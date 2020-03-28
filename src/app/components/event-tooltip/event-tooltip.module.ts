import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {EventTooltipComponent} from './event-tooltip.component';


@NgModule({
  declarations: [
    EventTooltipComponent,
  ],
  imports: [
    CommonModule,
  ],
  bootstrap: [EventTooltipComponent],
  exports: [EventTooltipComponent],
})
export class EventTooltipComponentModule { }
