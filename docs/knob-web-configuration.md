# Knob web configuration release

`configs/onx2424g013.yaml` imports firmware from
`fixtse/OpenNextion-KNOB-ESPHome` at commit
`57ac77497eea5afdf31b56fcbab2295163b7edb1` (source version `2026.10.2.27`).

This source adds:

- A bundled checkmark icon for executable entity presses, shown for 900ms with
  no text toast. It appears after action dispatch or local GPIO completion,
  not for navigation, unsupported presses or **No action** bindings. Dispatch
  feedback does not claim downstream script/playback success.

- mbedTLS allocations in PSRAM. A live Native API log on `.25` showed
  `mbedtls_ssl_setup returned -0x7F00` while fetching the GitHub OTA manifest,
  including after one clean restart. This is an allocation failure before
  update discovery, not evidence that the published manifest is missing.
  This correction must be installed before its memory benefit is available;
  an already blocked HTTP-only OTA path may require one USB recovery flash.

- A Home Assistant **Wi-Fi Signal** diagnostic sensor reporting RSSI in dBm
  every 60 seconds, using the existing RSSI sensor rather than adding a duplicate.
- A network-memory gate corrected for live hardware: 48 KB total internal free
  RAM and a 20 KB largest block. Firmware `.25` had a 32 KB block requirement
  that prevented all downloads on a board reporting a healthy 28 KB block.
  Icon/artwork diagnostics now expose `waiting_for_memory` when deferred.

Performance follow-up: unchanged labels, icons, and overlays avoid repeated
redraw work. DNS/TCP/TLS and artwork body reads run in a worker task, capped at
512 KB of PSRAM, three redirects and a 15-second deadline. Final image decoding
stays on the main task. HTTP diagnostics expose Wi-Fi RSSI, disconnect counts,
and the last artwork error so reception and image failures can be distinguished.
Icons prefetch after input settles into the existing bounded RAM
cache (not persistent across reboot). Artwork stays provider-independent, uses
shorter request timeouts, waits for stable metadata and sufficient internal heap,
and cancels on unavailable playback. Download callbacks defer view refresh until
connection cleanup completes. HTTP diagnostics include reset reason, heap figures,
and a last-event breadcrumb retained across some resets. Source `.27` compilation
and publication await the next build; no hardware crash fix is claimed yet.

- A configurable media playlist/station menu with up to eight named script or
  automation actions per media player slot. Configure it under **Playlists &
  stations** on the knob webpage. Names, actions, and order persist in backups.
- A visible hold bar and **Release now / Open playlists** cue at 0.5 seconds.
  Rotate through the list and press to send the selected action. Medium-press
  again to return to playback; holding for 1.5 seconds returns to devices.
  Existing short-press playback and press-and-turn transport remain available.
- This source was committed without Codespaces or regression runs at the user's
  request. Compilation and publication are handled by the OTA build workflow;
  no successful firmware build is claimed here.

- Optional secondary sensor entity with text templates `{value}`, `{unit}`,
  `{relative}`, `{time}`, `{date}`, `{datetime}`. Example: `Resets {relative} ({time})`.
- Optional 12-hour numeric graph for opened sensors, using bounded Recorder
  statistics where available and a live ten-minute history cache otherwise.
  Secondary information is small below the graph. Gaps are not interpolated.
- Independent AM/PM display for 12-hour clocks, with migration of existing date
  preferences. Backup defaults preserve older configurations. Regression runs
  were skipped per user preference. Run `42681057723` compiled exact source
  `796279b2730b9aaeb0a6861c5a5631ae13993d1e` and published actual `.23` from
  OTA pin `116b37f`. Downloaded release MD5 `fe833dc86982db53e0bccefc111a50db`
  matches its manifest; SHA-256 is
  `fc6c3bca0db190d0492387efe560c25680e2bf4aa7b6194ad0bf9b504e7f4c72`.
  Physical checks are recorded separately after installation.

- OpenNextion Knob by fixtSE branding: supplied logo served from flash, browser
  knob favicon, and a footer link to https://fixtse.com/. README branding updated.
  Regression tests were explicitly skipped for this branding change at the user's
  request. Firmware compilation/publication passed in run `42676763668` for exact source
  `b02339ab14c2a2b5ea6d98f681b098b5295ada33`, pin `0e82cd5`.
  Actual release `.22` has verified MD5 `91efb5a94f8441edb17e598c89d5cb08`
  and SHA-256 `7ca58b9f8faba141be2e3034dda803aefffe7d488ee5b83e6320fd40d1e15f4f`.
  Physical branding validation is recorded after installation below.

- Automatic timer popups for configured `timer.*`, Voice timer JSON sensors and
  Google Home timers sensors. Dial movement dismisses the popup; after ten idle
  seconds it returns while active. Rings share the media color and flash on
  completion. Popup behavior and Google Home parsing await hardware validation.

- Condition-aware weather carousel icons, respecting Home Assistant's supplied
  icon and explicit user overrides.
