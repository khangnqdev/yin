import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AuthorProfile { authorName: string; authorRole: string; }

@Injectable({ providedIn: 'root' })
export class AuthorProfileService {
  private readonly http = inject(HttpClient);
  readonly profile = signal<AuthorProfile | null>(null);

  async load(): Promise<AuthorProfile> {
    try {
      const profile = await firstValueFrom(this.http.get<AuthorProfile>('/api/admin/me/profile'));
      this.profile.set(profile);
      try {
        localStorage.setItem('yin_author_profile', JSON.stringify(profile));
      } catch {}
      return profile;
    } catch (err) {
      const cached = localStorage.getItem('yin_author_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          this.profile.set(parsed);
          return parsed;
        } catch {}
      }
      throw err;
    }
  }

  async save(profile: AuthorProfile): Promise<AuthorProfile> {
    try {
      localStorage.setItem('yin_author_profile', JSON.stringify(profile));
    } catch {}
    try {
      const updated = await firstValueFrom(this.http.patch<AuthorProfile>('/api/admin/me/profile', profile));
      this.profile.set(updated);
      try {
        localStorage.setItem('yin_author_profile', JSON.stringify(updated));
      } catch {}
      return updated;
    } catch {
      this.profile.set(profile);
      return profile;
    }
  }
}
