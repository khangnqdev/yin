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
import org.springframework.jdbc.core.JdbcTemplate;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import vn.yin.backend.repository.AccountRepository;

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
                        .requestMatchers(HttpMethod.GET, "/api/admin/accounts").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.POST, "/api/admin/accounts", "/api/admin/accounts/*/reset-password")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/accounts/*/status", "/api/admin/accounts/*/role")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/admin/me/profile")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_FIXER")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/me/profile")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_FIXER")
                        .requestMatchers(HttpMethod.GET, "/api/admin/clients", "/api/admin/contacts")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/contacts/*", "/api/admin/pages/*",
                                "/api/admin/articles/*").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.POST, "/api/admin/articles", "/api/admin/articles/*/restore")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.POST, "/api/admin/upload")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/articles/*")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER")
                        .requestMatchers(HttpMethod.GET, "/api/admin/bootstrap", "/api/admin/analytics",
                                "/api/admin/reading-sessions", "/api/admin/articles", "/api/admin/articles/*",
                                "/api/admin/support-requests").hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_FIXER")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/support-requests/*")
                            .hasAnyAuthority("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_FIXER")
                        .requestMatchers("/api/client/**").hasAuthority("SCOPE_CLIENT")
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/client/login",
                                "/api/auth/admin/login", "/api/auth/login", "/api/contacts",
                                "/api/analytics/views", "/api/analytics/reading-sessions",
                                "/api/articles/*/view").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/pages", "/api/pages/*", "/api/articles",
                                "/api/articles/categories", "/api/articles/*", "/api/media/*").permitAll()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter)))
                .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter(AccountRepository accounts) {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> account = accounts.activePrincipal(jwt.getSubject());
            String role = jwt.getClaimAsString("role");
            String scope = "CLIENT".equals(role) ? "CLIENT" : "ADMIN";
            Number version = jwt.getClaim("tokenVersion");
            int tokenVersion = version == null ? 0 : version.intValue();
            if (account == null || !account.get("role").equals(role)
                    || !scope.equals(jwt.getClaimAsString("scope"))
                    || ((Number) account.get("token_version")).intValue() != tokenVersion)
                throw new InvalidBearerTokenException("Account unavailable");
            return java.util.List.of(new SimpleGrantedAuthority("SCOPE_" + scope),
                    new SimpleGrantedAuthority("ROLE_" + role));
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
    TokenService tokenService(JwtEncoder encoder, @Value("${app.jwt.expiration-ms}") long expirationMs) {
        if (expirationMs < 60_000 || expirationMs > 3_600_000)
            throw new IllegalArgumentException("JWT_EXPIRATION_MS must be between 1 and 60 minutes");
        return new TokenService(encoder, expirationMs);
    }

    public record TokenService(JwtEncoder encoder, long expirationMs) {
        public String issue(String userId, String username, String role) {
            return issue(userId, username, role, 0);
        }

        public String issue(String userId, String username, String role, int tokenVersion) {
            var now = Instant.now();
            String scope = "CLIENT".equals(role) ? "CLIENT" : "ADMIN";
            var claims = JwtClaimsSet.builder().issuer("yin-backend").subject(userId)
                    .issuedAt(now).expiresAt(now.plusMillis(expirationMs))
                    .id(UUID.randomUUID().toString()).claim("username", username)
                    .claim("role", role).claim("scope", scope).claim("tokenVersion", tokenVersion).build();
            return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        }
    }
}
