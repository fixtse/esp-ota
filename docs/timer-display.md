# Voice timers on the OpenNextion knob

Voice PE SoundSense and ReSpeaker Satellite expose a `Voice timer` text sensor.
It reports the nearest running timer, falling back to the nearest paused timer.
The `onx.timer.v1` JSON state contains `state`, `name`, `duration`, `remaining`
(seconds), and `count`. It refreshes once per second; timer creation and control
remain on the voice device. Alarm ringing also reports `ringing` because these
configurations share their timer/alarm ringing switch.

Flash the updated voice firmware, refresh entities on the knob, select the
voice device's **Voice timer** sensor in Device1–Device10 and save. Open the
sensor to see its countdown and animated progress ring. Standard Home Assistant
`timer.*` helpers can also be selected directly. No microphone is needed on the
knob. This does not create HA timer helpers for Assist's internal timers.

The knob build is `configs/onx2424g013.yaml` and imports source packages from
https://github.com/fixtse/OpenNextion-KNOB-ESPHome. Update its pinned package ref
when releasing new knob source; this also changes its firmware fingerprint.

## Automatic display

Configured timer slots now surface automatically: native HA `timer.*` helpers,
Voice PE/SoundSense timer sensors, and Google Home timers sensors. Google Home's
`timers` attribute is adapted into the countdown view without a device token.
Ringing timers take priority, followed by the earliest running timer, then paused
timers. Turning the dial dismisses the popup and resumes browsing; it returns
after ten idle seconds if still active. Settings, scheduled sleep and an explicitly
off screen are not interrupted. The ring uses the selected media progress color
and flashes at completion. Timer control stays on its originating system.
Automatic CI passed for source `f4793fc` (regression `42672743885`, attempt 2).
Release `.21` was published and installed on the knob; physical popup and completion
flashing behavior remain unverified.
