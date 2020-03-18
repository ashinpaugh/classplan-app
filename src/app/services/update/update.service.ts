import {Injectable} from '@angular/core';
import {AbstractService} from '../abstract-service';
import {Observable, timer} from 'rxjs';
import {concatMap, tap} from 'rxjs/operators';

export interface UpdateObject {
  id: number;
  status_str: 'updating' | 'complete';
  start: string;
  end?: string;
  status: number;
  source: 'book' | 'ods';
  progress: number;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateService extends AbstractService {

  constructor() {
    super();

    this.LoggingEnabled = false;
  }

  /**
   * Fetch the latest update log.
   */
  fetch(): Observable<UpdateObject> {
    return this.doFetch<UpdateObject>('update.json')
      .pipe(tap(() => this.apiTracker.clear()))
    ;
  }

  /**
   * Poll the server until an import has finished.
   */
  check(): Observable<UpdateObject> {
    return timer(0, 7500)
      .pipe(concatMap(() => this.fetch()))
    ;
  }
}
