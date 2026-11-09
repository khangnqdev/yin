package vn.yin.backend.repository;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {
    private final JdbcTemplate jdbc;
    private final AccountRepository accounts;

    public RoleRepository(JdbcTemplate jdbc, AccountRepository accounts) {
        this.jdbc = jdbc;
        this.accounts = accounts;
    }

    public void lockPolicy() { accounts.lockPolicy(); }

    public Map<String, Object> find(String code) {
        var rows = jdbc.queryForList("SELECT code,name,description,rank,scope,is_active,is_system FROM roles WHERE code=? AND scope='ADMIN'", code);
        return rows.isEmpty() ? null : convert(rows.get(0));
    }

    public List<Map<String, Object>> all() {
        return jdbc.queryForList("SELECT code,name,description,rank,scope,is_active,is_system FROM roles WHERE scope='ADMIN' ORDER BY rank DESC,code")
                .stream().map(this::convert).toList();
    }

    private Map<String, Object> convert(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>();
        result.put("code", row.get("code"));
        result.put("name", row.get("name"));
        result.put("description", row.get("description"));
        result.put("rank", row.get("rank"));
        result.put("scope", row.get("scope"));
        result.put("isActive", row.get("is_active"));
        result.put("isSystem", row.get("is_system"));
        result.put("permissions", accounts.permissionsForRole((String) row.get("code")));
        return result;
    }

    public void create(String code, String name, String description, int rank) {
        jdbc.update("INSERT INTO roles(code,name,description,rank,scope,is_active,is_system,permissions_seeded) VALUES(?,?,?,?,'ADMIN',true,false,true)",
                code, name, description, rank);
    }

    public void update(String code, String name, String description, int rank) {
        jdbc.update("UPDATE roles SET name=?,description=?,rank=? WHERE code=? AND scope='ADMIN' AND is_system=false",
                name, description, rank, code);
    }

    public void permissions(String code, List<String> permissions) {
        jdbc.update("DELETE FROM role_permissions WHERE role_code=?", code);
        for (String permission : permissions) {
            String[] parts = permission.split(":", 2);
            jdbc.update("INSERT INTO role_permissions(role_code,feature,action) VALUES(?,?,?)", code, parts[0], parts[1]);
        }
    }

    public void status(String code, boolean active) {
        jdbc.update("UPDATE roles SET is_active=? WHERE code=? AND scope='ADMIN' AND is_system=false", active, code);
    }

    public long userCount(String code) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role=?", Long.class, code);
        return count == null ? 0 : count;
    }

    public List<String> userIds(String code) {
        return jdbc.queryForList("SELECT id FROM users WHERE role=?", String.class, code);
    }

    public void bumpVersions(String code) {
        jdbc.update("UPDATE users SET token_version=token_version+1 WHERE role=?", code);
    }

    public void audit(String actorId, String code, String operation, Object before, Object after) {
        jdbc.update("INSERT INTO role_audit(actor_id,target_code,operation,before_state,after_state) VALUES(?,?,?,?,?)",
                actorId, code, operation, before == null ? null : before.toString(), after == null ? null : after.toString());
    }
}
