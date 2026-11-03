import { Component, inject, computed, OnInit } from '@angular/core';
import { LocalDbService } from '../../../core/services/local-db.service';
import { AnalyticsTrackerService } from '../../../core/services/analytics-tracker.service';
import { DynamicPageHostComponent } from '../../../shared/components/dynamic-page-host/dynamic-page-host.component';

@Component({
  selector: 'yin-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [DynamicPageHostComponent]
})
export class HomeComponent implements OnInit {
  private readonly db = inject(LocalDbService);
  private readonly tracker = inject(AnalyticsTrackerService);

  protected readonly pageDoc = computed(() => this.db.getPageDocument('home'));
  protected readonly blocks = computed(() => this.pageDoc()?.blocks || []);

  ngOnInit(): void {
    this.db.recordPageView('/', 'direct');
    this.tracker.initTargetTracking('page_home', 'Trang Chủ Yin');
  }
}

