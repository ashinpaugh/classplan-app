import {ChangeDetectionStrategy, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {SearchModalComponent} from './components/search-modal/search-modal.component';
import {CalendarComponent} from './components/calendar/calendar.component';
import {SectionFetchAllParams} from './services/section/section.interfaces';
import {SectionService} from './services/section/section.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';

@Component({
  selector: 'classplan-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {

  @ViewChild(CalendarComponent, { static: true }) refCalendar: CalendarComponent;

  filters$: BehaviorSubject<SectionFetchAllParams>;

  noFilters$: Observable<boolean>;
  noEvents$: Observable<boolean>;

  constructor(
    protected dialog: MatDialog,
    protected sections: SectionService,
  ) {
    this.filters$ = new BehaviorSubject<SectionFetchAllParams>(undefined);
  }

  ngOnInit(): void {
    this.noFilters$ = this.filters$.asObservable()
      .pipe(map(filters => !filters))
    ;

    this.noEvents$ = this.refCalendar.events.asObservable()
      .pipe(map(events => !events || !events.length))
    ;
  }

  openSearch(): void {
    const searchModal = this.dialog.open<SearchModalComponent>(SearchModalComponent, {
      width: '50%',
      minHeight: 560,
      position: {top: '10vh'},
    });

    searchModal.afterClosed()
      .pipe(
        take(1),
        filter(data => !!data),
      )
      .subscribe((data: {filters: SectionFetchAllParams}) => this.filters$.next(data.filters))
    ;
  }

  downloadExport(): void {
    this.sections.getExportStream(this.filters$.getValue())
      .then(async response => await this.sections.handleStreamDownload(response))
    ;
  }

  clearFiltersAndEvents(): void {
    SearchModalComponent.lastFilters = undefined;

    this.filters$.next(undefined);
  }


}
