import {ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {FullCalendarComponent} from '@fullcalendar/angular';
import {PluginDef} from "@fullcalendar/core/plugin-system";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import {AbstractComponent} from '../abstract-component';
import {EventObject, FullCalendarService} from '../../services/full-calendar/full-calendar.service';
import {SectionFetchAllParams} from '../../services/section/section.interfaces';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {switchMap, takeUntil, tap} from 'rxjs/operators';

/**
 * @see https://fullcalendar.io/docs/header
 *
 * Setting the header options to false will display no header.
 * An object can be supplied with properties left, center, and right.
 * These properties contain strings with comma/space separated values.
 * Values separated by a comma will be displayed adjacently.
 * Values separated by a space will be displayed with a small gap in between.
 * Strings can contain any of the following values:
 * - title
 * - prev
 * - next
 * - prevYear
 * - nextYear
 * - today
 * - a view name: button that will switch the calendar to any of the available views
 * - '' (no value): Specifying an empty string for a property will cause it display no text/buttons.
 */
export interface CalendarHeader {
  left: string;
  center: string;
  right: string;
}

@Component({
  selector: 'classplan-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent extends AbstractComponent implements OnInit, OnChanges {

  @ViewChild(FullCalendarComponent, { static: true }) refFullCalendar: FullCalendarComponent;

  @Input() plugins: PluginDef[];
  @Input() header: CalendarHeader;
  @Input() events: EventObject[];
  @Input() filters: SectionFetchAllParams;
  @Input() allDaySlot: boolean = true;

  events$: Observable<EventObject[]>;

  protected filters$: BehaviorSubject<SectionFetchAllParams>;

  constructor(
    protected fullcalendar: FullCalendarService,
  ) {
    super();

    this.header = this.getCalendarHeaderConfig();
    this.plugins = [dayGridPlugin, timeGridPlugin];

    this.filters$ = new BehaviorSubject<SectionFetchAllParams>(undefined);
  }

  ngOnInit() {
    this.events$ = this.filters$.asObservable()
      .pipe(
        switchMap((filters: SectionFetchAllParams) => {
          if (!filters || !filters.block) {
            return of([]);
          }

          return this.fullcalendar.fetchAll(filters);
        }),
        tap((events: EventObject[]) => {
          if (!events || !events.length) {
            return;
          }

          const startDate = this.fullcalendar.getEarliestSectionStart(events);
          this.refFullCalendar.getApi().gotoDate(startDate);
        }),
        takeUntil(this.ngUnsubscribe$),
      )
    ;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('filters' in changes) {
      this.filters$.next(changes.filters.currentValue);
    }
  }

  protected getCalendarHeaderConfig() {
    return {
      left: 'prev,next',
      center: 'title',
      right: 'timeGridWeek,timeGridDay',
    };
  }

}
