package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.repository.RoleRepository;
import vn.yin.backend.service.RoleService;
import vn.yin.backend.service.TokenRegistry;

class RoleServiceTest {
    private RoleRepository roles;
    private AccountRepository accounts;
    private TokenRegistry tokens;
    private RoleService service;

    @BeforeEach
    void setUp() {
        roles = mock(RoleRepository.class);
        accounts = mock(AccountRepository.class);
        tokens = mock(TokenRegistry.class);
        service = new RoleService(roles, accounts, tokens);
        when(accounts.activePrincipal("actor")).thenReturn(Map.of("role", "MANAGER"));
        when(accounts.roleRank("MANAGER")).thenReturn(200);
        when(accounts.permissionsForRole("MANAGER")).thenReturn(List.of("roles:WRITE", "support:READ"));
    }

    @Test
    void cannotCreatePeerOrGrantPermissionActorDoesNotHave() {
        var peer = Map.<String, Object>of("code", "PEER", "name", "Peer", "rank", 200,
                "permissions", List.of("support:READ"));
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.create("actor", peer)).getStatusCode());
        var elevated = Map.<String, Object>of("code", "LOWER", "name", "Lower", "rank", 100,
                "permissions", List.of("accounts:EXECUTE"));
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.create("actor", elevated)).getStatusCode());
        verify(roles, never()).create(any(), any(), any(), anyInt());
    }

    @Test
    void changingRoleRevokesEachMemberAndBumpsTokenVersions() {
        var role = Map.<String, Object>of("code", "FIXER", "name", "Fixer", "rank", 100,
                "isSystem", false, "permissions", List.of("support:READ"));
        when(roles.find("FIXER")).thenReturn(role);
        when(roles.userIds("FIXER")).thenReturn(List.of("one", "two"));
        service.update("actor", "FIXER", Map.of("name", "Support", "rank", 100,
                "permissions", List.of("support:READ")));
        verify(tokens).revokeUser("one");
        verify(tokens).revokeUser("two");
        verify(roles).bumpVersions("FIXER");
    }
}
