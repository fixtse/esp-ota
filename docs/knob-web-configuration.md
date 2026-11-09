# Knob web configuration release

`configs/onx2424g013.yaml` imports firmware from
`fixtse/OpenNextion-KNOB-ESPHome` at commit
`ddb114d3cd07c3ee8c84aad1dbb5701bc6e5da49` (source version `2026.10.2.13`).

This source adds:

- PSRAM allocation for all NanoSVG parser and rasterizer working memory. Live
  device logs confirmed successful downloads followed by parser allocation failure
  on the previous firmware, despite ample external RAM.
- Home Assistant integration and device-class icon resolution, native sensor
  device-class defaults, and per-slot selected-icon/download diagnostics.

- Temporary command feedback expires and restores media artist/entity metadata.
- Saved-slot MDI metadata syncs automatically when the browser catalogue refreshes.
  Downloads wait for a valid clock, handle chunked responses, try a backup HTTPS
  source, and retry with backoff while retaining built-in fallbacks.
- Device settings presses cannot be consumed by the previously selected entity.

- Downloaded Home Assistant MDI icons, background SVG rendering, a bounded RAM
  cache, and built-in entity-type fallbacks when icons cannot be downloaded.
- A circular media playback progress ring with pause, seek, and track-change handling.
- Automatic missing-entity retries, on-device retry, and browser-triggered Native API
  reconnection without rebooting or replaying old commands.
- Removal of long-lived device tokens, token-status and usage sensors, and legacy
  QR-code menus. Upgrades erase the previously saved device credential.

- Fan, number/input_number, select/input_select, scene, and button controls.
- A shared requested/pending/confirmed command layer with bounded rotation updates,
  timeouts, and cancellation when leaving a view or losing the HA connection.
- Climate HVAC mode parsing for Native API list attributes, local accumulation of
  temperature changes, independent range endpoints, presets, fan, swing, and humidity.
- Capability-dependent secondary settings selected by holding and rotating the knob.
- Media source/mute settings and 100-step light color-temperature adjustment.

- Separate knob, Home Assistant API, and browser catalogue connection indicators.
- Slot dirty markers, save all, discard, reload recovery, and unsaved-change prompts.
- Slot reordering, duplication, display names, room filters, and a round preview.
- Home Assistant capability-aware light/cover types and native press restrictions.
- Brightness, standby, sleep schedule, sensitivity, and standby weather settings.
- Versioned configuration export/import and redacted diagnostics downloads.
- Mobile slot labels, keyboard focus styles, and system/light/dark themes.

Open the knob's IP address or its ESPHome **Visit** link after installing the OTA.
Browser sign-in loads the entity catalogue; it does not register the knob with Home
Assistant. Enable **Allow the device to perform Home Assistant actions** in the
ESPHome integration options. Configuration imports are drafts until explicitly saved.

The web assets are embedded headers in the firmware source, so no separate frontend
build or deployment is needed. See the source repository's
`docs/web-configuration.md` for usage and backup details.

The pinned package ref changes the source fingerprint, causing the existing
**Update ESPHome firmware** workflow to select this configuration on push even
when the ESPHome compiler version has not changed. The workflow creates the actual
OTA image, checksum, incremented release version, and published manifest after a
successful compilation. Do not manually relabel an older binary or checksum.

Current revision validation and OTA publication are pending completion callbacks.

Previous release validation for source `4d0006e13893d5e7c0beb42cca58a0bcc78cc879`:

- [Regressions](https://github.com/fixtse/OpenNextion-KNOB-ESPHome/actions/runs/42620363297)
  checked out that exact source and passed production entity handlers, transient
  feedback expiry, settings input routing, recovery, media progress, icon selection,
  chunked download/fallback/retry handling, SVG rasterization, Wi-Fi lifecycle,
  HTTP, registry persistence, automatic icon metadata sync, and browser/mobile UI.
- [OTA build and publication](https://github.com/fixtse/esp-ota/actions/runs/42620407241)
  checked out `a2195b045e8bda8011f6dffea4ae14d4ec5a099d` at
  `/home/runner/work/esp-ota/esp-ota`, imported the exact source revision above,
  compiled with ESPHome 2026.10.2, and published firmware `2026.10.2.12`.
- The downloaded release binary matches manifest MD5
  `9e6ee69242288c0af5d2363c097e3b6d` and release SHA-256
  `77a2692c95066c69607a48082017dda231687e53de4e202cd810665f64351319`.

[Published firmware](https://github.com/fixtse/esp-ota/releases/tag/esphome-2026.10.2-42620407241-1).
Hardware and live Home Assistant behavior remain untested.
