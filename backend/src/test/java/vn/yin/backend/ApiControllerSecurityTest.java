package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.controller.ApiController;
import vn.yin.backend.repository.SiteRepository;
import vn.yin.backend.service.ContactService;
import vn.yin.backend.service.SiteService;

class ApiControllerSecurityTest {
    private SiteRepository repository;
    private ApiController api;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        repository = mock(SiteRepository.class);
        api = new ApiController(new SiteService(repository, new ObjectMapper(),
                new AbuseProtection(() -> 1_000_000L), mock(ContactService.class)));
        request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("editor", "", java.util.List.of(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("PERM_articles:EXECUTE"))));
    }

    @AfterEach void clearSecurity() { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }

    @Test
    void rejectsArbitraryAnalyticsPathsAndSessions() {
        var body = new HashMap<String, Object>();
        body.put("sessionId", "valid-session-123");
        body.put("path", "http://evil.example/");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.pageView(body, request));
        body.put("path", "/blog");
        body.put("sessionId", "bad session");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.pageView(body, request));
        verify(repository, never()).insertPageView(any(), any(), any());
    }

    @Test
    void rejectsNumericStringsInsteadOfNumbers() {
        var body = new HashMap<String, Object>();
        body.put("sessionId", "valid-session-123"); body.put("targetId", "art_1");
        body.put("targetTitle", "Article"); body.put("maxScrollDepth", "50");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.readingSession(body, request));
        verify(repository, never()).upsertReadingSession(any());
    }

    @Test
    void recordsViewsOnlyForPublishedExistingArticles() {
        when(repository.incrementArticleViews("published-article")).thenReturn(true);
        api.articleView("published-article", request);
        verify(repository).incrementArticleViews("published-article");

        assertStatus(HttpStatus.NOT_FOUND, () -> api.articleView("missing-article", request));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.articleView("bad-slug!", request));
        verify(repository, never()).incrementArticleViews("bad-slug!");
    }

    @Test
    void articleLifecycleRejectsBackwardTransitionsAndKeepsPublicationDate() {
        var current = new HashMap<String, Object>();
        current.put("id", "article-id");
        current.put("status", "PUBLISHED");
        current.put("publishedAt", "2025-01-01T00:00:00Z");
        current.put("viewCount", 12L);
        current.put("authorName", "Editor");
        when(repository.articleById("article-id")).thenReturn(current);

        var body = article();
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.updateArticle("article-id", body));
        verify(repository, never()).updateArticle(any());

        body.put("status", "ARCHIVED");
        api.updateArticle("article-id", body);
        ArgumentCaptor<Map<String, Object>> saved = ArgumentCaptor.forClass(Map.class);
        verify(repository).updateArticle(saved.capture());
        assertEquals("2025-01-01T00:00:00Z", saved.getValue().get("publishedAt"));
        assertEquals("ARCHIVED", saved.getValue().get("status"));
    }

    @Test
    void aNewArticleCannotStartArchived() {
        var body = article();
        body.put("status", "ARCHIVED");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(body));
        verify(repository, never()).insertArticle(any());
    }

    @Test
    void rejectsInvalidOrFuturePublicationDates() {
        var body = article();
        body.put("status", "PUBLISHED");
        body.put("publishedAt", "not-a-date");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(body));
        body.put("publishedAt", "2999-01-01T00:00:00Z");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(body));
        verify(repository, never()).insertArticle(any());
    }

    @Test
    void acceptsAnArticleLongerThanFiveThousandWords() throws Exception {
        String prose = "noi dung ".repeat(6_000).trim();
        var body = article();
        body.put("contentHtml", "<p>" + prose + "</p>");
        body.put("contentJson", new ObjectMapper().writeValueAsString(Map.of(
                "type", "doc", "content", java.util.List.of(Map.of("type", "paragraph",
                        "content", java.util.List.of(Map.of("type", "text", "text", prose)))))));
        body.put("wordCount", 6_000);
        api.createArticle(body);
        ArgumentCaptor<Map<String, Object>> saved = ArgumentCaptor.forClass(Map.class);
        verify(repository).insertArticle(saved.capture());
        assertEquals(6_000, saved.getValue().get("wordCount"));
        assertTrue(saved.getValue().get("contentHtml").toString().contains(prose));
    }

    @Test
    void deletionCanBeRestoredButAnAlreadyMissingArticleCannot() {
        when(repository.deleteArticle("article-id")).thenReturn(true);
        api.deleteArticle("article-id");
        when(repository.restoreArticle("article-id")).thenReturn(true);
        api.restoreArticle("article-id");
        assertStatus(HttpStatus.NOT_FOUND, () -> api.restoreArticle("missing-id"));
    }

    @Test
    void rejectsScriptUrlsAndRemovesScriptHtml() {
        var article = article();
        article.put("slug", "bad';drop-table");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(article));
        article.put("slug", "safe-article");
        article.put("thumbnailUrl", "javascript:alert(1)");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(article));
        article.put("thumbnailUrl", "data:image/png;base64,AAAA");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(article));
        article.put("thumbnailUrl", "https://example.com/" + "a".repeat(1000));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createArticle(article));
        article.put("thumbnailUrl", "https://example.com/image.png");
        article.put("contentHtml", "<script>alert(1)</script><img src=x onerror=alert(1)>"
                + "<img src='/api/media/11111111-2222-3333-4444-555555555555.png'><p>Safe</p>");
        api.createArticle(article);
        ArgumentCaptor<Map<String, Object>> saved = ArgumentCaptor.forClass(Map.class);
        verify(repository).insertArticle(saved.capture());
        assertFalse(saved.getValue().get("contentHtml").toString().contains("<script>"));
        assertFalse(saved.getValue().get("contentHtml").toString().contains("onerror"));
        assertTrue(saved.getValue().get("contentHtml").toString().contains("<p>Safe</p>"));
        assertTrue(saved.getValue().get("contentHtml").toString().contains("/api/media/11111111-2222-3333-4444-555555555555.png"));
    }

    @Test
    void rejectsUnsafeCmsLinks() {
        var page = Map.<String, Object>of("pageTitle", "Home", "blocks", java.util.List.of(
                Map.of("type", "cta", "buttonLink", "javascript:alert(1)")));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.savePage("home", page));
        verify(repository, never()).savePage(any(), any(), any(), any());
    }

    @Test
    void listEndpointsRejectInvalidPaginationBeforeQuerying() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.pages(-1, 20));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.articles("", "", "", 101));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.adminArticles("INVALID", "", "", "", 20));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.readingSessions("bad-cursor", 20));
        verify(repository, never()).pages(anyInt(), anyInt());
        verify(repository, never()).articles(anyBoolean(), any(), any(), any(), any(), anyInt());
    }

    private Map<String, Object> article() {
        var result = new HashMap<String, Object>();
        result.put("title", "Safe article"); result.put("slug", "safe-article");
        result.put("status", "DRAFT"); result.put("contentJson", "{\"type\":\"doc\",\"content\":[]}");
        return result;
    }

    private void assertStatus(HttpStatus expected, Runnable action) {
        assertEquals(expected, assertThrows(ResponseStatusException.class, action::run).getStatusCode());
    }
}
