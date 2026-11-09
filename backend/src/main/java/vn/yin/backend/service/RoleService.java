package vn.yin.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.repository.RoleRepository;

@Service
public class RoleService {
    private final RoleRepository roles;
    private final AccountRepository accounts;
    private final TokenRegistry tokens;

    public RoleService(RoleRepository roles, AccountRepository accounts, TokenRegistry tokens) {
        this.roles = roles;
        this.accounts = accounts;
        this.tokens = tokens;
    }

    public List<Map<String, Object>> all() { return roles.all(); }

    public Map<String, Object> one(String code) {
        var role = roles.find(code);
        if (role == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
        return role;
    }

    private int actorRank(String actorId) {
        var actor = accounts.activePrincipal(actorId);
        Integer rank = actor == null ? null : accounts.roleRank(String.valueOf(actor.get("role")));
        if (rank == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account unavailable");
        return rank;
    }

    private void below(String actorId, int rank) {
        if (rank < 1 || rank >= actorRank(actorId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role must be below your own");
    }

    private String text(Map<String, Object> body, String key, int max) {
        Object raw = body.get(key);
        if (!(raw instanceof String value) || value.isBlank() || value.length() > max)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + key);
        return value.trim();
    }

    private String description(Map<String, Object> body) {
        Object value = body.getOrDefault("description", "");
        if (!(value instanceof String description) || description.length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid description");
        return description.trim();
    }

    private List<String> permissions(String actorId, Map<String, Object> body) {
        if (!(body.get("permissions") instanceof List<?> raw))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid permissions");
        var selected = new ArrayList<String>();
        Set<String> actor = new HashSet<>(accounts.permissionsForRole(String.valueOf(accounts.activePrincipal(actorId).get("role"))));
        for (Object value : raw) {
            if (!(value instanceof String permission) || !RoleCatalog.PERMISSIONS.contains(permission) || !actor.contains(permission))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot grant unavailable permission");
            if (!selected.contains(permission)) selected.add(permission);
        }
        return selected;
    }

    private int rank(Map<String, Object> body) {
        Object value = body.get("rank");
        if (!(value instanceof Number number) || number.intValue() != number.doubleValue() || number.intValue() < 1 || number.intValue() > 999)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid rank");
        return number.intValue();
    }

    @Transactional
    public Map<String, Object> create(String actorId, Map<String, Object> body) {
        roles.lockPolicy();
        String code = text(body, "code", 30).toUpperCase(java.util.Locale.ROOT);
        if (!code.matches("[A-Z][A-Z0-9_]{2,29}") || "CLIENT".equals(code))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role code");
        int rank = rank(body);
        below(actorId, rank);
        var grants = permissions(actorId, body);
        roles.create(code, text(body, "name", 100), description(body), rank);
        roles.permissions(code, grants);
        var created = one(code);
        roles.audit(actorId, code, "CREATE", null, created);
        return created;
    }

    @Transactional
    public Map<String, Object> update(String actorId, String code, Map<String, Object> body) {
        roles.lockPolicy();
        var before = one(code);
        if (Boolean.TRUE.equals(before.get("isSystem"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "System role");
        below(actorId, ((Number) before.get("rank")).intValue());
        int rank = rank(body);
        below(actorId, rank);
        var grants = permissions(actorId, body);
        roles.update(code, text(body, "name", 100), description(body), rank);
        roles.permissions(code, grants);
        invalidateMembers(code);
        var after = one(code);
        roles.audit(actorId, code, "UPDATE", before, after);
        return after;
    }

    @Transactional
    public Map<String, Object> status(String actorId, String code, boolean active) {
        roles.lockPolicy();
        var before = one(code);
        if (Boolean.TRUE.equals(before.get("isSystem"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "System role");
        below(actorId, ((Number) before.get("rank")).intValue());
        if (!active && roles.userCount(code) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reassign users before disabling role");
        roles.status(code, active);
        invalidateMembers(code);
        var after = one(code);
        roles.audit(actorId, code, "STATUS", before, after);
        return after;
    }

    private void invalidateMembers(String code) {
        for (String userId : roles.userIds(code)) tokens.revokeUser(userId);
        roles.bumpVersions(code);
    }
}
