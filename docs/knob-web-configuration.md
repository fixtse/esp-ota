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

Codespaces validation passed the native command-state, production entity-handler,
Wi-Fi, HTTP, registry, and browser-catalogue regressions, plus ESPHome 2026.10.2
configuration validation. The browser fixture was updated after that run to serve
the current app script and settings API; GitHub Actions reruns it on this source
revision. The Codespaces compilation stopped during toolchain setup without a
usable completion record. The Native API action keys now use explicit ESPHome 2026.10 `StringRef` construction,
with a stricter production-handler test stub covering the conversion. The publication
workflow must complete compilation
before creating a new OTA image or checksum. Hardware behavior remains untested.
