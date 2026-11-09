package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.RedisConnectionFailureException;
import vn.yin.backend.service.TokenRegistry;

class TokenRegistryTest {
    @Test
    void revokedJtiIsBlacklistedUntilItsOwnExpiry() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked") ZSetOperations<String, String> zset = mock(ZSetOperations.class);
        @SuppressWarnings("unchecked") ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForZSet()).thenReturn(zset);
        when(redis.opsForValue()).thenReturn(values);
        when(zset.rangeByScore(eq("yin:jwt:active:user-1"), anyDouble(), eq(Double.POSITIVE_INFINITY)))
                .thenReturn(Set.of("jti-1"));
        when(zset.score("yin:jwt:active:user-1", "jti-1"))
                .thenReturn((double) Instant.now().plusSeconds(60).toEpochMilli());

        var registry = new TokenRegistry(redis);
        registry.register("user-1", "jti-1", Instant.now().plusSeconds(60));
        registry.revokeUser("user-1");
        verify(values).set(eq("yin:jwt:denied:jti-1"), eq("1"), argThat((Duration ttl) -> !ttl.isNegative() && ttl.toSeconds() <= 60));
        verify(redis).delete("yin:jwt:active:user-1");
        when(redis.hasKey("yin:jwt:denied:jti-1")).thenReturn(true);
        assertTrue(registry.isDenied("jti-1"));
    }

    @Test
    void redisOutageCannotBeTreatedAsAnAllowedToken() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.hasKey("yin:jwt:denied:jti-1"))
                .thenThrow(new RedisConnectionFailureException("offline"));
        assertThrows(RedisConnectionFailureException.class,
                () -> new TokenRegistry(redis).isDenied("jti-1"));
    }
}
