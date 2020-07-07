import {AbstractLoggable} from '../classes/abstract-loggable';
import {environment} from '../../environments/environment';
import {EventService} from './event/event.service';
import {AppEvent} from './event/event.interface';
import {from, Observable, of, throwError} from 'rxjs';
import {concatMap, tap} from 'rxjs/operators';


export interface ApiParams {
  [ param: string ]: string|string[]|number|number[];
}

export abstract class AbstractService extends AbstractLoggable {

  // Poor mans caching.
  protected apiTracker: Map<string, any> = new Map<string, object>();

  constructor(protected event: EventService) {
    super();

    this.event.register(AppEvent.Events.API_UPDATE_END, this, () => this.clear());
  }

  /**
   * Fetch a batch of objects and perform param serialization and page caching.
   *
   * @param uri
   * @param params
   * @param requestInit
   */
  protected doFetchAll<T>(uri: string, params?: ApiParams, requestInit?: RequestInit): Observable<T> {
    requestInit = this.getRequestInit(params, requestInit);

    if (this.apiTracker.has(uri)) {
      return of(this.apiTracker.get(uri) as T);
    }

    return from(fetch(environment.apiUrl + uri, requestInit))
      .pipe(
        concatMap(async response => {
          const payload = await response.json();

          if (response.ok) {
            return payload;
          }

          return await throwError(payload).toPromise();
        }),
        tap(data => {
          this.debug('fetchAll', data);
          this.apiTracker.set(uri, data);
        }),
      )
    ;
  }

  /**
   * Fetch a single instance of an object and perform param serialization and page caching.
   *
   * @param uri
   * @param params
   * @param requestInit
   */
  protected doFetch<T>(uri: string, params?: ApiParams, requestInit?: RequestInit): Observable<T> {
    requestInit = this.getRequestInit(params, requestInit);

    if (this.apiTracker.has(uri)) {
      return of(this.apiTracker.get(uri) as T);
    }

    return from(fetch(environment.apiUrl + uri, requestInit))
      .pipe(
        // concatMap(response => response.json()),
        concatMap(async response => {
          const payload = await response.json();

          if (response.ok) {
            return payload;
          }

          return await throwError(payload).toPromise();
        }),
        tap((data: T) => {
          this.debug('fetch', data);
          this.apiTracker.set(uri, data);
        }),
      )
    ;
  }

  /**
   * Modify / create the request object passed into a request.
   *
   * @param params    Params to include in the query / body of the request.
   * @param overrides The request init params to override.
   */
  protected getRequestInit(params: ApiParams, overrides?: RequestInit): RequestInit {
    const request = Object.assign(this.getDefaultRequestInit(), overrides || {});
    const hasParams = !!params && Object.keys(params).length > 0;
    const contentType = request.headers['Content-Type'];

    if (hasParams && !request.body) {
      if ('application/json' === contentType) {
        request.body = JSON.stringify(params);
      } else if ('application/x-www-form-urlencoded' === contentType) {
        request.body = this.createFormBody(params);
      } else {
        throw new Error('Unsupported content type: ' + contentType);
      }
    }

    return request;
  }

  /**
   * Get the default request init settings for the fetch() api.
   */
  protected getDefaultRequestInit(): RequestInit {
    return {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    };
  }

  /**
   * Be sure to set the Content-Type: application/x-www-form-urlencoded
   *
   * @param params
   */
  protected createFormBody(params: ApiParams): string {
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

  /**
   * Clear local caching.
   */
  protected clear(): void {
    this.debug('clear');

    this.apiTracker.clear();
  }

}
