package vn.yin.backend.repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AccountRepository {
    private final JdbcTemplate jdbc;

    public AccountRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void lockPolicy() { jdbc.execute("SELECT pg_advisory_xact_lock(20261103)"); }

    private String time(Object value) { return value == null ? null : ((Timestamp) value).toInstant().toString(); }

    public Map<String, Object> byUsername(String username) {
        var rows = jdbc.queryForList("SELECT u.id,u.username,u.password_hash,u.role,u.is_active,u.token_version FROM users u JOIN roles r ON r.code=u.role AND r.is_active=true WHERE u.username=?", username);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> activePrincipal(String id) {
        var rows = jdbc.queryForList("SELECT u.role,u.token_version FROM users u JOIN roles r ON r.code=u.role AND r.is_active=true WHERE u.id=? AND u.is_active=true", id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Integer roleRank(String role) {
        var rows = jdbc.queryForList("SELECT rank FROM roles WHERE code=? AND scope='ADMIN'", role);
        return rows.isEmpty() ? null : ((Number) rows.get(0).get("rank")).intValue();
    }

    public boolean isAdminRole(String role) {
        var rows = jdbc.queryForList("SELECT code FROM roles WHERE code=? AND scope='ADMIN' AND is_active=true", role);
        return !rows.isEmpty();
    }

    public List<String> permissionsForRole(String role) {
        return jdbc.queryForList("SELECT feature || ':' || action FROM role_permissions WHERE role_code=?", String.class, role);
    }

    public Map<String, Object> authorProfile(String id) {
        var rows = jdbc.queryForList("SELECT u.author_name,u.author_role FROM users u JOIN roles r ON u.role=r.code WHERE u.id=? AND u.is_active=true AND r.scope='ADMIN'", id);
        if (rows.isEmpty()) return null;
        var result = new LinkedHashMap<String, Object>();
        result.put("authorName", rows.get(0).get("author_name") == null ? "" : rows.get(0).get("author_name"));
        result.put("authorRole", rows.get(0).get("author_role") == null ? "" : rows.get(0).get("author_role"));
        return result;
    }

    public Map<String, Object> updateAuthorProfile(String id, String name, String role) {
        jdbc.update("UPDATE users SET author_name=?,author_role=? WHERE id=? AND is_active=true AND role IN (SELECT code FROM roles WHERE scope='ADMIN')", name, role, id);
        return authorProfile(id);
    }

    public Map<String, Object> client(String id) {
        var rows = jdbc.queryForList("SELECT id,username,email,phone,date_of_birth,receive_updates,role,created_at FROM users WHERE id=? AND role='CLIENT' AND is_active=true", id);
        return rows.isEmpty() ? null : profile(rows.get(0));
    }

    private Map<String, Object> profile(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", row.get("id")); result.put("username", row.get("username"));
        result.put("email", row.get("email")); result.put("phone", row.get("phone"));
        result.put("dateOfBirth", row.get("date_of_birth") == null ? null : row.get("date_of_birth").toString());
        result.put("receiveUpdates", row.get("receive_updates")); result.put("role", row.get("role"));
        result.put("createdAt", time(row.get("created_at")));
        return result;
    }

    public Map<String, Object> createClient(String username, String hash, String email, String phone,
            String dateOfBirth, boolean receiveUpdates) {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users (id,username,password_hash,role,email,phone,date_of_birth,receive_updates) VALUES (?,?,?,'CLIENT',?,?,?,?)",
                id, username, hash, email, phone, java.sql.Date.valueOf(dateOfBirth), receiveUpdates);
        return client(id);
    }

    public Map<String, Object> updateOptIn(String id, boolean receiveUpdates) {
        int changed = jdbc.update("UPDATE users SET receive_updates=? WHERE id=? AND role='CLIENT' AND is_active=true", receiveUpdates, id);
        return changed == 0 ? null : client(id);
    }

    public Map<String, Object> clients(boolean updatesOnly, String search, int page, int size) {
        var conditions = new ArrayList<String>();
        conditions.add("role='CLIENT'");
        var params = new ArrayList<Object>();
        if (updatesOnly) conditions.add("receive_updates=true");
        if (!search.isEmpty()) {
            conditions.add("(LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)");
            String pattern = "%" + search.toLowerCase(java.util.Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            params.add(pattern); params.add(pattern); params.add(pattern);
        }
        String where = " WHERE " + String.join(" AND ", conditions);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM users" + where, Long.class, params.toArray());
        params.add(page * size); params.add(size);
        var items = jdbc.queryForList("SELECT id,username,email,phone,date_of_birth,receive_updates,role,created_at FROM users"
                + where + " ORDER BY created_at DESC,id DESC OFFSET ? LIMIT ?", params.toArray())
                .stream().map(this::profile).toList();
        return Map.of("items", items, "page", page, "size", size, "total", total == null ? 0L : total);
    }

    public Map<String, Object> admins(int page, int size) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role IN (SELECT code FROM roles WHERE scope='ADMIN')", Long.class);
        var items = jdbc.queryForList("SELECT id,username,role,is_active,created_at FROM users WHERE role IN (SELECT code FROM roles WHERE scope='ADMIN')"
                + " ORDER BY created_at ASC,id ASC OFFSET ? LIMIT ?", page * size, size)
                .stream().map(row -> {
                    var r = new LinkedHashMap<String, Object>();
                    r.put("id", row.get("id")); r.put("username", row.get("username"));
                    r.put("role", row.get("role")); r.put("isActive", row.get("is_active"));
                    r.put("createdAt", time(row.get("created_at")));
                    return (Map<String, Object>) r;
                }).toList();
        return Map.of("items", items, "page", page, "size", size, "total", total == null ? 0L : total);
    }

    public Map<String, Object> createAdmin(String username, String hash, String role) {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users (id,username,password_hash,role) VALUES (?,?,?,?)", id, username, hash, role);
        return Map.of("id", id, "username", username, "role", role);
    }

    public Map<String, Object> admin(String id) {
        var rows = jdbc.queryForList("SELECT id,username,role,is_active,created_at FROM users"
                + " WHERE id=? AND role IN (SELECT code FROM roles WHERE scope='ADMIN')", id);
        if (rows.isEmpty()) return null;
        var row = rows.get(0);
        return Map.of("id", row.get("id"), "username", row.get("username"), "role", row.get("role"),
                "isActive", row.get("is_active"), "createdAt", time(row.get("created_at")));
    }

    @Transactional
    public boolean updateAdminStatus(String id, boolean active) {
        jdbc.execute("SELECT pg_advisory_xact_lock(20261103)");
        return jdbc.update("UPDATE users SET is_active=?,token_version=token_version+1 WHERE id=?"
                + " AND role IN (SELECT code FROM roles WHERE scope='ADMIN')"
                + " AND (?=true OR is_active=false OR role<>'ADMIN' OR"
                + " (SELECT COUNT(*) FROM users WHERE role='ADMIN' AND is_active=true)>1)",
                active, id, active) > 0;
    }

    @Transactional
    public boolean updateAdminRole(String id, String role) {
        jdbc.execute("SELECT pg_advisory_xact_lock(20261103)");
        return jdbc.update("UPDATE users SET role=?,token_version=token_version+1 WHERE id=?"
                + " AND role IN (SELECT code FROM roles WHERE scope='ADMIN')"
                + " AND (?='ADMIN' OR is_active=false OR role<>'ADMIN' OR"
                + " (SELECT COUNT(*) FROM users WHERE role='ADMIN' AND is_active=true)>1)",
                role, id, role) > 0;
    }

    public boolean resetAdminPassword(String id, String hash) {
        return jdbc.update("UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?"
                + " AND role IN (SELECT code FROM roles WHERE scope='ADMIN')", hash, id) > 0;
    }

    public void auditRoleAssignment(String actorId, String userId, String oldRole, String newRole) {
        jdbc.update("INSERT INTO role_audit(actor_id,target_code,operation,before_state,after_state) VALUES(?,?,?,?,?)",
                actorId, newRole, "ACCOUNT_ROLE", "user=" + userId + ";role=" + oldRole,
                "user=" + userId + ";role=" + newRole);
    }

}

