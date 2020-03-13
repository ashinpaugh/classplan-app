import { Injectable } from '@angular/core';
import {AbstractLoggable} from '../../classes/abstract-loggable';
import {SectionService} from '../section/section.service';
import {SectionObject} from '../section/section.interfaces';
import {Dictionary} from '../../interfaces/dictionary';
import {AdvancedFilters, CalendarColorMatrix} from '../../components/search/search.component';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

// @see https://fullcalendar.io/docs/event-object
export interface EventObject {
  id: number;
  title: string;
  daysOfWeek: number[];
  allDay: boolean;
  extendedProps: Dictionary<any> & {
    section: SectionObject;
  }

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
}

@Injectable({
  providedIn: 'root'
})
export class FullCalendarService extends AbstractLoggable {

  protected defaultEventColor = '#3f51b5';

  constructor(
    protected sections: SectionService,
  ) {
    super();
  }

  /**
   * Fetch all the sections based on the provided filter criteria and map them to FullCalendar Event Objects.
   *
   * @param filters
   * @param colors
   */
  fetchAll(filters: AdvancedFilters, colors: CalendarColorMatrix): Observable<EventObject[]> {
    const params = this.sections.filtersToSectionParams(filters);

    return this.sections.fetchAll(params)
      .pipe(
        map(sections => {
          return sections
            .filter(section => params.showOnline || (!params.showOnline && !this.isOnline(section)))
            .map(section => this.formatSourceToEvent(colors, section))
          ;
        }),
      )
    ;
  }

  /**
   * Find the first ISO date out of the provided events.
   *
   * @param events
   */
  getEarliestSectionStart(events?: EventObject[]): string {
    const format = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const startParam = (event: EventObject) => {
      return event.startRecur ? event.startRecur : event.start;
    };

    if (!events || !events.length) {
      return format(new Date());
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

    return format(new Date(startParam(sortedSections[0])));
  }

  /**
   * Get the color value for an event.
   *
   * @param matrix
   * @param section
   * @param defaultColor
   */
  getColor(matrix: CalendarColorMatrix, section, defaultColor = this.defaultEventColor): string {
    const fieldSpecificity = ['instructor', 'room', 'building', 'subject', 'block'];
    const mostSpecific     = fieldSpecificity.find(field => field in matrix);

    if (!mostSpecific) {
      return defaultColor;
    }

    return matrix[mostSpecific][section[mostSpecific].id];
  }

  /**
   * Take a section and map it to a FullCalendar Event Object.
   *
   * @param colors
   * @param section
   */
  protected formatSourceToEvent(colors: CalendarColorMatrix, section: SectionObject): EventObject {
    const isAllDay = this.isAllDay(section);
    const event = {
      id: section.id,
      title: section.subject.name + ' ' + section.course.number + ': ' + section.number,
      allDay : isAllDay,
      daysOfWeek: this.getDays(section, isAllDay),
      extendedProps: {
        section: section,
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
   *
   * @param section
   * @param isAllDay
   */
  protected getDays(section: SectionObject, isAllDay?: boolean): number[] {
    const days = section.days;
    const dow  = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];

    isAllDay = isAllDay === undefined ? this.isAllDay(section) : isAllDay;

    if (isAllDay) {
      return Array.from(dow.keys());
    }

    if (!days.length) {
      return [];
    }

    const parts = -1 === days.indexOf('/')
      ? [days]
      : days.split('/')
    ;

    return parts.map(part => dow.indexOf(part));
  }

  /**
   * Format the time.
   *
   * @param time
   */
  protected getTime(time: string): string {
    if (!time) {
      return time;
    }

    const target = 4 === time.length ? time : '0' + time;

    return target.substr(0, 2) + ':' + target.substr(2);
  }

  protected isOnline(section: SectionObject): boolean {
    return 'WEB' === section.building.name;
  }

  /**
   * Determine if the section is considered an all day event.
   *
   * @param section
   * @param includeOnline
   */
  protected isAllDay(section: SectionObject, includeOnline: boolean = true): boolean {
    return includeOnline && this.isOnline(section) || !section.days && section.start_time === section.end_time;
  }

}
