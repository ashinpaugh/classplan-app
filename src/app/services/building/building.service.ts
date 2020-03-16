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

export type UISafeBuilding = (BasicObject & {rooms: BasicObject[]});

@Injectable({
  providedIn: 'root'
})
export class BuildingService extends AbstractService {

  constructor() {
    super();
  }

  fetchAll(blockId: number) : Observable<BuildingObject[]> {
    return this.doFetchAll(`term/${blockId}/buildings.json`)
      .pipe(map((payload: {buildings: BuildingObject[]}) => payload.buildings))
    ;
  }

  fetch(id: number) {
    return this.doFetch(`building/${id}.json`);
  }

  fetchAllByBlock(blockId: number): Observable<BuildingObject[]> {
    return this.fetchAll(blockId)
      .pipe(
        map(results => [].concat(...results)),
        tap((results: BuildingObject[]) => this.debug('fetchAllByBuilding', results))
      )
    ;
  }

  multiFetchAllByBlock(blocks: BasicObject[]): Observable<UISafeBuilding[]> {
    const requests$ = blocks.map(block => this.fetchAllByBlock(block.id));

    return merge(...requests$)
      .pipe(
        scan((acc: UISafeBuilding[], rows: BuildingObject[]) => {
          const results = rows.map(data => {
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
          });

          return acc.concat(results);
        }, []),
        map(buildings => {
          buildings.forEach((building) => {
            building.rooms = building.rooms
              .sort((a: BasicObject & {sortName: string}, b: BasicObject & {sortName: string}) => {
                if (a.sortName < b.sortName) {
                  return -1;
                }

                if (a.sortName > b.sortName) {
                  return 1;
                }

                return 0;
              });
          });

          return [...new Set(buildings)];
        })
      )
    ;
  }
}
