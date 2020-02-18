import {AbstractLoggable} from '../classes/abstract-loggable';
import {from, Observable, of} from 'rxjs';
import {environment} from '../../environments/environment';
import {mergeMap, tap} from 'rxjs/operators';
import {Dictionary} from '../interfaces/dictionary';


export interface ApiParams {
  [ param: string ]: string|string[]|number|number[];
}

export abstract class AbstractService extends AbstractLoggable {

  // Poor mans caching.
  protected apiTracker: Map<string, any>;

  constructor() {
    super();

    this.apiTracker = new Map<string, object>();
  }

  protected doFetchAll<T>(uri: string, requestInit: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }): Observable<T> {

    if (this.apiTracker.has(uri)) {
      return of(this.apiTracker.get(uri) as T);
    }

    return from(fetch(environment.apiUrl + uri, requestInit))
      .pipe(
        mergeMap(response => response.json()),
        tap(data => {
          this.log('fetchAll', data);
          this.apiTracker.set(uri, data);
        }),
      )
    ;
  }

  protected doFetch<T>(uri: string, requestInit: RequestInit = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }): Observable<T> {

    if (this.apiTracker.has(uri)) {
      return of(this.apiTracker.get(uri) as T);
    }

    return from(fetch(environment.apiUrl + uri, requestInit))
      .pipe(
        mergeMap(response => response.json()),
        tap(data => {
          this.log('fetch', data);
          this.apiTracker.set(uri, data);
        }),
      )
    ;
  }

  protected createRequestBody(params: ApiParams): string {
    const body = [];

    Object.keys(params).forEach(key => {
      const value = params[key];
      const isArr = Array.isArray(value);
      const param = isArr ? `${key}[]` : key;
      const mappable = (isArr ? value : [value]) as any[];

      // mappable.forEach(val => url.searchParams.append(param, val));
      mappable.forEach(val => body.push(`${param}=${val}`));
    });

    return body.join('&');
  }

  protected normalizeParams(params): string {
    let normalized = '';

    for (const param in params) {
      const item = params[param];

      if (!params.hasOwnProperty(param) || !item || !item.length) {
        continue;
      }

      normalized += item.map(value => (!normalized ? '' : '&') + `${param}[]=${value}`);
    }

    return normalized;
  }

}
