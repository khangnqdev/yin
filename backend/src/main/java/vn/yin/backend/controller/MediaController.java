package vn.yin.backend.controller;

import java.util.Map;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.yin.backend.service.MediaService;

@RestController
@RequestMapping("/api")
public class MediaController {
    private final MediaService media;

    public MediaController(MediaService media) { this.media = media; }

    @PostMapping(value = "/admin/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", media.upload(file));
    }

    @GetMapping("/media/{name}")
    public ResponseEntity<Resource> image(@PathVariable String name) {
        MediaType type = name.endsWith(".png") ? MediaType.IMAGE_PNG
                : name.endsWith(".jpg") || name.endsWith(".jpeg") ? MediaType.IMAGE_JPEG
                : name.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : name.endsWith(".svg") ? MediaType.parseMediaType("image/svg+xml")
                : MediaType.parseMediaType("image/gif");
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic())
                .body(media.image(name));
    }
}
