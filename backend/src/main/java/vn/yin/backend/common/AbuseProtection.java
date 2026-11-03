package vn.yin.backend.common;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.stereotype.Component;

@Component
public class AbuseProtection {
    private static final long MINUTE = 60_000L;
    private static final long LOGIN_WINDOW = 15 * MINUTE;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier now;

    public AbuseProtection() { this(System::currentTimeMillis); }
    public AbuseProtection(LongSupplier now) { this.now = now; }

    private static final class Bucket {
        final Deque<Long> timestamps = new ArrayDeque<>();
        long lastTouched;

        void prune(long current, long window) {
            while (!timestamps.isEmpty() && current - timestamps.peekFirst() >= window) timestamps.removeFirst();
            lastTouched = current;
        }
    }

    private Bucket bucket(String key) {
        if (buckets.size() > 10_000) {
            long current = now.getAsLong();
            buckets.entrySet().removeIf(entry -> current - entry.getValue().lastTouched > 30 * MINUTE);
        }
        return buckets.computeIfAbsent(key, ignored -> new Bucket());
    }

    private boolean acquire(String key, int limit, long window) {
        Bucket bucket = bucket(key);
        synchronized (bucket) {
            long current = now.getAsLong();
            bucket.prune(current, window);
            if (bucket.timestamps.size() >= limit) return false;
            bucket.timestamps.addLast(current);
            return true;
        }
    }

    private String userKey(String username) { return "login:user:" + username.toLowerCase(Locale.ROOT); }
    public Object loginLock(String username) { return bucket(userKey(username)); }
    public boolean allowLoginIp(String ip) { return acquire("login:ip:" + ip, 20, LOGIN_WINDOW); }
    public boolean loginAccountBlocked(String username) {
        Bucket bucket = bucket(userKey(username));
        synchronized (bucket) {
            bucket.prune(now.getAsLong(), LOGIN_WINDOW);
            return bucket.timestamps.size() >= 5;
        }
    }
    public void loginFailed(String username) {
        Bucket bucket = bucket(userKey(username));
        synchronized (bucket) {
            long current = now.getAsLong();
            bucket.prune(current, LOGIN_WINDOW);
            bucket.timestamps.addLast(current);
        }
    }
    public void loginSucceeded(String username) {
        Bucket bucket = bucket(userKey(username));
        synchronized (bucket) { bucket.timestamps.clear(); }
    }
    public boolean allowRegistration(String ip) { return acquire("reg:ip:" + ip, 5, 60 * MINUTE); }
    public boolean allowSupport(String userId) { return acquire("sup:user:" + userId, 3, 60 * MINUTE); }
    public boolean allowContact(String ip) { return acquire("contact:ip:" + ip, 3, MINUTE); }
    public boolean allowTelemetry(String ip) { return acquire("telemetry:ip:" + ip, 120, MINUTE); }
    public boolean allowArticleView(String ip) { return acquire("view:ip:" + ip, 30, MINUTE); }
}
