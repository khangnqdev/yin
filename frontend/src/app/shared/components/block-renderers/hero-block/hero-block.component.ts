import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroBlock } from '../../../../core/models/page-block.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import { ContactActionBaseComponent } from '../../contact-action/contact-action-base.component';

@Component({
  selector: 'yin-hero-block',
  templateUrl: './hero-block.component.html',
  styleUrls: ['./hero-block.component.css'],
  imports: [RouterLink, YinIconComponent]
})
export class HeroBlockComponent extends ContactActionBaseComponent {
  public readonly block = input.required<HeroBlock>();

  onBtnClick(url: string, event: MouseEvent): void {
    if (this.isContactUrl(url)) {
      this.handleContactClick(event);
    }
  }
}
