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
    return this.doLog(console.log, message, ...args);
  }

  protected doLog(method: (...args) => void, message: string, ...args): this {
    if (!this.Enabled || !method) {
      return this;
    }

    method(message, args);

    return this;
  }
}
