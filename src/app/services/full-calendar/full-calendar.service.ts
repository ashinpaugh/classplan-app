import { Injectable } from '@angular/core';
import {AbstractLoggable} from '../../classes/abstract-loggable';
import {SectionService} from '../section/section.service';
import {SectionFetchAllParams} from '../section/section.interfaces';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FullCalendarService extends AbstractLoggable {

  constructor(protected sections: SectionService) {
    super();
  }

  fetchAll(params: SectionFetchAllParams) {
    return this.sections.fetchAll(params)
      .pipe(
        map(results => {
          return results.map(section => {
            return {
              id: section.id,
              title: section.subject.name + ' ' + section.course.number + ': ' + section.number,
              startRecur: section.start,
              endRecur: section.end,
              startTime: this.getTime(section.start_time),
              endTime: this.getTime(section.end_time),
              daysOfWeek: this.getDays(section.days),
              //backgroundColor: '',
              //borderColor: '',
              //textColor: '',
              extendedProps: {
                section: section,
              }
            }
          });
        }),
      )
    ;
  }

  protected getDays(strDays): number[] {
    if (!strDays.length) {
      return [];
    }

    let dow, days, parts, idx;
    dow   = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];
    days  = [];

    if (-1 === strDays.indexOf('/')) {
      parts = strDays;
    } else {
      parts = strDays.split('/');
    }

    for (idx in parts) {
      if (!parts.hasOwnProperty(idx)) {
        continue;
      }

      let initial = parts[idx];
      days.push(dow.indexOf(initial));
    }

    return days;
  }

  /**
   * Format the time.
   *
   * @param {string} strTime
   * @returns {string}
   */
  protected getTime(strTime) {
    let time = 4 === strTime.length ? strTime : '0' + strTime;

    return time.substr(0, 2) + ':' + time.substr(2);
  }

}
