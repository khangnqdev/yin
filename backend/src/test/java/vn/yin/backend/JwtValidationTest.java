package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import vn.yin.backend.config.SecurityConfig;
import vn.yin.backend.repository.AccountRepository;
import static org.mockito.Mockito.*;
import java.util.Map;

class JwtValidationTest {
    @Test
    void acceptsOwnTokenAndRejectsWrongIssuerOrExpiredToken() {
        var security = new SecurityConfig();
        var key = new SecretKeySpec("0123456789abcdef0123456789abcdef".getBytes(), "HmacSHA256");
        var encoder = security.jwtEncoder(key);
        var decoder = security.jwtDecoder(key);
        var token = new SecurityConfig.TokenService(encoder, 60_000).issue("account-id", "admin", "ADMIN");
        assertEquals("account-id", decoder.decode(token).getSubject());
        assertEquals("ADMIN", decoder.decode(token).getClaimAsString("scope"));
        var clientToken = new SecurityConfig.TokenService(encoder, 60_000).issue("client-id", "client", "CLIENT");
        assertEquals("CLIENT", decoder.decode(clientToken).getClaimAsString("scope"));

        var now = Instant.now();
        var wrongIssuer = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder().issuer("attacker").subject("admin").issuedAt(now)
                        .expiresAt(now.plusSeconds(300)).claim("scope", "ADMIN").build())).getTokenValue();
        assertThrows(JwtException.class, () -> decoder.decode(wrongIssuer));

        var expired = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder().issuer("yin-backend").subject("admin").issuedAt(now.minusSeconds(7200))
                        .expiresAt(now.minusSeconds(3600)).claim("scope", "ADMIN").build())).getTokenValue();
        assertThrows(JwtException.class, () -> decoder.decode(expired));
    }

    @Test
    void roleAndTokenVersionMustStillMatchActiveAccount() {
        var security = new SecurityConfig();
        var accounts = mock(AccountRepository.class);
        var converter = security.jwtAuthenticationConverter(accounts);
        var token = org.springframework.security.oauth2.jwt.Jwt.withTokenValue("test")
                .header("alg", "HS256").subject("account-id")
                .claim("role", "MANAGER").claim("scope", "ADMIN").claim("tokenVersion", 2).build();
        when(accounts.activePrincipal("account-id")).thenReturn(Map.of("role", "MANAGER", "token_version", 2));
        assertTrue(converter.convert(token).getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_MANAGER")));
        when(accounts.activePrincipal("account-id")).thenReturn(Map.of("role", "FIXER", "token_version", 3));
        assertThrows(InvalidBearerTokenException.class, () -> converter.convert(token));
        when(accounts.activePrincipal("account-id")).thenReturn(null);
        assertThrows(InvalidBearerTokenException.class, () -> converter.convert(token));
    }
}
