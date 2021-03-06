import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChild, ViewChildren, ViewEncapsulation} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatCheckbox, MatCheckboxChange} from '@angular/material/checkbox';
import {MatSelectionListChange} from '@angular/material/list';
import {NgOption, NgSelectComponent} from '@ng-select/ng-select';
import {GithubComponent} from 'ngx-color/github';
import {ColorEvent} from 'ngx-color';
import {TermService} from '../../services/term/term.service';
import {BlockObject, TermObject} from '../../services/term/term.interfaces';
import {BasicObject} from '../../interfaces/dictionary';
import {AbstractComponent} from '../abstract-component';
import {SubjectService} from '../../services/subject/subject.service';
import {InstructorService} from '../../services/instructor/instructor.service';
import {BuildingService} from '../../services/building/building.service';
import {SectionMeetingType} from '../../services/section/section.interfaces';
import {SectionService} from '../../services/section/section.service';
import {DomUtil} from '../../classes/tools/dom.util';
import {FilterHelper, SearchFilters, UIFilters} from './helper/filter.helper';
import {combineLatest, merge, Observable, of, Subject, timer} from 'rxjs';
import {debounceTime, filter, map, mapTo, shareReplay, startWith, switchMap, take, takeUntil, tap} from 'rxjs/operators';
import tippy from 'tippy.js';

