package vn.yin.backend.service;

import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.repository.SupportRepository;

@Service
public class SupportService {
    public static final Set<String> SUPPORT_STATUSES = Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED");

    private final SupportRepository support;
    private final AccountRepository accounts;
    private final AbuseProtection protection;

    public SupportService(SupportRepository support, AccountRepository accounts, AbuseProtection protection) {
        this.support = support;
        this.accounts = accounts;
        this.protection = protection;
    }

    private void only(Map<String, Object> body, String... allowed) {
        if (body == null || !Set.of(allowed).containsAll(body.keySet())) bad("Unexpected input");
    }

    private String string(Map<String, Object> body, String key, int max) {
        Object value = body.get(key);
        if (!(value instanceof String text) || text.isBlank() || text.length() > max
                || text.chars().anyMatch(ch -> Character.isISOControl(ch)
                        && !("message".equals(key) && (ch == '\n' || ch == '\r' || ch == '\t')))) bad("Invalid " + key);
        return (String) value;
    }

    private String trimmed(Map<String, Object> body, String key, int max) {
        String value = string(body, key, max).trim();
        if (value.isEmpty()) bad("Invalid " + key);
        return value;
    }

    private int page(int page) {
        if (page < 0 || page > 100_000) bad("Invalid page");
        return page;
    }

    private int size(int size) {
        if (size < 1 || size > 100) bad("Invalid size");
        return size;
    }

    private void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private void limit(boolean allowed) {
        if (!allowed) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again later.");
    }

    private void checkClientExists(String userId) {
        if (accounts.client(userId) == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable");
        }
    }

    public Map<String, Object> createSupport(String userId, Map<String, Object> body) {
        only(body, "subject", "message");
        String subject = trimmed(body, "subject", 200);
        String message = trimmed(body, "message", 5000);
        if (subject.length() < 3 || message.length() < 10) bad("Invalid support request");
        checkClientExists(userId);
        limit(protection.allowSupport(userId));
        return support.create(userId, subject, message);
    }

    public Map<String, Object> mySupport(String userId, int page, int size) {
        checkClientExists(userId);
        return support.mine(userId, page(page), size(size));
    }

    public Map<String, Object> supportRequests(String status, int page, int size) {
        if (!status.isEmpty() && !SUPPORT_STATUSES.contains(status)) bad("Invalid status");
        return support.all(status, page(page), size(size));
    }

    public Map<String, Object> updateSupport(String id, Map<String, Object> body) {
        only(body, "status");
        String status = trimmed(body, "status", 30);
        if (!SUPPORT_STATUSES.contains(status)) bad("Invalid status");
        if (!id.matches("[0-9a-fA-F-]{36}")) bad("Invalid id");
        Map<String, Object> result = support.updateStatus(id, status);
        if (result == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Support request not found");
        return result;
    }
}

