import {Injectable} from '@angular/core';
import {AbstractService} from '../abstract-service';
import {BuildingObject} from '../building/building.service';
import {Observable} from 'rxjs';
import {EventService} from '../event/event.service';

export interface RoomObject {
  id: number;
  number: string;
  sortName?: string;
}

export interface BuildingListObject {
  building: BuildingObject;
  rooms: RoomObject[];
}

@Injectable({
  providedIn: 'root'
})
export class RoomService extends AbstractService {

  constructor(event: EventService) {
    super(event);
  }

  fetchAll(building: BuildingObject) : Observable<BuildingListObject> {
    return this.doFetchAll(`building/${building.id}/rooms.json`);
  }

  fetch(id: number) {
    return this.doFetch(`room/${id}.json`);
  }
}
