import { Component, input } from '@angular/core';
import { RichContentBlock } from '../../../../core/models/page-block.model';

@Component({
  selector: 'yin-rich-content-block',
  templateUrl: './rich-content-block.component.html',
  styleUrls: ['./rich-content-block.component.css']
})
export class RichContentBlockComponent {
  public readonly block = input.required<RichContentBlock>();
}
