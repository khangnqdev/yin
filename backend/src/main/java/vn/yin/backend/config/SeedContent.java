package vn.yin.backend.config;

import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import vn.yin.backend.repository.SiteRepository;

@Configuration
public class SeedContent {
    @Bean
    @ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
    ApplicationRunner seedPagesAndArticles(SiteRepository repository, ObjectMapper json) {
        return args -> {
            try (var input = new ClassPathResource("seed.json").getInputStream()) {
                var seed = json.readTree(input);
                if (repository.articleCount() == 0) {
                    for (var node : seed.path("articles")) {
                        Map<String, Object> article = json.convertValue(node, new TypeReference<>() {});
                        repository.insertArticle(article);
                    }
                }
                var pages = seed.path("pages");
                for (var item = pages.fields(); item.hasNext();) {
                    var entry = item.next();
                    if (repository.page(entry.getKey()) == null) {
                        var page = entry.getValue();
                        repository.savePage(entry.getKey(), page.path("pageTitle").asText(),
                                page.path("metaDescription").asText(), page.path("blocks"));
                    }
                }
            }
        };
    }
}

