import type { AccessoryConfig, AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';
import fakegato from 'fakegato-history';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings.js';
import type { MotionPlatform } from './platform.js';

type FakegatoHistoryEntry = {
  time: number;
  status: boolean;
};

function normalizeMotionValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function getHistoryEntries(loggingService: fakegato): FakegatoHistoryEntry[] {
  if (!Array.isArray(loggingService.history)) {
    return [];
  }

  return loggingService.history.filter((entry: unknown): entry is FakegatoHistoryEntry => {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    const candidate = entry as Partial<FakegatoHistoryEntry>;
    return typeof candidate.time === 'number' && typeof candidate.status === 'boolean';
  });
}

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

    this.name = String(config.name);
    this.listen = String(config.listen);
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

    this.motionSensorService.addCharacteristic(EveMotionLastActivation);
    this.motionSensorService.getCharacteristic(EveMotionLastActivation).onGet(async () => {
      const initialTime = this.loggingService.getInitialTime();
      if (initialTime === undefined) {
        return 0;
      }

      if (this.motionSensorService.getCharacteristic(platform.Characteristic.MotionDetected).value) {
        return Math.round(Date.now() / 1000) - initialTime;
      }

      const history = getHistoryEntries(this.loggingService);
      if (history.length === 0) {
        return 0;
      }

      let lastActivation = history[history.length - 1].time;
      for (let i = history.length - 1; i >= 0; --i) {
        if (!history[i].status) {
          lastActivation = history[i].time;
        } else {
          break;
        }
      }

      return lastActivation - initialTime;
    });

    this.loggingService = new platform.fakeGatoHistoryService('motion', this, { storage: 'fs', log: platform.log });

    const dp = new Datapoint({
      ga: this.listen,
      dpt: 'DPT1.001',
      autoread: true,
    }, platform.connection);

    dp.on('change', (_oldValue: unknown, newValue: unknown) => {
      const motionDetected = normalizeMotionValue(newValue);
      this.motionSensorService.getCharacteristic(platform.Characteristic.MotionDetected).updateValue(motionDetected);
      this.loggingService._addEntry({ time: Math.round(Date.now() / 1000), status: motionDetected });
      platform.log.debug(`KNX motion update for ${this.name} (${this.listen}): ${motionDetected}`);
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
