package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.Pagination;

class PaginationTest {
    @Test
    void keysetCursorRoundTripsAndRejectsMalformedValues() {
        Instant time = Instant.parse("2026-11-03T03:15:30.1234567Z");
        String id = "11111111-2222-3333-4444-555555555555";
        var cursor = Pagination.cursor(Pagination.encode(time, id));
        assertEquals(time, cursor.time());
        assertEquals(id, cursor.id());
        assertEquals("art_2", Pagination.cursor(Pagination.encode(time, "art_2")).id());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> Pagination.cursor("invalid")).getStatusCode());
    }

    @Test
    void sliceReturnsOnlyRequestedItemsAndContinuationWhenNeeded() {
        var first = Pagination.slice(List.of(1, 2, 3), 2, "next");
        assertEquals(List.of(1, 2), first.get("items"));
        assertEquals(true, first.get("hasMore"));
        assertEquals("next", first.get("nextCursor"));
        var last = Pagination.slice(List.of(3), 2, null);
        assertEquals(false, last.get("hasMore"));
        assertNull(last.get("nextCursor"));
    }

    @Test
    void rejectsInvalidBounds() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> Pagination.size(101)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> Pagination.page(Integer.MAX_VALUE, 100)).getStatusCode());
    }
}
