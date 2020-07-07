import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {AbstractService} from '../abstract-service';
import {ApiGetTerm, ApiGetTermCollection} from './term.interfaces';
import {EventService} from '../event/event.service';

@Injectable({
  providedIn: 'root'
})
export class TermService extends AbstractService {

  constructor(event: EventService) {
    super(event);
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
