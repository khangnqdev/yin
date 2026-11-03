import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CtaBlock } from '../../../../core/models/page-block.model';
import { YinIconComponent } from '../../../../core/components/icon/icon.component';
import { ContactActionBaseComponent } from '../../contact-action/contact-action-base.component';

@Component({
  selector: 'yin-cta-block',
  templateUrl: './cta-block.component.html',
  styleUrls: ['./cta-block.component.css'],
  imports: [RouterLink, YinIconComponent]
})
export class CtaBlockComponent extends ContactActionBaseComponent {
  public readonly block = input.required<CtaBlock>();

  onBtnClick(url: string, event: MouseEvent): void {
    if (this.isContactUrl(url)) {
      this.handleContactClick(event);
    }
  }
}
