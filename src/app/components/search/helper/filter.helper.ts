import {ColorEvent} from 'ngx-color';
import {BehaviorSubject, Observable} from 'rxjs';
import {SectionMeetingType} from '../../../services/section/section.interfaces';
import {UISafeBuilding} from '../../../services/building/building.service';
import {BlockObject, TermObject} from '../../../services/term/term.interfaces';
import {BasicObject} from '../../../interfaces/dictionary';
import {SearchComponent} from '../search.component';
import * as HelperInterfaces from './filter.interfaces';
export * from './filter.interfaces';


export class FilterHelper {

  static filters$: BehaviorSubject<HelperInterfaces.SearchFilters>;

  static set Filters(filters: HelperInterfaces.SearchFilters) {
    FilterHelper.filters$.next(filters);
  }

  static get Filters(): HelperInterfaces.SearchFilters {
    return FilterHelper.filters$.getValue();
  }

  static get Filters$(): Observable<HelperInterfaces.SearchFilters> {
    return FilterHelper.filters$.asObservable();
  }

  static get DefaultFilters(): HelperInterfaces.SearchFilters {
    return {
      term: undefined,
      blocks: undefined,
      buildings: undefined,
      rooms: undefined,
      subjects: undefined,
      instructors: undefined,
      uiFilters: {
        showAllDay: false,
        meetingTypes: [SectionMeetingType.Class],
        colors: {} as HelperInterfaces.CalendarColorMatrix,
        xref: {
          subjects: false,
          instructors: true,
        },
      },
    };
  }

  static setup(reset?: boolean) {
    if (!FilterHelper.filters$) {
      FilterHelper.filters$ = new BehaviorSubject<HelperInterfaces.SearchFilters>(undefined);
    }

    if (reset) {
      this.Filters = FilterHelper.DefaultFilters;
    }
  }

  static setOptionColor(type: string, value: BasicObject, event: MouseEvent, colorEvent: ColorEvent) {
    let parent: HTMLElement = event.target as HTMLElement;

    while (!parent.classList.contains('ng-value')) {
      parent = parent.parentElement;
    }

    parent.style.backgroundColor = colorEvent.color.hex;

    const filters = FilterHelper.Filters;

    if (!filters.uiFilters.colors[type]) {
      filters.uiFilters.colors[type] = {};
    }

    filters.uiFilters.colors[type][value.id] = colorEvent.color.hex;

    this.Filters = filters;
  }

  static syncComponentValues(component: SearchComponent): HelperInterfaces.SearchFilters {
    const ngBuildings = component.refBuilding.selectedValues as UISafeBuilding[];
    const buildings   = ngBuildings.filter((item: UISafeBuilding) => !!item.rooms);
    const rooms       = ngBuildings.filter((item: UISafeBuilding) => !item.rooms);

    const values = {
      term: component.refTerm.selectedValues[0] as TermObject,
      blocks: component.refBlock.selectedValues as BlockObject[],
      buildings: buildings as UISafeBuilding[],
      rooms: [].concat(...rooms),
      subjects: component.refSubject.selectedValues as BasicObject[],
      instructors: component.refInstructor.selectedValues as BasicObject[],
      uiFilters: {
        colors: component.Filters.uiFilters.colors,
        showAllDay: component.showAllDay,
        meetingTypes: component.meetingTypes,
        xref: {
          subjects: component.refChkSubjectsByInstructors.checked,
          instructors: component.refChkInstructorsBySubject.checked,
        }
      },
    };

    return this.Filters = values;
  }

}

