package vn.yin.backend.repository;

import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.yin.backend.entity.ContactEntity;

public interface ContactJpaRepository extends JpaRepository<ContactEntity, String> {
    @Query("select c from ContactEntity c where (:createdAt is null or c.createdAt < :createdAt or "
            + "(c.createdAt = :createdAt and c.id < :id)) and (:status = '' or c.status = :status)"
            + " and (:search = '' or lower(c.fullName) like :pattern or lower(c.email) like :pattern"
            + " or c.phone like :pattern or lower(c.companyName) like :pattern or lower(c.projectType) like :pattern)"
            + " order by c.createdAt desc, c.id desc")
    List<ContactEntity> findSlice(@Param("createdAt") LocalDateTime createdAt, @Param("id") String id,
            @Param("status") String status, @Param("search") String search, @Param("pattern") String pattern,
            Pageable pageable);
}
