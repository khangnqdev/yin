package vn.yin.backend.service;

import java.util.Set;

public final class RoleCatalog {
    private RoleCatalog() {}

    public static final Set<String> PERMISSIONS = Set.of(
            "dashboard:READ", "analytics:READ", "articles:READ", "articles:WRITE", "articles:EXECUTE", "articles:DELETE",
            "pages:READ", "pages:WRITE", "contacts:READ", "contacts:WRITE", "clients:READ",
            "support:READ", "support:EXECUTE", "accounts:READ", "accounts:WRITE", "accounts:EXECUTE",
            "roles:READ", "roles:WRITE", "roles:EXECUTE", "profile:READ", "profile:WRITE", "upload:WRITE");
}
