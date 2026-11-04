import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminSettingsComponent } from './admin-settings.component';
import { AuthorProfileService } from '../../../core/services/author-profile.service';

describe('AdminSettingsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: AuthorProfileService, useValue: {
          load: vi.fn().mockResolvedValue({ authorName: 'Khang', authorRole: 'Biên tập viên' }),
          save: vi.fn().mockResolvedValue({ authorName: 'Khang', authorRole: 'Biên tập viên' })
        } }
      ]
    });
  });

  it('loads author profile on init and allows saving', async () => {
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    expect(component['authorName']()).toBe('Khang');
    expect(component['authorRole']()).toBe('Biên tập viên');

    await component.saveAuthorProfile();
    expect(component['profileSaved']()).toBe(true);
  });
});
