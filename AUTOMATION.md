# Automatic ESPHome builds

Everything needed lives in this repository:

- `configs/`: the nine source configurations and the ReSpeaker shared package.
- `firmware_list.txt`: config filename, published OTA filename, JSON manifest filename, ESPHome node name.
- `scripts/build-firmware.ts`: builds using the exact stable ESPHome Docker image, updates manifest versions/checksums, and records `.esphome-version` only after all builds succeed.
- `.github/workflows/update-firmware.yml`: checks the latest stable release of `esphome/esphome` hourly, at minute 23 UTC. Releases in another repository do not directly trigger this repository's `release` event, so the workflow polls GitHub's Releases API. Prereleases are excluded.

Push these files to the default branch to activate the schedule. GitHub Actions must be enabled and branch rules must allow `github-actions[bot]` to push using the workflow's `contents: write` permission. No personal access token or ESPHome secrets are needed for these configurations. GitHub may delay scheduled runs, and automatically disables schedules in public repositories after 60 days without repository activity; re-enable in Actions if needed.

Pushing changes to the workflow, configurations, build script, or firmware list on `main` also triggers a build. Firmware-only bot commits do not trigger another build. The first run builds the latest stable release. Later runs skip the build if `.esphome-version` matches. Failures leave that marker unchanged so the next scheduled run retries; no partial firmware batch is committed. The marker tracks the compiler independently from older manifest version numbers, which the previous script sometimes incremented manually.

Use Actions → Update ESPHome firmware → Run workflow to run immediately. Select `force` to rebuild the latest release after editing configurations. The workflow compiles binaries only; devices continue to use their existing OTA manifest URLs. Config project versions are changed in an isolated temporary build directory; source files remain unchanged.

For a local build, install Node.js 24 and Docker, then run:

```sh
node scripts/build-firmware.ts 2026.6.3
```

This updates local OTA binaries/manifests without committing or pushing. Nine builds run sequentially, cleaning between variants that share node names. ESPHome dependencies, remote components, and remote audio assets still require internet access. Future ESPHome releases may require configuration updates; a failed build appears as a failed Actions run instead of publishing incomplete firmware.

Two source configuration corrections were made during migration: the Bluetooth-free Wi-Fi fix variant now references its existing manifest filename, and ReSpeaker's factory-reset warning uses its defined red Fast Pulse effect instead of an undefined effect. Legacy manifests with trailing commas are accepted on input and rewritten as valid JSON after a successful build.
