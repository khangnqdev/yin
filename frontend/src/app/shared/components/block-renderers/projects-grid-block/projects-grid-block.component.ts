import { Component, input, signal, computed } from '@angular/core';
import { ProjectsGridBlock, ProjectItem } from '../../../../core/models/page-block.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import { YinContactLinkComponent } from '../../contact-action/contact-link.component';

@Component({
  selector: 'yin-projects-grid-block',
  templateUrl: './projects-grid-block.component.html',
  styleUrls: ['./projects-grid-block.component.css'],
  imports: [YinIconComponent, YinContactLinkComponent]
})
export class ProjectsGridBlockComponent {
  public readonly block = input.required<ProjectsGridBlock>();
  protected readonly selectedCategory = signal<string>('ALL');

  protected readonly categories = computed(() => {
    const list: ProjectItem[] = this.block().projects || [];
    const set = new Set(list.map((p: ProjectItem) => p.category));
    return ['ALL', ...Array.from(set)];
  });

  protected readonly filteredProjects = computed(() => {
    const cat = this.selectedCategory();
    const list: ProjectItem[] = this.block().projects || [];
    
    // Early Return nếu chọn hiển thị tất cả
    if (cat === 'ALL') {
      return list;
    }
    return list.filter((p: ProjectItem) => p.category === cat);
  });

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }
}
