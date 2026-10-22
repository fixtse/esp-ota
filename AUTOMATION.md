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
- [Actions variable](https://github.com/fixtse/esp-ota/settings/variables/actions) `TELEGRAM_CHAT_ID`: the destination user, group, or channel chat ID. An existing secret of the same name remains supported as a fallback.

Alternatively, run the interactive setup after signing in with `gh auth login`:

```sh
bash scripts/configure-telegram.sh
```

The setup prompts for the bot token privately and creates/updates both named settings in `fixtse/esp-ota`. It does not save the token in the repository. Later, edit their values directly in GitHub Settings → Secrets and variables → Actions.

Start a conversation with the bot first, or add it to the destination group/channel with permission to send messages. Keep the bot token in the GitHub secret; do not commit it. After builds and publication finish, a separate notification job sends one message listing all failing configurations/stages (including timed-out builds), the ESPHome version, and workflow log URL. Release detection and publication failures are included too. If credentials are missing or Telegram rejects delivery, the notification step reports an error in Actions; firmware publication remains independent from notification delivery. Repeated failed retries produce new notifications.

GitHub Actions must be enabled and branch rules must allow `github-actions[bot]` to push using the publishing job's `contents: write` permission. No personal access token or ESPHome secrets are needed for compilation. GitHub may delay scheduled runs, and automatically disables schedules in public repositories after 60 days without repository activity; re-enable in Actions if needed.

For a local build, install Node.js 24 and Docker, then run:

```sh
node scripts/build-firmware.ts 2026.10.0 mini-mmwave-sensor.yaml
```

This updates only that configuration's local OTA binary, manifest, and version marker without committing or pushing. Every build uses an isolated temporary configuration directory; source project versions remain unchanged and variants sharing node names cannot reuse one another's outputs. The workflow compiles binaries only; devices continue to use their existing OTA manifest URLs.

ESPHome dependencies, remote components, and remote audio assets require internet access. Future ESPHome releases may require configuration updates; failed builds keep their last successfully published firmware.

Two source configuration corrections were made during migration: the Bluetooth-free Wi-Fi fix variant now references its existing manifest filename, and ReSpeaker's factory-reset warning uses its defined red Fast Pulse effect instead of an undefined effect. Legacy manifests with trailing commas are accepted on input and rewritten as valid JSON after a successful build.
