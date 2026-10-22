# Automatic ESPHome builds

Everything needed lives in this repository:

- `configs/`: the nine source configurations and the ReSpeaker shared package.
- `firmware_list.txt`: config filename, published OTA filename, JSON manifest filename, ESPHome node name.
- `scripts/build-firmware.ts`: builds one configuration using the exact stable ESPHome Docker image and updates its OTA binary, JSON manifest, and version marker.
- `.github/workflows/update-firmware.yml`: checks the latest stable release of `esphome/esphome` hourly at minute 23 UTC. Releases in another repository do not directly trigger this repository's `release` event, so the workflow polls GitHub's Releases API. Prereleases are excluded.
- `.github/actions/notify-telegram/`: sends failure notifications through the Telegram Bot API.

Each configuration runs as a separate matrix job, with `fail-fast: false`. One failure never cancels the other builds. Each successful job uploads its own firmware, manifest, and `firmware-versions/<config>.txt` marker. After all jobs finish, the publishing job commits the successful artifacts even when other jobs failed. Failed configurations retain their previously published binary, manifest, and version marker. If all builds fail, nothing is published. The workflow still shows a failure if any build fails.

The hourly check skips configurations already published for the latest release and retries only the failed/outdated configurations. A legacy `.esphome-version` marker, if present, is used as a fallback until per-configuration markers exist. The markers track the compiler independently from old manifest version numbers, which the previous script sometimes incremented manually.

Push changes to the workflow, notification action, configurations, build script, or firmware list on `main` to rebuild all configurations. Firmware-only bot commits do not trigger another build. Use Actions → Update ESPHome firmware → Run workflow to check immediately, or select `force` to rebuild all configurations even when their versions match.

## Telegram configuration

Set these repository settings (the workflow exposes them as named environment variables in the notification job):

- [Actions secret](https://github.com/fixtse/esp-ota/settings/secrets/actions) `TELEGRAM_BOT_TOKEN`: the token issued by BotFather for your bot.
- [Actions secret](https://github.com/fixtse/esp-ota/settings/secrets/actions) `TELEGRAM_CHAT_ID`: the destination user, group, or channel chat ID. An Actions variable of the same name is also supported as a fallback; the secret takes priority.

Alternatively, run the interactive setup after signing in with `gh auth login`:

```sh
bash scripts/configure-telegram.sh
```

The setup prompts for both values privately and creates/updates both named secrets in `fixtse/esp-ota`. It does not save the token in the repository. Later, edit their values directly in GitHub Settings → Secrets and variables → Actions.

Start a conversation with the bot first, or add it to the destination group/channel with permission to send messages. Keep the bot token in the GitHub secret; do not commit it. After builds and publication finish, a separate notification job sends one message listing all failing configurations/stages (including timed-out builds), the ESPHome version, and workflow log URL. Release detection and publication failures are included too. If credentials are missing or Telegram rejects delivery, the notification step reports an error in Actions; firmware publication remains independent from notification delivery. Repeated failed retries produce new notifications.

GitHub Actions must be enabled and branch rules must allow `github-actions[bot]` to push using the publishing job's `contents: write` permission. No personal access token or ESPHome secrets are needed for compilation. GitHub may delay scheduled runs, and automatically disables schedules in public repositories after 60 days without repository activity; re-enable in Actions if needed.

For a local build, install Node.js 24 and Docker, then run:

```sh
node scripts/build-firmware.ts 2026.10.0 mini-mmwave-sensor.yaml
```

This updates only that configuration's local OTA binary, manifest, and version marker without committing or pushing. Every build uses an isolated temporary configuration directory; source project versions remain unchanged and variants sharing node names cannot reuse one another's outputs. The workflow compiles binaries only; devices continue to use their existing OTA manifest URLs.

ESPHome dependencies, remote components, and remote audio assets require internet access. Future ESPHome releases may require configuration updates; failed builds keep their last successfully published firmware.

The Bluetooth-free Wi-Fi fix variant references its existing manifest filename. Legacy manifests with trailing commas are accepted on input and rewritten as valid JSON after a successful build.

Artifact discovery supports both native ESP-IDF (`.esphome/build/<node>/build/firmware.ota.bin`) and PlatformIO (`.esphome/build/<node>/.pioenvs/<node>/firmware.ota.bin`) output. Run `node --test scripts/firmware-artifact.test.ts` with Node.js 24 to verify both layouts.

## ReSpeaker Lite features

`configs/respeaker-satellite.yaml` includes a local snapshot of upstream ReSpeaker Lite release 2026.10.3. Source revision, local corrections, and upgrade notes are in `configs/common/respeaker-lite/UPSTREAM.md`.

The snapshot adds Sendspin, source-based media playback with local Opus sounds, configurable snooze (including the Snooze wake word, pending state and cancel button), a native Home Assistant alarm-time entity, disabling physical controls, wake-word recovery, 16 kHz microphone resampling, and improved LED timing and fault indication. It retains SoundSense, device/project identity, Wi-Fi diagnostics, the media player's existing name, Improv provisioning, the existing HTTP OTA manifest, and the `set_alarm_time` API action. A one-time migration copies a valid saved HH:MM alarm time into the new time entity without enabling an alarm that was off. Dashboards using the old alarm text sensor should switch to the time entity.

To refresh the snapshot, review and copy the seven upstream packages together, update `respeaker_lite_ref` and the attribution file to the same revision, preserve the documented local timer safety correction, and compile locally with the workflow's exact ESPHome version before publishing.
