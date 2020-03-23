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

  constructor(
    protected dialog: MatDialog,
    protected updates: UpdateService,
    protected sections: SectionService,
  ) {
    super();
  }

  /**
   * @inheritDoc
   */
  ngOnInit(): void {
    Filters.FilterHelper.setup();

    this.filters$ = Filters.FilterHelper.Filters$;

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
   * @param log
   */
  protected parseUpdateLog(log: UpdateObject) {
    if (log.end) {
      return this.debug('parseUpdateLog: app ready', log);
    }

    const modal = this.dialog.open(this.refLoadingSpinner, {
      position: {top: '37.5%'},
      width: 'fit-content',
      height: 'auto',
      disableClose: true,
    });

    this.updateProgress$ = this.updates.check()
      .pipe(
        map(log => log.progress ? log.progress * 100 : 0),
        takeUntil(modal.afterClosed()),
        shareReplay(1),
      )
    ;

    this.updateProgress$
      .pipe(
        filter(progress => 100 === progress),
        take(1),
      )
      .subscribe(
        () => modal.close(),
        err => this.warn('parseUpdateLog -> modal', err),
        () => this.warn('parseUpdateLog -> complete')
      )
    ;
  }


}
