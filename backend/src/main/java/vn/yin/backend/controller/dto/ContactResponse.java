package vn.yin.backend.controller.dto;

import vn.yin.backend.domain.Contact;

public record ContactResponse(String id, String fullName, String email, String phone,
        String companyName, String projectType, String budgetRange, String message,
        String status, String adminNotes, String createdAt, String updatedAt) {
    public static ContactResponse from(Contact contact) {
        return new ContactResponse(contact.id(), contact.fullName(), contact.email(),
                contact.phone(), contact.companyName(), contact.projectType(),
                contact.budgetRange(), contact.message(), contact.status(),
                contact.adminNotes(), contact.createdAt().toString(), contact.updatedAt().toString());
    }
}
