import {ChangeDetectionStrategy, Component, ComponentFactoryResolver, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FullCalendarComponent, CalendarOptions} from '@fullcalendar/angular';
import tippy, {hideAll} from 'tippy.js';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {catchError, map, shareReplay, switchMap, take, takeUntil} from 'rxjs/operators';
import {AbstractComponent} from '../abstract-component';
import {EventObject, FullCalendarService} from '../../services/full-calendar/full-calendar.service';
import {SectionMeetingType, SectionObject} from '../../services/section/section.interfaces';
import {SearchFilters} from '../search/helper/filter.interfaces';
import {EventTooltipComponent} from '../event-tooltip/event-tooltip.component';
import {TooltipHostDirective} from '../../directives/tooltip-host/tooltip-host.directive';
import {environment} from '../../../environments/environment';

interface ViewObject {
  type: string;
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
  @ViewChild(TooltipHostDirective, { static: true }) refTooltip: TooltipHostDirective;

  @Input() options: CalendarOptions;
  @Input() filters: SearchFilters;

  @Output() events: EventEmitter<EventObject[]>;
  @Output() title:  EventEmitter<string>;

  events$:  Observable<EventObject[]>;
  filters$: BehaviorSubject<SearchFilters>;
  options$: BehaviorSubject<CalendarOptions>;

  constructor(
    protected componentFactoryResolver: ComponentFactoryResolver,
    protected elementRef: ElementRef,
    protected snackBar: MatSnackBar,
    protected fullcalendar: FullCalendarService,
  ) {
    super();

    this.events = new EventEmitter<EventObject[]>();
    this.title  = new EventEmitter<string>();

    this.options$ = new BehaviorSubject<CalendarOptions>(undefined);
    this.filters$ = new BehaviorSubject<SearchFilters>(undefined);
  }

  /**
   * @inheritDoc
   */
  ngOnInit(): void {

    this.options$.next(this.getCalendarOptions(this.options));

    this.events$ = this.filters$.asObservable()
      .pipe(
        switchMap((filters: SearchFilters) => {
          hideAll({duration: 0});

          if (!filters || !filters.blocks || !filters.blocks.length) {
            return of([]);
          }

          this.refFullCalendar.getApi().removeAllEvents();

          return this.fullcalendar.fetchAll(filters, filters.uiFilters.colors);
        }),
        catchError(() => {

          this.snackBar.open(
            `An error occurred while fetching your classes. Please try again, or reduce your filter complexity.`,
            undefined,
            {duration: 5000}
          );

          return of([]);
        }),
        takeUntil(this.ngUnsubscribe$),
        shareReplay(1),
      )
    ;

    this.events$
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe(events => {
        if (!events || !events.length) {
          const filters = this.filters$.getValue();

          if (filters && !!filters.term && !!filters.term.id) {
            this.snackBar.open('No results found.', undefined, {
              duration:   5000,
              panelClass: 'center',
            });
          }

          return;
        }

        this
          .updateOptions('events', events)
          .shiftCalendarDate(events)
        ;

        this.events.next(events);
      })
    ;
  }

  /**
   * @inheritDoc
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('filters' in changes) {
      if (!!changes.filters.currentValue && !!changes.filters.currentValue.uiFilters) {
        const allDaySlot = (changes.filters.currentValue as SearchFilters).uiFilters.showAllDay;
        this.updateOptions('allDaySlot', allDaySlot);
      }

      this.filters$.next(changes.filters.currentValue);
    }
  }

  updateOptions(options: CalendarOptions): this;
  updateOptions<T extends keyof CalendarOptions>(option: keyof CalendarOptions, value: CalendarOptions[T]): this;

  /**
   * Update full-calendar's options.
   *
   * @param options
   * @param value
   */
  updateOptions<T extends keyof CalendarOptions>(
    options: CalendarOptions | T,
    value?: CalendarOptions[T],
  ): this {
    let config = this.options$.getValue() as CalendarOptions;

    if (typeof options === 'object') {
      config = Object.assign(config, options);
    } else {
      config[options] = value;
    }

    this.options$.next(config);

    return this;
  }