- Saved DD-MM / MM-DD / YYYY-MM-DD date preferences and 12/24-hour clocks in
  Device settings, shared by forecast dates and the standby screen. Existing
  display preferences are preserved; older backups receive DD-MM/24-hour defaults.
  Latest automatic validation passed: regression `42672743885` attempt 2 for
  source `f4793fc`, and publication run `42674661169` for OTA pin `df7457b`.
  Both earlier attempts were interrupted by a GitHub Actions/Checks outage.

- Dial-selectable weather pages: current temperature/condition/feels-like/humidity,
  wind/pressure/visibility/UV, and up to five daily forecast pages with high/low
  temperatures and rain probability. Press requests a forecast refresh through
  Home Assistant's native action response; no device access token is needed.
  Providers without daily forecasts show unavailable data. Requests are bounded
  to once per 20 seconds, with a 15-minute cache on reopening.

- Larger 40 px carousel icons with adjusted value/context spacing. Climate retains
  its centered mode heading without a separate icon.

- Persistent pause feedback over media covers and one-second next/previous badges.
- Larger centered HVAC mode/emoji without a separate climate icon. Pressing cycles
  the selected preset, fan or swing mode; temperature controls keep HVAC cycling.

Codespaces validation was explicitly skipped for this revision at the user's
request. Automatic regression run `42667951801` passed for preceding source `4562176`. OTA build
`42668030732` compiled that source and published actual release `2026.10.2.19`
from pin `6c889ea464ff08df5170283964a9e38e6d43166d`.
Downloaded OTA MD5: `198c7645ef09ed9789ed7c459e8ae7b2` (matches manifest).
SHA-256: `b433396d965528a376f25e9cf9fd7e5e7c1f894f990ed59ce7052b2574041fa9`.
The `.19` firmware was installed on `192.168.10.52`; USB recorded OTA completion
and restart, and web state confirmed `.19` with Home Assistant connected and
uptime above 60 seconds. Live weather JSON returned current temperature,
condition, feels-like and humidity. This exposed a carousel icon/name regression,
fixed in the currently pinned followup source above (validation pending).
Daily forecast retrieval and physical dial pagination remain unverified.

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

Previous release validation completed for source `2550dbfa653627566de7bdb8c3bc0708456508d4`:

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
The user confirmed the physical media press/turn gestures work on `.17`.

## Latest verified publication

Recovery run `42674661169` compiled exact source
`f4793fc86cf6836a47e8905cb8d980e2d7e309ca` and published actual release
`2026.10.2.21` (publisher commit `b3d0a8f`). The downloaded released OTA image
matches manifest MD5 `17b128f8b09da614c67ce113d744a8f2`.
SHA-256: `832a1e1d4ec15f54ab404f16a48b94b3389abf3602e68d4c2a323d496e5fada8`.
The failed original run's unpublished artifact has different bytes and was not
used for this installation. Hardware verification is recorded separately below.

### Physical installation of `.21`

The device at `192.168.10.52` pulled the verified release URL. USB/native logs
recorded “Update complete” after 43 seconds and a software restart into the OTA
partition. Its web state then reported `2026.10.2.21`, Wi-Fi and HA connected.
Saved media color `#F97316` and main-only standby persisted; new date/clock settings
reported DD-MM and 24 hour. Complete live weather JSON showed `15°C`, carousel
name `Home`, and condition-aware `mdi:weather-night`.

USB evidence: `/tmp/onx-usb-crash-42674661169.log`; native OTA log:
`/tmp/onx-usb-update-42674661169.log`. No fresh panic/backtrace was found in the
captured startup. This confirms installation and live state, not physical dial
pagination, timer popups/completion flashing, or daily forecast retrieval.

### Branding `.22` device verification

Release `.22` was installed on `192.168.10.52` with USB capture in
`/tmp/onx-usb-crash-42676763668.log`. The live page returned the branded title,
footer link and favicon. `/knob/fixtse-logo.png` returned image/png with 23,057
bytes exactly matching the supplied original. Logo SHA-256:
`7c0ac1bca92a009c9e20a27659f1aa57bc1e42499f7a6be8cc56e6b11df35360`.
The new secondary sensor/graph source above is not covered by that evidence.

### Physical installation of `.23`

USB/native evidence (`/tmp/onx-usb-crash-42681057723.log` and
`/tmp/onx-usb-update-42681057723.log`) recorded completion after 43 seconds and
restart. Web state reported `.23`, HA connected and uptime above 115 seconds.
Existing 12-hour preferences migrated with AM/PM enabled.

Configured slot 1's existing Codex sensor with secondary entity
`sensor.openai_codex_5_hour_reset` and text `Resets {relative} ({time})`.
Live device JSON confirmed `Resets in 2 hours (11:10 PM)` on both main and detail
models. Disabling AM/PM produced `Resets in 2 hours (11:10)`; the original setting
was restored. Value mode remains selected. Graph configuration saved, but the
immediate graph previews occurred during HA resubscription and returned waiting
for data. Graph drawing and Recorder history retrieval remain physically
unverified; compilation success is not evidence of their runtime behavior.
