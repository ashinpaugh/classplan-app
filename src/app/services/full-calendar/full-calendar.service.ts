import { Injectable } from '@angular/core';
import {AbstractLoggable} from '../../classes/abstract-loggable';
import {SectionService} from '../section/section.service';
import {SectionMeetingType, SectionObject} from '../section/section.interfaces';
import {Dictionary} from '../../interfaces/dictionary';
import {CalendarColorMatrix, SearchFilters} from '../../components/search/helper/filter.helper';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {environment} from '../../../environments/environment';

// @see https://fullcalendar.io/docs/event-object
export interface EventObject {
  id: number;
  title: string;
  daysOfWeek: number[];
  allDay: boolean;
  extendedProps: Dictionary<any> & {
    section: SectionObject;
  };

  // Recurring events with specific times.
  startRecur?: string;
  endRecur?: string;
  startTime?: string;
  endTime?: string;

  // All day properties.
  start?: string;
  end?: string;

  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  eventOrder?: string | string[];
}

@Injectable({
  providedIn: 'root'
})
export class FullCalendarService extends AbstractLoggable {

  constructor(
    protected sections: SectionService,
  ) {
    super();
  }

  /**
   * Fetch all the sections based on the provided filter criteria and map them to FullCalendar Event Objects.
   */
  fetchAll(filters: SearchFilters, colors: CalendarColorMatrix): Observable<EventObject[]> {
    const params = this.sections.filtersToSectionParams(filters);

    return this.sections.fetchAll(params)
      .pipe(
        map(sections => {
          const showAllDay = filters.uiFilters.showAllDay;

          return sections
            .filter(section => showAllDay || !(!showAllDay && this.isAllDay(section)))
            .map(section => this.formatSourceToEvent(colors, section))
          ;
        }),
      )
    ;
  }

  /**
   * Find the first ISO date out of the provided events.
   */
  getEarliestSectionStart(events: EventObject[]): Date {
    const startParam = (event: EventObject) => {
      return event.startRecur ? event.startRecur : event.start;
    };

    if (!events || !events.length) {
      return new Date();
    }

    const sortedSections = events.sort((a, b) => {
      const dateA = new Date(startParam(a)).getTime();
      const dateB = new Date(startParam(b)).getTime();

      if (dateA < dateB) {
        return -1;
      }

      if (dateA > dateB) {
        return 1;
      }

      return 0;
    });

    return new Date(startParam(sortedSections[0]));
  }

  /**
   * Turns a date into a fullcalendar 'parsable' date.
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get the color value for an event.
   */
  getColor(matrix: CalendarColorMatrix, section: SectionObject, defaultColor = environment.defaultEventColor): string {
    const fieldSpecificity = ['instructor', 'room', 'building', 'subject', 'block'];
    const mostSpecific     = fieldSpecificity.find(field => field in matrix);

    if (!mostSpecific) {
      return defaultColor;
    }

    return matrix[mostSpecific][section[mostSpecific].id];
  }

  /**
   * Take a section and map it to a FullCalendar Event Object.
   */
  protected formatSourceToEvent(colors: CalendarColorMatrix, section: SectionObject): EventObject {
    const isAllDay = this.isAllDay(section);
    // section.meeting_type_str = this.meetingTypeToStr(section.meeting_type);

    const event = {
      id: section.id,
      title: section.subject.name + ' ' + section.course.number + ': ' + section.number,
      allDay : isAllDay,
      daysOfWeek: this.getDays(section, isAllDay),
      extendedProps: {
        section,
      },
      backgroundColor: this.getColor(colors, section),
    } as EventObject;

    if (!isAllDay) {
      event.startRecur = section.start;
      event.endRecur = section.end;
      event.startTime = this.getTime(section.start_time);
      event.endTime = this.getTime(section.end_time);
    } else {
      event.start = section.start;
      event.end = section.end;
    }

    return event;
  }

  /**
   * Map a section's day strings to FC event days.
   */
  protected getDays(section: SectionObject, isAllDay?: boolean): number[] {
    isAllDay  = isAllDay === undefined ? this.isAllDay(section) : isAllDay;
    const dow = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];

    if (isAllDay) {
      return Array.from(dow.keys());
    }

    const days = section.days.indexOf('/') > -1
      ? section.days.split('/')
      : section.days.split('')
    ;

    return days.map(part => dow.indexOf(part));
  }

  /**
   * Format the time.
   */
  protected getTime(time: string): string {
    if (!time) {
      return time;
    }

    const target = 4 === time.length ? time : '0' + time;

    return target.substr(0, 2) + ':' + target.substr(2);
  }

  /**
   * Determine if the section is considered an all day event.
   */
  protected isAllDay(section: SectionObject, includeOnline: boolean = true): boolean {
    return includeOnline && this.isOnline(section)
      || !section.days && section.start_time === section.end_time
    ;
  }

  /**
   * Checks if a class is taught online.
   */
  protected isOnline(section: SectionObject): boolean {
    return section.building && 'WEB' === section.building.name || section.meeting_type === SectionMeetingType.Web;
  }

  // protected meetingTypeToStr(typeId: number): string {
  //   switch (typeId) {
  //     case 0: return 'Exam';
  //     case 1: return 'Class';
  //     case 2: return 'Web';
  //     case 3: return 'Lab';
  //     case 4: return 'Conference';
  //     default: return 'Unknown';
  //   }
  // }
}
