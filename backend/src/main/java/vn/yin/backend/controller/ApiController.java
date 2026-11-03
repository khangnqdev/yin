package vn.yin.backend.controller;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.yin.backend.service.SiteService;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final SiteService siteService;

    public ApiController(SiteService siteService) {
        this.siteService = siteService;
    }

    @GetMapping("/pages")
    public Map<String, Object> pages(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return siteService.pages(page, size);
    }

    @GetMapping("/pages/{key}")
    public Map<String, Object> page(@PathVariable String key) { return siteService.page(key); }

    @GetMapping("/articles")
    public Map<String, Object> articles(@RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String category, @RequestParam(defaultValue = "") String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return siteService.articles(false, "", category, search, cursor, size);
    }

    @GetMapping("/articles/categories")
    public Map<String, Object> articleCategories(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) { return siteService.articleCategories(page, size); }

    @GetMapping("/admin/articles")
    public Map<String, Object> adminArticles(@RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String category, @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return siteService.articles(true, status, category, search, cursor, size);
    }

    @GetMapping("/articles/{slug}")
    public Map<String, Object> article(@PathVariable String slug) {
        return siteService.article(slug);
    }

    @GetMapping("/admin/articles/{id}")
    public Map<String, Object> adminArticle(@PathVariable String id) { return siteService.adminArticle(id); }

    @GetMapping("/admin/articles/trash")
    public Map<String, Object> trashedArticles(@RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return siteService.trashedArticles(search, cursor, size);
    }

    @PostMapping("/articles/{slug}/view")
    public void articleView(@PathVariable String slug, HttpServletRequest request) {
        siteService.articleView(slug, request.getRemoteAddr());
    }

    @PostMapping("/analytics/views")
    public void pageView(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        siteService.pageView(body, request.getRemoteAddr());
    }

    @PostMapping("/analytics/reading-sessions")
    public void readingSession(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        siteService.readingSession(body, request.getRemoteAddr());
    }

    @GetMapping("/admin/bootstrap")
    public Map<String, Object> adminBootstrap() {
        return siteService.adminBootstrap();
    }

    @GetMapping("/admin/analytics")
    public Map<String, Object> analytics() {
        return siteService.analytics();
    }

    @GetMapping("/admin/reading-sessions")
    public Map<String, Object> readingSessions(@RequestParam(defaultValue = "") String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return siteService.readingSessions(cursor, size);
    }

    @PostMapping("/admin/articles")
    public Map<String, Object> createArticle(@RequestBody Map<String, Object> body) {
        return siteService.createArticle(body);
    }

    @PutMapping("/admin/articles/{id}")
    public Map<String, Object> updateArticle(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return siteService.updateArticle(id, body);
    }

    @DeleteMapping("/admin/articles/{id}")
    public void deleteArticle(@PathVariable String id) {
        siteService.deleteArticle(id);
    }

    @PostMapping("/admin/articles/{id}/restore")
    public Map<String, Object> restoreArticle(@PathVariable String id) {
        return siteService.restoreArticle(id);
    }

    @PutMapping("/admin/pages/{key}")
    public Map<String, Object> savePage(@PathVariable String key, @RequestBody Map<String, Object> body) {
        return siteService.savePage(key, body);
    }

}

