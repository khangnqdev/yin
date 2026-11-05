import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { NotFoundComponent } from './not-found.component';
import { LocalDbService } from '../../../core/services/local-db.service';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let db: LocalDbService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    db = TestBed.inject(LocalDbService);
    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the not-found component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with 5 menu items matching the mockup', () => {
    expect(component.menuItems.length).toBe(5);
    expect(component.menuItems[0].title).toBe('Trang chủ');
    expect(component.menuItems[1].title).toBe('Về Yin');
    expect(component.menuItems[2].title).toBe('Giải pháp');
    expect(component.menuItems[3].title).toBe('Bài viết');
    expect(component.menuItems[4].title).toBe('Liên hệ');
  });

  it('should set isNavbarHidden to true on init and restore to false on destroy', () => {
    expect(db.isNavbarHidden()).toBe(true);
    fixture.destroy();
    expect(db.isNavbarHidden()).toBe(false);
  });

  it('should adapt error info for status codes 404, 403, and 510', () => {
    // 404 default
    component.statusCode.set(404);
    expect(component.errorInfo().code).toBe(404);
    expect(component.errorInfo().label).toBe('NOT FOUND');

    // 403 Forbidden
    component.statusCode.set(403);
    expect(component.errorInfo().code).toBe(403);
    expect(component.errorInfo().label).toBe('FORBIDDEN');

    // 510 Not Extended
    component.statusCode.set(510);
    expect(component.errorInfo().code).toBe(510);
    expect(component.errorInfo().label).toBe('NOT EXTENDED');
  });

  it('should render at most 6 divs per column and stop exactly at 4 0 4 payline', () => {
    // 1. Kiểm tra giới hạn: Mỗi cột chỉ render tối đa 6 div trong DOM
    expect(component.reel1().length).toBeLessThanOrEqual(6);
    expect(component.reel2().length).toBeLessThanOrEqual(6);
    expect(component.reel3().length).toBeLessThanOrEqual(6);
    expect(component.reel1().length).toBe(6);
    expect(component.reel2().length).toBe(6);
    expect(component.reel3().length).toBe(6);

    // 2. Hàng giữa (center row - index 1): 4 0 4
    const centerRow = [
      component.reel1()[1],
      component.reel2()[1],
      component.reel3()[1]
    ].join(' ');
    expect(centerRow).toBe('4 0 4');

    // 3. Hàng trên (top row - index 0): 4 4 4
    const topRow = [
      component.reel1()[0],
      component.reel2()[0],
      component.reel3()[0]
    ].join(' ');
    expect(topRow).toBe('4 4 4');

    // 4. Hàng dưới (bottom row - index 2): 0 4 0
    const bottomRow = [
      component.reel1()[2],
      component.reel2()[2],
      component.reel3()[2]
    ].join(' ');
    expect(bottomRow).toBe('0 4 0');
  });
});
