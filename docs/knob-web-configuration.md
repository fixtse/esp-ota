# Knob web configuration release

`configs/onx2424g013.yaml` imports firmware from
`fixtse/OpenNextion-KNOB-ESPHome` at commit
`ab815c1cece30f097f5c5f1a75d2ccb2c0e05021` (source version `2026.10.2.9`).

This source adds:

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

The source revision above is queued for native and browser regression checks and
ESPHome 2026.10.2 compilation through the publication workflow. No old OTA image
has been relabeled as this release. The workflow updates binaries and manifests
only after compilation succeeds. Hardware behavior remains untested.
