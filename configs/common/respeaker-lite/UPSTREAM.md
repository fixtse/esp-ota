# ReSpeaker Lite upstream snapshot

Source: https://github.com/formatBCE/Respeaker-Lite-ESPHome-integration
Revision: `6d68e61f1d615c59bd7d47e8f4e8c09e53583892` (release 2026.10.3).
Entry point: `config/common/respeaker-satellite-base.yaml`.

The seven packages are vendored here so the firmware source is reviewable in this repository. The top-level configuration pins the corresponding component, audio files, and wake-word assets to the same revision. Whitespace is normalized and the base file's include paths point to these local copies.

Local correction: `fetch_first_active_timer` handles empty lists and ignores paused timers when choosing the next active timer.

The top-level `configs/respeaker-satellite.yaml` preserves the fixtse project/device identity, HTTP OTA manifest, credential-free Improv provisioning, SoundSense raw-microphone hook, and the legacy `set_alarm_time` API action.

New features include Sendspin playback, source-based media pipelines, native alarm-time controls, persisted snooze with wake word and Home Assistant controls, physical-control disabling, wake-word recovery, 16 kHz microphone resampling, and updated LED timing/fault indication. Alarm time is now a Home Assistant time entity instead of a text sensor; adjust dashboards that referenced the old text sensor. A one-time boot migration restores a valid saved HH:MM alarm into the new datetime preference and preserves whether the alarm was enabled.
