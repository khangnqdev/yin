package vn.yin.backend.service.command;

public record CreateContactCommand(String fullName, String email, String phone, String companyName,
        String projectType, String budgetRange, String message) { }
