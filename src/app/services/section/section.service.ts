import { Injectable } from '@angular/core';
import {AbstractService} from '../abstract-service';
import {SectionFetchAllParams, SectionObject} from './section.interfaces';
import {Observable, of} from 'rxjs';
import {map, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SectionService extends AbstractService {

  constructor() {
    super();
  }

  fetchAll(params: SectionFetchAllParams): Observable<SectionObject[]> {
    const uri = 'section/find.json';
    const strParams = this.normalizeParams(params);
    const keyStore = `${uri}?${strParams}`;

    if (this.apiTracker.has(keyStore)) {
      return of(this.apiTracker.get(keyStore));
    }

    return this.doFetchAll<{sections: SectionObject[]}>(uri, {
      method: 'POST',
      body: strParams,
      headers: {
        'Accept': 'application/json',
        'Content-Type': "application/x-www-form-urlencoded"
      }
    })
      .pipe(
        map(response => response.sections),
        tap((sections: SectionObject[]) => {
          this.log('fetchAll', sections);
          this.apiTracker.delete(uri);
          this.apiTracker.set(keyStore, sections);
        }),
      )
    ;
  }
}
