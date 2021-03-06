import {ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {AbstractComponent} from './components/abstract-component';
import {SearchComponent} from './components/search/search.component';
import {CalendarComponent} from './components/calendar/calendar.component';
import {UpdateObject, UpdateService} from './services/update/update.service';
import {SectionService} from './services/section/section.service';
import * as Filters from './components/search/helper/filter.helper';
import {Observable} from 'rxjs';
import {filter, map, shareReplay, startWith, take, takeUntil} from 'rxjs/operators';
import {EventService} from './services/event/event.service';
import {AppEvent} from './services/event/event.interface';

@Component({
  selector: 'classplan-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent extends AbstractComponent implements OnInit {

  @ViewChild(CalendarComponent, { static: true }) refCalendar: CalendarComponent;
  @ViewChild(SearchComponent, { static: true }) refSearch: SearchComponent;
  @ViewChild('tplLoadingSpinner', { static: true }) refLoadingSpinner: TemplateRef<any>;

  filters$: Observable<Filters.SearchFilters>;
  noFilters$: Observable<boolean>;
  noEvents$: Observable<boolean>;
  updateProgress$: Observable<number>;
  title$: Observable<string>;

  constructor(
    protected dialog: MatDialog,
    protected updates: UpdateService,
    protected sections: SectionService,
    protected event: EventService,
  ) {
    super();
  }

  /**
   * @inheritDoc
   */
  ngOnInit(): void {
    Filters.FilterHelper.setup();

    this.filters$ = Filters.FilterHelper.Filters$;

    this.title$ = this.refCalendar.title
      .pipe(
        startWith(undefined),
        map(title => title ? title : 'Class Plan'),
      )
    ;

    this.noFilters$ = this.filters$
      .pipe(map(filters => !filters || !filters.term || !filters.term.id))
    ;

    this.noEvents$ = this.refCalendar.events.asObservable()
      .pipe(
        map(events => !events || !events.length),
        startWith(true),
      )
    ;

    this.updates.fetch()
      .pipe(
        take(1),
      )
      .subscribe(log => this.parseUpdateLog(log))
    ;
  }

  /**
   * Open the search filters modal.
   */
  openSearch(): void {
    this.dialog.open(SearchComponent, {
      position: {top: '5vh'},
      width: '50%',
      minHeight: 560,
      minWidth: 325,
      height: 'auto',
    });
  }

  /**
   * Download the current events to a csv.
   */
  async downloadExport() {
    this.sections.getExportStream(Filters.FilterHelper.Filters)
      .then(async response => await this.sections.handleStreamDownload(response))
    ;
  }

  /**
   * Reset the UI.
   */
  clearFiltersAndEvents(): void {
    Filters.FilterHelper.setup(true);
  }

  /**
   * Poll the update service in order to inform the user when the update has complete.
   *
   * @param update
   */
  protected parseUpdateLog(update: UpdateObject) {
    if (update.end) {
      return this.debug('parseUpdateLog: app ready', update);
    }

    const modal = this.dialog.open(this.refLoadingSpinner, {
      position: {top: '25vh'},
      width: 'fit-content',
      height: 'auto',
      disableClose: true,
    });

    const updates$ = this.updates.check()
      .pipe(
        takeUntil(modal.afterClosed()),
        shareReplay(1),
      )
    ;

    let started = false;

    updates$.subscribe(
      update => {
        let event = AppEvent.Events.API_UPDATE_START;

        if (update.progress > 0 && !started) {
          started = true;
          event   = AppEvent.Events.API_UPDATE_PENDING;
        }

        this.event.trigger<{update: UpdateObject}>(event, {
          data: {update},
        });
      }
    )

    this.updateProgress$ = updates$
      .pipe(
        map(log => log.progress ? log.progress * 100 : 0),
      )
    ;

    this.updateProgress$
      .pipe(
        filter(progress => 100 === progress),
        take(1),
      )
      .subscribe(
        (progress) => {
          this.event.trigger(AppEvent.Events.API_UPDATE_END, {
            data: {
              update: {progress},
            }
          });

          modal.close();
        },
        err => this.warn('parseUpdateLog -> modal', err)
      )
    ;
  }


}