@Component({
  selector: 'classplan-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent extends AbstractComponent implements AfterViewInit {

  @Output() filtersChange: EventEmitter<SearchFilters> = new EventEmitter<SearchFilters>();

  @ViewChildren(NgSelectComponent) ngSelects: QueryList<NgSelectComponent>;
  @ViewChild('refTermSearch') refTerm: NgSelectComponent;
  @ViewChild('refBlockSearch') refBlock: NgSelectComponent;
  @ViewChild('refBuildingSearch') refBuilding: NgSelectComponent;
  @ViewChild('refSubjectSearch') refSubject: NgSelectComponent;
  @ViewChild('refInstructorSearch') refInstructor: NgSelectComponent;
  @ViewChild('colorPallet', { static: true, read: ElementRef }) refColor: ElementRef;
  @ViewChild('chkFilterSubjectsByInstructors') refChkSubjectsByInstructors: MatCheckbox;
  @ViewChild('chkFilterInstructorsBySubjects') refChkInstructorsBySubject: MatCheckbox;

  availableMeetingTypes: string[];
  disableSearch$: Observable<boolean>;
  terms$: Observable<TermObject[]>;
  blocks$: Observable<BlockObject[]>;
  buildings$: Observable<BasicObject[]>;
  subjects$: Observable<BasicObject[]>;
  instructors$: Observable<BasicObject[]>;
  showSpinner$: Observable<boolean>;
  hideElements$: Observable<boolean>;

  constructor(
    protected elementRef: ElementRef,
    protected dialogRef: MatDialogRef<SearchComponent>,
    protected terms: TermService,
    protected buildings: BuildingService,
    protected subjects: SubjectService,
    protected instructors: InstructorService,
    protected sections: SectionService,
  ) {
    super();

    this.setMeetingTypes();

    if (!this.Filters) {
      FilterHelper.setup(true);
    }
  }

  get Filters(): SearchFilters {
    return FilterHelper.filters$.getValue();
  }

  set Filters(filters: SearchFilters) {
    FilterHelper.Filters = filters;
  }

  get Filter$() {
    return FilterHelper.Filters$;
  }

  get showAllDay() {
    return this.Filters.uiFilters.showAllDay;
  }

  @Input()
  set showAllDay(show: boolean) {
    this.setUIFilter('showAllDay', show);
  }

  get meetingTypes() {
    return this.Filters.uiFilters.meetingTypes;
  }

  @Input()
  set meetingTypes(type: SectionMeetingType[]) {
    this.setUIFilter('meetingTypes', type);
  }

  /**
   * @inheritDoc
   */
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

    this.setupEntityFetchers();

    this.setupLoadingSpinner();

    DomUtil.watch$(this.elementRef.nativeElement, {childList: true, subtree: true})
      .pipe(takeUntil(this.ngUnsubscribe$))
      .subscribe(records => this.setLabelColor(records))
    ;

    this.log('filters', this.Filters);

    // Auto-select the Full Semester block.
    this.blocks$
      .pipe(
        // Wait for ng-select to parse the update.
        switchMap(blocks => timer(0).pipe(mapTo(blocks))),
        map(blocks => blocks && blocks.find(block => ['Full Semester', 'Full Term'].includes(block.name))),
        filter(fullSemester => !!fullSemester),
        takeUntil(this.ngUnsubscribe$),
      )
      .subscribe(fullSemester => {
        // Automatically select Full Semester if there are no blocks set, or if a new term was selected.
        const shouldSet = (!this.Filters.blocks || this.Filters.blocks.length === 0)
          || (!!this.refTerm.selectedValues && this.Filters.term.id !== (this.refTerm.selectedValues[0] as TermObject).id)
        ;

        if (!shouldSet) {
          return;
        }

        const ngOption = this.refBlock.itemsList.findItem(fullSemester.id);

        if (ngOption && !ngOption.selected) {
          this.refBlock.select(ngOption);
        }
      })
    ;

    if (this.Filters.term) {
      setTimeout(() => this.syncFilters(), 0);
    }
  }

  /**
   * Remove a selected item and unset it's custom color if one was set.
   *
   * @param ngSelect
   * @param type
   * @param item
   */
  ngSelectDeselectItem(ngSelect: NgSelectComponent, type: string, item: BasicObject) {
    ngSelect.clearItem(item);

    const colors = this.Filters.uiFilters.colors[type];

    if (!colors || !colors[item.id]) {
      return;
    }

    delete colors[item.id];
  }

  /**
   * Triggered when an option label is clicked.
   *
   * @param event
   * @param type
   * @param optionValue
   * @param colorPallet
   */
  ngOptionLabelClick(event: MouseEvent, type: string, optionValue, colorPallet: GithubComponent) {
    this.log('ngOptionLabelClick', event, optionValue);

    event.stopPropagation();

    const onDestroy$ = new Subject();

    tippy(event.target as HTMLElement, {
      allowHTML: true,
      content: this.refColor.nativeElement,
      trigger: 'click',
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
      .subscribe((colorEvent: ColorEvent) => FilterHelper.setOptionColor(type, optionValue, event, colorEvent))
    ;
  }

  /**
   * Handles the checkbox changes.
   *
   * @param data
   */
  advancedCheckChanged(data: MatSelectionListChange) {
    this.log('advancedCheckChanged', data);

    this.setUIFilter(data.option.value, data.option.selected);
  }

  /**
   * Emit a filter changed event on close.
   */
  sendFilters() {
    // Set the filters for reference when the search component is re-opened.
    FilterHelper.syncComponentValues(this);

    this.filtersChange.emit(this.Filters);

    this.close();
  }

  /**
   * Reset the filters to their default values.
   */
  clearFilters() {
    FilterHelper.setup(true);

    this.clearSelected();
  }

  /**
   * Clear the values from all ngSelects.
   */
  clearSelected(): void {
    this.ngSelects.forEach(select => select.clearModel());
  }

  /**
   * Closes the search dialog.
   */
  close() {
    this.dialogRef.close();
  }

  /**
   * Make api calls based on user interaction with the search filters.
   */
  protected setupEntityFetchers(): void {

    this.terms$ = this.terms.fetchAll()
      .pipe(
        map(data => data.terms),
        startWith([]),
        shareReplay(1),
      )
    ;

    this.blocks$ = this.onTermChange()
      .pipe(
        debounceTime(25),
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
        shareReplay(1),
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
        shareReplay(1),
      )
    ;

    this.buildings$ = this.buildings.fetchAll()
      .pipe(shareReplay(1))
    ;

  }

  /**
   * uiFilter setter.
   *
   * @param param
   * @param value
   */
  protected setUIFilter(param: keyof UIFilters, value) {
    const filters = this.Filters;
    filters.uiFilters[param] = value;
    this.Filters = filters;
  }

  /**
   * Take the settings stored in the filter helper and reapply them to the modal.
   */
  protected syncFilters() {
    const termOption = this.refTerm.itemsList
      .findByLabel(this.Filters.term.name)
    ;

    if (!termOption || !this.Filters.blocks || !this.Filters.blocks.length) {
      return;
    }

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

    this.refBlock.changeEvent
      .pipe(take(1))
      .subscribe(() => {
        syncFilterWithSelect(this.refSubject, this.subjects$, this.Filters.subjects);
        syncFilterWithSelect(this.refInstructor, this.instructors$, this.Filters.instructors);
        syncFilterWithSelect(this.refBuilding, this.buildings$, this.Filters.buildings, true);
        syncFilterWithSelect(this.refBuilding, this.buildings$, this.Filters.rooms, true);
      })
    ;

    syncFilterWithSelect(this.refBlock, this.blocks$, this.Filters.blocks);

    this.showAllDay = this.Filters.uiFilters.showAllDay;
    this.meetingTypes = this.Filters.uiFilters.meetingTypes;

    this.refChkSubjectsByInstructors.checked = this.Filters.uiFilters.xref.subjects;
    this.refChkInstructorsBySubject.checked  = this.Filters.uiFilters.xref.instructors;
  }

  /**
   * Setup a spinner so that the uiElements don't load in staggered.
   */
  protected setupLoadingSpinner(): void {
    const fieldCheck = (items) => items && items.length > 0;
    const haveValues = (items) => items && items.every(fieldCheck);

    this.hideElements$ = combineLatest([
      this.refBlock.changeEvent,
      this.subjects$,
      this.instructors$,
      this.buildings$,
    ])
      .pipe(
        // tap(hideElements => this.debug('hideElements$ -> peak', hideElements)),
        map(results => !haveValues(results)),
        startWith(true),
        tap(hideElements => this.log('hideElements$', hideElements)),
        shareReplay(1),
      )
    ;

    this.showSpinner$ = combineLatest([
      this.hideElements$,
      this.refBlock.changeEvent.pipe(map(value => fieldCheck(value))),
    ])
      .pipe(
        map(flags => flags && flags.every(flag => !!flag)),
        startWith(false),
        tap(showSpinner => this.log('showSpinner$', showSpinner)),
        shareReplay(1),
      )
    ;
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
    const colors = this.Filters.uiFilters.colors;
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

    return (merge(mappedTermEvents$, blockChange$) as Observable<BlockObject[]>)
      // .pipe(tap(value => this.log('onTermChange', value)),)
    ;
  }

  /**
   * Set the meeting types.
   */
  protected setMeetingTypes(): void {
    this.availableMeetingTypes = [];

    Object.keys(SectionMeetingType)
      .filter(key => Number.isInteger(+key))
      .sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
      .forEach(key => this.availableMeetingTypes.push(SectionMeetingType[key]))
    ;
  }

}
