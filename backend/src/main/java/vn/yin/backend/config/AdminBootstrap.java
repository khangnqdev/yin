package vn.yin.backend.config;

import java.util.UUID;
import java.util.Locale;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {
    @Bean
    ApplicationRunner createAdmin(JdbcTemplate jdbc, PasswordEncoder encoder,
            @Value("${app.admin.username}") String username,
            @Value("${app.admin.password}") String password) {
        return args -> {
            Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role='ADMIN' AND is_active=true", Integer.class);
            if (count != null && count > 0) return;
            String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
            if (!normalizedUsername.matches("[a-z0-9_.-]{3,50}") || password.length() < 12
                    || password.getBytes(StandardCharsets.UTF_8).length > 72
                    || !password.equals(password.trim())) {
                throw new IllegalStateException("Set a valid ADMIN_USERNAME and ADMIN_PASSWORD (12-72 UTF-8 bytes) before first start");
            }
            Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username=?", Integer.class, normalizedUsername);
            if (existing != null && existing > 0)
                throw new IllegalStateException("No active ADMIN exists and ADMIN_USERNAME is already in use");
            jdbc.update("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, 'ADMIN')",
                    UUID.randomUUID().toString(), normalizedUsername, encoder.encode(password));
        };
    }
}

