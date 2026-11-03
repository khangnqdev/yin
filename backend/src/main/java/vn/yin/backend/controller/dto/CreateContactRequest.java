package vn.yin.backend.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateContactRequest(
        @NotBlank @Size(max = 200) String fullName,
        @NotBlank @Email @Pattern(regexp = "^[^\\s@<>]{1,64}@[^\\s@<>.]+(?:\\.[^\\s@<>.]+)+$") @Size(max = 255) String email,
        @NotBlank @Size(max = 50) String phone,
        @Size(max = 255) String companyName,
        @NotBlank @Size(max = 100) String projectType,
        @NotBlank @Size(max = 100) String budgetRange,
        @NotBlank @Size(max = 5000) String message) { }
