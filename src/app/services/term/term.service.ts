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

  fetchAll(): Observable<ApiGetTermCollection> {
    return this.doFetchAll('terms.json');
  }

  fetch(id: number): Observable<ApiGetTerm> {
    return this.doFetch(`term/${id}.json`);
  }

}
