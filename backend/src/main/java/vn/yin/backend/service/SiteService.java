package vn.yin.backend.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.common.Pagination;
import vn.yin.backend.repository.SiteRepository;

@Service
public class SiteService {
    public static final Set<String> PAGE_KEYS = Set.of("home", "about", "projects", "blog", "contact");
    public static final Set<String> ARTICLE_STATUSES = Set.of("DRAFT", "PUBLISHED", "ARCHIVED");
    public static final Set<String> BLOCK_TYPES = Set.of(
            "hero", "stats", "projects-grid", "rich-content", "testimonials", "cta",
            "text", "steps", "options", "multi-column", "programs", "video", "form", "section", "faq"
    );
    public static final Safelist HTML = Safelist.relaxed()
            .addTags("h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td", "figure", "figcaption", "mark", "hr", "s", "u")
            .addAttributes(":all", "id", "class", "style")
            .addAttributes("a", "target", "rel", "href")
            .addAttributes("img", "src", "alt", "title", "width", "height", "loading")
            .addProtocols("img", "src", "https", "http", "data")
            .preserveRelativeLinks(true);

    private final SiteRepository data;
    private final ObjectMapper json;
    private final AbuseProtection protection;
    private final ContactService contacts;

    public SiteService(SiteRepository data, ObjectMapper json, AbuseProtection protection, ContactService contacts) {
        this.data = data;
        this.json = json;
        this.protection = protection;
        this.contacts = contacts;
    }

