import {FullCalendarModule} from '@fullcalendar/angular';
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {CalendarComponent} from './calendar.component';


@NgModule({
  declarations: [
    CalendarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
  ],
  bootstrap: [CalendarComponent],
  exports: [CalendarComponent],
})
export class CalendarComponentModule { }
