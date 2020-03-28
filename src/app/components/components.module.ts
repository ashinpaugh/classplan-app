import {NgModule} from '@angular/core';
import {SearchComponentModule} from './search/search.module';
import {CalendarComponentModule} from './calendar/calendar.module';
import {EventTooltipComponent} from './event-tooltip/event-tooltip.component';
import {DirectivesModule} from '../directives/directives.module';
import {EventTooltipComponentModule} from './event-tooltip/event-tooltip.module';


@NgModule({
  imports: [
    DirectivesModule,
    SearchComponentModule,
    CalendarComponentModule,
    EventTooltipComponentModule,
  ],
  exports: [
    DirectivesModule,
    SearchComponentModule,
    CalendarComponentModule,
    EventTooltipComponent,
  ],
  declarations: [],
  providers: [],
  bootstrap: [],
  entryComponents: [],
})
export class ComponentsModule { }
