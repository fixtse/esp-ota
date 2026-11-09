# Knob web configuration release

`configs/onx2424g013.yaml` imports firmware from
`fixtse/OpenNextion-KNOB-ESPHome` at commit
`2550dbfa653627566de7bdb8c3bc0708456508d4` (source version `2026.10.2.18`).

This source adds:

- Media presses pause/resume a loaded track, or run a configured automation/script
  when idle. The website exposes the media binding as **When idle**.
- Press-and-turn skips next/previous tracks; release sends no extra press. Normal
  rotation stays on volume. Playback controls use advertised entity capabilities.
- Idle media views clear stale artwork/artist and show **Nothing playing**.

- Page-local carousel readings/context/dot pagination that animate with each page.
- Centered Settings and sensor headings, correct scaled-icon positions, a sensor
  detail icon below the value, and larger gaps between icons, values and names.

- Flash-backed scripts and chunked HTML nonce insertion to avoid full-page heap
  copies, selected-entity previews, and complete measured web JSON up to 16 KB.
  The previous release's live preview was confirmed truncated at 5,119 bytes;
  a USB log also recorded an abort after opening the website.

The publisher auto-increments the actual release version from the last published
manifest. Source version labels above are not evidence of the released version.

This source also includes:

- Live state/value on every main carousel entry, including light brightness,
  cover position, climate/fan mode and media playback/track.
- A media-ring color picker with presets, custom colors and backup persistence.
- Whole-number media volume and a configurable weather timeout scope that defaults
  to the main carousel only; opened entity views remain visible by default.
- Backup schema 2 with version 1 migration defaults.

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

Validation completed for source `2550dbfa653627566de7bdb8c3bc0708456508d4`:

- [Regressions](https://github.com/fixtse/OpenNextion-KNOB-ESPHome/actions/runs/42662875760)
  checked out the exact source and passed production input routing for idle
  automation/script actions, play/pause, held track rotation and release suppression;
  capability handling; per-page carousel ownership and spacing; complete HTTP/JSON;
  saved colors/standby rules; icons; and browser/mobile configuration tests.
  Retained browser screenshots include the media **When idle** binding.
- [Build/publication](https://github.com/fixtse/esp-ota/actions/runs/42662943568)
  checked out `da2461735a7ba7feaed6a474a42ac63057af6fbe` at
  `/home/runner/work/esp-ota/esp-ota`, imported that exact source, compiled with
  ESPHome 2026.10.2 and published actual release `2026.10.2.17`.
- Downloaded binary matches manifest MD5 `55f7664cfbec2a206a0428e496834ade`
  and GitHub SHA-256 `863a16945654de3cf2b59cabe2e7be6a5d1340db2ebc17af8f83e402b3014554`.
- Physical device completed the `.16` to `.17` OTA with USB capture and reported
  a successful boot. No panic appeared during capture. Native API/web checks
  confirmed the running version, unchanged saved slots, the existing orange ring
  setting, main-only standby, complete selected-entity JSON and integer volume.
  The real browser media page exposed **When idle** and loaded live values/artwork;
  uptime continued increasing through page checks without a restart.

[Published firmware](https://github.com/fixtse/esp-ota/releases/tag/esphome-2026.10.2-42662943568-1).
Physical press/turn confirmation was requested from the user and is still pending;
those gesture routes have passed automated production-handler tests.
