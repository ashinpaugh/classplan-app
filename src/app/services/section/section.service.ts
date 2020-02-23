import { Injectable } from '@angular/core';
import {AbstractService} from '../abstract-service';
import {SectionFetchAllParams, SectionObject} from './section.interfaces';
import {Observable, of} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SectionService extends AbstractService {

  constructor() {
    super();
  }

  /**
   * Find all the sections matching the provided filter criteria.
   *
   * @param params
   */
  fetchAll(params: SectionFetchAllParams): Observable<SectionObject[]> {
    const uri       = 'section/find.json';
    const strParams = this.createFormBody(params);
    const keyStore  = `${uri}?${strParams}`;

    if (this.apiTracker.has(keyStore)) {
      return of(this.apiTracker.get(keyStore));
    }

    return this.doFetchAll<{sections: SectionObject[]}>(uri, params, {method: 'POST'})
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

  /**
   * Fetch the response for the export view button.
   *
   * @param filters
   */
  getExportStream(filters: SectionFetchAllParams): Promise<Response> {
    return fetch(environment.apiUrl + 'download', {
      method: 'POST',
      body: this.createFormBody(filters),
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      })
    });
  }

  /**
   * Inline the export view response for download.
   *
   * @param response
   * @param defaultFilename
   */
  async handleStreamDownload(response: Response, defaultFilename: string = 'classplan-export.csv') {
    if (!response.ok || response.status !== 200) {
      return;
    }

    // @see https://nehalist.io/downloading-files-from-post-requests/
    const disposition = response.headers.get('content-disposition');
    const matches = /"([^"]*)"/.exec(disposition);
    const filename = (matches != null && matches[1] ? matches[1] : defaultFilename);

    const fileContents = await response.blob();
    const fileObjUrl   = window.URL.createObjectURL(fileContents);

    const link = document.createElement('a');
    link.href = fileObjUrl;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
