import { API, StaticPlatformPlugin, Logger, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import fakegato from 'fakegato-history';

import { Connection } from 'knx';

import { MotionAccessory } from './accessory';


export class MotionPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly uuid: typeof uuid = this.api.hap.uuid;

  public readonly fakeGatoHistoryService;

  public readonly connection: Connection;

  private readonly devices: MotionAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.fakeGatoHistoryService = fakegato(this.api);

    // connect
    this.connection = new Connection({
      ipAddr: config.ip ?? '127.0.0.1',
      ipPort: config.port ?? 3671,
      handlers: {
        connected: function () {
          log.info('KNX connected');
        },
        error: function (connstatus: unknown) {
          log.error(`KNX status: ${connstatus}`);
        },
      },
    });

    // read devices
    config.devices.forEach(element => {
      if (element.name !== undefined && element.listen) {
        this.devices.push(new MotionAccessory(this, element));
      }
    });

    log.info('finished initializing!');
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
