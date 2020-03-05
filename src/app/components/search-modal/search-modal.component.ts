import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NgSelectComponent} from '@ng-select/ng-select';
import {GithubComponent} from 'ngx-color/github';
import {ColorEvent} from 'ngx-color';
import {MatSelectionListChange} from '@angular/material/list';
import {TermService} from '../../services/term/term.service';
import {BlockObject, TermObject} from '../../services/term/term.interfaces';
import {BasicObject, Dictionary} from '../../interfaces/dictionary';
import {AbstractComponent} from '../abstract-component';
import {SubjectService} from '../../services/subject/subject.service';
import {InstructorService} from '../../services/instructor/instructor.service';
import {SectionService} from '../../services/section/section.service';
import {SectionFetchAllParams} from '../../services/section/section.interfaces';
import {BehaviorSubject, combineLatest, Observable, of, Subject, timer} from 'rxjs';
import {concatMap, map, share, shareReplay, startWith, switchMap, take, takeUntil, tap} from 'rxjs/operators';
import tippy from 'tippy.js';
import {DomUtil} from '../../classes/tools/dom.util';

export interface CalendarColorMatrix {
  blocks: Dictionary<ColorEvent>;
  subjects: Dictionary<ColorEvent>;
  instructors: Dictionary<ColorEvent>;
}

export interface SearchFilters {
  term: TermObject;
  blocks: BlockObject[];
  subjects: BasicObject[];
  instructors: BasicObject[];
}

export interface AdvancedFilters extends SearchFilters {
  advanced: {
    showAllDay: boolean;
    showOnline: boolean;
    colors: CalendarColorMatrix;
  };
}

