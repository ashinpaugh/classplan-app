import { Injectable } from '@angular/core';
import {AbstractService} from '../abstract-service';
import {merge, Observable} from 'rxjs';
import {map, scan, tap} from 'rxjs/operators';
import {BasicObject} from '../../interfaces/dictionary';
import {RoomObject} from '../room/room.service';

export interface BuildingObject {
  campus?: BasicObject;
  rooms?: RoomObject[];
  id: number;
  name: string;
  short_name: string;
}

export type UISafeRoom     = (BasicObject & {sortName: string});
export type UISafeBuilding = (BasicObject & {rooms: UISafeRoom[]});

@Injectable({
  providedIn: 'root'
})
export class BuildingService extends AbstractService {

  constructor() {
    super();
  }

  fetchAll() : Observable<UISafeBuilding[]> {
    return this.doFetchAll(`buildings.json`)
      .pipe(
        map((payload: {buildings: BuildingObject[]}) => {
          const results = payload.buildings
            .map(data => {
              return {
                id:    data.id,
                name:  data.name,
                rooms: data.rooms.map(room => {
                  const roomName = data.short_name + ' - ' + room.number;

                  return {
                    id: room.id,
                    name: roomName,
                    sortName: roomName.toLocaleLowerCase(),
                  };
                }),
              };
            })
          ;

          return this.sortAlpha(results);
        }),
      )
    ;
  }

  fetch(id: number) {
    return this.doFetch(`building/${id}.json`);
  }

  fetchAllByBlock(blockId: number): Observable<BuildingObject[]> {
    return this.doFetchAll(`term/${blockId}/buildings.json`)
      .pipe(
        map((payload: {buildings: BuildingObject[]}) => payload.buildings),
        tap((results: BuildingObject[]) => this.debug('fetchAllByBlock -> peak', results)),
        map(results => [].concat(...results)),
        tap((results: BuildingObject[]) => this.debug('fetchAllByBlock', results)),
      )
    ;
  }


  /**
   * Sort buildings and their rooms.
   *
   * @param buildings
   */
  protected sortAlpha(buildings: UISafeBuilding[]) {
    const sort = (a, b, key) => {
      if (a[key] < b[key]) {
        return -1;
      }

      if (a[key] > b[key]) {
        return 1;
      }

      return 0;
    };

    return buildings
      .sort((a, b) => sort(a, b, 'name'))
      .map(building => {
        building.rooms = building.rooms.sort((a, b) => sort(a, b, 'sortName'));

        return building
      })
    ;
  }
}
