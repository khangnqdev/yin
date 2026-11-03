package vn.yin.backend.domain;

import java.time.Instant;

public record Contact(String id, String fullName, String email, String phone, String companyName,
        String projectType, String budgetRange, String message, String status, String adminNotes,
        Instant createdAt, Instant updatedAt) { }
