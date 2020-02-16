import { Injectable } from '@angular/core';
import {AbstractService} from '../abstract-service';
import {merge, Observable} from 'rxjs';
import {ApiGetBlockAwareSubjectList} from './subject.interfaces';
import {BlockObject} from '../term/term.interfaces';
import {BasicObject, Dictionary} from '../../interfaces/dictionary';
import {map, toArray} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SubjectService extends AbstractService {

  constructor(

  ) {
    super();
  }

  fetchAll(): Observable<BasicObject[]> {
    return this.doFetchAll(`subjects.json`);
  }

  fetchAllByBlock(
    block: BlockObject | BlockObject[],
    metaKey: keyof BlockObject = 'name',
  ): Observable<BasicObject[]> {

    const blocks = Array.isArray(block) ? block : [block];
    const fetchArr$ = blocks.map(block => this.doFetchAll(`term/${block.id}/subjects.json`));

    return merge(...fetchArr$)
      .pipe(
        map((result: ApiGetBlockAwareSubjectList) => {
          return result.subjects.map(subject => {
            subject.meta = result.block[metaKey];

            return subject;
          })
        }),
        toArray(),
        map((results: BasicObject[][]) => [].concat(...results)),
      )
    ;
  }

  fetchByInstructor(instructor: BasicObject | BasicObject[]): Observable<BasicObject[]> {
    const instructors = Array.isArray(instructor) ? instructor : [instructor];
    const fetchArr$ = instructors.map(instructor => this.doFetchAll(`subject/${instructor.id}/instructor.json`));

    return merge(...fetchArr$)
      .pipe(
        map((response: {subjects: Dictionary<BasicObject>}) => Object.values(response.subjects)),
        toArray(),
        map((results: BasicObject[][]) => [].concat(...results)),
      )
    ;
  }
}
