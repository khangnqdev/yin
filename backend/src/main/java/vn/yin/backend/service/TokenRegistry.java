package vn.yin.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class TokenRegistry {
    private final StringRedisTemplate redis;

    public TokenRegistry(StringRedisTemplate redis) { this.redis = redis; }

    private String activeKey(String userId) { return "yin:jwt:active:" + userId; }
    private String deniedKey(String jti) { return "yin:jwt:denied:" + jti; }

    public void register(String userId, String jti, Instant expiresAt) {
        var key = activeKey(userId);
        redis.opsForZSet().add(key, jti, expiresAt.toEpochMilli());
        redis.expire(key, Duration.ofDays(7).plusMinutes(1));
    }

    public boolean isDenied(String jti) {
        return Boolean.TRUE.equals(redis.hasKey(deniedKey(jti)));
    }

    public void revokeUser(String userId) {
        var key = activeKey(userId);
        long now = Instant.now().toEpochMilli();
        Set<String> active = redis.opsForZSet().rangeByScore(key, now, Double.POSITIVE_INFINITY);
        if (active != null) {
            for (String jti : active) {
                Double expiry = redis.opsForZSet().score(key, jti);
                if (expiry != null && expiry.longValue() > now) {
                    redis.opsForValue().set(deniedKey(jti), "1", Duration.ofMillis(expiry.longValue() - now));
                }
            }
        }
        redis.delete(key);
    }
}
