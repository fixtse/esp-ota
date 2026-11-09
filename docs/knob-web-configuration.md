# Knob web configuration release

`configs/onx2424g013.yaml` imports firmware from
`fixtse/OpenNextion-KNOB-ESPHome` at commit
`5cce3e14a38812dbc2cc0d550cd5627f28f5f675` (source version `2026.10.2.8`).

This source adds:

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

Validation completed for source `5cce3e14a38812dbc2cc0d550cd5627f28f5f675`:

- [Source regressions](https://github.com/fixtse/OpenNextion-KNOB-ESPHome/actions/runs/42600437750)
  passed command-state and production-handler checks, Wi-Fi lifecycle, HTTP,
  registry persistence, browser discovery, and configuration UI/mobile tests.
- [OTA publication](https://github.com/fixtse/esp-ota/actions/runs/42600467747),
  built from OTA checkout `cab95093af0a4c2bb941420fb9ea4ba33efd82d9`, successfully
  compiled with ESPHome 2026.10.2 and published firmware `2026.10.2.8`.
- The downloaded release binary matches manifest MD5
  `c9e16900612b90c180446041b87ba407` and release SHA-256
  `bac0fd2d38f80d73604eecf5b37afe40e1c5b353655a6c68b22aab4a10d647ac`.

[Published firmware release](https://github.com/fixtse/esp-ota/releases/tag/esphome-2026.10.2-42600467747-1).
Hardware and live Home Assistant behavior remain untested.
