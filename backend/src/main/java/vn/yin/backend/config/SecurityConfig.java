package vn.yin.backend.config;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.jdbc.core.JdbcTemplate;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.service.TokenRegistry;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationConverter jwtConverter) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(
                                "/swagger",
                                "/swagger/**",
                                "/swagger-ui.html",
                                "/swagger-ui",
                                "/swagger-ui/",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/swagger-resources",
                                "/swagger-resources/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/admin/session").hasAuthority("SCOPE_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/admin/roles", "/api/admin/roles/*").hasAuthority("PERM_roles:READ")
                        .requestMatchers(HttpMethod.POST, "/api/admin/roles").hasAuthority("PERM_roles:WRITE")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/roles/*").hasAuthority("PERM_roles:WRITE")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/roles/*/status").hasAuthority("PERM_roles:EXECUTE")
                        .requestMatchers(HttpMethod.GET, "/api/admin/accounts").hasAuthority("PERM_accounts:READ")
                        .requestMatchers(HttpMethod.POST, "/api/admin/accounts").hasAuthority("PERM_accounts:WRITE")
                        .requestMatchers(HttpMethod.POST, "/api/admin/accounts/*/reset-password").hasAuthority("PERM_accounts:EXECUTE")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/accounts/*/status", "/api/admin/accounts/*/role").hasAuthority("PERM_accounts:EXECUTE")
                        .requestMatchers(HttpMethod.GET, "/api/admin/me/profile").hasAuthority("PERM_profile:READ")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/me/profile").hasAuthority("PERM_profile:WRITE")
                        .requestMatchers(HttpMethod.GET, "/api/admin/clients").hasAuthority("PERM_clients:READ")
                        .requestMatchers(HttpMethod.GET, "/api/admin/contacts").hasAuthority("PERM_contacts:READ")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/contacts/*").hasAuthority("PERM_contacts:WRITE")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/pages/*").hasAuthority("PERM_pages:WRITE")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/articles/*").hasAuthority("PERM_articles:WRITE")
                        .requestMatchers(HttpMethod.POST, "/api/admin/articles").hasAuthority("PERM_articles:WRITE")
                        .requestMatchers(HttpMethod.POST, "/api/admin/articles/*/restore").hasAuthority("PERM_articles:EXECUTE")
                        .requestMatchers(HttpMethod.POST, "/api/admin/upload").hasAuthority("PERM_upload:WRITE")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/articles/*").hasAuthority("PERM_articles:DELETE")
                        .requestMatchers(HttpMethod.GET, "/api/admin/bootstrap").hasAuthority("PERM_dashboard:READ")
                        .requestMatchers(HttpMethod.GET, "/api/admin/analytics", "/api/admin/reading-sessions").hasAuthority("PERM_analytics:READ")
                        .requestMatchers(HttpMethod.GET, "/api/admin/articles", "/api/admin/articles/*").hasAuthority("PERM_articles:READ")
                        .requestMatchers(HttpMethod.GET, "/api/admin/support-requests").hasAuthority("PERM_support:READ")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/support-requests/*").hasAuthority("PERM_support:EXECUTE")
                        .requestMatchers("/api/client/**").hasAuthority("SCOPE_CLIENT")
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/client/login",
                                "/api/auth/admin/login", "/api/auth/login", "/api/contacts",
                                "/api/analytics/views", "/api/analytics/reading-sessions",
                                "/api/articles/*/view").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/pages", "/api/pages/*", "/api/articles",
                                "/api/articles/categories", "/api/articles/*", "/api/media/*").permitAll()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter)))
                .addFilterBefore(new DependencyFailureFilter(), BearerTokenAuthenticationFilter.class)
                .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter(AccountRepository accounts, TokenRegistry registry) {
        return converter(accounts, registry);
    }

    public JwtAuthenticationConverter jwtAuthenticationConverter(AccountRepository accounts) {
        return converter(accounts, null);
    }

    private JwtAuthenticationConverter converter(AccountRepository accounts, TokenRegistry registry) {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> account = accounts.activePrincipal(jwt.getSubject());
            String role = jwt.getClaimAsString("role");
            if (registry != null && (jwt.getId() == null || registry.isDenied(jwt.getId())))
                throw new InvalidBearerTokenException("SESSION_REAUTH_REQUIRED");
            String scope = "CLIENT".equals(role) ? "CLIENT" : "ADMIN";
            Number version = jwt.getClaim("tokenVersion");
            int tokenVersion = version == null ? 0 : version.intValue();
            if (account == null || !account.get("role").equals(role)
                    || !scope.equals(jwt.getClaimAsString("scope"))
                    || ((Number) account.get("token_version")).intValue() != tokenVersion)
                throw new InvalidBearerTokenException("Account unavailable");
            var authorities = new java.util.ArrayList<org.springframework.security.core.GrantedAuthority>();
            authorities.add(new SimpleGrantedAuthority("SCOPE_" + scope));
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            var permissions = accounts.permissionsForRole(role);
            if (permissions != null) for (String permission : permissions)
                authorities.add(new SimpleGrantedAuthority("PERM_" + permission));
            return authorities;
        });
        return converter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(JdbcTemplate jdbc) {
        return username -> jdbc.query("SELECT username, password_hash, role, is_active FROM users WHERE username = ?", rs -> {
            if (!rs.next()) throw new UsernameNotFoundException("Invalid credentials");
            return User.withUsername(rs.getString("username"))
                    .password(rs.getString("password_hash"))
                    .roles(rs.getString("role"))
                    .disabled(!rs.getBoolean("is_active"))
                    .build();
        }, username);
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    public SecretKeySpec jwtKey(@Value("${app.jwt.secret}") String secret) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKeySpec key) {
        var decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("yin-backend"));
        return decoder;
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKeySpec key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    TokenService tokenService(JwtEncoder encoder, TokenRegistry registry, @Value("${app.jwt.expiration-ms}") long expirationMs) {
        if (expirationMs < 60_000 || expirationMs > 604_800_000)
            throw new IllegalArgumentException("JWT_EXPIRATION_MS must be between 1 minute and 7 days");
        return new TokenService(encoder, expirationMs, registry);
    }

    public record TokenService(JwtEncoder encoder, long expirationMs, TokenRegistry registry) {
        public TokenService(JwtEncoder encoder, long expirationMs) { this(encoder, expirationMs, null); }
        public String issue(String userId, String username, String role) {
            return issue(userId, username, role, 0);
        }

        public String issue(String userId, String username, String role, int tokenVersion) {
            var now = Instant.now();
            String scope = "CLIENT".equals(role) ? "CLIENT" : "ADMIN";
            String jti = UUID.randomUUID().toString();
            Instant expiry = now.plusMillis(expirationMs);
            var claims = JwtClaimsSet.builder().issuer("yin-backend").subject(userId)
                    .issuedAt(now).expiresAt(expiry)
                    .id(jti).claim("username", username)
                    .claim("role", role).claim("scope", scope).claim("tokenVersion", tokenVersion).build();
            String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
            if (registry != null) registry.register(userId, jti, expiry);
            return token;
        }
    }
}
