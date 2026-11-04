import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  DynamicBlock, 
  HeroBlock, 
  StatsBlock, 
  ProjectsGridBlock, 
  RichContentBlock, 
  CtaBlock,
  TextBlock,
  StepsBlock,
  OptionsBlock,
  MultiColumnBlock,
  ProgramsBlock,
  VideoBlock,
  FormBlock,
  SectionBlock,
  FaqBlock,
  TestimonialsBlock
} from '../../../core/models/page-block.model';
import { YinIconComponent } from '../../../core/components/icon/icon.component';
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
    RouterLink,
    FormsModule,
    YinIconComponent,
    HeroBlockComponent,
    StatsBlockComponent,
    ProjectsGridBlockComponent,
    RichContentBlockComponent,
    CtaBlockComponent
  ]
})
export class DynamicPageHostComponent {
  public readonly blocks = input.required<DynamicBlock[]>();

  // Casting helpers for template type-safety
  asHero(b: DynamicBlock): HeroBlock { return b as HeroBlock; }
  asStats(b: DynamicBlock): StatsBlock { return b as StatsBlock; }
  asProjects(b: DynamicBlock): ProjectsGridBlock { return b as ProjectsGridBlock; }
  asRich(b: DynamicBlock): RichContentBlock { return b as RichContentBlock; }
  asCta(b: DynamicBlock): CtaBlock { return b as CtaBlock; }
  asText(b: DynamicBlock): TextBlock { return b as TextBlock; }
  asSteps(b: DynamicBlock): StepsBlock { return b as StepsBlock; }
  asOptions(b: DynamicBlock): OptionsBlock { return b as OptionsBlock; }
  asMultiColumn(b: DynamicBlock): MultiColumnBlock { return b as MultiColumnBlock; }
  asPrograms(b: DynamicBlock): ProgramsBlock { return b as ProgramsBlock; }
  asVideo(b: DynamicBlock): VideoBlock { return b as VideoBlock; }
  asForm(b: DynamicBlock): FormBlock { return b as FormBlock; }
  asSection(b: DynamicBlock): SectionBlock { return b as SectionBlock; }
  asFaq(b: DynamicBlock): FaqBlock { return b as FaqBlock; }
  asTestimonials(b: DynamicBlock): TestimonialsBlock { return b as TestimonialsBlock; }

  getBlockStyles(block: DynamicBlock): Record<string, string> {
    const s = block.style || {};
    const styles: Record<string, string> = {};
    if (s.backgroundColor) styles['background-color'] = s.backgroundColor;
    if (s.backgroundGradient) styles['background-image'] = s.backgroundGradient;
    if (s.backgroundImage) {
      styles['background-image'] = `url('${s.backgroundImage}')`;
      styles['background-size'] = 'cover';
      styles['background-position'] = 'center';
    }
    if (s.textColor) styles['color'] = s.textColor;
    if (s.textAlign) styles['text-align'] = s.textAlign;
    if (s.borderRadius) {
      const radiusMap: Record<string, string> = {
        none: '0px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        full: '9999px'
      };
      styles['border-radius'] = radiusMap[s.borderRadius] || '0px';
    }
    return styles;
  }
}
