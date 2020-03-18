import {environment} from '../../environments/environment';

export class AbstractLoggable {

  protected loggingEnabled: boolean;

  constructor() {
    this.loggingEnabled = !environment.production;
  }

  get LoggingEnabled(): boolean {
    return this.loggingEnabled;
  }

  set LoggingEnabled(toggle: boolean) {
    this.loggingEnabled = toggle;
  }

  protected log(message: string, ...args): this {
    return this.doLog(console.log, message, args);
  }

  protected warn(message: string, ...args): this {
    return this.doLog(console.log, message, args);
  }

  protected debug(message: string, ...args): this {
    return this.doLog(console.debug, message, args);
  }

  protected doLog(method: (...args: any[]) => void, message: string, args: any[]): this {
    if (!this.LoggingEnabled || !method) {
      return this;
    }

    method(`[${this.constructor.name}] ${message}`, ...args);

    return this;
  }
}