  /**
   * Fired after the calendar dom renders.
   *
   * @param event
   */
  calendarRendered(event: {view: ViewObject, el: HTMLElement}): void {
    this.setTitle();

    const headerConfig = this.getCalendarViewOptions(event.view.type);
    this.updateOptions(headerConfig);
  }

  /**
   * Fired before an event is rendered.
   *
   * @param data
   */
  eventRender(data: {
    el: HTMLElement,
    event: EventObject,
    view: ViewObject,
  }) {

    tippy(data.el, {
      allowHTML: true,
      appendTo: this.elementRef.nativeElement,
      lazy: true,
      maxWidth: 320,
      onShow: () => hideAll({duration: 0}),
      onTrigger: (instance) => {
        const ttBody = this.renderTooltip(data.event.extendedProps.section).location.nativeElement;

        instance.setContent(ttBody);
      }
    });

    return data.el;
  }

  /**
   * Set FC's toolbar title.
   */
  setTitle(override?: string): void {
    const doSet = (title: string) => {
      const refTitle = document.querySelector('.fc-toolbar-title');

      if (refTitle) {
        refTitle.innerHTML = title;
      }

      this.title.next(title);
    };

    if (undefined !== override) {
      return doSet(override);
    }

    this.events$
      .pipe(
        take(1),
        map(events => !events || !events.length ? '' : events[0].extendedProps.section.block.term.name),
      )
      .subscribe(title => doSet(title))
    ;
  }

  /**
   * Update the tooltip ng-template with a new section.
   *
   * @param section
   */
  protected renderTooltip(section: SectionObject) {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(EventTooltipComponent);
    const viewContainerRef = this.refTooltip.viewContainerRef;

    viewContainerRef.clear();

    const componentRef = viewContainerRef.createComponent(componentFactory);
    componentRef.instance.section = section;

    componentRef.changeDetectorRef.detectChanges();

    return componentRef;
  }

  /**
   * Parse the earliest start date, and then move it forward 2 weeks to account for MLK day.
   *
   * @param events
   */
  protected shiftCalendarDate(events: EventObject[]): void {
    const hasExam  = !!events.find(e => e.extendedProps.section.meeting_type === SectionMeetingType.Exam);
    const jumpDays = hasExam ? 0 : 14;

    const startDate = this.fullcalendar.getEarliestSectionStart(events);
    startDate.setDate(startDate.getDate() + jumpDays);

    this.refFullCalendar.getApi().gotoDate(
      this.fullcalendar.formatDate(startDate)
    );
  }

  /**
   * Create the calendar config.
   *
   * @param overrides
   */
  protected getCalendarOptions(overrides: CalendarOptions = {}): CalendarOptions {
    const defaultOptions = {
      initialView: 'timeGridWeek',
      slotMinTime: '06:00:00',
      slotMaxTime: '24:00:00',
      contentHeight: 'auto',
      allDayContent: 'unassigned',
      startParam: null,
      endParam: null,
      lazyFetching: true,
      weekends: false,
      eventOrder: ['start', 'allDay', 'backgroundColor'],
      viewDidMount: ($event) => this.calendarRendered($event),
      eventDidMount: ($event) => this.eventRender($event),
      datesSet: () => this.setTitle(),
    };

    const options = Object.assign(defaultOptions, overrides || {});
    const views   = this.getCalendarViewOptions(options.initialView);

    return Object.assign(options, views);
  }

  /**
   * Get the default options for setting FC's toolbar content layout.
   */
  protected getCalendarViewOptions(viewName: string, overrides: CalendarOptions = this.options) {
    const getColumnHeaderFormat = (weekdayFormat: string) => {
      const config = { weekday: weekdayFormat };
      return !environment.showDateInColumnHeader
        ? config
        : Object.assign(config, { month: 'numeric', day: 'numeric', omitCommas: true })
      ;
    };

    const viewConfig = {
      dayHeaderFormat: getColumnHeaderFormat('timeGridDay' === viewName ? 'long' : 'short'),
      headerToolbar: {
        start: 'prev,next',
        center: '',
        end: 'timeGridWeek,timeGridDay,dayGridWeek',
      },
      buttonText: {
        timeGridWeek: 'default',
        timeGridDay: 'single',
        dayGridWeek: 'compressed',
      },
    };

    return Object.assign(viewConfig, overrides || {});
  }

}
