import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatCheckbox, MatCheckboxChange} from '@angular/material/checkbox';
import {MatExpansionPanel} from '@angular/material/expansion';
import {MatSelectionListChange} from '@angular/material/list';
import {NgOption, NgSelectComponent} from '@ng-select/ng-select';
import {GithubComponent} from 'ngx-color/github';
import {ColorEvent} from 'ngx-color';
import {TermService} from '../../services/term/term.service';
import {BlockObject, TermObject} from '../../services/term/term.interfaces';
import {BasicObject, Dictionary} from '../../interfaces/dictionary';
import {AbstractComponent} from '../abstract-component';
import {SubjectService} from '../../services/subject/subject.service';
import {InstructorService} from '../../services/instructor/instructor.service';
import {BuildingService, UISafeBuilding} from '../../services/building/building.service';
import {SectionService} from '../../services/section/section.service';
import {RoomService} from '../../services/room/room.service';
import {DomUtil} from '../../classes/tools/dom.util';
import {BehaviorSubject, combineLatest, merge, Observable, of, Subject, timer} from 'rxjs';
import {debounceTime, filter, map, mapTo, share, shareReplay, startWith, switchMap, take, takeUntil, tap} from 'rxjs/operators';
import tippy from 'tippy.js';

export interface CalendarColorMatrix {
  block: Dictionary<ColorEvent>;
  subject: Dictionary<ColorEvent>;
  instructor: Dictionary<ColorEvent>;
  building: Dictionary<ColorEvent>;
  room: Dictionary<ColorEvent>;
}

export interface SearchFilters {
  term: TermObject;
  blocks: BlockObject[];
  subjects: BasicObject[];
  instructors: BasicObject[];
  buildings: UISafeBuilding[];
  rooms: BasicObject[];
}

export interface AdvancedFilters extends SearchFilters {
  advanced: {
    colors: CalendarColorMatrix;
    showAllDay: boolean;
    showOnline: boolean;
    xref: {
      subjects: boolean;
      instructors: boolean;
    }
  };
}

