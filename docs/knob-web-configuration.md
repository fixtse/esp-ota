# Knob web configuration release

`configs/onx2424g013.yaml` imports firmware from
`fixtse/OpenNextion-KNOB-ESPHome` at commit
`672ac5d00badd90faa8fc3ffa8423afa76c8cf66` (source version `2026.10.2.14`).

This source adds:

- A refreshed orange/slate configuration website with light/dark themes and Nunito.
- Live device previews using the same presentation model as the display, including
  real readings, current mode symbols, media artwork, artist, volume and progress.
- Compact entity icons, larger sensor readings, wider two-line names, and climate
  and fan mode symbols with less instructional text competing with values.

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

Previous release validation for source `ddb114d3cd07c3ee8c84aad1dbb5701bc6e5da49`:

- [Regressions](https://github.com/fixtse/OpenNextion-KNOB-ESPHome/actions/runs/42623338328)
  checked out the exact source and passed the PSRAM allocator regression, parser
  and download handling, icon resolution and browser metadata sync, command state,
  settings input routing, recovery, Wi-Fi lifecycle, HTTP, registry and mobile UI.
- [OTA build and publication](https://github.com/fixtse/esp-ota/actions/runs/42623390495)
  checked out `089d42ccf9b08e68d81621df34c348ad52600dcd` at
  `/home/runner/work/esp-ota/esp-ota`, imported the exact source revision above,
  compiled with ESPHome 2026.10.2, and published firmware `2026.10.2.13`.
- Downloaded binary MD5 matches manifest `e9d1360247d680bcc8077bec8993e30a`;
  SHA-256 is `605549f80b60b6a0704b6676f0e6e584c0dc1429c61fe0b3dc405872e7eb5839`.

[Published firmware](https://github.com/fixtse/esp-ota/releases/tag/esphome-2026.10.2-42623390495-1).
Physical device validation: the first update attempt rolled back after a panic.
A subsequent update booted `2026.10.2.13`; the live icon diagnostics reported
`mdi:weather-fog` selected and `ready` with no download error, and the user confirmed
the correct icon appeared on the display. The initial panic has not been diagnosed;
retain that limitation when assessing startup reliability.
