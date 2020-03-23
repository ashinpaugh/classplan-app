import {BasicObject, Dictionary} from '../../../interfaces/dictionary';
import {ColorEvent} from 'ngx-color';
import {SectionMeetingType} from '../../../services/section/section.interfaces';
import {BlockObject, TermObject} from '../../../services/term/term.interfaces';
import {UISafeBuilding} from '../../../services/building/building.service';

export interface CalendarColorMatrix {
  block: Dictionary<ColorEvent>;
  subject: Dictionary<ColorEvent>;
  instructor: Dictionary<ColorEvent>;
  building: Dictionary<ColorEvent>;
  room: Dictionary<ColorEvent>;
}

export interface UIFilters {
  colors: CalendarColorMatrix;
  showAllDay: boolean;
  meetingTypes: SectionMeetingType[],
  xref: {
    subjects: boolean;
    instructors: boolean;
  }
}

export interface SearchFilters {
  term: TermObject;
  blocks: BlockObject[];
  subjects: BasicObject[];
  instructors: BasicObject[];
  buildings: UISafeBuilding[];
  rooms: BasicObject[];
  uiFilters: UIFilters;
}
