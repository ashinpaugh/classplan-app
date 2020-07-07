import {Injectable} from '@angular/core';
import {AbstractService} from '../abstract-service';
import {BasicObject, Dictionary} from '../../interfaces/dictionary';
import {BlockObject} from '../term/term.interfaces';
import {merge, Observable} from 'rxjs';
import {map, tap, toArray} from 'rxjs/operators';
import {EventService} from '../event/event.service';

export interface ApiGetBlockAwareInstructorList {
  block: BlockObject;
  instructors: Dictionary<BasicObject[]>;
}

@Injectable({
  providedIn: 'root'
})
export class InstructorService extends AbstractService {

  constructor(event: EventService) {
    super(event);
  }

  /**
   * Fetch all the known instructors.
   */
  fetchAll(): Observable<BasicObject[]> {
    return this.doFetchAll(`instructors.json`);
  }

  /**
   * Fetch all the known instructors and filter by the provided blocks / subjects.
   *
   * @param blocks
   * @param subjects
   */
  fetchAllByBlock(blocks: BlockObject[], subjects?: BlockObject[]): Observable<BasicObject[]> {
    const requests = [];

    blocks.forEach(block => {
      if (!subjects || !subjects.length) {
        requests.push(this.doFetchAll<ApiGetBlockAwareInstructorList>(`term/${block.id}/instructors.json`));
        return;
      }

      subjects.forEach(subject => {
        requests.push(this.doFetchAll<ApiGetBlockAwareInstructorList>(`term/${block.id}/subject/${subject.id}/instructors.json`));
      })
    });

    const parseBlockResponse = (data: {block: BlockObject, instructors: Dictionary<BasicObject[]>}) => {
      const collection = data.instructors;

      for (const subject in collection) {
        if (!collection.hasOwnProperty(subject)) {
          continue;
        }

        // Format the data for ng-select.
        collection[subject].map(instructor => {
          instructor.meta = `${data.block.name} - ${subject}`;

          return instructor;
        });
      }

      const instructors = Object.values(collection);

      return [].concat(...instructors);
    };

    return merge(...requests)
      .pipe(
        toArray(),
        map((responses: [{block: BlockObject, instructors: Dictionary<BasicObject[]>}]) => responses.map(response => parseBlockResponse(response))),
        map(results => [].concat(...results)),
        tap(results => this.debug('fetchAllByBlock', results)),
      )
    ;
  }
}
