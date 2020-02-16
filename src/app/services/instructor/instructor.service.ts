import { Injectable } from '@angular/core';
import {AbstractService} from '../abstract-service';
import {merge, Observable} from 'rxjs';
import {BasicObject} from '../../interfaces/dictionary';
import {ApiGetBlockAwareInstructorList, InstructorFetchAllParams} from './instructor.interfaces';
import {map, tap, toArray} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InstructorService extends AbstractService {

  constructor() {
    super();
  }

  fetchAll(params?: InstructorFetchAllParams): Observable<BasicObject[]> {

    if (!params) {
      return this.doFetchAll(`instructors.json`);
    }

    if (!!params.block) {
      return this.fetchAllByBlock(params.block);
    }

    throw new Error('Invalid fetchAll signature.');
  }

  fetchAllByBlock(block: number | number[]): Observable<BasicObject[]> {
    const blocks = Array.isArray(block) ? block : [block];
    const requests = blocks.map(blockId => this.doFetchAll<ApiGetBlockAwareInstructorList>(`instructor/${blockId}/subjects.json`));

    return merge(...requests)
      .pipe(
        map(data => {
          const collection = data.instructors;

          for (const subject in collection) {
            if (!collection.hasOwnProperty(subject)) {
              continue;
            }

            // Format the data for ng-select.
            (collection[subject] as BasicObject[]).map(instructor => {
              instructor.meta = `${data.block.name} - ${subject}`;

              return instructor;
            });
          }

          const instructors = Object.values(collection);

          return [].concat(...instructors);
        }),
        toArray(),
        map(results => [].concat(...results)),
        tap(results => this.debug('results', results)),
      )
    ;
  }
}
