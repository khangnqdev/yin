import { Component, inject, computed, OnInit } from '@angular/core';
import { LocalDbService } from '../../../core/services/local-db.service';
import { AnalyticsTrackerService } from '../../../core/services/analytics-tracker.service';
import { DynamicPageHostComponent } from '../../../shared/components/dynamic-page-host/dynamic-page-host.component';

@Component({
  selector: 'yin-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
  imports: [DynamicPageHostComponent]
})
export class ProjectsComponent implements OnInit {
  private readonly db = inject(LocalDbService);
  private readonly tracker = inject(AnalyticsTrackerService);

  protected readonly pageDoc = computed(() => this.db.getPageDocument('projects'));
  protected readonly blocks = computed(() => this.pageDoc()?.blocks || []);

  ngOnInit(): void {
    this.db.recordPageView('/projects', 'direct');
    this.tracker.initTargetTracking('page_projects', 'Dự Án Yin');
  }
}

