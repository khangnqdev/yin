package vn.yin.backend.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateContactRequest(
        @NotBlank String status,
        @Size(max = 5000) String adminNotes) { }
