import { Component, input } from '@angular/core';
import { DynamicBlock } from '../../../core/models/page-block.model';
import { HeroBlockComponent } from '../block-renderers/hero-block/hero-block.component';
import { StatsBlockComponent } from '../block-renderers/stats-block/stats-block.component';
import { ProjectsGridBlockComponent } from '../block-renderers/projects-grid-block/projects-grid-block.component';
import { RichContentBlockComponent } from '../block-renderers/rich-content-block/rich-content-block.component';
import { CtaBlockComponent } from '../block-renderers/cta-block/cta-block.component';

@Component({
  selector: 'yin-dynamic-page-host',
  templateUrl: './dynamic-page-host.component.html',
  styleUrls: ['./dynamic-page-host.component.css'],
  imports: [
    HeroBlockComponent,
    StatsBlockComponent,
    ProjectsGridBlockComponent,
    RichContentBlockComponent,
    CtaBlockComponent
  ]
})
export class DynamicPageHostComponent {
  public readonly blocks = input.required<DynamicBlock[]>();
}

