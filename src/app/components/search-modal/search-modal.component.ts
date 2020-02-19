import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Inject, Input, QueryList,
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
import {BehaviorSubject, combineLatest, Observable, of, timer} from 'rxjs';
import {
  concatMap,
  map,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs/operators';
import {MatSelectionListChange} from '@angular/material/list';

export interface SearchFilters {
  term: TermObject;
  blocks: BlockObject[];
  subjects: BasicObject[];
  instructors: BasicObject[];
  advanced: AdvancedFilters;
}

export interface AdvancedFilters {
  showAllDay: boolean;
  showOnline: boolean;
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

  advanced$: BehaviorSubject<AdvancedFilters>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SearchFilters,
    protected dialogRef: MatDialogRef<SearchModalComponent>,
    protected terms: TermService,
    protected subjects: SubjectService,
    protected instructors: InstructorService,
    protected sections: SectionService,
  ) {
    super();

    this.advanced$ = new BehaviorSubject<AdvancedFilters>({showAllDay: true, showOnline: true});
  }

  get showAllDay() {
    return this.advanced$.getValue().showAllDay;
  }

  @Input()
  set showAllDay(show: boolean) {
    const advanced = this.advanced$.getValue();
    advanced.showAllDay = show;
    this.advanced$.next(advanced);
  }

  get showOnline() {
    return this.advanced$.getValue().showOnline;
  }

  @Input()
  set showOnline(show: boolean) {
    const advanced = this.advanced$.getValue();
    advanced.showOnline = show;
    this.advanced$.next(advanced);
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

    this.subjects$ = combineLatest([
      this.refBlock.changeEvent,
      this.refInstructor.changeEvent.pipe(startWith(undefined)),
    ])
      .pipe(
        // tap(value => this.log('subjects -> peak', value)),
        switchMap((results: [BlockObject[], BasicObject[]]) => {
          const [blocks, instructors] = results;

          if (!blocks || !blocks.length) {
            this.ngSelectClear(this.refSubject);

            return of(undefined);
          }

          if (!instructors || !instructors.length) {
            return this.subjects.fetchAllByBlock(blocks);
          }

          return this.subjects.fetchByInstructor(blocks, instructors);
        }),
        tap((data) => this.log('subjects', data)),
        share()
      )
    ;

    this.instructors$ = combineLatest([
      this.refBlock.changeEvent,
      this.refSubject.changeEvent.pipe(startWith(undefined)),
    ])
      .pipe(
        // tap(results => this.log('instructors$ -> peak', results)),
        switchMap((data: [BlockObject[], BasicObject[]]) => {
          const [blocks, subjects] = data;

          if (!blocks || !blocks.length) {
            this.ngSelectClear(this.refInstructor);

            return of(undefined);
          }

          return this.instructors.fetchAllByBlock(blocks, subjects);
        }),
        tap(instructors => this.log('instructors$', instructors)),
        share(),
      )
    ;

    this.log('filters', SearchModalComponent.lastFilters);

    if (!SearchModalComponent.lastFilters || !SearchModalComponent.lastFilters.term) {
      return;
    }

    setTimeout(() => this.setFilters(), 0);
  }

  advancedChanged(data: MatSelectionListChange) {
    this.log('advancedChanged', data);
    const option = data.option.value as keyof AdvancedFilters;
    const advanced = this.advanced$.getValue();
    advanced[option] = data.option.selected;

    this.advanced$.next(advanced);
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

    this.showAllDay = SearchModalComponent.lastFilters.advanced.showAllDay;
    this.showOnline = SearchModalComponent.lastFilters.advanced.showOnline;
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
      advanced: {
        showAllDay: this.showAllDay,
        showOnline: this.showOnline,
      }
    } as SearchFilters;

    if (!asIds) {
      return filters;
    }

    return {
      block: filters.blocks.map(block => block.id),
      subject: filters.subjects.map(subject => subject.id),
      instructor: filters.instructors.map(instructor => instructor.id),
      showAllDay: Number(this.showAllDay),
      showOnline: Number(this.showOnline),
    };
  }

  /**
   * Clear an ngSelect if it has a selected values.
   *
   * Calling .clearModel() on an already empty ngSelect triggers values changes and infinite loops
   * in observables that listen to other value changes.
   *
   * @param ngSelect
   */
  protected ngSelectClear(ngSelect: NgSelectComponent): void {
    if (!ngSelect || !ngSelect.selectedValues || !ngSelect.selectedValues.length) {
      return;
    }

    ngSelect.clearModel();
  }

}
