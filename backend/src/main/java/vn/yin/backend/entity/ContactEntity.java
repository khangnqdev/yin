package vn.yin.backend.entity;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import vn.yin.backend.domain.Contact;

@Entity
@Table(name = "contacts")
public class ContactEntity {
    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @Column(name = "full_name", length = 200, nullable = false)
    private String fullName;
    @Column(length = 255, nullable = false)
    private String email;
    @Column(length = 50, nullable = false)
    private String phone;
    @Column(name = "company_name", length = 255)
    private String companyName;
    @Column(name = "project_type", length = 100, nullable = false)
    private String projectType;
    @Column(name = "budget_range", length = 100, nullable = false)
    private String budgetRange;
    @Column(columnDefinition = "text", nullable = false)
    private String message;
    @Column(length = 30, nullable = false)
    private String status;
    @Column(name = "admin_notes", columnDefinition = "text")
    private String adminNotes;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ContactEntity() { }

    public ContactEntity(String fullName, String email, String phone, String companyName,
                         String projectType, String budgetRange, String message) {
        this.id = UUID.randomUUID().toString();
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.companyName = companyName;
        this.projectType = projectType;
        this.budgetRange = budgetRange;
        this.message = message;
        this.status = "NEW";
        this.createdAt = LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = createdAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now(ZoneOffset.UTC);
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(ZoneOffset.UTC); }

    public void update(String status, String adminNotes) {
        this.status = status;
        this.adminNotes = adminNotes;
    }

    public Contact toDomain() {
        return new Contact(id, fullName, email, phone, companyName, projectType, budgetRange,
                message, status, adminNotes, createdAt.toInstant(ZoneOffset.UTC),
                updatedAt.toInstant(ZoneOffset.UTC));
    }

    public String getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getCompanyName() { return companyName; }
    public String getProjectType() { return projectType; }
    public String getBudgetRange() { return budgetRange; }
    public String getMessage() { return message; }
    public String getStatus() { return status; }
    public String getAdminNotes() { return adminNotes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
