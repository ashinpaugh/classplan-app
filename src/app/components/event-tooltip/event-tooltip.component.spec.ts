import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EventTooltipComponent } from './event-tooltip.component';

describe('EventTooltipComponent', () => {
  let component: EventTooltipComponent;
  let fixture: ComponentFixture<EventTooltipComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EventTooltipComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EventTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
