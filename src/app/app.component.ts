import {ChangeDetectionStrategy, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {AdvancedFilters, SearchComponent} from './components/search/search.component';
import {CalendarComponent} from './components/calendar/calendar.component';
import {SectionService} from './services/section/section.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, map, startWith, take} from 'rxjs/operators';

@Component({
  selector: 'classplan-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {

  @ViewChild(CalendarComponent, { static: true }) refCalendar: CalendarComponent;

  filters$: BehaviorSubject<AdvancedFilters>;

  noFilters$: Observable<boolean>;
  noEvents$: Observable<boolean>;

  constructor(
    protected dialog: MatDialog,
    protected sections: SectionService,
  ) {
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
  }

  openSearch(): void {
    const searchModal = this.dialog.open<SearchComponent>(SearchComponent, {
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


}
