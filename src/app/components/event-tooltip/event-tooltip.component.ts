import {Component, Input, ViewEncapsulation} from '@angular/core';
import {SectionObject} from '../../services/section/section.interfaces';

@Component({
  selector: 'classplan-event-tooltip',
  templateUrl: './event-tooltip.component.html',
  styleUrls: ['./event-tooltip.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventTooltipComponent {

  @Input() section: SectionObject;

  constructor() {}

}
