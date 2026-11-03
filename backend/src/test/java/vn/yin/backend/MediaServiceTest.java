package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.Path;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.service.MediaService;

class MediaServiceTest {
    @TempDir Path directory;

    @Test
    void acceptsRealPngAndServesOnlyStoredNames() {
        var media = new MediaService(directory.toString());
        byte[] png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl2cAAAAASUVORK5CYII=");
        String url = media.upload(new MockMultipartFile("file", "image.txt", "text/plain", png));
        assertTrue(url.matches("/api/media/[0-9a-f-]{36}\\.png"));
        assertTrue(media.image(url.substring("/api/media/".length())).exists());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> media.image("../secret.png")).getStatusCode());
    }

    @Test
    void rejectsNonImageContent() {
        var media = new MediaService(directory.toString());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> media.upload(new MockMultipartFile("file", "script.png", "image/png",
                        "<script>alert(1)</script>".getBytes()))).getStatusCode());
    }
}
