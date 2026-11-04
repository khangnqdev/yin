package vn.yin.backend.controller;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.config.SecurityConfig;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.repository.SupportRepository;
import vn.yin.backend.service.AccountService;
import vn.yin.backend.service.SupportService;

@RestController
@RequestMapping("/api")
public class AccountController {
    private final AccountService accountService;
    private final SupportService supportService;

    @Autowired
    public AccountController(AccountService accountService, SupportService supportService) {
        this.accountService = accountService;
        this.supportService = supportService;
    }

    public AccountController(AccountRepository accounts, SupportRepository support, AuthenticationManager authentication,
            SecurityConfig.TokenService tokens, PasswordEncoder passwords, AbuseProtection protection) {
        this(new AccountService(accounts, authentication, tokens, passwords, protection),
             new SupportService(support, accounts, protection));
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return accountService.register(body, request.getRemoteAddr());
    }

    @PostMapping("/auth/client/login")
    public Map<String, Object> clientLogin(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return accountService.login(body, request.getRemoteAddr(), false);
    }

    @PostMapping({"/auth/admin/login", "/auth/login"})
    public Map<String, Object> adminLogin(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return accountService.login(body, request.getRemoteAddr(), true);
    }

    @GetMapping("/client/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return accountService.me(jwt.getSubject());
    }

    @PatchMapping("/client/me/updates")
    public Map<String, Object> updateOptIn(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return accountService.updateOptIn(jwt.getSubject(), body);
    }

    @GetMapping("/admin/clients")
    public Map<String, Object> clients(@RequestParam(defaultValue = "false") boolean updatesOnly,
            @RequestParam(defaultValue = "") String search, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return accountService.clients(updatesOnly, search, page, size);
    }

    @GetMapping("/admin/accounts")
    public Map<String, Object> admins(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return accountService.admins(page, size);
    }

    @GetMapping("/admin/me/profile")
    public Map<String, Object> authorProfile(@AuthenticationPrincipal Jwt jwt) {
        return accountService.authorProfile(jwt.getSubject());
    }

    @PatchMapping("/admin/me/profile")
    public Map<String, Object> updateAuthorProfile(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return accountService.updateAuthorProfile(jwt.getSubject(), body);
    }

    @PostMapping("/admin/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createAdmin(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return accountService.createAdmin(jwt.getSubject(), body);
    }

    @PatchMapping("/admin/accounts/{id}/status")
    public Map<String, Object> updateAdminStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Map<String, Object> body) {
        return accountService.updateAdminStatus(jwt.getSubject(), id, body);
    }

    @PatchMapping("/admin/accounts/{id}/role")
    public Map<String, Object> updateAdminRole(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Map<String, Object> body) {
        return accountService.updateAdminRole(jwt.getSubject(), id, body);
    }

    @PostMapping("/admin/accounts/{id}/reset-password")
    public Map<String, Object> resetAdminPassword(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Map<String, Object> body) {
        return accountService.resetAdminPassword(jwt.getSubject(), id, body);
    }

    @PostMapping("/client/support-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createSupport(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return supportService.createSupport(jwt.getSubject(), body);
    }

    @GetMapping("/client/support-requests")
    public Map<String, Object> mySupport(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return supportService.mySupport(jwt.getSubject(), page, size);
    }

    @GetMapping("/admin/support-requests")
    public Map<String, Object> supportRequests(@RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return supportService.supportRequests(status, page, size);
    }

    @PatchMapping("/admin/support-requests/{id}")
    public Map<String, Object> updateSupport(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return supportService.updateSupport(id, body);
    }
}

