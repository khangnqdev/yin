package vn.yin.backend.common;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import vn.yin.backend.service.ContactException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ContactException.class)
    ResponseEntity<Map<String, String>> contact(ContactException e) {
        return switch (e.code()) {
            case INVALID_PHONE -> ResponseEntity.badRequest().body(Map.of("message", "Invalid phone"));
            case INVALID_STATUS -> ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));
            case INVALID_TEXT -> ResponseEntity.badRequest().body(Map.of("message", "Invalid control character"));
            case RATE_LIMIT -> ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", "60")
                    .body(Map.of("message", "Too many requests. Try again later."));
            case NOT_FOUND -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Contact not found"));
        };
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> invalidFields(MethodArgumentNotValidException e) {
        String field = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField()).sorted().findFirst().orElse("request");
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid " + field));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, String>> malformedJson(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Invalid request body"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> known(ResponseStatusException e, HttpServletRequest request) {
        var response = ResponseEntity.status(e.getStatusCode());
        if (e.getStatusCode().value() == 429) {
            String uri = request.getRequestURI();
            response.header("Retry-After", uri.endsWith("/auth/register") || uri.contains("/support-requests")
                    ? "3600" : uri.contains("/auth/") ? "900" : "60");
        }
        return response.body(Map.of("message", e.getReason() == null ? "Request failed" : e.getReason()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> conflict(DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Duplicate or invalid data"));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, String>> uploadTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("message", "Image must be 5 MB or smaller"));
    }
}

