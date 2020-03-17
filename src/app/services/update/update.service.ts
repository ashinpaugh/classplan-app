import {Injectable} from '@angular/core';
import {AbstractService} from '../abstract-service';
import {environment} from '../../../environments/environment';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {mergeMap, tap} from 'rxjs/operators';

export interface UpdateObject {
  id: number,
  status_str: 'updating' | 'complete',
  start: string,
  end?: string,
  status: number,
  source: 'book' | 'ods'
}

@Injectable({
  providedIn: 'root'
})
export class UpdateService extends AbstractService {

  protected updateLog$: BehaviorSubject<UpdateObject>;

  constructor() {
    super();

    this.updateLog$ = new BehaviorSubject<UpdateObject>(undefined);
  }

  /**
   * Fetch the latest update log.
   */
  fetch(): Observable<UpdateObject> {
    return this.doFetch<UpdateObject>('update.json')
      .pipe(
        tap(log => {
          this.updateLog$.next(log);

          // Disable parent caching of this response.
          this.apiTracker.clear();
        })
      )
    ;
  }

  /**
   * Poll the server until an import has finished.
   */
  check(): Observable<{log: UpdateObject, updating: boolean}> {
    return from(fetch(environment.apiUrl + 'update/check.json', this.getDefaultRequestInit()))
      .pipe(
        mergeMap(response => response.json()),
        mergeMap((payload: {log: UpdateObject, updating: boolean}) => {
          if (!payload.updating) {
            this.updateLog$.next(payload.log);

            return of(payload);
          }

          return this.check();
        }),
        tap(payload => this.log('check', payload)),
      )
    ;
  }
}
