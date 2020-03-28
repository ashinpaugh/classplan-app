import {ChangeDetectionStrategy, Component, ComponentFactoryResolver, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FullCalendarComponent} from '@fullcalendar/angular';
import {PluginDef} from '@fullcalendar/core/plugin-system';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import {ToolbarInput, ViewOptionsInput} from '@fullcalendar/core/types/input-types';
import tippy, {hideAll} from 'tippy.js';
import {AbstractComponent} from '../abstract-component';
import {EventObject, FullCalendarService} from '../../services/full-calendar/full-calendar.service';
import {SectionMeetingType, SectionObject} from '../../services/section/section.interfaces';
import {SearchFilters} from '../search/helper/filter.interfaces';
import {EventTooltipComponent} from '../event-tooltip/event-tooltip.component';
import {TooltipHostDirective} from '../../directives/tooltip-host/tooltip-host.directive';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {catchError, shareReplay, switchMap, take, takeUntil} from 'rxjs/operators';

interface ViewOptions { [viewId: string]: ViewOptionsInput }

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

  @Input() views: ViewOptions;
  @Input() plugins: PluginDef[];
  @Input() filters: SearchFilters;
  @Input() allDaySlot: boolean = true;

  @Output() events: EventEmitter<EventObject[]>;
  @Output() title: EventEmitter<string>;

  events$: Observable<EventObject[]>;
  filters$: BehaviorSubject<SearchFilters>;

  // @see https://fullcalendar.io/docs/header
  header: boolean | ToolbarInput;

  constructor(
    protected componentFactoryResolver: ComponentFactoryResolver,
    protected elementRef: ElementRef,
    protected snackBar: MatSnackBar,
    protected fullcalendar: FullCalendarService,
  ) {
    super();

    this.plugins = [dayGridPlugin, timeGridPlugin];

    this.filters$ = new BehaviorSubject<SearchFilters>(undefined);
    this.events   = new EventEmitter<EventObject[]>();
    this.title    = new EventEmitter<string>();
  }

  ngOnInit() {
    this.views  = this.views ? this.views : this.getCalendarViewOptions();
    this.header = this.views.timeGridWeek.header;

    this.events$ = this.filters$.asObservable()
      .pipe(
        switchMap((filters: SearchFilters) => {
          hideAll({duration: 0});

          if (!filters || !filters.blocks || !filters.blocks.length) {
            return of([]);
          }

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
        this.events.next(events);

        if (!events || !events.length) {
          const filters = this.filters$.getValue();

          if (filters && !!filters.term && !!filters.term.id) {
            this.snackBar.open('No results found.', undefined, {duration: 5000});
          }

          return;
        }

        this.shiftCalendarDate(events);
      })
    ;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('filters' in changes) {
      if (!!changes.filters.currentValue && !!changes.filters.currentValue.uiFilters) {
        this.allDaySlot = (changes.filters.currentValue as SearchFilters).uiFilters.showAllDay;
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
    this.header = this.views[event.view.type].header;
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
   * Get the default options for setting FC's toolbar content layout.
   */
  protected getCalendarViewOptions(overrides?: ViewOptions) {
    const defaultHeader = {
      left: 'prev,next',
      center: '',
      right: 'timeGridWeek,timeGridDay,dayGridWeek',
    };

    const headers = {
      timeGridWeek: {
        buttonText: 'default',
        header: defaultHeader,
        columnHeaderFormat: { weekday: 'short' }
      },
      timeGridDay: {
        buttonText: 'single',
        header: defaultHeader,
        columnHeaderFormat: { weekday: 'long' },
      },
      dayGridWeek: {
        buttonText: 'compressed',
        header: defaultHeader,
        columnHeaderFormat: { weekday: 'short' },
      }
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

      this.title.next(title);
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
