import { Component, input } from '@angular/core';
import { StatsBlock } from '../../../../core/models/page-block.model';

@Component({
  selector: 'yin-stats-block',
  templateUrl: './stats-block.component.html',
  styleUrls: ['./stats-block.component.css']
})
export class StatsBlockComponent {
  public readonly block = input.required<StatsBlock>();
}
