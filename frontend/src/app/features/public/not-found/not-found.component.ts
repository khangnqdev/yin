import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ElementRef,
  viewChild
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { LocalDbService } from '../../../core/services/local-db.service';
import { AnalyticsTrackerService } from '../../../core/services/analytics-tracker.service';

export interface MenuItem {
  path: string;
  title: string;
}

export interface ErrorInfo {
  code: number;
  label: string;
  title: string;
}

@Component({
  selector: 'yin-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css'],
  imports: [RouterLink, RouterLinkActive]
})
export class NotFoundComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly db = inject(LocalDbService);
  private readonly tracker = inject(AnalyticsTrackerService);

  // Template Element Refs cho 3 cột cuộn số
  readonly reelCol1 = viewChild<ElementRef<HTMLDivElement>>('reelCol1');
  readonly reelCol2 = viewChild<ElementRef<HTMLDivElement>>('reelCol2');
  readonly reelCol3 = viewChild<ElementRef<HTMLDivElement>>('reelCol3');

  // Status Code Signal: 404 | 403 | 510
  readonly statusCode = signal<number>(404);

  readonly errorInfo = computed<ErrorInfo>(() => {
    const code = this.statusCode();
    switch (code) {
      case 403:
        return {
          code: 403,
          label: 'FORBIDDEN',
          title: 'Truy Cập Bị Từ Chối'
        };
      case 510:
        return {
          code: 510,
          label: 'NOT EXTENDED',
          title: 'Yêu Cầu Chưa Được Hỗ Trợ'
        };
      case 404:
      default:
        return {
          code: 404,
          label: 'NOT FOUND',
          title: 'Không Tìm Thấy Trang'
        };
    }
  });

  // Menu bên trái đúng như hình mẫu
  readonly menuItems: MenuItem[] = [
    { path: '/', title: 'Trang chủ' },
    { path: '/about', title: 'Về Yin' },
    { path: '/projects', title: 'Giải pháp' },
    { path: '/blog', title: 'Bài viết' },
    { path: '/contact', title: 'Liên hệ' }
  ];

  // Trạng thái đã dừng và khóa đúng 4 0 4
  readonly isLocked = signal<boolean>(false);

  // Cấu hình kích thước ô số (px)
  readonly itemHeight = 150; // Chiều cao mỗi chữ số (px) được tăng lớn hơn
  readonly restY = 100;      // Vị trí translateY tại điểm dừng để index 1 nằm ngay giữa khung 250px

  // Mỗi cột chỉ render TỐI ĐA 6 DIV trong DOM (đáp ứng đúng yêu cầu khi kiểm tra F12)
  readonly reel1 = signal<string[]>(['4', '4', '0', '4', '4', '0']);
  readonly reel2 = signal<string[]>(['4', '0', '4', '0', '4', '0']);
  readonly reel3 = signal<string[]>(['4', '4', '0', '4', '4', '0']);

  private isDestroyed = false;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private animationFrameId: number | null = null;

  ngOnInit(): void {
    // 1. Ẩn thanh navbar của layout chung khi ở trang này
    this.db.isNavbarHidden.set(true);

    // 2. Xác định mã trạng thái HTTP (404 | 403 | 510)
    const routeDataCode = this.activatedRoute.snapshot.data['statusCode'] as number | undefined;
    const currentPath =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : this.router.url;

    if (routeDataCode) {
      this.statusCode.set(routeDataCode);
    } else if (currentPath.includes('/403')) {
      this.statusCode.set(403);
    } else if (currentPath.includes('/510')) {
      this.statusCode.set(510);
    } else {
      this.statusCode.set(404);
    }

    const info = this.errorInfo();

    // 3. Cấu hình SEO
    this.titleService.setTitle(`${info.code} - ${info.title} | Yin`);
    this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });

    // 4. Analytics
    this.db.recordPageView(`/${info.code}`, 'direct');
    this.tracker.initTargetTracking(`page_${info.code}`, `Trang ${info.code}`);

    // 5. Khởi động Animation Slot Machine
    if (typeof window !== 'undefined') {
      this.safeTimeout(() => {
        this.startRollCycle();
      }, 250);
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.db.isNavbarHidden.set(false);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    for (const t of this.timeouts) {
      clearTimeout(t);
    }
    this.timeouts = [];
  }

  private safeTimeout(fn: () => void, delay: number): void {
    if (this.isDestroyed) return;
    const timer = setTimeout(() => {
      if (!this.isDestroyed) {
        fn();
      }
    }, delay);
    this.timeouts.push(timer);
  }

  /**
   * Tạo chuỗi số trong bộ nhớ cho mỗi vòng quay:
   * - Các số trung gian quay cuồng ở tốc độ cao (chạy khác nhau ở cả 3 cột).
   * - 3 số cuối khóa chuẩn xác: [Top, Center, Bottom].
   * - 3 số đệm phía sau để luôn đủ lát cắt 6 phần tử trong DOM.
   */
  private createReelSequence(
    steps: number,
    finalTop: string,
    finalCenter: string,
    finalBottom: string,
    seedPattern: string[]
  ): string[] {
    const list: string[] = [];
    for (let i = 0; i < steps; i++) {
      list.push(seedPattern[i % seedPattern.length]);
    }
    list.push(finalTop, finalCenter, finalBottom);
    list.push(finalTop, finalCenter, finalBottom);
    return list;
  }

  /**
   * Vòng lặp roll số 3 cột với Virtual Conveyor Belt (tối đa 6 div mỗi cột):
   * - Mỗi cột chạy số lượng bước khác nhau (18 vs 25 vs 32) và dữ liệu trung gian khác nhau.
   * - Tốc độ cao ban đầu (thang 10 khoảng 7), hãm phanh chậm dần (0 -> 90%) và dừng hẳn tại 100%.
   * - Khi dừng lại: Cột 1 dừng ở 4, Cột 2 dừng ở 0, Cột 3 dừng ở 4 -> tạo thành 4 0 4.
   * - Giữ nguyên 3.2 giây rồi tự động lặp lại.
   */
  private startRollCycle(): void {
    if (this.isDestroyed) return;

    const el1 = this.reelCol1()?.nativeElement;
    const el2 = this.reelCol2()?.nativeElement;
    const el3 = this.reelCol3()?.nativeElement;
    if (!el1 || !el2 || !el3) return;

    this.isLocked.set(false);

    // Chuẩn bị 3 dãy số chạy khác nhau hoàn toàn trong bộ nhớ
    const seq1 = this.createReelSequence(18, '4', '4', '0', ['4', '0', '4', '0', '4', '4', '0']);
    const seq2 = this.createReelSequence(25, '4', '0', '4', ['0', '4', '0', '0', '4', '0', '4']);
    const seq3 = this.createReelSequence(32, '4', '4', '0', ['4', '4', '0', '0', '4', '0', '4', '4']);

    const startTime = performance.now();
    const dur1 = 1850;
    const dur2 = 2250;
    const dur3 = 2650;

    let prevS1 = -1;
    let prevS2 = -1;
    let prevS3 = -1;

    // Đường cong giảm tốc: rất nhanh ở đầu (tốc độ ~7/10), hãm chậm dần và dừng êm tại 100%
    const ease = (t: number) => 1 - Math.pow(1 - t, 3.5);

    const step = (now: number) => {
      if (this.isDestroyed) return;

      const elapsed = now - startTime;

      // Cột 1
      const t1 = Math.min(1, elapsed / dur1);
      const D1 = ease(t1) * (18 * this.itemHeight);
      const s1 = Math.min(18, Math.floor(D1 / this.itemHeight));
      const r1 = D1 % this.itemHeight;
      const y1 = -(this.restY + (t1 === 1 ? 0 : r1));
      el1.style.transform = `translateY(${y1}px)`;
      if (s1 !== prevS1) {
        prevS1 = s1;
        this.reel1.set(seq1.slice(s1, s1 + 6));
      }

      // Cột 2
      const t2 = Math.min(1, elapsed / dur2);
      const D2 = ease(t2) * (25 * this.itemHeight);
      const s2 = Math.min(25, Math.floor(D2 / this.itemHeight));
      const r2 = D2 % this.itemHeight;
      const y2 = -(this.restY + (t2 === 1 ? 0 : r2));
      el2.style.transform = `translateY(${y2}px)`;
      if (s2 !== prevS2) {
        prevS2 = s2;
        this.reel2.set(seq2.slice(s2, s2 + 6));
      }

      // Cột 3
      const t3 = Math.min(1, elapsed / dur3);
      const D3 = ease(t3) * (32 * this.itemHeight);
      const s3 = Math.min(32, Math.floor(D3 / this.itemHeight));
      const r3 = D3 % this.itemHeight;
      const y3 = -(this.restY + (t3 === 1 ? 0 : r3));
      el3.style.transform = `translateY(${y3}px)`;
      if (s3 !== prevS3) {
        prevS3 = s3;
        this.reel3.set(seq3.slice(s3, s3 + 6));
      }

      if (t3 < 1) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        // Cả 3 cột đã dừng lại hoàn chỉnh thành 4 0 4!
        this.isLocked.set(true);

        // Đảm bảo chính xác 100% vị trí và nội dung dừng cuối
        el1.style.transform = `translateY(${-this.restY}px)`;
        el2.style.transform = `translateY(${-this.restY}px)`;
        el3.style.transform = `translateY(${-this.restY}px)`;
        this.reel1.set(seq1.slice(18, 24));
        this.reel2.set(seq2.slice(25, 31));
        this.reel3.set(seq3.slice(32, 38));

        // Giữ trạng thái hiển thị 3.2 giây rồi tự động cuộn vòng mới
        this.safeTimeout(() => {
          this.startRollCycle();
        }, 3200);
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
  }
}
