import {AfterViewInit, ChangeDetectionStrategy, Component, Inject, ViewChild, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TermService} from '../../services/term/term.service';
import {BlockObject, TermObject} from '../../services/term/term.interfaces';
import {Observable, of, timer} from 'rxjs';
import {concatMap, map, mergeMap, share, shareReplay, switchMap, take, takeUntil, tap} from 'rxjs/operators';
import {BasicObject} from '../../interfaces/dictionary';
import {NgSelectComponent} from '@ng-select/ng-select';
import {AbstractComponent} from '../abstract-component';
import {SubjectService} from '../../services/subject/subject.service';
import {InstructorService} from '../../services/instructor/instructor.service';
import {SectionService} from '../../services/section/section.service';
import {SectionFetchAllParams} from '../../services/section/section.interfaces';
import {FullCalendarService} from '../../services/full-calendar/full-calendar.service';

export interface SearchFilters {
  term: TermObject;
  blocks: BlockObject[];
  subjects: BasicObject[];
  instructors: BasicObject[];
}

@Component({
  selector: 'classplan-search-modal',
  templateUrl: './search-modal.component.html',
  styleUrls: ['./search-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchModalComponent extends AbstractComponent implements AfterViewInit {

  @ViewChild('refTermSearch', { static: false }) refTerm: NgSelectComponent;
  @ViewChild('refBlockSearch', { static: false }) refBlock: NgSelectComponent;
  @ViewChild('refSubjectSearch', { static: false }) refSubject: NgSelectComponent;
  @ViewChild('refInstructorSearch', { static: false }) refInstructor: NgSelectComponent;

  term: TermObject;

  terms$: Observable<TermObject[]>;
  blocks$: Observable<BlockObject[]>;
  subjects$: Observable<BasicObject[]>;
  instructors$: Observable<BasicObject[]>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SearchFilters,
    protected dialogRef: MatDialogRef<SearchModalComponent>,
    protected terms: TermService,
    protected subjects: SubjectService,
    protected instructors: InstructorService,
    protected sections: SectionService,
    protected fullcalendar: FullCalendarService,
  ) {
    super();
  }

  ngAfterViewInit(): void {
    this.terms$ = this.terms.fetchAll()
      .pipe(
        map(data => data.terms),
        shareReplay(1),
      )
    ;

    this.blocks$ = this.refTerm.changeEvent
      .pipe(
        // tap(term => this.log('blocks$ -> peak', term)),
        map((term: TermObject) => term && term.blocks),
        tap(blocks => this.log('blocks$', blocks)),
        shareReplay(1),
      )
    ;

    this.subjects$ = this.refBlock.changeEvent
      .pipe(
        // tap(value => this.log('subjects -> blocks', value)),
        switchMap((blocks: BlockObject[]) => {
          if (!blocks || !blocks.length) {
            return of(undefined);
          }

          return this.subjects.fetchAllByBlock(blocks);
        }),
        tap((data) => this.log('subjects', data)),
        share()
      )
    ;

    // this.instructors.fetchAll()
    this.instructors$ = this.refBlock.changeEvent
      .pipe(
        tap(results => this.log('instructors$ -> peak', results)),
        switchMap((blocks: BlockObject[]) => {
          if (!blocks || !blocks.length) {
            return of(undefined);
          }

          const blockIds = blocks.map(block => block.id);

          return this.instructors.fetchAllByBlock(blockIds);
        }),
        tap(instructors => this.log('instructors$', instructors)),
        share(),
      )
    ;

    this.refInstructor.changeEvent
      .pipe(
        switchMap((instructors: BasicObject[]) => this.subjects.fetchByInstructor(instructors)),
      )
      .subscribe(subjects => this.log('subjects by instructor', subjects))
    ;

    this.log('filters', this.data);

    if (!this.data || !this.data.term) {
      return;
    }

    setTimeout(() => this.setFilters(), 0);
  }

  search() {
    // Search is already in progress.
    if (this.dialogRef.disableClose) {
      this.log('canceld');
      return;
    }

    this.dialogRef.disableClose = true;

    const filters = this.getFilters(true) as SectionFetchAllParams;

    this.fullcalendar.fetchAll(filters)
      .pipe(
        take(1),
        takeUntil(this.ngUnsubscribe$),
      )
      .subscribe(
        events => {
          this.log('sections', events);

          this.dialogRef.close({
            filters: this.getFilters(),
            events: events,
          });
        },
        err => {
          this.warn('search', err);
          this.dialogRef.disableClose = false;
        }
      )
    ;
  }

  clearFilters() {
    this.refTerm.clearModel();
    this.refBlock.clearModel();
    this.refSubject.clearModel();
    this.refInstructor.clearModel();
  }

  close() {
    const filters = this.getFilters();
    this.dialogRef.close({filters});
  }

  protected setFilters() {
    const termOption = this.refTerm.itemsList.findByLabel(this.data.term.name);

    if (!termOption) {
      return;
    }

    this.refTerm.select(termOption);

    const syncFilterWithSelect = (
      ngSelect: NgSelectComponent,
      list$: Observable<BasicObject[]>,
      filterBy: BasicObject[]
    ) => {
      list$
        .pipe(
          // Push to the end of the queue to allow ng-select to render the options.
          concatMap(() => timer(0)),
          take(1),
          takeUntil(this.ngUnsubscribe$),
        )
        .subscribe(() => {
          filterBy
            .map(block => ngSelect.itemsList.findByLabel(block.name))
            .filter(found => !!found)
            .forEach(item => ngSelect.select(item))
          ;
        })
      ;
    };

    syncFilterWithSelect(this.refBlock, this.blocks$, this.data.blocks);
    syncFilterWithSelect(this.refSubject, this.subjects$, this.data.subjects);
    syncFilterWithSelect(this.refInstructor, this.instructors$, this.data.instructors);
  }

  protected getFilters(asIds: boolean = false): SearchFilters | SectionFetchAllParams {
    const filters = {
      term: this.refTerm.selectedValues[0] as TermObject,
      blocks: this.refBlock.selectedValues as BlockObject[],
      subjects: this.refSubject.selectedValues as BasicObject[],
      instructors: this.refInstructor.selectedValues as BasicObject[],
    } as SearchFilters;

    if (!asIds) {
      return filters;
    }

    return {
      term:  filters.term.id,
      block: filters.blocks.map(block => block.id),
      subject: filters.subjects.map(subject => subject.id),
      instructor: filters.instructors.map(instructor => instructor.id),
    } as SectionFetchAllParams;
  }

}
