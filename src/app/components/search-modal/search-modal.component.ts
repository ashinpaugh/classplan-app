import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Inject, QueryList,
  ViewChild,
  ViewChildren,
  ViewEncapsulation
} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NgSelectComponent} from '@ng-select/ng-select';
import {TermService} from '../../services/term/term.service';
import {BlockObject, TermObject} from '../../services/term/term.interfaces';
import {BasicObject} from '../../interfaces/dictionary';
import {AbstractComponent} from '../abstract-component';
import {SubjectService} from '../../services/subject/subject.service';
import {InstructorService} from '../../services/instructor/instructor.service';
import {SectionService} from '../../services/section/section.service';
import {SectionFetchAllParams} from '../../services/section/section.interfaces';
import {combineLatest, Observable, of, timer} from 'rxjs';
import {concatMap, map, share, shareReplay, startWith, switchMap, take, takeUntil, tap} from 'rxjs/operators';

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

  static lastFilters: SearchFilters;

  @ViewChildren(NgSelectComponent) selects: QueryList<NgSelectComponent>;
  @ViewChild('refTermSearch', { static: false }) refTerm: NgSelectComponent;
  @ViewChild('refBlockSearch', { static: false }) refBlock: NgSelectComponent;
  @ViewChild('refSubjectSearch', { static: false }) refSubject: NgSelectComponent;
  @ViewChild('refInstructorSearch', { static: false }) refInstructor: NgSelectComponent;

  disableSearch$: Observable<boolean>;
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
  ) {
    super();
  }

  ngAfterViewInit(): void {

    this.disableSearch$ = combineLatest([
      this.refBlock.changeEvent,
      this.refSubject.changeEvent.pipe(startWith(undefined)),
      this.refInstructor.changeEvent.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(results => this.debug('disableSearch$ -> peak', results)),
        map((results: [BlockObject[], BasicObject[], BasicObject[]]) => {
          const [blocks, subjects, instructors] = results;

          const invalid = (item: BasicObject[]) => !item || !!item && !item.length;

          return invalid(blocks) || invalid(subjects) && invalid(instructors);
        }),
        startWith(true),
        tap(disableSearch => this.log('disableSearch$', disableSearch)),
      )
    ;

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

    this.log('filters', SearchModalComponent.lastFilters);

    if (!SearchModalComponent.lastFilters || !SearchModalComponent.lastFilters.term) {
      return;
    }

    setTimeout(() => this.setFilters(), 0);
  }

  sendSearchFilters() {
    SearchModalComponent.lastFilters = this.getFilters();

    this.dialogRef.close({
      filters: this.getFilters(true),
    });
  }

  clearFilters() {
    SearchModalComponent.lastFilters = undefined;

    this.selects.forEach(select => select.clearModel());
  }

  close() {
    this.dialogRef.close(undefined);
  }

  protected setFilters() {
    const termOption = this.refTerm.itemsList.findByLabel(SearchModalComponent.lastFilters.term.name);

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

    syncFilterWithSelect(this.refBlock, this.blocks$, SearchModalComponent.lastFilters.blocks);
    syncFilterWithSelect(this.refSubject, this.subjects$, SearchModalComponent.lastFilters.subjects);
    syncFilterWithSelect(this.refInstructor, this.instructors$, SearchModalComponent.lastFilters.instructors);
  }

  protected getFilters(): SearchFilters;
  protected getFilters(asIds: boolean): SectionFetchAllParams;
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
      block: filters.blocks.map(block => block.id),
      subject: filters.subjects.map(subject => subject.id),
      instructor: filters.instructors.map(instructor => instructor.id),
    };
  }

}
