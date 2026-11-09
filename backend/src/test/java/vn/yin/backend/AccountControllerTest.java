package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.config.SecurityConfig;
import vn.yin.backend.controller.AccountController;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.repository.SupportRepository;

class AccountControllerTest {
    private AccountRepository accounts;
    private SupportRepository support;
    private AccountController api;
    private MockHttpServletRequest request;
    private SecurityConfig security;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        when(accounts.roleRank("ADMIN")).thenReturn(300);
        when(accounts.roleRank("MANAGER")).thenReturn(200);
        when(accounts.roleRank("FIXER")).thenReturn(100);
        when(accounts.isAdminRole("ADMIN")).thenReturn(true);
        when(accounts.isAdminRole("MANAGER")).thenReturn(true);
        when(accounts.isAdminRole("FIXER")).thenReturn(true);
        support = mock(SupportRepository.class);
        security = new SecurityConfig();
        var key = new SecretKeySpec("0123456789abcdef0123456789abcdef".getBytes(), "HmacSHA256");
        AuthenticationManager auth = input -> new UsernamePasswordAuthenticationToken(input.getPrincipal(), input.getCredentials());
        api = new AccountController(accounts, support, auth,
                new SecurityConfig.TokenService(security.jwtEncoder(key), 60_000),
                new BCryptPasswordEncoder(), new AbuseProtection(() -> 1_000_000L));
        request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
    }

    @Test
    void registrationRejectsRoleInjectionWrongTypesAndInvalidDetails() {
        var body = registration();
        body.put("role", "ADMIN");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.register(body, request));
        body.remove("role");
        body.put("receiveUpdates", "true");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.register(body, request));
        body.put("receiveUpdates", true);
        body.put("dateOfBirth", "2035-02-01");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.register(body, request));
        body.put("dateOfBirth", "1899-12-31");
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.register(body, request));
        body.put("dateOfBirth", "2000-01-01");
        body.put("password", "very-long-🔐-password-".repeat(5));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.register(body, request));
        verify(accounts, never()).createClient(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void registrationNormalizesIdentityAndHashesPassword() {
        var body = registration();
        body.put("email", "CLIENT@EXAMPLE.COM");
        body.put("username", "Client_01");
        api.register(body, request);
        verify(accounts).createClient(eq("client_01"), argThat(hash -> new BCryptPasswordEncoder().matches("a-long-private-password", hash)),
                eq("client@example.com"), eq("+84 901 234 567"), eq("2000-01-01"), eq(true));
    }

    @Test
    void clientCannotSignInThroughAdminPortal() {
        when(accounts.byUsername("client_01")).thenReturn(Map.of("id", "client-id", "username", "client_01", "role", "CLIENT", "is_active", true));
        var body = Map.<String, Object>of("username", "client_01", "password", "correct-password");
        assertStatus(HttpStatus.UNAUTHORIZED, () -> api.adminLogin(body, request));
        var result = api.clientLogin(body, request);
        var key = new SecretKeySpec("0123456789abcdef0123456789abcdef".getBytes(), "HmacSHA256");
        assertEquals("CLIENT", security.jwtDecoder(key).decode(result.get("token").toString()).getClaimAsString("scope"));
    }

    @Test
    void allThreeAdminRolesReceiveAdminScopeButCannotUseClientLogin() {
        var key = new SecretKeySpec("0123456789abcdef0123456789abcdef".getBytes(), "HmacSHA256");
        for (String role : java.util.List.of("MANAGER", "ADMIN", "FIXER")) {
            String username = role.toLowerCase(java.util.Locale.ROOT);
            when(accounts.byUsername(username)).thenReturn(Map.of("id", username + "-id", "username", username,
                    "role", role, "is_active", true));
            var body = Map.<String, Object>of("username", username, "password", "correct-password");
            var result = api.adminLogin(body, request);
            var jwt = security.jwtDecoder(key).decode(result.get("token").toString());
            assertEquals("ADMIN", jwt.getClaimAsString("scope"));
            assertEquals(role, jwt.getClaimAsString("role"));
            assertStatus(HttpStatus.UNAUTHORIZED, () -> api.clientLogin(body, request));
        }
    }

    @Test
    void loginThrottlesRepeatedWrongPasswords() {
        var failing = new AccountController(accounts, support, input -> { throw new BadCredentialsException("bad"); },
                new SecurityConfig.TokenService(mock(org.springframework.security.oauth2.jwt.JwtEncoder.class), 60_000),
                new BCryptPasswordEncoder(), new AbuseProtection(() -> 1_000_000L));
        var body = Map.<String, Object>of("username", "admin", "password", "wrong-password");
        for (int i = 0; i < 5; i++) assertStatus(HttpStatus.UNAUTHORIZED, () -> failing.adminLogin(body, request));
        assertStatus(HttpStatus.TOO_MANY_REQUESTS, () -> failing.adminLogin(body, request));
    }

    @Test
    void loginReportsDependencyFailureInsteadOfInvalidCredentials() {
        var unavailable = new AccountController(accounts, support,
                input -> { throw new AuthenticationServiceException("database unavailable"); },
                new SecurityConfig.TokenService(mock(org.springframework.security.oauth2.jwt.JwtEncoder.class), 60_000),
                new BCryptPasswordEncoder(), new AbuseProtection(() -> 1_000_000L));
        assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> unavailable.adminLogin(
                Map.of("username", "admin", "password", "correct-password"), request));
    }

    @Test
    void supportRequiresActiveClientAndRejectsUnknownStatus() {
        Jwt client = Jwt.withTokenValue("test").header("alg", "none").subject("client-id").claim("scope", "CLIENT").build();
        when(accounts.client("client-id")).thenReturn(null);
        assertStatus(HttpStatus.UNAUTHORIZED, () -> api.createSupport(client, Map.of("subject", "Help", "message", "Please help with this issue")));
        verify(support, never()).create(any(), any(), any());
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.supportRequests("HACKED", 0, 20));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createAdmin(adminJwt(), Map.of("username", "fixer1", "role", "CLIENT")));
    }

    @Test
    void clientSupportListIsScopedAndPaginated() {
        Jwt client = Jwt.withTokenValue("test").header("alg", "none").subject("client-id").claim("scope", "CLIENT").build();
        when(accounts.client("client-id")).thenReturn(Map.of("id", "client-id"));
        api.mySupport(client, 0, 20);
        verify(support).mine("client-id", 0, 20);
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.mySupport(client, -1, 20));
        verify(support, times(1)).mine(any(), anyInt(), anyInt());
    }

    @Test
    void cannotManageEqualRoleAndCanResetLowerRolePassword() {
        var admin = Map.<String, Object>of("id", "admin-id", "username", "admin", "role", "ADMIN",
                "isActive", true, "createdAt", "2026-01-01T00:00:00Z");
        when(accounts.admin("admin-id")).thenReturn(admin);
        when(accounts.activePrincipal("actor-id")).thenReturn(Map.of("role", "ADMIN"));
        assertStatus(HttpStatus.FORBIDDEN,
                () -> api.updateAdminStatus(adminJwt(), "admin-id", Map.of("isActive", false)));
        verify(accounts, never()).updateAdminStatus(any(), anyBoolean());

        when(accounts.admin("manager-id")).thenReturn(Map.of("id", "manager-id", "role", "MANAGER"));
        when(accounts.resetAdminPassword(eq("manager-id"), any())).thenReturn(true);
        api.resetAdminPassword(adminJwt(), "manager-id", Map.of("password", "a-new-private-password"));
        verify(accounts).resetAdminPassword(eq("manager-id"),
                argThat(hash -> new BCryptPasswordEncoder().matches("a-new-private-password", hash)));
    }

    @Test
    void generatedPasswordAndRoleHierarchy() {
        when(accounts.activePrincipal("actor-id")).thenReturn(Map.of("role", "ADMIN"));
        assertStatus(HttpStatus.FORBIDDEN, () -> api.createAdmin(adminJwt(), Map.of("username", "peer", "role", "ADMIN")));
        when(accounts.createAdmin(eq("fixer"), any(), eq("FIXER"))).thenReturn(Map.of("id", "fixer-id"));
        when(accounts.admin("fixer-id")).thenReturn(Map.of("id", "fixer-id", "username", "fixer", "role", "FIXER"));
        var result = api.createAdmin(adminJwt(), Map.of("username", "fixer", "role", "FIXER"));
        String generated = String.valueOf(result.get("generatedPassword"));
        assertTrue(generated.length() >= 32);
        verify(accounts).createAdmin(eq("fixer"), argThat(hash -> new BCryptPasswordEncoder().matches(generated, hash)), eq("FIXER"));
        assertStatus(HttpStatus.BAD_REQUEST, () -> api.createAdmin(adminJwt(), Map.of("username", "other", "role", "FIXER", "password", "manual-password")));
        when(accounts.activePrincipal("actor-id")).thenReturn(Map.of("role", "MANAGER"));
        assertStatus(HttpStatus.FORBIDDEN, () -> api.createAdmin(adminJwt(), Map.of("username", "peer", "role", "MANAGER")));
        verify(accounts, never()).createAdmin(eq("peer"), any(), any());
    }

    private Jwt adminJwt() {
        return Jwt.withTokenValue("test").header("alg", "none").subject("actor-id").build();
    }

    private Map<String, Object> registration() {
        var body = new HashMap<String, Object>();
        body.put("email", "client@example.com"); body.put("username", "client_01");
        body.put("password", "a-long-private-password"); body.put("phone", "+84 901 234 567");
        body.put("dateOfBirth", "2000-01-01"); body.put("receiveUpdates", true);
        return body;
    }

    private void assertStatus(HttpStatus expected, Runnable action) {
        assertEquals(expected, assertThrows(ResponseStatusException.class, action::run).getStatusCode());
    }
}
