import {AbstractLoggable} from '../classes/abstract-loggable';
import {from, Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {mergeMap, tap} from 'rxjs/operators';


export abstract class AbstractService extends AbstractLoggable {

  protected doFetchAll<T>(uri: string): Observable<T> {
    return from(fetch(environment.apiUrl + uri))
      .pipe(
        mergeMap(response => response.json()),
        tap(data => this.log('fetchAll', data)),
      )
    ;
  }

  protected doFetch<T>(uri: string): Observable<T> {
    return from(fetch(environment.apiUrl + uri))
      .pipe(
        mergeMap(response => response.json()),
        tap(data => this.log('fetch', data)),
      )
    ;
  }

}
