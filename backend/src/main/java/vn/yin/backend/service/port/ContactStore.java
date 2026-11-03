package vn.yin.backend.service.port;

import java.util.List;
import java.util.Optional;
import vn.yin.backend.domain.Contact;
import vn.yin.backend.service.command.CreateContactCommand;

public interface ContactStore {
    String create(CreateContactCommand command);
    Optional<Contact> update(String id, String status, String adminNotes);
    List<Contact> listNewestFirst(java.time.Instant before, String id, String status, String search, int size);
    long count();
}
