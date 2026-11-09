package vn.yin.backend;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.yin.backend.config.SecurityConfig;
import vn.yin.backend.controller.ApiController;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.service.SiteService;
import vn.yin.backend.service.TokenRegistry;

@WebMvcTest(controllers = ApiController.class, properties = {
        "app.jwt.secret=0123456789abcdef0123456789abcdef",
        "app.jwt.expiration-ms=60000",
        "app.cors.allowed-origins=http://localhost:4200" })
@Import(SecurityConfig.class)
class AdminAuthorizationTest {
    @Autowired MockMvc mvc;
    @MockitoBean SiteService site;
    @MockitoBean AccountRepository accounts;
    @MockitoBean JdbcTemplate jdbc;
    @MockitoBean TokenRegistry tokenRegistry;

    @Test
    void fixerCanReadButCannotWriteCmsOrManageAccounts() throws Exception {
        mvc.perform(get("/api/admin/articles").with(jwt().authorities(new SimpleGrantedAuthority("PERM_articles:READ"))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/admin/articles").with(jwt().authorities(new SimpleGrantedAuthority("PERM_articles:READ")))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/accounts").with(jwt().authorities(new SimpleGrantedAuthority("PERM_articles:READ"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCanWriteCmsAndReachAccountManagement() throws Exception {
        mvc.perform(post("/api/admin/articles").with(jwt().authorities(new SimpleGrantedAuthority("PERM_articles:WRITE")))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/accounts").with(jwt().authorities(new SimpleGrantedAuthority("PERM_accounts:READ"))))
                .andExpect(status().isNotFound());
    }
}
