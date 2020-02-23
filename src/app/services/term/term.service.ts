import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {AbstractService} from '../abstract-service';
import {ApiGetTerm, ApiGetTermCollection} from './term.interfaces';

@Injectable({
  providedIn: 'root'
})
export class TermService extends AbstractService {

  constructor() {
    super();
  }

  /**
   * Fetch all the term objects.
   */
  fetchAll(): Observable<ApiGetTermCollection> {
    return this.doFetchAll('terms.json');
  }

  /**
   * Fetch a single (full) term object.
   *
   * @param id
   */
  fetch(id: number): Observable<ApiGetTerm> {
    return this.doFetch(`term/${id}.json`);
  }

}
