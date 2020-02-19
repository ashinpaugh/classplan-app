import { Injectable } from '@angular/core';
import {AbstractService} from '../abstract-service';
import {merge, Observable} from 'rxjs';
import {BlockAwareSubjectList} from './subject.interfaces';
import {BlockObject} from '../term/term.interfaces';
import {BasicObject} from '../../interfaces/dictionary';
import {map, tap, toArray} from 'rxjs/operators';
import {ArrayUtil} from '../../classes/tools/array.util';

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
    blockKey: keyof BlockObject = 'name',
  ): Observable<BasicObject[]> {

    const blocks = Array.isArray(block) ? block : [block];
    const fetchArr$ = blocks.map(block => this.doFetchAll(`term/${block.id}/subjects.json`));

    return merge(...fetchArr$)
      .pipe(
        map((result: BlockAwareSubjectList) => this.mapSubject(result.block, result.subjects, blockKey)),
        toArray(),
        map((results: BasicObject[][]) => [].concat(...results)),
        tap(results => this.log('fetchAllByBlock', results)),
      )
    ;
  }

  fetchByInstructor(blocks: BasicObject[], instructors: BasicObject[]): Observable<BasicObject[]> {
    const fetchArr = [];

    blocks.forEach(block => instructors.forEach(instructor => {
      fetchArr.push(this.doFetchAll(`term/${block.id}/instructor/${instructor.id}/subjects.json`));
    }));

    return merge(...fetchArr)
      .pipe(
        toArray(),
        map((responses: BlockAwareSubjectList[]) => responses.map(response => this.mapSubject(response.block, response.subjects))),
        map((results: BasicObject[][]) => [].concat(...results)),
        map((results: BasicObject[]) => ArrayUtil.unique<BasicObject>(results, 'id')),
      )
    ;
  }

  protected mapSubject(block: BlockObject, subjects: BasicObject[], blockKey: keyof BlockObject = 'name') {
    return subjects.map(subject => {
      subject.meta = block[blockKey];

      return subject;
    })
  }
}
