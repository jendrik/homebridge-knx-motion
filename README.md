# homebridge-knx-motion

[![npm](https://img.shields.io/npm/v/@jendrik/homebridge-knx-motion)](https://www.npmjs.com/package/@jendrik/homebridge-knx-motion)
[![license](https://img.shields.io/npm/l/@jendrik/homebridge-knx-motion)](LICENSE)
[![homebridge](https://img.shields.io/badge/homebridge-%5E2.0.2-purple)](https://github.com/homebridge/homebridge)
[![node](https://img.shields.io/badge/node-%5E22%20%7C%7C%20%5E24-green)](https://nodejs.org)

A [Homebridge](https://homebridge.io) plugin that exposes KNX motion sensors to Apple HomeKit.

## Features

- Exposes KNX motion sensors as HomeKit motion sensors
- Supports multiple sensors via a single platform configuration
- Listens to KNX group addresses in real time (DPT 1.001)
- Eve app history support via [fakegato-history](https://github.com/simont77/fakegato-history)
- Custom "Last Activation" characteristic for Eve
- Compatible with Homebridge v2 and Node.js 22/24

## Installation

This version requires Homebridge 2 and Node.js 22 or 24.

### Via Homebridge UI (recommended)

Search for `@jendrik/homebridge-knx-motion` in the Homebridge UI plugin search and install it.

### Via npm

```sh
npm install -g @jendrik/homebridge-knx-motion
```

## Configuration

Add the `knx-motion` platform to the `platforms` array in your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "knx-motion",
      "devices": [
        {
          "name": "Hallway Motion",
          "listen": "1/1/1"
        },
        {
          "name": "Kitchen Motion",
          "listen": "1/1/2"
        }
      ]
    }
  ]
}
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | `"knx-motion"` | Must be `"knx-motion"` |
| `devices` | Yes | | Array of motion sensor devices |
| `ip` | No | `224.0.23.12` | IP address of the KNX router or interface |
| `port` | No | `3671` | KNX port |

### Device Options

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Display name for the motion sensor in HomeKit |
| `listen` | Yes | KNX group address to listen on (e.g. `1/1/1`) |

## Development

### Setup

```sh
git clone https://github.com/jendrik/homebridge-knx-motion.git
cd homebridge-knx-motion
npm install
```

### Build

```sh
npm run build
```

### Lint

```sh
npm run lint
```

### Watch (link and auto-reload)

```sh
npm run watch
```

## License

[Apache-2.0](LICENSE)
