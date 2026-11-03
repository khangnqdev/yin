package vn.yin.backend.service;

import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.common.Pagination;
import vn.yin.backend.domain.Contact;
import vn.yin.backend.service.command.CreateContactCommand;
import vn.yin.backend.service.command.UpdateContactCommand;
import vn.yin.backend.service.port.ContactStore;

@Service
public class ContactService {
    private static final Set<String> STATUSES = Set.of("NEW", "CONTACTED", "IN_PROGRESS", "CLOSED");
    private final ContactStore store;
    private final AbuseProtection protection;

    public ContactService(ContactStore store, AbuseProtection protection) {
        this.store = store;
        this.protection = protection;
    }

    @Transactional
    public String create(CreateContactCommand command, String remoteAddr) {
        // Names and form choices are one-line fields; only the message may contain line breaks.
        validateText(false, command.fullName(), command.email(), command.phone(), command.companyName(),
                command.projectType(), command.budgetRange());
        validateText(true, command.message());
        String phone = command.phone().trim();
        int digits = phone.replaceAll("\\D", "").length();
        if (!phone.matches("[+0-9() .-]+") || digits < 7 || digits > 15)
            throw new ContactException(ContactException.Code.INVALID_PHONE);
        if (!protection.allowContact(remoteAddr))
            throw new ContactException(ContactException.Code.RATE_LIMIT);
        return store.create(new CreateContactCommand(command.fullName().trim(), command.email().trim(), phone,
                command.companyName() == null ? "" : command.companyName().trim(),
                command.projectType().trim(), command.budgetRange().trim(), command.message().trim()));
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> list(String status, String search, String cursor, int size) {
        size = Pagination.size(size);
        if (!status.isEmpty() && !STATUSES.contains(status))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid status");
        String term = search == null ? "" : search.trim();
        if (term.length() > 100 || term.chars().anyMatch(Character::isISOControl)
                || term.indexOf('%') >= 0 || term.indexOf('_') >= 0 || term.indexOf('[') >= 0)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid search");
        var after = Pagination.cursor(cursor);
        var fetched = store.listNewestFirst(after == null ? null : after.time(), after == null ? null : after.id(),
                status, term, size + 1);
        var last = fetched.size() > size ? fetched.get(size - 1) : null;
        String next = last == null ? null : Pagination.encode(last.createdAt(), last.id());
        return Pagination.slice(fetched, size, next);
    }

    @Transactional(readOnly = true)
    public long count() { return store.count(); }

    @Transactional
    public Contact update(String id, UpdateContactCommand command) {
        if (!STATUSES.contains(command.status()))
            throw new ContactException(ContactException.Code.INVALID_STATUS);
        validateText(true, command.adminNotes());
        return store.update(id, command.status(), command.adminNotes() == null ? "" : command.adminNotes().trim())
                .orElseThrow(() -> new ContactException(ContactException.Code.NOT_FOUND));
    }

    private void validateText(boolean allowLineBreaks, String... values) {
        for (String value : values) {
            if (value != null && value.chars().anyMatch(c -> Character.isISOControl(c)
                    && !(allowLineBreaks && (c == '\n' || c == '\r' || c == '\t'))))
                throw new ContactException(ContactException.Code.INVALID_TEXT);
        }
    }
}
