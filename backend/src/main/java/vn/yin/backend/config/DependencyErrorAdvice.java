package vn.yin.backend.config;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class DependencyErrorAdvice {
    @ExceptionHandler({DataAccessResourceFailureException.class, QueryTimeoutException.class, RedisSystemException.class})
    public ResponseEntity<Map<String, String>> unavailable(DataAccessException error) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "code", "SERVICE_UNAVAILABLE",
                "message", "Chức năng đang bị lỗi hệ thống. Vui lòng thử lại sau."));
    }

}
