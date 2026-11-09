package vn.yin.backend.controller;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.service.RoleService;

@RestController
@RequestMapping("/api/admin")
public class RoleController {
    private final RoleService roles;
    private final AccountRepository accounts;

    public RoleController(RoleService roles, AccountRepository accounts) {
        this.roles = roles;
        this.accounts = accounts;
    }

    @GetMapping("/session")
    public Map<String, Object> session(@AuthenticationPrincipal Jwt jwt) {
        var principal = accounts.activePrincipal(jwt.getSubject());
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable");
        return Map.of("role", principal.get("role"), "rank", accounts.roleRank(String.valueOf(principal.get("role"))),
                "permissions", accounts.permissionsForRole(String.valueOf(principal.get("role"))));
    }

    @GetMapping("/roles") public List<Map<String, Object>> all() { return roles.all(); }
    @GetMapping("/roles/{code}") public Map<String, Object> one(@PathVariable String code) { return roles.one(code); }
    @PostMapping("/roles") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return roles.create(jwt.getSubject(), body);
    }
    @PutMapping("/roles/{code}")
    public Map<String, Object> update(@AuthenticationPrincipal Jwt jwt, @PathVariable String code, @RequestBody Map<String, Object> body) {
        return roles.update(jwt.getSubject(), code, body);
    }
    @PatchMapping("/roles/{code}/status")
    public Map<String, Object> status(@AuthenticationPrincipal Jwt jwt, @PathVariable String code, @RequestBody Map<String, Object> body) {
        if (!(body.get("isActive") instanceof Boolean active))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid isActive");
        return roles.status(jwt.getSubject(), code, active);
    }
}
