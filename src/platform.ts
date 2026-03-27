import type { API, StaticPlatformPlugin, Logging, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import fakegato from 'fakegato-history';
import { Connection } from 'knx';

import { MotionAccessory } from './accessory.js';

export class MotionPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly uuid: typeof uuid;

  public readonly fakeGatoHistoryService;

  public readonly connection: Connection;

  private readonly devices: MotionAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.uuid = api.hap.uuid;

    this.fakeGatoHistoryService = fakegato(this.api);

    // connect
    this.connection = new Connection({
      ipAddr: config.ip ?? '224.0.23.12',
      ipPort: config.port ?? 3671,
      handlers: {
        connected: () => {
          log.info('KNX connected');
        },
        error: (connstatus: unknown) => {
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
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
