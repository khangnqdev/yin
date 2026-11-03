package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import vn.yin.backend.common.AbuseProtection;

class AbuseProtectionTest {
    @Test
    void blocksPasswordGuessingByAccountThenExpiresTheWindow() {
        var time = new AtomicLong(1_000_000L);
        var protection = new AbuseProtection(time::get);
        for (int i = 0; i < 5; i++) protection.loginFailed("Admin");
        assertTrue(protection.loginAccountBlocked("admin"));
        time.addAndGet(15 * 60_000L);
        assertFalse(protection.loginAccountBlocked("ADMIN"));
    }

    @Test
    void successfulLoginClearsFailureCountAndIpHasSeparateLimit() {
        var protection = new AbuseProtection(() -> 1_000_000L);
        for (int i = 0; i < 5; i++) protection.loginFailed("admin");
        protection.loginSucceeded("admin");
        assertFalse(protection.loginAccountBlocked("admin"));
        for (int i = 0; i < 20; i++) assertTrue(protection.allowLoginIp("10.0.0.1"));
        assertFalse(protection.allowLoginIp("10.0.0.1"));
        assertTrue(protection.allowLoginIp("10.0.0.2"));
    }

    @Test
    void limitsPublicWritesAndReopensAfterWindow() {
        var time = new AtomicLong(1_000_000L);
        var protection = new AbuseProtection(time::get);
        for (int i = 0; i < 3; i++) assertTrue(protection.allowContact("127.0.0.1"));
        assertFalse(protection.allowContact("127.0.0.1"));
        for (int i = 0; i < 120; i++) assertTrue(protection.allowTelemetry("127.0.0.1"));
        assertFalse(protection.allowTelemetry("127.0.0.1"));
        time.addAndGet(60_000L);
        assertTrue(protection.allowContact("127.0.0.1"));
        assertTrue(protection.allowTelemetry("127.0.0.1"));
    }
}
