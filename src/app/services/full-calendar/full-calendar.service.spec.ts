import { TestBed } from '@angular/core/testing';

import { FullCalendarService } from './full-calendar.service';

describe('FullCalendarService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FullCalendarService = TestBed.get(FullCalendarService);
    expect(service).toBeTruthy();
  });
});
