package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import java.util.Optional;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.controller.dto.CreateContactRequest;
import vn.yin.backend.entity.ContactEntity;
import vn.yin.backend.service.ContactService;
import vn.yin.backend.service.ContactException;
import vn.yin.backend.service.command.CreateContactCommand;
import vn.yin.backend.service.command.UpdateContactCommand;
import vn.yin.backend.service.port.ContactStore;

class ContactServiceTest {
    private final ContactStore store = mock(ContactStore.class);
    private final ContactService service = new ContactService(store, new AbuseProtection(() -> 1_000_000L));

    private CreateContactRequest validRequest() {
        return new CreateContactRequest("Test Person", "test@example.com", "+84 900 123 456",
                "Test Company", "Web", "200M - 500M", "Please contact me about a project.");
    }

    private CreateContactCommand validCommand() {
        var request = validRequest();
        return new CreateContactCommand(request.fullName(), request.email(), request.phone(),
                request.companyName(), request.projectType(), request.budgetRange(), request.message());
    }

    @Test
    void requestContractRejectsMissingAndInvalidFields() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(validRequest()).isEmpty());
            assertFalse(validator.validate(new CreateContactRequest("", "bad@@example.com", "123",
                    "", "", "", "")).isEmpty());
        }
    }

    @Test
    void createsContactAndThrottlesFurtherSubmissions() {
        when(store.create(any(CreateContactCommand.class))).thenReturn("contact-id");
        for (int i = 0; i < 3; i++) assertEquals("contact-id", service.create(validCommand(), "10.0.0.1"));
        var error = assertThrows(ContactException.class,
                () -> service.create(validCommand(), "10.0.0.1"));
        assertEquals(ContactException.Code.RATE_LIMIT, error.code());
        verify(store, times(3)).create(any(CreateContactCommand.class));
    }

    @Test
    void rejectsInvalidPhoneBeforePersistence() {
        var bad = new CreateContactCommand("Test", "test@example.com", "abc-script", "", "Web", "Budget", "Message");
        assertEquals(ContactException.Code.INVALID_PHONE,
                assertThrows(ContactException.class, () -> service.create(bad, "10.0.0.2")).code());
        verifyNoInteractions(store);
    }

    @Test
    void rejectsLineBreaksInSingleLineFieldsButAllowsThemInMessage() {
        var invalid = new CreateContactCommand("Test\nPerson", "test@example.com", "123456789",
                "", "Web", "Budget", "Please contact me.");
        assertEquals(ContactException.Code.INVALID_TEXT,
                assertThrows(ContactException.class, () -> service.create(invalid, "10.0.0.3")).code());
        verifyNoInteractions(store);

        when(store.create(any(CreateContactCommand.class))).thenReturn("contact-id");
        var multiline = new CreateContactCommand("Test Person", "test@example.com", "123456789",
                "", "Web", "Budget", "Line one\nLine two");
        assertEquals("contact-id", service.create(multiline, "10.0.0.3"));
    }

    @Test
    void updatesExistingContactAndRejectsUnknownStatusOrId() {
        var entity = new ContactEntity("Test", "test@example.com", "123456789", "", "Web", "Budget", "Message");
        entity.update("CONTACTED", "Called client");
        when(store.update(entity.getId(), "CONTACTED", "Called client")).thenReturn(Optional.of(entity.toDomain()));
        var updated = service.update(entity.getId(), new UpdateContactCommand("CONTACTED", "Called client"));
        assertEquals("CONTACTED", updated.status());
        assertEquals("Called client", updated.adminNotes());
        assertEquals(ContactException.Code.INVALID_STATUS, assertThrows(ContactException.class,
                () -> service.update(entity.getId(), new UpdateContactCommand("INVALID", ""))).code());
        assertEquals(ContactException.Code.NOT_FOUND, assertThrows(ContactException.class,
                () -> service.update("missing", new UpdateContactCommand("NEW", ""))).code());
    }
}
