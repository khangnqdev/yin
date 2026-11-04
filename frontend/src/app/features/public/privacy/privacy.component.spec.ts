import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  let component: PrivacyComponent;
  let fixture: ComponentFixture<PrivacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the privacy policy component', () => {
    expect(component).toBeTruthy();
  });

  it('should set acceptedNotice to true when confirming acceptance', () => {
    expect(component['acceptedNotice']()).toBe(false);
    component['confirmAcceptance']();
    expect(component['acceptedNotice']()).toBe(true);
  });
});

