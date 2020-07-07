import { Injectable } from '@angular/core';
import {AbstractLoggable} from '../../classes/abstract-loggable';
import {AppEvent} from './event.interface';
import {AbstractService} from '../abstract-service';

interface EventAware<T extends AbstractService> {
  service: T;
  callback: (event: AppEvent.Event) => boolean|void;
}

@Injectable({
  providedIn: 'root'
})
export class EventService extends AbstractLoggable {

  protected subscriptions = new Map<AppEvent.Events, EventAware<AbstractService>[]>();

  constructor() {
    super();
  }

  register(event: AppEvent.Events, service: AbstractService, callback: (event: AppEvent.Event) => boolean|void): this {
    const subscriptions = this.subscriptions.has(event)
      ? this.subscriptions.get(event)
      : []
    ;

    subscriptions.push({
      service: service,
      callback: callback,
    } as EventAware<AbstractService>);

    this.subscriptions.set(event, subscriptions);

    return this;
  }

  trigger<C extends Object = any>(eventName: AppEvent.Events, event: AppEvent.Event<C>): this {
    const subscriptions = this.subscriptions.get(eventName);

    if (!subscriptions || !subscriptions.length) {
      return this;
    }

    // Add the event name to the event payload.
    event.name = eventName;

    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];

      // If something truthy is returned quit notifying other subscribers.
      if (subscription.callback(event)) {
        return this;
      }
    }

    return this;
  }
}
