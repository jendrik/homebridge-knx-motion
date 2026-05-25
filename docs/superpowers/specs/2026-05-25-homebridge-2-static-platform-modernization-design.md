# Homebridge 2 Static Platform Modernization Design

## Goal

Update `@jendrik/homebridge-knx-motion` so it is ready for stable Homebridge 2 while preserving the current user-facing plugin shape:

- Homebridge v2 only.
- Keep `StaticPlatformPlugin` for now.
- Keep `knx`.
- Keep `fakegato-history`.
- Keep the existing config fields and semantics.

Backward compatibility with Homebridge 1 and older Node runtimes is not required.

## Current Context

The plugin is a small TypeScript ESM Homebridge platform with these main files:

- `src/index.ts` registers the platform alias.
- `src/platform.ts` implements `StaticPlatformPlugin`, creates the KNX connection, and creates accessories from configured devices.
- `src/accessory.ts` exposes a HomeKit motion sensor, fakegato motion history, and the Eve last-activation characteristic.
- `config.schema.json` defines the existing Homebridge UI config shape.

The current package still allows Homebridge 1.x and Homebridge 2 beta ranges. Current stable Homebridge 2 resolves to `2.0.2` and requires Node `^22 || ^24`.

## Package And Runtime

The package should target stable Homebridge 2 only:

- Set the Homebridge engine range to `^2.0.2`.
- Set the Node engine range to `^22 || ^24`.
- Move the Homebridge dev dependency from beta to stable `^2.0.2`.
- Keep ESM and TypeScript `nodenext` output.
- Update retained runtime libraries conservatively:
  - `knx` to `^2.5.4`.
  - `fakegato-history` to `^0.6.7`.
- Refresh development dependencies when compatible with Node 22/24 and the existing flat ESLint config.

CI should validate the supported runtime. Node 22 is required as the baseline. Node 24 may be added if installation and build behavior is clean with the dependency tree.

## Platform And Config Behavior

The plugin remains a `StaticPlatformPlugin` registered under the existing alias, `knx-motion`.

The existing config shape stays intact:

- `ip` remains optional and defaults to `224.0.23.12`.
- `port` remains optional and keeps the existing schema behavior, with runtime coercion to a numeric KNX port.
- `devices[].name` remains the HomeKit display name.
- `devices[].listen` remains the KNX group address to listen on.

Runtime handling should become more defensive:

- Missing or malformed `devices` should log a clear error and expose no accessories instead of throwing during Homebridge startup.
- Invalid individual device entries should be skipped with a useful log message.
- KNX connection setup should use validated and coerced `ip` and `port` values.
- KNX connection errors should be logged with enough context to diagnose network or address issues.

## Accessory And History Behavior

Each valid configured device should continue exposing:

- `AccessoryInformation`.
- One HomeKit `MotionSensor` service.
- fakegato motion history.
- The custom Eve "Last Activation" characteristic.

Accessory behavior should be tightened without changing the HomeKit identity model:

- Keep the stable UUID base derived from plugin name, sensor name, and listen address.
- Normalize KNX `DPT1.001` values to booleans before updating `MotionDetected` and fakegato entries.
- Avoid unsafe reads from empty fakegato history when computing last activation.
- Keep motion event logs quiet by default. Debug-level logging is acceptable where the Homebridge logger supports it.

## Testing And Verification

The implementation should be verified with:

- `npm ci`
- `npm run lint`
- `npm run build`
- A package metadata check confirming Homebridge v2-only and Node 22/24-only constraints.

If the implementation introduces enough logic to justify tests, add focused unit-level coverage for config normalization and empty-history last-activation behavior. Do not add a broad test framework solely for package metadata changes.

## Out Of Scope

This modernization should not:

- Convert the plugin to a dynamic platform.
- Remove `knx`.
- Remove `fakegato-history`.
- Change the published platform alias.
- Change the user config shape.
- Add unrelated features beyond the Homebridge 2 readiness and defensive runtime improvements described here.
