import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {FullCalendarComponent} from '@fullcalendar/angular';
import {PluginDef} from "@fullcalendar/core/plugin-system";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import tippy, {hideAll} from 'tippy.js';
import {AbstractComponent} from '../abstract-component';
import {EventObject, FullCalendarService} from '../../services/full-calendar/full-calendar.service';
import {SectionObject} from '../../services/section/section.interfaces';
import {AdvancedFilters} from '../search/search.component';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {shareReplay, switchMap, take, takeUntil} from 'rxjs/operators';

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
  @ViewChild('toolTip', { static: true, read: ElementRef }) refTooltip: ElementRef;

  @Input() plugins: PluginDef[];
  @Input() header: CalendarHeader;
  @Input() filters: AdvancedFilters;
  @Input() allDaySlot: boolean = true;

  @Output() events: EventEmitter<EventObject[]>;

  events$: Observable<EventObject[]>;
  filters$: BehaviorSubject<AdvancedFilters>;

  constructor(
    protected elementRef: ElementRef,
    protected fullcalendar: FullCalendarService,
  ) {
    super();

    this.header = this.getCalendarHeaderConfig();
    this.plugins = [dayGridPlugin, timeGridPlugin];

    this.filters$ = new BehaviorSubject<AdvancedFilters>(undefined);
    this.events   = new EventEmitter<EventObject[]>();
  }

  ngOnInit() {
    this.events$ = this.filters$.asObservable()
      .pipe(
        switchMap((filters: AdvancedFilters) => {
          if (!filters || !filters.blocks || !filters.blocks.length) {
            return of([]);
          }

          return this.fullcalendar.fetchAll(filters, filters.advanced.colors);
        }),
        takeUntil(this.ngUnsubscribe$),
        shareReplay(1),
      )
    ;

    this.events$
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe(events => {
        this.events.next(events);

        if (!events || !events.length) {
          return;
        }

        const startDate = this.fullcalendar.getEarliestSectionStart(events);
        this.refFullCalendar.getApi().gotoDate(startDate);
      })
    ;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('filters' in changes) {
      if (!!changes.filters.currentValue && !!changes.filters.currentValue.advanced) {
        this.allDaySlot = (changes.filters.currentValue as AdvancedFilters).advanced.showAllDay;
      }

      this.filters$.next(changes.filters.currentValue);
    }
  }

  /**
   * Fired after the calendar dom renders.
   *
   * @param event
   */
  calendarRendered(event: {view: any, el: HTMLElement}): void {
    this.setTitle();
  }

  /**
   * Fired before an event is rendered.
   *
   * @param data
   */
  eventRender(data: {
    event: EventObject,
    el: HTMLElement,
    isMirror: boolean,
    isStart: boolean,
    isEnd: boolean,
    view: any
  }) {
    tippy(data.el, {
      allowHTML: true,
      content: this.createTooltipContent(data.event.extendedProps.section),
      appendTo: this.elementRef.nativeElement,
      lazy: true,
      maxWidth: 320,
      onShow: () => hideAll({duration: 0}),
    });

    return data.el;
  }

  /**
   * Override the FC toolbar title.
   *
   * There is currently no API to support changing this dynamically.
   *
   * @param data
   */
  datesRendered(data: {view: any, el: HTMLElement}) {
    this.setTitle();
  }

  /**
   * Create a tooltip for event hover events.
   *
   * @param section
   */
  protected createTooltipContent(section: SectionObject): string {
    let days = `
      <div class="row">
        <span class="label">Days:</span>
        <span class="value">${section.days}</span>
      </div>
    `;

    if (!section.days) {
      days = '';
    }

    return `
      <div class="cp-tooltip-content">
        <div class="header">
          <div class="row">
            <span class="bold">${section.subject.name} ${section.course.number}: ${section.number}</span>
            <span class="spacer"></span>
            <span class="bold">${section.num_enrolled} / ${section.maximum_enrollment}</span>
          </div>

          <span class="spacer"></span>

          <div class="bold">${section.course.name}</div>
        </div>

        <div class="body">
          <hr>
          <div class="row">
            <span class="label">Location:</span>
            <div class="value">
              ${section.campus.name}
              <br/>
              ${section.building.name} - ${section.room.number}
            </div>
          </div>

          <div class="row">
            <span class="label">Instructor:</span>
            <span class="value ellipses">${section.instructor.name}</span>
          </div>

          ${days}
        </div>
      </div>
    `;
  }

  /**
   * Get the default options for setting FC's toolbar content layout.
   */
  protected getCalendarHeaderConfig(overrides?: object) {
    const headers = {
      left: 'prev,next',
      center: 'title',
      right: 'timeGridWeek,timeGridDay,dayGridWeek',
    };

    return Object.assign(headers, overrides || {});
  }

  /**
   * Set FC's toolbar title.
   */
  protected setTitle(override?: string): void {
    const doSet = (title: string) => {
      const refTitle = document.querySelector('.fc-center h2');

      if (refTitle) {
        refTitle.innerHTML = title;
      }
    };

    if (undefined !== override) {
      return doSet(override);
    }

    this.events$
      .pipe(take(1))
      .subscribe(events => {
        if (!events || !events.length) {
          return doSet('');
        }

        doSet(events[0].extendedProps.section.block.term.name);
      })
    ;
  }

}
