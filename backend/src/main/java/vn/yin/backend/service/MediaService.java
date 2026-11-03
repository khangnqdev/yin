package vn.yin.backend.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MediaService {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 25_000_000L;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "png", "png", "jpeg", "jpg", "gif", "gif");
    private final Path storage;

    public MediaService(@Value("${app.media.storage-dir}") String storageDir) {
        this.storage = Path.of(storageDir).toAbsolutePath().normalize();
    }

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image must be 5 MB or smaller");
        String extension;
        try (var input = ImageIO.createImageInputStream(file.getInputStream())) {
            if (input == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                extension = EXTENSIONS.get(reader.getFormatName().toLowerCase(java.util.Locale.ROOT));
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (extension == null || pixels < 1 || pixels > MAX_PIXELS)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image");
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image", e);
        }
        try {
            Files.createDirectories(storage);
            String name = UUID.randomUUID() + "." + extension;
            try (var source = file.getInputStream()) {
                Files.copy(source, storage.resolve(name));
            }
            return "/api/media/" + name;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot store image", e);
        }
    }

    public Resource image(String name) {
        if (!name.matches("[0-9a-fA-F-]{36}\\.(png|jpg|gif)"))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        Path file = storage.resolve(name);
        if (!Files.isRegularFile(file)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        try {
            return new UrlResource(file.toUri());
        } catch (java.net.MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found", e);
        }
    }
}
