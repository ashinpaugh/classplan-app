
export namespace AppEvent {
  export enum Events {
    // First event triggered when an update is detected.
    API_UPDATE_START = 'api:update:start',
    // Continuously triggered as the update polling returns results.
    API_UPDATE_PENDING = 'api:update:pending',
    // Last event triggered after the update has completed.
    API_UPDATE_END = 'api:update:end',
  }

  export interface Event<T extends EventData<T> = any> {
    name?: string;
    origin?: any;
    data?: EventData<T>;
  }

  export interface EventData<T extends Object> {
  }
}
