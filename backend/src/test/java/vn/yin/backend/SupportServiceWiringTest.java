package vn.yin.backend;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import vn.yin.backend.common.AbuseProtection;
import vn.yin.backend.repository.AccountRepository;
import vn.yin.backend.repository.SupportRepository;
import vn.yin.backend.service.SupportService;

class SupportServiceWiringTest {
    @Test
    void springCanConstructSupportServiceWithItsDependencies() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.registerBean(SupportRepository.class, () -> mock(SupportRepository.class));
            context.registerBean(AccountRepository.class, () -> mock(AccountRepository.class));
            context.registerBean(AbuseProtection.class, () -> mock(AbuseProtection.class));
            context.registerBean(SupportService.class);
            context.refresh();
            assertNotNull(context.getBean(SupportService.class));
        }
    }
}