@Component({
  selector: 'classplan-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent extends AbstractComponent implements AfterViewInit {

  static filters$: BehaviorSubject<AdvancedFilters>;

  @ViewChildren(NgSelectComponent) ngSelects: QueryList<NgSelectComponent>;
  @ViewChild(MatExpansionPanel, { static: false }) refAdvancedFiltersPanel: MatExpansionPanel;
  @ViewChild('refTermSearch', { static: false }) refTerm: NgSelectComponent;
  @ViewChild('refBlockSearch', { static: false }) refBlock: NgSelectComponent;
  @ViewChild('refBuildingSearch', { static: false }) refBuilding: NgSelectComponent;
  @ViewChild('refSubjectSearch', { static: false }) refSubject: NgSelectComponent;
  @ViewChild('refInstructorSearch', { static: false }) refInstructor: NgSelectComponent;
  @ViewChild('colorPallet', { static: true, read: ElementRef }) refColor: ElementRef;
  @ViewChild('chkFilterSubjectsByInstructors', { static: false }) refChkSubjectsByInstructors: MatCheckbox;
  @ViewChild('chkFilterInstructorsBySubjects', { static: false }) refChkInstructorsBySubject: MatCheckbox;

  disableSearch$: Observable<boolean>;
  terms$: Observable<TermObject[]>;
  blocks$: Observable<BlockObject[]>;
  buildings$: Observable<BasicObject[]>;
  subjects$: Observable<BasicObject[]>;
  instructors$: Observable<BasicObject[]>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SearchFilters,
    protected elementRef: ElementRef,
    protected dialogRef: MatDialogRef<SearchComponent>,
    protected terms: TermService,
    protected buildings: BuildingService,
    protected rooms: RoomService,
    protected subjects: SubjectService,
    protected instructors: InstructorService,
    protected sections: SectionService,
  ) {
    super();

    this.init();
  }

  get Filters(): AdvancedFilters {
    return SearchComponent.filters$.getValue();
  }

  set Filters(filters: AdvancedFilters) {
    SearchComponent.filters$.next(filters);
  }

  get Filter$() {
    return SearchComponent.filters$.asObservable();
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

  protected init(reset?: boolean): void {
    const defaultFilters: AdvancedFilters = {
      term: undefined,
      blocks: undefined,
      buildings: undefined,
      rooms: undefined,
      subjects: undefined,
      instructors: undefined,
      advanced: {
        showAllDay: true,
        showOnline: true,
        colors: {} as CalendarColorMatrix,
        xref: {} as any,
      },
    };

    if (!!SearchComponent.filters$) {
      if (reset) {
        this.Filters = defaultFilters;
      }

      return;
    }

    SearchComponent.filters$ = new BehaviorSubject<AdvancedFilters>(defaultFilters);
  }

  ngAfterViewInit(): void {

    this.disableSearch$ = combineLatest([
      this.onTermChange(true),
      this.ngOnChange(this.refSubject).pipe(startWith(undefined)),
      this.ngOnChange(this.refInstructor).pipe(startWith(undefined)),
      this.ngOnChange(this.refBuilding).pipe(startWith(undefined)),
    ])
      .pipe(
        tap(results => this.debug('disableSearch$ -> peak', results)),
        map((results: [BlockObject[], BasicObject[], BasicObject[], BasicObject[]]) => {
          const [blocks, subjects, instructors, buildings] = results;

          const invalid = (item: BasicObject[]) => !item || !!item && !item.length;

          return invalid(blocks) || invalid(subjects) && invalid(instructors) && invalid(buildings);
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

    // this.blocks$ = this.ngOnChange<TermObject>(this.refTerm)
    this.blocks$ = this.onTermChange()
      .pipe(
        tap((term: TermObject) => this.log('blocks$ -> peak', term)),
        map((term: TermObject) => term && term.blocks),
        tap(blocks => {
          this.log('blocks$', blocks);

          this.ngSelectClear(this.refBlock);

          if (!blocks || !blocks.length) {
            return;
          }

          // Hide the blinking cursor in the semester label.
          this.refTerm.blur();
        }),
        shareReplay(1),
      )
    ;

    this.subjects$ = combineLatest([
      this.onTermChange(true),
      this.ngOnChange(this.refInstructor).pipe(startWith(undefined)),
      this.refChkSubjectsByInstructors.change.pipe(
        startWith({
          source: this.refChkSubjectsByInstructors,
          checked: this.refChkSubjectsByInstructors.checked,
        }),
      ),
    ])
      .pipe(
        tap(value => this.log('subjects -> peak', value)),
        switchMap((results: [BlockObject[], BasicObject[], MatCheckboxChange]) => {
          const [blocks, instructors, filterByInstructors] = results;

          if (!blocks || !blocks.length) {
            this.ngSelectClear(this.refSubject);

            return of(undefined);
          }

          if (!instructors || !instructors.length || !filterByInstructors.checked) {
            return this.subjects.fetchAllByBlock(blocks);
          }

          return this.subjects.fetchByInstructor(blocks, instructors);
        }),
        tap((data) => this.log('subjects', data)),
        share(),
      )
    ;

    this.instructors$ = combineLatest([
      this.onTermChange(true),
      this.ngOnChange(this.refSubject).pipe(startWith(undefined)),
      this.refChkInstructorsBySubject.change.pipe(
        startWith({
          source: this.refChkInstructorsBySubject,
          checked: this.refChkInstructorsBySubject.checked,
        }),
      ),
    ])
      .pipe(
        tap(results => this.log('instructors$ -> peak', results)),
        switchMap((data: [BlockObject[], BasicObject[], MatCheckboxChange]) => {
          const [blocks, subjects, filterBySubjects] = data;

          if (!blocks || !blocks.length) {
            this.ngSelectClear(this.refInstructor);

            return of(undefined);
          }

          return this.instructors.fetchAllByBlock(
            blocks,
            !filterBySubjects.checked ? undefined : subjects
          );
        }),
        tap(instructors => this.log('instructors$', instructors)),
        share(),
      )
    ;

    this.buildings$ = this.onTermChange(true)
      .pipe(
        tap(blocks => this.log('building -> peak', blocks)),
        switchMap((blocks: BasicObject[]) => {
          // When the block value's change - it can modify the values of this component.
          this.ngSelectClear(this.refBuilding);

          if (!blocks || !blocks.length) {
            return of(undefined);
          }

          return this.buildings.multiFetchAllByBlock(blocks);
        }),
        shareReplay(1),
        tap(buildings => this.log('buildings -> list', buildings)),
      )
    ;

    DomUtil.watch$(this.elementRef.nativeElement, {childList: true, subtree: true})
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe(records => this.setLabelColor(records))
    ;

    this.log('filters', this.Filters);

    if (this.Filters.term) {
      setTimeout(() => this.setFilters(), 0);
      return;
    }

    // Auto-select the Full Semester block.
    this.blocks$
      .pipe(
        debounceTime(100),
        map(blocks => blocks && blocks.find(block => 'Full Semester' === block.name)),
        filter(fullSemester => !!fullSemester),
        takeUntil(this.ngUnsubscribe$),
      )
      .subscribe(fullSemester => {
        const ngOption = this.refBlock.itemsList.findItem(fullSemester.id);

        if (ngOption) {
          this.refBlock.select(ngOption);
        }
      })
    ;
  }

  ngSelectDeselectItem(ngSelect: NgSelectComponent, type: string, item: BasicObject) {
    ngSelect.clearItem(item);

    const colors = this.Filters.advanced.colors[type];

    if (!colors || !colors[item.id]) {
      return;
    }

    delete colors[item.id];
  }

  advancedChanged(data: MatSelectionListChange) {
    this.log('advancedChanged', data);
    const option = data.option.value;
    const filters = this.Filters;
    filters.advanced[option] = data.option.selected;

    this.Filters = filters;
  }

  sendSearchFilters() {
    // Set the filters for reference when the search component is re-opened.
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

    event.stopPropagation();

    const onDestroy$ = new Subject();

    tippy(event.target as HTMLElement, {
      allowHTML: true,
      content: this.refColor.nativeElement,
      trigger: "click",
      showOnCreate: true,
      delay: [null, 5000],
      appendTo: this.elementRef.nativeElement,
      onHidden: (instance) => {
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
        const parent = (event.target as HTMLElement).parentElement.parentElement;
        this.log('ngOptionLabelClick -> color change', parent, colorEvent);
        parent.style.backgroundColor = colorEvent.color.hex;

        if (!this.Filters.advanced.colors[type]) {
          this.Filters.advanced.colors[type] = {};
        }

        this.Filters.advanced.colors[type][optionValue.id] = colorEvent.color.hex;
      })
    ;
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

    this.refChkSubjectsByInstructors.checked = this.Filters.advanced.xref.subjects;
    this.refChkInstructorsBySubject.checked  = this.Filters.advanced.xref.instructors;

    this.refTerm.select(termOption);

    const syncFilterWithSelect = (ngSelect: NgSelectComponent, list$: Observable<BasicObject[]>, selected: BasicObject[], matchOnId?: boolean) => {
      list$
        .pipe(
          // Push to the end of the queue to allow ng-select to render the options.
          switchMap(() => timer(0)),
          take(1),
          takeUntil(this.ngUnsubscribe$),
        )
        .subscribe(() => {
          selected
            .map((obj: BasicObject) => {
              if (!matchOnId) {
                return ngSelect.itemsList.findByLabel(obj.name);
              }

              return ngSelect.itemsList.items.find(item => (item.value as BasicObject).id === obj.id)
            })
            .filter((option: NgOption) => !!option && !option.selected)
            .forEach((option: NgOption) => ngSelect.select(option))
          ;
        })
      ;
    };

    syncFilterWithSelect(this.refBlock, this.blocks$, this.Filters.blocks);
    syncFilterWithSelect(this.refSubject, this.subjects$, this.Filters.subjects);
    syncFilterWithSelect(this.refInstructor, this.instructors$, this.Filters.instructors);
    syncFilterWithSelect(this.refBuilding, this.buildings$, this.Filters.buildings, true);
    syncFilterWithSelect(this.refBuilding, this.buildings$, this.Filters.rooms, true);

    this.openAdvancedPanelOnSetFilter();
  }

  protected openAdvancedPanelOnSetFilter(): void {
    if (this.showAllDay && this.showOnline) {
      return;
    }

    merge(this.refSubject.changeEvent, this.refInstructor.changeEvent)
      .pipe(
        switchMap(() => timer(325)),
        take(1),
      )
      .subscribe(() => this.refAdvancedFiltersPanel.open())
    ;
  }

  protected getFilters(): AdvancedFilters {
    const ngBuildings = this.refBuilding.selectedValues as UISafeBuilding[];
    const buildings   = ngBuildings.filter((item: UISafeBuilding) => !!item.rooms);
    const rooms       = ngBuildings.filter((item: UISafeBuilding) => !item.rooms);

    return {
      term: this.refTerm.selectedValues[0] as TermObject,
      blocks: this.refBlock.selectedValues as BlockObject[],
      buildings: buildings as UISafeBuilding[],
      rooms: [].concat(...rooms),
      subjects: this.refSubject.selectedValues as BasicObject[],
      instructors: this.refInstructor.selectedValues as BasicObject[],
      advanced: {
        colors: this.Filters.advanced.colors,
        showAllDay: this.showAllDay,
        showOnline: this.showOnline,
        xref: {
          subjects: this.refChkSubjectsByInstructors.checked,
          instructors: this.refChkInstructorsBySubject.checked,
        }
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
   * Sets the last known color for a selected label if the search component is closed and reopened.
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

        return Array.from(element.childNodes)
          .find((label: HTMLElement) => !!label.classList && label.classList.contains('ng-select-label'))
        ;
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

  /**
   * Monitor ngSelect change event sources.
   *
   * @param ngSelect
   */
  protected ngOnChange<T = BasicObject[]>(ngSelect: NgSelectComponent): Observable<T> {
    return merge(ngSelect.clearEvent, ngSelect.changeEvent);
  }

  /**
   * Trigger list changes for fields that depend on the Term / Term Block fields.
   *
   * @param includeBlock
   */
  protected onTermChange(includeBlock?: boolean): Observable<TermObject|BlockObject[]> {
    const termChange$ = this.ngOnChange(this.refTerm);

    if (!includeBlock) {
      return termChange$;
    }

    const blockChange$      = this.ngOnChange(this.refBlock);
    const mappedTermEvents$ = termChange$
      .pipe(mapTo(this.refBlock.selectedValues))
    ;

    return merge(mappedTermEvents$, blockChange$) as Observable<BlockObject[]>;
  }

}
