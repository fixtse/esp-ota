# Voice PE upstream snapshot

Source: https://github.com/esphome/home-assistant-voice-pe/blob/dev/home-assistant-voice.yaml
Revision: `d4e6fa43d6a1a7d342b7d4d403567e06516719de`.

`base.yaml` is the official development configuration at that revision. Its Voice Kit component and notification-sound URLs are pinned to the same commit. The upstream license is included. Local changes normalize whitespace and make next-active-timer selection safe for an empty list or paused timers.

`configs/voice-pe-sound-sense.yaml` adds the shared SoundSense package, passes the official raw 32-bit microphone frames to it, and retains factory provisioning over BLE/USB. It uses this repository's project identity, dashboard import, and HTTP OTA manifest. API encryption and the hardware mute switch follow the official configuration. No Wi-Fi credentials or API keys are embedded in the published binaries.

The merged factory image is delivered locally for the initial USB flash and is not published in this repository. The automated workflow publishes only `ota/voice-pe-sound-sense.ota.bin` and its manifest. The Firmware Update entity checks the repository every 30 minutes; updates are installed through that entity. Dynamic volume starts disabled and can be enabled in Home Assistant. SoundSense levels are relative rather than calibrated sound-pressure measurements.
