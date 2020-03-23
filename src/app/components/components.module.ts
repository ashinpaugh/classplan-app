import {NgModule} from '@angular/core';
import {SearchComponentModule} from './search/search.module';
import {CalendarComponentModule} from './calendar/calendar.module';


@NgModule({
  imports: [
    SearchComponentModule,
    CalendarComponentModule,
  ],
  exports: [
    SearchComponentModule,
    CalendarComponentModule,
  ],
  declarations: [],
  providers: [],
  bootstrap: [],
  entryComponents: [],
})
export class ComponentsModule { }
