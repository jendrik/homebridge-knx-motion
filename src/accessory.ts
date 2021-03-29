import { AccessoryConfig, AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';
import fakegato from 'fakegato-history';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings';

import { MotionPlatform } from './platform';


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

    // class EveMotionSensitivity extends platform.Characteristic {
    //   public static readonly UUID: string = 'E863F120-079E-48FF-8F27-9C2605A29F52';

    //   public static readonly HIGH = 0;
    //   public static readonly MEDIUM = 4;
    //   public static readonly LOW = 7;

    //   constructor() {
    //     super('Sensitivity', EveMotionSensitivity.UUID, {
    //       format: platform.Characteristic.Formats.UINT8,
    //       minValue: 0,
    //       maxValue: 7,
    //       validValues: [0, 4, 7],
    //       perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY],
    //     });
    //     this.value = this.getDefaultValue();
    //   }
    // }

    // // unused for now
    // class EveMotionDuration extends platform.Characteristic {
    //   public static readonly UUID: string = 'E863F12D-079E-48FF-8F27-9C2605A29F52';

    //   constructor() {
    //     super('Duration', EveMotionDuration.UUID, {
    //       format: platform.Characteristic.Formats.UINT16,
    //       unit: platform.Characteristic.Units.SECONDS,
    //       minValue: 5,
    //       maxValue: 15 * 3600,
    //       validValues: [
    //         5, 10, 20, 30,
    //         1 * 60, 2 * 60, 3 * 60, 5 * 60, 10 * 60, 20 * 60, 30 * 60,
    //         1 * 3600, 2 * 3600, 3 * 3600, 5 * 3600, 10 * 3600, 12 * 3600, 15 * 3600,
    //       ],
    //       perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY, platform.Characteristic.Perms.WRITE],
    //     });
    //     this.value = this.getDefaultValue();
    //   }
    // }

    class EveMotionLastActivation extends platform.Characteristic {
      public static readonly UUID: string = 'E863F11A-079E-48FF-8F27-9C2605A29F52';

      constructor() {
        super('Last Activation', EveMotionLastActivation.UUID, {
          format: platform.Characteristic.Formats.UINT32,
          unit: platform.Characteristic.Units.SECONDS,
          perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY],
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

    dp.on('change', (oldValue: number, newValue: number) => {
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
