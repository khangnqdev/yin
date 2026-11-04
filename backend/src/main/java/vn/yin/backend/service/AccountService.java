package vn.yin.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.config.SecurityConfig;
import vn.yin.backend.repository.AccountRepository;

@Service
public class AccountService {
    public static final Set<String> ADMIN_ROLES = Set.of("MANAGER", "ADMIN", "FIXER");
    private static final SecureRandom PASSWORD_RANDOM = new SecureRandom();

    private int rank(String role) {
        return switch (role) { case "ADMIN" -> 3; case "MANAGER" -> 2; case "FIXER" -> 1; default -> 0; };
    }

    private String actorRole(String actorId) {
        Map<String, Object> actor = accounts.activePrincipal(actorId);
        if (actor == null || rank(String.valueOf(actor.get("role"))) == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account unavailable");
        return String.valueOf(actor.get("role"));
    }

    private void requireSuperior(String actorId, String targetRole) {
        if (rank(actorRole(actorId)) <= rank(targetRole))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role must be below your own");
    }

    private final AccountRepository accounts;
    private final AuthenticationManager authentication;
    private final SecurityConfig.TokenService tokens;
    private final PasswordEncoder passwords;
    private final AbuseProtection protection;

    public AccountService(AccountRepository accounts, AuthenticationManager authentication,
            SecurityConfig.TokenService tokens, PasswordEncoder passwords, AbuseProtection protection) {
        this.accounts = accounts;
        this.authentication = authentication;
        this.tokens = tokens;
        this.passwords = passwords;
        this.protection = protection;
    }

    public void only(Map<String, Object> body, String... allowed) {
        if (body == null || !Set.of(allowed).containsAll(body.keySet())) bad("Unexpected input");
    }

    public String string(Map<String, Object> body, String key, int max) {
        Object value = body.get(key);
        if (!(value instanceof String text) || text.isBlank() || text.length() > max
                || text.chars().anyMatch(ch -> Character.isISOControl(ch)
                        && !("message".equals(key) && (ch == '\n' || ch == '\r' || ch == '\t')))) bad("Invalid " + key);
        return (String) value;
    }

    public String trimmed(Map<String, Object> body, String key, int max) {
        String value = string(body, key, max).trim();
        if (value.isEmpty()) bad("Invalid " + key);
        return value;
    }

    public String username(Map<String, Object> body, boolean newAccount) {
        String value = trimmed(body, "username", newAccount ? 50 : 100);
        if (!value.matches(newAccount ? "[A-Za-z0-9_.-]{3,50}" : "[A-Za-z0-9_.-]{1,100}")) bad("Invalid username");
        return value.toLowerCase(Locale.ROOT);
    }

    public String password(Map<String, Object> body, boolean newAccount) {
        String value = string(body, "password", 200);
        if (newAccount && (value.length() < 12 || value.getBytes(StandardCharsets.UTF_8).length > 72
                || !value.equals(value.trim()))) bad("Invalid password");
        return value;
    }

    public boolean booleanField(Map<String, Object> body, String key, boolean defaultValue) {
        Object value = body.get(key);
        if (value == null && !body.containsKey(key)) return defaultValue;
        if (!(value instanceof Boolean)) bad("Invalid " + key);
        return (Boolean) value;
    }

    public int page(int page) {
        if (page < 0 || page > 100_000) bad("Invalid page");
        return page;
    }

    public int size(int size) {
        if (size < 1 || size > 100) bad("Invalid size");
        return size;
    }

    public void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    public void limit(boolean allowed) {
        if (!allowed) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again later.");
    }

    public Map<String, Object> register(Map<String, Object> body, String remoteAddr) {
        only(body, "email", "username", "password", "phone", "dateOfBirth", "receiveUpdates");
        String email = trimmed(body, "email", 255).toLowerCase(Locale.ROOT);
        if (!email.matches("^[^\\s@<>]{1,64}@[^\\s@<>.]+(?:\\.[^\\s@<>.]+)+$")) bad("Invalid email");
        String username = username(body, true);
        String password = password(body, true);
        String phone = trimmed(body, "phone", 50);
        int digits = phone.replaceAll("\\D", "").length();
        if (!phone.matches("[+0-9() .-]+") || digits < 7 || digits > 15) bad("Invalid phone");
        String dob = trimmed(body, "dateOfBirth", 10);
        try {
            LocalDate birthday = LocalDate.parse(dob);
            if (birthday.isBefore(LocalDate.of(1900, 1, 1)) || birthday.isAfter(LocalDate.now())) bad("Invalid dateOfBirth");
        } catch (DateTimeParseException e) { bad("Invalid dateOfBirth"); }
        boolean updates = booleanField(body, "receiveUpdates", false);
        limit(protection.allowRegistration(remoteAddr));
        return accounts.createClient(username, passwords.encode(password), email, phone, dob, updates);
    }

    public Map<String, Object> login(Map<String, Object> body, String remoteAddr, boolean admin) {
        only(body, "username", "password");
        String username = username(body, false);
        String password = password(body, false);
        synchronized (protection.loginLock(username)) {
            limit(protection.allowLoginIp(remoteAddr) && !protection.loginAccountBlocked(username));
            try {
                authentication.authenticate(new UsernamePasswordAuthenticationToken(username, password));
                Map<String, Object> account = accounts.byUsername(username);
                if (account == null || !Boolean.TRUE.equals(account.get("is_active")))
                    throw new BadCredentialsException("Invalid credentials");
                String role = account.get("role").toString();
                if (admin != ADMIN_ROLES.contains(role))
                    throw new BadCredentialsException("Invalid credentials");
                protection.loginSucceeded(username);
                String id = account.get("id").toString();
                String actualUsername = account.get("username").toString();
                int tokenVersion = account.get("token_version") instanceof Number version ? version.intValue() : 0;
                return Map.of("token", tokens.issue(id, actualUsername, role, tokenVersion), "tokenType", "Bearer",
                        "expiresIn", tokens.expirationMs() / 1000,
                        "user", Map.of("id", id, "username", actualUsername, "role", role));
            } catch (AuthenticationException e) {
                protection.loginFailed(username);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }
        }
    }

    public Map<String, Object> me(String userId) {
        Map<String, Object> client = accounts.client(userId);
        if (client == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable");
        return client;
    }

    public Map<String, Object> updateOptIn(String userId, Map<String, Object> body) {
        only(body, "receiveUpdates");
        if (!body.containsKey("receiveUpdates")) bad("receiveUpdates is required");
        Map<String, Object> client = accounts.updateOptIn(userId, booleanField(body, "receiveUpdates", false));
        if (client == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable");
        return client;
    }

    public Map<String, Object> clients(boolean updatesOnly, String search, int page, int size) {
        String term = search.trim();
        if (term.length() > 100 || !term.matches("[A-Za-z0-9@+._ -]*")) bad("Invalid search");
        return accounts.clients(updatesOnly, term, page(page), size(size));
    }

    public Map<String, Object> admins(int page, int size) {
        int checkedSize = size(size);
        return accounts.admins(page(page), checkedSize);
    }

    public Map<String, Object> authorProfile(String actorId) {
        Map<String, Object> profile = accounts.authorProfile(actorId);
        if (profile == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable");
        return profile;
    }

    public Map<String, Object> updateAuthorProfile(String actorId, Map<String, Object> body) {
        only(body, "authorName", "authorRole");
        String name = trimmed(body, "authorName", 200);
        String role = trimmed(body, "authorRole", 200);
        if (accounts.authorProfile(actorId) == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable");
        return accounts.updateAuthorProfile(actorId, name, role);
    }

    public Map<String, Object> createAdmin(String actorId, Map<String, Object> body) {
        only(body, "username", "role");
        String username = username(body, true);
        String role = trimmed(body, "role", 30);
        if (!ADMIN_ROLES.contains(role)) bad("Invalid role");
        requireSuperior(actorId, role);
        byte[] random = new byte[24];
        PASSWORD_RANDOM.nextBytes(random);
        String password = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        Map<String, Object> created = accounts.createAdmin(username, passwords.encode(password), role);
        Map<String, Object> result = new LinkedHashMap<>(accounts.admin((String) created.get("id")));
        result.put("generatedPassword", password);
        return result;
    }

    public Map<String, Object> updateAdminStatus(String actorId, String id, Map<String, Object> body) {
        only(body, "isActive");
        if (!body.containsKey("isActive")) bad("isActive is required");
        boolean active = booleanField(body, "isActive", false);
        Map<String, Object> current = adminOrNotFound(id);
        requireSuperior(actorId, String.valueOf(current.get("role")));
        if (active == Boolean.TRUE.equals(current.get("isActive"))) return current;
        if (!accounts.updateAdminStatus(id, active))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot disable the last active ADMIN");
        return adminOrNotFound(id);
    }

    public Map<String, Object> updateAdminRole(String actorId, String id, Map<String, Object> body) {
        only(body, "role");
        String role = trimmed(body, "role", 30);
        if (!ADMIN_ROLES.contains(role)) bad("Invalid role");
        Map<String, Object> current = adminOrNotFound(id);
        requireSuperior(actorId, String.valueOf(current.get("role")));
        requireSuperior(actorId, role);
        if (role.equals(current.get("role"))) return current;
        if (!accounts.updateAdminRole(id, role))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot demote the last active ADMIN");
        return adminOrNotFound(id);
    }

    public Map<String, Object> resetAdminPassword(String actorId, String id, Map<String, Object> body) {
        only(body, "password");
        String password = password(body, true);
        requireSuperior(actorId, String.valueOf(adminOrNotFound(id).get("role")));
        if (!accounts.resetAdminPassword(id, passwords.encode(password)))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        return adminOrNotFound(id);
    }

    private Map<String, Object> adminOrNotFound(String id) {
        Map<String, Object> admin = accounts.admin(id);
        if (admin == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        return admin;
    }
}

