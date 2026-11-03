package vn.yin.backend.repository;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SupportRepository {
    private final JdbcTemplate jdbc;
    private static final String COLUMNS = "SELECT s.id,s.user_id,s.subject,s.message,s.status,s.created_at,s.updated_at,u.username,u.email,u.phone FROM support_requests s JOIN users u ON u.id=s.user_id";

    public SupportRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private Map<String, Object> request(Map<String, Object> row, boolean admin) {
        var result = new LinkedHashMap<String, Object>();
        result.put("id", row.get("id"));
        if (admin) {
            result.put("clientId", row.get("user_id")); result.put("username", row.get("username"));
            result.put("email", row.get("email")); result.put("phone", row.get("phone"));
        }
        result.put("subject", row.get("subject")); result.put("message", row.get("message"));
        result.put("status", row.get("status"));
        result.put("createdAt", ((Timestamp) row.get("created_at")).toInstant().toString());
        result.put("updatedAt", ((Timestamp) row.get("updated_at")).toInstant().toString());
        return result;
    }

    public Map<String, Object> create(String userId, String subject, String message) {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO support_requests (id,user_id,subject,message) VALUES (?,?,?,?)", id, userId, subject, message);
        return byId(id, false);
    }

    private Map<String, Object> byId(String id, boolean admin) {
        var rows = jdbc.queryForList(COLUMNS + " WHERE s.id=?", id);
        return rows.isEmpty() ? null : request(rows.get(0), admin);
    }

    public Map<String, Object> mine(String userId, int page, int size) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM support_requests WHERE user_id=?", Long.class, userId);
        var items = jdbc.queryForList(COLUMNS + " WHERE s.user_id=? ORDER BY s.created_at DESC,s.id DESC OFFSET ? LIMIT ?",
                userId, page * size, size).stream().map(row -> request(row, false)).toList();
        return Map.of("items", items, "page", page, "size", size, "total", total == null ? 0L : total);
    }

    public Map<String, Object> all(String status, int page, int size) {
        String where = status.isEmpty() ? "" : " WHERE s.status=?";
        var params = new ArrayList<Object>();
        if (!status.isEmpty()) params.add(status);
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM support_requests s" + where, Long.class, params.toArray());
        params.add(page * size); params.add(size);
        var items = jdbc.queryForList(COLUMNS + where + " ORDER BY s.created_at DESC,s.id DESC OFFSET ? LIMIT ?", params.toArray())
                .stream().map(row -> request(row, true)).toList();
        return Map.of("items", items, "page", page, "size", size, "total", total == null ? 0L : total);
    }

    public Map<String, Object> updateStatus(String id, String status) {
        int changed = jdbc.update("UPDATE support_requests SET status=?,updated_at=(now() AT TIME ZONE 'UTC') WHERE id=?", status, id);
        return changed == 0 ? null : byId(id, true);
    }
}

