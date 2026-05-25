import type { API, StaticPlatformPlugin, Logging, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid, AccessoryConfig } from 'homebridge';

import fakegato from 'fakegato-history';
import { Connection } from 'knx';

import { MotionAccessory } from './accessory.js';

const DEFAULT_KNX_IP = '224.0.23.12';
const DEFAULT_KNX_PORT = 3671;

interface MotionDeviceConfig extends AccessoryConfig {
  name: string;
  listen: string;
}

function normalizePort(value: unknown, log: Logging): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_KNX_PORT;
  }

  const port = typeof value === 'number' ? value : Number(value);
  if (Number.isInteger(port) && port > 0 && port <= 65535) {
    return port;
  }

  log.error(`Invalid KNX port "${String(value)}"; using default ${DEFAULT_KNX_PORT}`);
  return DEFAULT_KNX_PORT;
}

function normalizeIp(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : DEFAULT_KNX_IP;
}

function isValidDeviceConfig(value: unknown): value is MotionDeviceConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const device = value as Partial<MotionDeviceConfig>;
  return typeof device.name === 'string' && device.name.trim().length > 0
    && typeof device.listen === 'string' && device.listen.trim().length > 0;
}

function loadDevices(config: PlatformConfig, log: Logging): MotionDeviceConfig[] {
  if (!Array.isArray(config.devices)) {
    log.error('No valid KNX motion devices configured. Expected "devices" to be an array.');
    return [];
  }

  const devices: MotionDeviceConfig[] = [];
  config.devices.forEach((device: unknown, index: number) => {
    if (!isValidDeviceConfig(device)) {
      log.error(`Skipping invalid KNX motion device at index ${index}. Each device requires non-empty "name" and "listen" fields.`);
      return;
    }

    devices.push({
      ...device,
      name: device.name.trim(),
      listen: device.listen.trim(),
    });
  });

  return devices;
}

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

    const ipAddr = normalizeIp(config.ip);
    const ipPort = normalizePort(config.port, log);

    this.connection = new Connection({
      ipAddr,
      ipPort,
      handlers: {
        connected: () => {
          log.info(`KNX connected to ${ipAddr}:${ipPort}`);
        },
        error: (connstatus: unknown) => {
          log.error(`KNX connection error for ${ipAddr}:${ipPort}: ${String(connstatus)}`);
        },
      },
    });

    loadDevices(config, log).forEach(device => {
      this.devices.push(new MotionAccessory(this, device));
    });
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
