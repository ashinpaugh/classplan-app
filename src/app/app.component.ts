import {ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {AdvancedFilters, SearchComponent} from './components/search/search.component';
import {CalendarComponent} from './components/calendar/calendar.component';
import {SectionService} from './services/section/section.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, map, startWith, take, tap} from 'rxjs/operators';
import {UpdateObject, UpdateService} from './services/update/update.service';
import {AbstractComponent} from './components/abstract-component';

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

  constructor(
    protected dialog: MatDialog,
    protected updates: UpdateService,
    protected sections: SectionService,
  ) {
    super();

    this.filters$ = new BehaviorSubject<AdvancedFilters>(undefined);
  }

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

  downloadExport(): void {
    this.sections.getExportStream(this.filters$.getValue())
      .then(async response => await this.sections.handleStreamDownload(response))
    ;
  }

  clearFiltersAndEvents(): void {
    SearchComponent.filters$ = undefined;

    this.filters$.next(undefined);
  }

  protected parseUpdateLog(log: UpdateObject) {
    if (log.end) {
      return this.log('parseUpdateLog: app ready', log);
    }

    const modal = this.dialog.open(this.refLoadingSpinner, {
      position: {top: '37.5%'},
      width: 'fit-content',
      height: 'auto',
      disableClose: true,
    });

    this.updates.check()
      .pipe(
        tap(payload => this.log('parseUpdateLog -> peak', payload))
      )
      .subscribe(() => modal.close())
    ;

  }


}
