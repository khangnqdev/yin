import { Component, inject, computed, OnInit } from '@angular/core';
import { LocalDbService } from '../../../core/services/local-db.service';
import { AnalyticsTrackerService } from '../../../core/services/analytics-tracker.service';
import { DynamicPageHostComponent } from '../../../shared/components/dynamic-page-host/dynamic-page-host.component';

@Component({
  selector: 'yin-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [DynamicPageHostComponent]
})
export class AboutComponent implements OnInit {
  private readonly db = inject(LocalDbService);
  private readonly tracker = inject(AnalyticsTrackerService);

  protected readonly pageDoc = computed(() => this.db.getPageDocument('about'));
  protected readonly blocks = computed(() => this.pageDoc()?.blocks || []);

  async ngOnInit(): Promise<void> {
    this.db.recordPageView('/about', 'direct');
    this.tracker.initTargetTracking('page_about', 'Giới Thiệu Yin');
    await this.db.fetchPageByKey('about');
  }
}

