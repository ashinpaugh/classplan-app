import {ChangeDetectionStrategy, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid'
import {FullCalendarComponent} from '@fullcalendar/angular';
import {PluginDef} from '@fullcalendar/core/plugin-system';
import {MatDialog} from '@angular/material/dialog';
import {SearchFilters, SearchModalComponent} from './components/search-modal/search-modal.component';
import {take} from 'rxjs/operators';

@Component({
  selector: 'classplan-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {

  @ViewChild(FullCalendarComponent, { static: true }) fullCalendar: FullCalendarComponent;

  calendarPlugins: PluginDef[];
  fcHeader$: BehaviorSubject<object>;
  events$: BehaviorSubject<object>;


  protected storedFilters: SearchFilters;

  constructor(
    protected dialog: MatDialog
  ) {
    this.events$ = new BehaviorSubject<object>(undefined);
    this.fcHeader$ = new BehaviorSubject<object>(this.getCalendarHeaderConfig());
    this.calendarPlugins = [dayGridPlugin, timeGridPlugin];
  }

  ngOnInit(): void {
  }

  openSearch(): void {
    const searchModal = this.dialog.open<SearchModalComponent>(SearchModalComponent, {
      width: '50%',
      minHeight: 500,
      position: {top: '20%'},
      data: this.storedFilters || {}
    });

    searchModal.afterClosed()
      .pipe(take(1))
      .subscribe((data: {filters: SearchFilters, events: any}) => {
        this.storedFilters = data.filters;

        this.events$.next(data.events);
      })
    ;
  }

  protected getCalendarHeaderConfig(title: string = '') {
    return {
      left: 'prev,next',
      center: 'title',
      right: 'timeGridWeek,timeGridDay',
      title,
    };
  }
}
