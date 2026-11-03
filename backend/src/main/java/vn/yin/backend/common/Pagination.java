package vn.yin.backend.common;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Pagination {
    private Pagination() { }

    public record Cursor(Instant time, String id) { }

    public static int size(int size) {
        if (size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid size");
        return size;
    }

    public static int page(int page, int size) {
        if (page < 0 || (long) page * size > Integer.MAX_VALUE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page");
        return page;
    }

    public static Cursor cursor(String token) {
        if (token == null || token.isBlank()) return null;
        if (token.length() > 256) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|", -1);
            if (parts.length != 2 || !parts[1].matches("[A-Za-z0-9_-]{1,64}")) throw new IllegalArgumentException();
            return new Cursor(Instant.parse(parts[0]), parts[1]);
        } catch (IllegalArgumentException | DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid cursor");
        }
    }

    public static String encode(Instant time, String id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                (time.toString() + "|" + id).getBytes(StandardCharsets.UTF_8));
    }

    public static <T> Map<String, Object> slice(List<T> fetched, int size, String nextCursor) {
        boolean hasMore = fetched.size() > size;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", fetched.subList(0, Math.min(size, fetched.size())));
        result.put("size", size);
        result.put("hasMore", hasMore);
        result.put("nextCursor", hasMore ? nextCursor : null);
        return result;
    }
}