@Component({
  selector: 'classplan-search-modal',
  templateUrl: './search-modal.component.html',
  styleUrls: ['./search-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchModalComponent extends AbstractComponent implements AfterViewInit {

  static filters$: BehaviorSubject<AdvancedFilters>;

  @ViewChildren(NgSelectComponent) ngSelects: QueryList<NgSelectComponent>;
  @ViewChild('refTermSearch', { static: false }) refTerm: NgSelectComponent;
  @ViewChild('refBlockSearch', { static: false }) refBlock: NgSelectComponent;
  @ViewChild('refSubjectSearch', { static: false }) refSubject: NgSelectComponent;
  @ViewChild('refInstructorSearch', { static: false }) refInstructor: NgSelectComponent;
  @ViewChild('colorPallet', { static: true, read: ElementRef }) refColor: ElementRef;

  disableSearch$: Observable<boolean>;
  terms$: Observable<TermObject[]>;
  blocks$: Observable<BlockObject[]>;
  subjects$: Observable<BasicObject[]>;
  instructors$: Observable<BasicObject[]>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SearchFilters,
    protected elementRef: ElementRef,
    protected dialogRef: MatDialogRef<SearchModalComponent>,
    protected terms: TermService,
    protected subjects: SubjectService,
    protected instructors: InstructorService,
    protected sections: SectionService,
  ) {
    super();

    this.init();
  }

  get Filters(): AdvancedFilters {
    return SearchModalComponent.filters$.getValue();
  }

  set Filters(filters: AdvancedFilters) {
    SearchModalComponent.filters$.next(filters);
  }

  get Filter$() {
    return SearchModalComponent.filters$.asObservable();
  }

  get showAllDay() {
    return this.Filters.advanced.showAllDay;
  }

  @Input()
  set showAllDay(show: boolean) {
    const filters = this.Filters;
    filters.advanced.showAllDay = show;
    this.Filters = filters;
  }

  get showOnline() {
    return this.Filters.advanced.showOnline;
  }

  @Input()
  set showOnline(show: boolean) {
    const filters = this.Filters;
    filters.advanced.showOnline = show;
    this.Filters = filters;
  }

  /**
   * TODO: Move?
   * @param filters
   */
  static filtersToSectionParams(filters?: AdvancedFilters): SectionFetchAllParams {
    filters = !!filters ? filters : SearchModalComponent.filters$.getValue();

    return {
      block: filters.blocks.map(block => block.id),
      subject: filters.subjects.map(subject => subject.id),
      instructor: filters.instructors.map(instructor => instructor.id),
      showAllDay: Number(filters.advanced.showAllDay),
      showOnline: Number(filters.advanced.showOnline),
    };
  }

  protected init(reset?: boolean): void {
    const defaultFilters = {
      term: undefined,
      blocks: undefined,
      subjects: undefined,
      instructors: undefined,
      advanced: {
        showAllDay: true,
        showOnline: true,
        colors: {},
      },
    } as AdvancedFilters;

    if (!!SearchModalComponent.filters$) {
      if (reset) {
        this.Filters = defaultFilters;
      }

      return;
    }

    SearchModalComponent.filters$ = new BehaviorSubject<AdvancedFilters>(defaultFilters);
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

    DomUtil.watch$(this.elementRef.nativeElement, {childList: true, subtree: true})
      .pipe(
        takeUntil(this.ngUnsubscribe$),
      )
      .subscribe(records => this.setLabelColor(records))
    ;

    this.log('filters', this.Filters);

    if (!this.Filters.term) {
      return;
    }

    setTimeout(() => this.setFilters(), 0);
  }

  ngSelectDeselectItem(ngSelect: NgSelectComponent, item: BasicObject) {
    ngSelect.clearItem(item);
  }

  advancedChanged(data: MatSelectionListChange) {
    this.log('advancedChanged', data);
    const option = data.option.value;
    const filters = this.Filters;
    filters.advanced[option] = data.option.selected;

    this.Filters = filters;
  }

  sendSearchFilters() {
    // Set the filters for reference when the modal is re-opened.
    this.Filters = this.getFilters();

    this.dialogRef.close({
      filters: this.Filters,
    });
  }

  clearFilters() {
    this.init(true);

    this.ngSelects.forEach(select => select.clearModel());
  }

  close() {
    this.dialogRef.close(undefined);
  }

  ngOptionLabelClick(event: MouseEvent, type: string, optionValue, colorPallet: GithubComponent) {
    this.log('ngOptionLabelClick', event, optionValue);

    // event.preventDefault();
    event.stopPropagation();
    // event.stopImmediatePropagation();

    const onDestroy$ = new Subject();

    tippy(event.target as HTMLElement, {
      allowHTML: true,
      content: this.refColor.nativeElement,
      trigger: "click",
      showOnCreate: true,
      delay: [null, 5000],
      appendTo: this.elementRef.nativeElement,
      onHidden: (instance) => {
        this.log('ngOptionLabelClick -> hidden', instance);
        onDestroy$.next();
        onDestroy$.complete();

        instance.destroy();
      }
    });

    colorPallet.onChangeComplete
      .pipe(
        take(1),
        takeUntil(onDestroy$),
        tap(e => this.debug('ngOptionLabelClick -> onChange', e, event.target)),
      )
      .subscribe((colorEvent: ColorEvent) => {
        const parent = (event.target as HTMLElement).parentElement;
        parent.style.backgroundColor = colorEvent.color.hex;

        if (!this.Filters.advanced.colors[type]) {
          this.Filters.advanced.colors[type] = {};
        }

        this.Filters.advanced.colors[type][optionValue.id] = colorEvent.color.hex;
      })
    ;
  }

  onClickStopBubble(event: MouseEvent) {
    this.log('onClickStopBubble', event);
    event.stopPropagation();
  }

  protected setFilters() {
    const termOption = this.refTerm.itemsList
      .findByLabel(this.Filters.term.name)
    ;

    if (!termOption) {
      return;
    }

    this.showAllDay = this.Filters.advanced.showAllDay;
    this.showOnline = this.Filters.advanced.showOnline;
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

    syncFilterWithSelect(this.refBlock, this.blocks$, this.Filters.blocks);
    syncFilterWithSelect(this.refSubject, this.subjects$, this.Filters.subjects);
    syncFilterWithSelect(this.refInstructor, this.instructors$, this.Filters.instructors);
  }

  protected getFilters(): AdvancedFilters {
    return {
      term: this.refTerm.selectedValues[0] as TermObject,
      blocks: this.refBlock.selectedValues as BlockObject[],
      subjects: this.refSubject.selectedValues as BasicObject[],
      instructors: this.refInstructor.selectedValues as BasicObject[],
      advanced: {
        showAllDay: this.showAllDay,
        showOnline: this.showOnline,
        colors: this.Filters.advanced.colors,
      },
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

  /**
   * Sets the last known color for a selected label if the modal is closed and reopened.
   *
   * @param records
   */
  protected setLabelColor(records: MutationRecord[]): void {
    const colors = this.Filters.advanced.colors;
    const labels = records
      .filter(record => !!record.addedNodes)
      .map(record => record.target)
      .map((element: HTMLElement) => {
        if (!element || !element.classList || !element.classList.contains('ng-value')) {
          return false;
        }

        const children = Array.from(element.childNodes);

        return children.find((label: HTMLElement) => !!label.classList && label.classList.contains('ng-select-label'));
      })
      .filter((element: HTMLElement) => !!element)
    ;


    labels.forEach((label: HTMLElement) => {
      const [type, id] = label.id.split('-');
      const color      = colors[type] && colors[type][id];

      if (!!color) {
        label.parentElement.style.backgroundColor = color;
      }
    });
  }

}
