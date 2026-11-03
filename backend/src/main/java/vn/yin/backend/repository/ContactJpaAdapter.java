package vn.yin.backend.repository;

import java.util.List;
import java.util.Optional;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import vn.yin.backend.domain.Contact;
import vn.yin.backend.entity.ContactEntity;
import vn.yin.backend.service.command.CreateContactCommand;
import vn.yin.backend.service.port.ContactStore;

@Repository
public class ContactJpaAdapter implements ContactStore {
    private final ContactJpaRepository repository;

    public ContactJpaAdapter(ContactJpaRepository repository) { this.repository = repository; }

    @Override
    public String create(CreateContactCommand command) {
        var entity = new ContactEntity(command.fullName(), command.email(), command.phone(),
                command.companyName(), command.projectType(), command.budgetRange(), command.message());
        return repository.save(entity).getId();
    }

    @Override
    public Optional<Contact> update(String id, String status, String adminNotes) {
        return repository.findById(id).map(entity -> {
            entity.update(status, adminNotes);
            return repository.saveAndFlush(entity).toDomain();
        });
    }

    @Override
    public List<Contact> listNewestFirst(Instant before, String id, String status, String search, int size) {
        LocalDateTime time = before == null ? null : LocalDateTime.ofInstant(before, ZoneOffset.UTC);
        return repository.findSlice(time, id == null ? "" : id, status, search,
                "%" + search.toLowerCase(java.util.Locale.ROOT) + "%", PageRequest.of(0, size)).stream()
                .map(ContactEntity::toDomain).toList();
    }

    @Override
    public long count() { return repository.count(); }
}
