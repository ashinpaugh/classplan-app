import {FullCalendarModule} from '@fullcalendar/angular';
import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {CalendarComponent} from './calendar.component';
import {DirectivesModule} from '../../directives/directives.module';


@NgModule({
  declarations: [
    CalendarComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    FullCalendarModule,
    MatSnackBarModule,
    DirectivesModule,
  ],
  bootstrap: [CalendarComponent],
  exports: [CalendarComponent],
})
export class CalendarComponentModule { }
