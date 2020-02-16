import {AbstractLoggable} from '../classes/abstract-loggable';
import {Subject} from 'rxjs';
import {OnDestroy} from '@angular/core';

export abstract class AbstractComponent extends AbstractLoggable implements OnDestroy {

  protected ngUnsubscribe$: Subject<void>;

  constructor() {
    super();

    this.ngUnsubscribe$ = new Subject<void>();
  }

  /**
   * @inheritDoc
   */
  ngOnDestroy(): void {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

}
