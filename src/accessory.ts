import type { AccessoryConfig, AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';
import fakegato from 'fakegato-history';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings.js';
import type { MotionPlatform } from './platform.js';

export class MotionAccessory implements AccessoryPlugin {
  private readonly uuid_base: string;
  private readonly name: string;
  private readonly displayName: string;
  private readonly listen: string;

  private readonly motionSensorService: Service;
  private readonly loggingService: fakegato;
  private readonly informationService: Service;

  constructor(
    private readonly platform: MotionPlatform,
    private readonly config: AccessoryConfig,
  ) {
    class EveMotionLastActivation extends platform.Characteristic {
      public static readonly UUID: string = 'E863F11A-079E-48FF-8F27-9C2605A29F52';

      constructor() {
        super('Last Activation', EveMotionLastActivation.UUID, {
          format: platform.api.hap.Formats.UINT32,
          unit: platform.api.hap.Units.SECONDS,
          perms: [platform.api.hap.Perms.PAIRED_READ, platform.api.hap.Perms.NOTIFY],
        });
        this.value = this.getDefaultValue();
      }
    }

    this.name = config.name;
    this.listen = config.listen;
    this.uuid_base = platform.uuid.generate(PLUGIN_NAME + '-' + this.name + '-' + this.listen);
    this.displayName = this.uuid_base;

    this.informationService = new platform.Service.AccessoryInformation()
      .setCharacteristic(platform.Characteristic.Name, this.name)
      .setCharacteristic(platform.Characteristic.Identify, this.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, '@jendrik')
      .setCharacteristic(platform.Characteristic.Model, PLUGIN_DISPLAY_NAME)
      .setCharacteristic(platform.Characteristic.SerialNumber, this.displayName)
      .setCharacteristic(platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.motionSensorService = new platform.Service.MotionSensor(this.name);
    this.motionSensorService.getCharacteristic(platform.Characteristic.StatusActive).updateValue(true);

    // last activation
    this.motionSensorService.addCharacteristic(EveMotionLastActivation);
    this.motionSensorService.getCharacteristic(EveMotionLastActivation).onGet(async () => {
      if (this.loggingService.getInitialTime() === undefined) {
        return 0;
      } else if (this.motionSensorService.getCharacteristic(platform.Characteristic.MotionDetected).value) {
        return Math.round(new Date().valueOf() / 1000) - this.loggingService.getInitialTime();
      } else {
        let lastActivation = this.loggingService.history[this.loggingService.history.length - 1].time;
        for (let i = this.loggingService.history.length - 1; i >= 0; --i) {
          if (this.loggingService.history[i].status === false) {
            lastActivation = this.loggingService.history[i].time;
          } else {
            break;
          }
        }
        return lastActivation - this.loggingService.getInitialTime();
      }
    });

    this.loggingService = new platform.fakeGatoHistoryService('motion', this, { storage: 'fs', log: platform.log });

    const dp = new Datapoint({
      ga: this.listen,
      dpt: 'DPT1.001',
      autoread: true,
    }, platform.connection);

    dp.on('change', (_oldValue: number, newValue: number) => {
      this.motionSensorService.getCharacteristic(platform.Characteristic.MotionDetected).updateValue(newValue);
      this.loggingService._addEntry({ time: Math.round(new Date().valueOf() / 1000), status: newValue });
    });
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.motionSensorService,
      this.loggingService,
    ];
  }
}
