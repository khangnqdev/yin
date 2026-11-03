package vn.yin.backend.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.Pagination;

@Repository
public class SiteRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public SiteRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    private String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON", e); }
    }

    private Object decode(String value) {
        try { return json.readValue(value, Object.class); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Invalid stored JSON", e); }
    }

    private String str(Map<String, Object> row, String key) {
        Object value = row.get(key);
        return value == null ? null : value.toString();
    }

    private String time(Map<String, Object> row, String key) {
        Object value = row.get(key);
        return value == null ? null : ((Timestamp) value).toInstant().toString();
    }

    private Map<String, Object> article(Map<String, Object> r) {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("id", str(r, "id")); a.put("title", str(r, "title")); a.put("slug", str(r, "slug"));
        a.put("summary", str(r, "summary")); a.put("category", str(r, "category"));
        a.put("thumbnailUrl", str(r, "thumbnail_url")); a.put("contentJson", str(r, "content_json"));
        a.put("contentHtml", str(r, "content_html")); a.put("status", str(r, "status"));
        a.put("focusKeyword", str(r, "focus_keyword")); a.put("seoTitle", str(r, "seo_title"));
        a.put("seoDescription", str(r, "seo_description"));
        a.put("readingTimeMinutes", r.get("reading_time_minutes"));
        a.put("wordCount", r.get("word_count")); a.put("viewCount", r.get("view_count"));
        a.put("authorName", str(r, "author_name"));
        a.put("publishedAt", time(r, "published_at")); a.put("createdAt", time(r, "created_at"));
        a.put("updatedAt", time(r, "updated_at")); a.put("deletedAt", time(r, "deleted_at"));
        return a;
    }

    public Map<String, Object> articles(boolean includeAll, String status, String category, String search,
            Pagination.Cursor cursor, int size) {
        return articleSlice(includeAll, false, status, category, search, cursor, size);
    }

    public Map<String, Object> trashedArticles(String search, Pagination.Cursor cursor, int size) {
        return articleSlice(true, true, "", "", search, cursor, size);
    }

    private Map<String, Object> articleSlice(boolean includeAll, boolean deleted, String status, String category,
            String search, Pagination.Cursor cursor, int size) {
        var where = new ArrayList<String>();
        var params = new ArrayList<Object>();
        where.add(deleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL");
        if (!includeAll) where.add("status = 'PUBLISHED'");
        else if (!status.isEmpty()) { where.add("status = ?"); params.add(status); }
        if (!category.isEmpty()) { where.add("category = ?"); params.add(category); }
        if (!search.isEmpty()) {
            where.add("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(slug) LIKE ?"
                    + " OR LOWER(category) LIKE ? OR LOWER(focus_keyword) LIKE ?)");
            String pattern = "%" + search.toLowerCase(java.util.Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            for (int i = 0; i < 5; i++) params.add(pattern);
        }
        if (cursor != null) {
            where.add("(sort_at < ? OR (sort_at = ? AND id < ?))");
            params.add(Timestamp.from(cursor.time())); params.add(Timestamp.from(cursor.time())); params.add(cursor.id());
        }
        String sql = "SELECT * FROM articles" + (where.isEmpty() ? "" : " WHERE " + String.join(" AND ", where))
                + " ORDER BY sort_at DESC, id DESC LIMIT ?";
        params.add(size + 1);
        var fetched = jdbc.queryForList(sql, params.toArray()).stream().map(this::article).toList();
        var last = fetched.size() > size ? fetched.get(size - 1) : null;
        String next = last == null ? null : Pagination.encode(Instant.parse((String)(last.get("publishedAt") == null
                ? last.get("createdAt") : last.get("publishedAt"))), (String) last.get("id"));
        return Pagination.slice(fetched, size, next);
    }

    public Map<String, Object> articleCategories(int page, int size) {
        Long total = jdbc.queryForObject("SELECT COUNT(DISTINCT category) FROM articles WHERE status='PUBLISHED' AND deleted_at IS NULL", Long.class);
        var items = jdbc.queryForList("SELECT DISTINCT category FROM articles WHERE status='PUBLISHED' AND deleted_at IS NULL"
                + " ORDER BY category OFFSET ? LIMIT ?", page * size, size)
                .stream().map(row -> str(row, "category")).toList();
        return Map.of("items", items, "page", page, "size", size, "total", total == null ? 0L : total);
    }

    public Map<String, Object> articleBySlug(String slug, boolean includeDraft) {
        String sql = "SELECT * FROM articles WHERE slug = ? AND deleted_at IS NULL"
                + (includeDraft ? "" : " AND status = 'PUBLISHED'");
        var rows = jdbc.queryForList(sql, slug);
        return rows.isEmpty() ? null : article(rows.get(0));
    }

    public Map<String, Object> articleById(String id) {
        var rows = jdbc.queryForList("SELECT * FROM articles WHERE id = ? AND deleted_at IS NULL", id);
        return rows.isEmpty() ? null : article(rows.get(0));
    }

    public void insertArticle(Map<String, Object> a) {
        jdbc.update("INSERT INTO articles (id,title,slug,summary,category,thumbnail_url,content_json,content_html,status,focus_keyword,seo_title,seo_description,reading_time_minutes,word_count,view_count,author_name,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                a.get("id"), a.get("title"), a.get("slug"), a.get("summary"), a.get("category"), a.get("thumbnailUrl"),
                a.get("contentJson"), a.get("contentHtml"), a.get("status"), a.get("focusKeyword"), a.get("seoTitle"),
                a.get("seoDescription"), a.get("readingTimeMinutes"), a.get("wordCount"), a.get("viewCount"), a.get("authorName"),
                a.get("publishedAt") == null ? null : Timestamp.from(Instant.parse((String)a.get("publishedAt"))));
    }

    public void updateArticle(Map<String, Object> a) {
        jdbc.update("UPDATE articles SET title=?,slug=?,summary=?,category=?,thumbnail_url=?,content_json=?,content_html=?,status=?,focus_keyword=?,seo_title=?,seo_description=?,reading_time_minutes=?,word_count=?,author_name=?,published_at=?,updated_at=(now() AT TIME ZONE 'UTC') WHERE id=? AND deleted_at IS NULL",
                a.get("title"), a.get("slug"), a.get("summary"), a.get("category"), a.get("thumbnailUrl"),
                a.get("contentJson"), a.get("contentHtml"), a.get("status"), a.get("focusKeyword"), a.get("seoTitle"),
                a.get("seoDescription"), a.get("readingTimeMinutes"), a.get("wordCount"), a.get("authorName"),
                a.get("publishedAt") == null ? null : Timestamp.from(Instant.parse((String)a.get("publishedAt"))), a.get("id"));
    }

    public boolean deleteArticle(String id) {
        return jdbc.update("UPDATE articles SET deleted_at=(now() AT TIME ZONE 'UTC'), updated_at=(now() AT TIME ZONE 'UTC') WHERE id=? AND deleted_at IS NULL", id) > 0;
    }

    public boolean restoreArticle(String id) {
        return jdbc.update("UPDATE articles SET status=CASE WHEN status='PUBLISHED' THEN 'ARCHIVED' ELSE status END, deleted_at=NULL, updated_at=(now() AT TIME ZONE 'UTC') WHERE id=? AND deleted_at IS NOT NULL", id) > 0;
    }

    public boolean incrementArticleViews(String slug) {
        return jdbc.update("UPDATE articles SET view_count = view_count + 1 WHERE slug = ? AND status = 'PUBLISHED' AND deleted_at IS NULL", slug) > 0;
    }

    public int articleCount() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM articles", Integer.class);
        return count == null ? 0 : count;
    }

    public int activeArticleCount() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL", Integer.class);
        return count == null ? 0 : count;
    }

    public Map<String, Object> pages(int page, int size) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM pages", Long.class);
        var items = jdbc.queryForList("SELECT page_key, title, meta_description, content_json, updated_at FROM pages"
                + " ORDER BY page_key OFFSET ? LIMIT ?", page * size, size)
                .stream().map(r -> {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("pageKey", str(r, "page_key"));
                    p.put("pageTitle", str(r, "title"));
                    p.put("metaDescription", str(r, "meta_description"));
                    p.put("blocks", decode(str(r, "content_json")));
                    p.put("updatedAt", time(r, "updated_at"));
                    return p;
                }).toList();
        return Map.of("items", items, "page", page, "size", size, "total", total == null ? 0L : total);
    }

    public Map<String, Object> page(String key) {
        var rows = jdbc.queryForList("SELECT page_key, title, meta_description, content_json, updated_at FROM pages WHERE page_key = ?", key);
        if (rows.isEmpty()) return null;
        var r = rows.get(0);
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("pageKey", str(r, "page_key"));
        p.put("pageTitle", str(r, "title"));
        p.put("metaDescription", str(r, "meta_description"));
        p.put("blocks", decode(str(r, "content_json")));
        p.put("updatedAt", time(r, "updated_at"));
        return p;
    }

    public void savePage(String key, String title, String meta, Object blocks) {
        String json = encode(blocks);
        int updated = jdbc.update("UPDATE pages SET title=?, meta_description=?, content_json=?, updated_at=(now() AT TIME ZONE 'UTC') WHERE page_key=?",
                title, meta, json, key);
        if (updated == 0) {
            jdbc.update("INSERT INTO pages (page_key, title, meta_description, content_json) VALUES (?,?,?,?)",
                    key, title, meta, json);
        }
    }

    public void insertPageView(String session, String path, String ref) {
        jdbc.update("INSERT INTO page_views (id, session_id, path, referrer) VALUES (?,?,?,?)",
                UUID.randomUUID().toString(), session, path, ref);
    }

    public int totalPageViews() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM page_views", Integer.class);
        return count == null ? 0 : count;
    }

    public int uniqueVisitors() {
        Integer count = jdbc.queryForObject("SELECT COUNT(DISTINCT session_id) FROM page_views", Integer.class);
        return count == null ? 0 : count;
    }

    public List<Map<String, Object>> dailyViews() {
        return jdbc.queryForList("SELECT CAST(viewed_at AS date) AS day, COUNT(*) AS views FROM page_views"
                + " WHERE viewed_at >= ((now() AT TIME ZONE 'UTC')::date - INTERVAL '6 days')"
                + " GROUP BY CAST(viewed_at AS date)");
    }

    public void upsertReadingSession(Map<String, Object> s) {
        int updated = jdbc.update("UPDATE reading_sessions SET target_title=?, max_scroll_depth=CASE WHEN ? > max_scroll_depth THEN ? ELSE max_scroll_depth END, last_block_id=CASE WHEN ? >= max_scroll_depth THEN ? ELSE last_block_id END, last_block_label=CASE WHEN ? >= max_scroll_depth THEN ? ELSE last_block_label END, time_spent_seconds=CASE WHEN ? > time_spent_seconds THEN ? ELSE time_spent_seconds END, updated_at=(now() AT TIME ZONE 'UTC') WHERE session_id=? AND target_id=?",
                s.get("targetTitle"), s.get("maxScrollDepth"), s.get("maxScrollDepth"),
                s.get("maxScrollDepth"), s.get("lastBlockId"),
                s.get("maxScrollDepth"), s.get("lastBlockLabel"),
                s.get("timeSpentSeconds"), s.get("timeSpentSeconds"), s.get("sessionId"), s.get("targetId"));
        if (updated == 0) {
            jdbc.update("INSERT INTO reading_sessions (id, session_id, target_id, target_title, max_scroll_depth, last_block_id, last_block_label, time_spent_seconds) VALUES (?,?,?,?,?,?,?,?)",
                    UUID.randomUUID().toString(), s.get("sessionId"), s.get("targetId"), s.get("targetTitle"),
                    s.get("maxScrollDepth"), s.get("lastBlockId"), s.get("lastBlockLabel"), s.get("timeSpentSeconds"));
        }
    }

    public Map<String, Object> readingSessions(Pagination.Cursor cursor, int size) {
        String where = cursor == null ? "" : " WHERE created_at < ? OR (created_at = ? AND id < ?)";
        Object[] params = cursor == null ? new Object[] { size + 1 }
                : new Object[] { Timestamp.from(cursor.time()), Timestamp.from(cursor.time()), cursor.id(), size + 1 };
        var fetched = jdbc.queryForList("SELECT * FROM reading_sessions" + where
                + " ORDER BY created_at DESC, id DESC LIMIT ?", params).stream().map(r -> {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("id", str(r, "id")); s.put("createdAt", time(r, "created_at"));
            s.put("sessionId", str(r, "session_id")); s.put("targetId", str(r, "target_id"));
            s.put("targetTitle", str(r, "target_title")); s.put("maxScrollDepth", r.get("max_scroll_depth"));
            s.put("lastBlockId", str(r, "last_block_id")); s.put("lastBlockLabel", str(r, "last_block_label"));
            s.put("timeSpentSeconds", r.get("time_spent_seconds"));
            return s;
        }).toList();
        var last = fetched.size() > size ? fetched.get(size - 1) : null;
        String next = last == null ? null : Pagination.encode(Instant.parse((String) last.get("createdAt")), (String) last.get("id"));
        return Pagination.slice(fetched, size, next);
    }

    public Map<String, Object> readingFunnel() {
        return jdbc.queryForMap("SELECT COUNT(*) AS \"totalReaders\","
                + " COALESCE(SUM(CASE WHEN max_scroll_depth >= 25 THEN 1 ELSE 0 END),0) AS \"reached25\","
                + " COALESCE(SUM(CASE WHEN max_scroll_depth >= 50 THEN 1 ELSE 0 END),0) AS \"reached50\","
                + " COALESCE(SUM(CASE WHEN max_scroll_depth >= 75 THEN 1 ELSE 0 END),0) AS \"reached75\","
                + " COALESCE(SUM(CASE WHEN max_scroll_depth >= 100 THEN 1 ELSE 0 END),0) AS \"completed100\""
                + " FROM reading_sessions");
    }

    public List<Map<String, Object>> exitBlocks() {
        return jdbc.queryForList("SELECT last_block_id AS \"blockId\", MAX(last_block_label) AS \"blockLabel\","
                + " COUNT(*) AS \"exitCount\" FROM reading_sessions WHERE last_block_id <> ''"
                + " GROUP BY last_block_id ORDER BY \"exitCount\" DESC, last_block_id LIMIT 5");
    }
}

