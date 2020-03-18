import {ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {AbstractComponent} from './components/abstract-component';
import {AdvancedFilters, SearchComponent} from './components/search/search.component';
import {CalendarComponent} from './components/calendar/calendar.component';
import {UpdateObject, UpdateService} from './services/update/update.service';
import {SectionService} from './services/section/section.service';
import {BehaviorSubject, Observable} from 'rxjs';
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
  @ViewChild('tplLoadingSpinner', { static: true }) refLoadingSpinner: TemplateRef<any>;

  filters$: BehaviorSubject<AdvancedFilters>;

  noFilters$: Observable<boolean>;
  noEvents$: Observable<boolean>;
  updateProgress$: Observable<number>;

  constructor(
    protected dialog: MatDialog,
    protected updates: UpdateService,
    protected sections: SectionService,
  ) {
    super();

    this.filters$ = new BehaviorSubject<AdvancedFilters>(undefined);
  }

  /**
   * @inheritDoc
   */
  ngOnInit(): void {
    this.noFilters$ = this.filters$.asObservable()
      .pipe(map(filters => !filters))
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
    const searchModal = this.dialog.open(SearchComponent, {
      position: {top: '5vh'},
      width: '50%',
      minHeight: 560,
      minWidth: 325,
      height: 'auto',
    });

    searchModal.afterClosed()
      .pipe(
        take(1),
        filter(data => !!data),
      )
      .subscribe((data: {filters: AdvancedFilters}) => this.filters$.next(data.filters))
    ;
  }

  /**
   * Download the current events to a csv.
   */
  downloadExport(): void {
    this.sections.getExportStream(this.filters$.getValue())
      .then(async response => await this.sections.handleStreamDownload(response))
    ;
  }

  /**
   * Reset the UI.
   */
  clearFiltersAndEvents(): void {
    SearchComponent.filters$ = undefined;

    this.filters$.next(undefined);
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
