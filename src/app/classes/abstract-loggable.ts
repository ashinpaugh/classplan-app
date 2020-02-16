import {environment} from '../../environments/environment';

export class AbstractLoggable {

  protected enabled: boolean;

  constructor() {
    this.enabled = !environment.production;
  }

  get Enabled(): boolean {
    return this.enabled;
  }

  set Enabled(toggle: boolean) {
    this.enabled = toggle;
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
    if (!this.Enabled || !method) {
      return this;
    }

    method(`[${this.constructor.name}] ${message}`, ...args);

    return this;
  }
}