    public String field(Map<String, Object> body, String key, int max) {
        Object value = body.get(key);
        if (value != null && !(value instanceof String)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + key);
        String text = value == null ? "" : ((String)value).trim();
        text = text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "");
        if (text.length() > max) {
            if (key.equals("summary") || key.equals("category") || key.equals("seoDescription")) {
                text = text.substring(0, max);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " is too long");
            }
        }
        return text;
    }

    public String required(Map<String, Object> body, String key, int max) {
        String text = field(body, key, max);
        if (text.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " is required");
        return text;
    }

    public int number(Map<String, Object> body, String key, int fallback, int max) {
        Object raw = body.get(key);
        if (raw == null) return fallback;
        if (!(raw instanceof Integer || raw instanceof Long))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + key);
        long value = ((Number)raw).longValue();
        if (value < 0 || value > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid " + key);
        return (int)value;
    }

    public String jsonDocument(String text) {
        try {
            if (text == null || text.isBlank()) {
                return "{\"type\":\"doc\",\"content\":[]}";
            }
            JsonNode node = json.readTree(text);
            if (!node.isObject() || !"doc".equals(node.path("type").asText()) || !node.path("content").isArray()) {
                return "{\"type\":\"doc\",\"content\":[]}";
            }
            return json.writeValueAsString(node);
        } catch (JsonProcessingException e) { 
            return "{\"type\":\"doc\",\"content\":[]}"; 
        }
    }

    public String slug(String title) {
        String normalized = java.text.Normalizer.normalize(title.toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('đ', 'd').replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return normalized.isEmpty() ? UUID.randomUUID().toString() : normalized;
    }

    public String validatedSlug(String candidate) {
        if (!candidate.matches("[a-z0-9]+(?:-[a-z0-9]+)*") || candidate.length() > 150)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid slug");
        return candidate;
    }

    public String validatedUrl(String value, boolean allowAnchor) {
        if (value.isEmpty()) return value;
        if (value.startsWith("/") && !value.startsWith("//") && value.matches("/[A-Za-z0-9/_#?&=%.-]*")) return value;
        if (allowAnchor && value.startsWith("#") && value.matches("#[A-Za-z0-9_-]+")) return value;
        if (allowAnchor && value.startsWith("mailto:") && value.substring(7).matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) return value;
        try {
            URI uri = new URI(value);
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) && uri.getHost() != null && uri.getUserInfo() == null) return value;
        } catch (URISyntaxException ignored) { }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
    }

    public String validatedSession(Map<String, Object> body) {
        String session = required(body, "sessionId", 100);
        if (!session.matches("[A-Za-z0-9_-]{8,100}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sessionId");
        return session;
    }

    public void limit(boolean allowed) {
        if (!allowed) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again later.");
    }

    public Map<String, Object> pages(int page, int size) {
        size = Pagination.size(size);
        return data.pages(Pagination.page(page, size), size);
    }

    public Map<String, Object> articles(boolean includeAll, String status, String category, String search,
            String cursor, int size) {
        size = Pagination.size(size);
        if (includeAll && !status.isEmpty() && !ARTICLE_STATUSES.contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        String term = search == null ? "" : search.trim();
        if (term.length() > 100 || term.chars().anyMatch(Character::isISOControl))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid search");
        String cat = category == null ? "" : category.trim();
        if (cat.length() > 100 || cat.chars().anyMatch(Character::isISOControl))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid category");
        return data.articles(includeAll, status, cat, term, Pagination.cursor(cursor), size);
    }

    public Map<String, Object> articleCategories(int page, int size) {
        size = Pagination.size(size);
        return data.articleCategories(Pagination.page(page, size), size);
    }

    public Map<String, Object> page(String key) {
        var result = data.page(key);
        if (result == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return result;
    }

    public Map<String, Object> article(String slug) {
        var result = data.articleBySlug(slug, false);
        if (result == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return result;
    }

    public Map<String, Object> adminArticle(String id) {
        var result = data.articleById(id);
        if (result == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return result;
    }

    public void articleView(String slug, String remoteAddr) {
        String validSlug = validatedSlug(slug);
        limit(protection.allowArticleView(remoteAddr));
        if (!data.incrementArticleViews(validSlug))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found");
    }

    public void pageView(Map<String, Object> body, String remoteAddr) {
        String path = required(body, "path", 500);
        if (!path.matches("/(?:|about|projects|blog|blog/[a-z0-9-]+|contact)"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid path");
        String session = validatedSession(body);
        String referrer = field(body, "referrer", 500);
        limit(protection.allowTelemetry(remoteAddr));
        data.insertPageView(session, path, referrer);
    }

    public void readingSession(Map<String, Object> body, String remoteAddr) {
        var session = new HashMap<String, Object>();
        session.put("sessionId", validatedSession(body));
        String target = required(body, "targetId", 100);
        if (!target.matches("[A-Za-z0-9_-]+")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid targetId");
        session.put("targetId", target);
        session.put("targetTitle", required(body, "targetTitle", 400));
        int depth = number(body, "maxScrollDepth", 0, 100);
        if (!Set.of(0,25,50,75,100).contains(depth)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid depth");
        session.put("maxScrollDepth", depth);
        session.put("lastBlockId", field(body, "lastBlockId", 150));
        session.put("lastBlockLabel", field(body, "lastBlockLabel", 300));
        session.put("timeSpentSeconds", number(body, "timeSpentSeconds", 0, 86400));
        limit(protection.allowTelemetry(remoteAddr));
        data.upsertReadingSession(session);
    }

    public Map<String, Object> adminBootstrap() {
        return Map.of("summary", analytics());
    }

    public Map<String, Object> analytics() {
        var funnel = data.readingFunnel();
        long total = ((Number) funnel.get("totalReaders")).longValue();
        var exitBlocks = data.exitBlocks().stream().map(row -> {
            var item = new LinkedHashMap<String, Object>(row);
            item.put("exitPercentage", total == 0 ? 0 : Math.round(((Number) row.get("exitCount")).doubleValue() * 100 / total));
            return item;
        }).toList();
        var days = new LinkedHashMap<LocalDate, Integer>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = 6; i >= 0; i--) days.put(today.minusDays(i), 0);
        for (var view : data.dailyViews()) {
            LocalDate date = ((java.sql.Date) view.get("day")).toLocalDate();
            days.computeIfPresent(date, (k, count) -> ((Number) view.get("views")).intValue());
        }
        var daily = new ArrayList<Map<String, Object>>();
        days.forEach((date, views) -> daily.add(Map.of("date", String.format("%02d-%02d", date.getMonthValue(), date.getDayOfMonth()), "views", views)));
        return Map.of("totalPageViews", data.totalPageViews(), "uniqueVisitors", data.uniqueVisitors(),
                "totalArticles", data.activeArticleCount(), "totalContacts", contacts.count(),
                "funnel", funnel,
                "exitBlocks", exitBlocks, "dailyViews", daily);
    }

    public Map<String, Object> readingSessions(String cursor, int size) {
        return data.readingSessions(Pagination.cursor(cursor), Pagination.size(size));
    }

    public Map<String, Object> createArticle(Map<String, Object> body) {
        var a = normalizedArticle(body, null);
        data.insertArticle(a);
        return data.articleById((String)a.get("id"));
    }

    public Map<String, Object> trashedArticles(String search, String cursor, int size) {
        String term = search == null ? "" : search.trim();
        if (term.length() > 100 || term.chars().anyMatch(Character::isISOControl))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid search");
        return data.trashedArticles(term, Pagination.cursor(cursor), Pagination.size(size));
    }

    public Map<String, Object> restoreArticle(String id) {
        if (!data.restoreArticle(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found in trash");
        return data.articleById(id);
    }

    public Map<String, Object> updateArticle(String id, Map<String, Object> body) {
        var current = data.articleById(id);
        if (current == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        var a = normalizedArticle(body, current);
        data.updateArticle(a);
        return data.articleById(id);
    }

    private Map<String, Object> normalizedArticle(Map<String, Object> body, Map<String, Object> current) {
        var a = new HashMap<String, Object>();
        a.put("id", current == null ? UUID.randomUUID().toString() : current.get("id"));
        String title = required(body, "title", 400);
        a.put("title", title);
        String requestedSlug = field(body, "slug", 400);
        String finalSlug = requestedSlug.isEmpty() ? slug(title) : requestedSlug.toLowerCase();
        a.put("slug", validatedSlug(finalSlug));
        a.put("summary", field(body, "summary", 100_000));
        a.put("category", field(body, "category", 500).isEmpty() ? "Cong-Nghe" : field(body, "category", 500));
        a.put("thumbnailUrl", validatedUrl(field(body, "thumbnailUrl", 1000).isEmpty() ? "/assets/logo/yin.svg" : field(body, "thumbnailUrl", 1000), false));
        String contentJson = field(body, "contentJson", 50_000_000);
        a.put("contentJson", jsonDocument(contentJson.isEmpty() ? "{\"type\":\"doc\",\"content\":[]}" : contentJson));
        a.put("contentHtml", Jsoup.clean(field(body, "contentHtml", 50_000_000), HTML));
        String status = field(body, "status", 30);
        if (status.isEmpty() && current == null) status = "DRAFT";
        if (!ARTICLE_STATUSES.contains(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        if (current == null && "ARCHIVED".equals(status)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A new article cannot start archived");
        if (current != null) {
            String previous = (String) current.get("status");
            if (("DRAFT".equals(previous) && "ARCHIVED".equals(status))
                    || ("PUBLISHED".equals(previous) && "DRAFT".equals(status))
                    || ("ARCHIVED".equals(previous) && "DRAFT".equals(status)))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid article status transition");
        }
        a.put("status", status); a.put("focusKeyword", field(body, "focusKeyword", 200));
        a.put("seoTitle", field(body, "seoTitle", 300).isEmpty() ? title : field(body, "seoTitle", 300));
        String seoDescription = field(body, "seoDescription", 500);
        String summary = (String) a.get("summary");
        a.put("seoDescription", seoDescription.isEmpty() ? summary.substring(0, Math.min(summary.length(), 500)) : seoDescription);
        a.put("readingTimeMinutes", number(body, "readingTimeMinutes", 1, 10000));
        a.put("wordCount", number(body, "wordCount", 0, 1_000_000));
        a.put("viewCount", current == null ? 0 : current.get("viewCount"));
        String author = field(body, "authorName", 200);
        a.put("authorName", author.isEmpty() ? (current == null ? "Khang (Founder)" : current.get("authorName")) : author);
        String authorRole = field(body, "authorRole", 200);
        a.put("authorRole", authorRole.isEmpty() ? (current == null ? "" : current.get("authorRole")) : authorRole);
        String previousPublication = current == null ? null : (String) current.get("publishedAt");
        String publication = previousPublication;
        if ("PUBLISHED".equals(status)) {
            String requestedPublication = field(body, "publishedAt", 60);
            if (!requestedPublication.isEmpty()) {
                try {
                    Instant date = Instant.parse(requestedPublication);
                    if (date.isAfter(Instant.now()))
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Publication date cannot be in the future");
                    publication = date.toString();
                } catch (DateTimeParseException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid publication date", e);
                }
            } else if (publication == null) publication = Instant.now().toString();
        }
        a.put("publishedAt", publication);
        return a;
    }

    public void deleteArticle(String id) {
        if (!data.deleteArticle(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    public Map<String, Object> savePage(String key, Map<String, Object> body) {
        if (!PAGE_KEYS.contains(key)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page key");
        Object rawBlocks = body.get("blocks");
        if (!(rawBlocks instanceof List<?> blocks) || blocks.size() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid blocks");
        JsonNode sanitized = json.valueToTree(blocks);
        for (JsonNode block : sanitized) {
            if (!block.isObject() || !BLOCK_TYPES.contains(block.path("type").asText())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid block type");
            sanitizeHtml(block);
        }
        data.savePage(key, required(body, "pageTitle", 300), field(body, "metaDescription", 500), sanitized);
        return data.page(key);
    }

    private void sanitizeHtml(JsonNode node) {
        if (node.isObject()) {
            ObjectNode object = (ObjectNode)node;
            var fields = object.properties().iterator();
            while (fields.hasNext()) {
                var field = fields.next();
                if (field.getKey().equals("contentHtml") && field.getValue().isTextual())
                    object.put("contentHtml", Jsoup.clean(field.getValue().asText(), HTML));
                else if (Set.of("primaryCtaLink", "secondaryCtaLink", "buttonLink", "link", "thumbnailUrl", "imageUrl", "href", "src").contains(field.getKey()) && field.getValue().isTextual())
                    validatedUrl(field.getValue().asText(), true);
                else sanitizeHtml(field.getValue());
            }
        } else if (node.isArray()) node.forEach(this::sanitizeHtml);
    }

}

