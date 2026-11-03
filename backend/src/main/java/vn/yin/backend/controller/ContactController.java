package vn.yin.backend.controller;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.yin.backend.controller.dto.ContactResponse;
import vn.yin.backend.controller.dto.CreateContactRequest;
import vn.yin.backend.controller.dto.UpdateContactRequest;
import vn.yin.backend.service.ContactService;
import vn.yin.backend.service.command.CreateContactCommand;
import vn.yin.backend.service.command.UpdateContactCommand;

@RestController
@RequestMapping("/api")
public class ContactController {
    private final ContactService service;

    public ContactController(ContactService service) { this.service = service; }

    @GetMapping("/admin/contacts")
    public Map<String, Object> list(@RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String search, @RequestParam(defaultValue = "") String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(status, search, cursor, size);
    }

    @PostMapping("/contacts")
    public ResponseEntity<Map<String, String>> create(@Valid @RequestBody CreateContactRequest body,
                                                       HttpServletRequest request) {
        var command = new CreateContactCommand(body.fullName(), body.email(), body.phone(),
                body.companyName(), body.projectType(), body.budgetRange(), body.message());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", service.create(command, request.getRemoteAddr())));
    }

    @PutMapping("/admin/contacts/{id}")
    public ContactResponse update(@PathVariable String id, @Valid @RequestBody UpdateContactRequest body) {
        return ContactResponse.from(service.update(id, new UpdateContactCommand(body.status(), body.adminNotes())));
    }
}
