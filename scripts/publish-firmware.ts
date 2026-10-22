import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOta, loadFirmwareList, readManifest } from './firmware-domain.ts';

interface PublishOptions {
  readonly root: string;
  readonly incoming: string;
  readonly compiler: string;
  readonly repository: string;
  readonly target: string;
  readonly runId: string;
  readonly attempt: string;
  readonly gh?: (args: readonly string[]) => void;
}

export function publishFirmware(options: PublishOptions): { published: number; migrations: number; release?: string } {
  const { root, incoming, compiler, repository, target, runId, attempt } = options;
  if (!/^\d{4}\.\d+\.\d+$/.test(compiler) || !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
      !/^\d+$/.test(runId) || !/^\d+$/.test(attempt) || !/^[a-f\d]{40}$/.test(target)) {
    throw new Error('Invalid release publication parameters');
  }
  const ready = loadFirmwareList(join(root, 'firmware_list.txt')).filter(entry =>
    existsSync(join(incoming, 'firmware-versions', `${entry.config}.txt`))).map(entry => {
      const marker = readFileSync(join(incoming, 'firmware-versions', `${entry.config}.txt`), 'utf8').trim();
      const path = join(incoming, 'ota', entry.binary);
      const content = readFileSync(path);
      const manifest = readManifest(join(incoming, 'ota', entry.manifest));
      const ota = getOta(manifest, entry.binary);
      if (marker !== compiler || !content.length || ota.md5 !== createHash('md5').update(content).digest('hex') ||
          !new RegExp(`^${compiler.replaceAll('.', '\\.')}([.]\\d+)?$`).test(manifest.version)) {
        throw new Error(`Invalid built firmware or checksum: ${entry.config}`);
      }
      return { entry, path, manifest, marker };
    });
  if (!ready.length) return { published: 0, migrations: 0 };

  // A new tag for every run/attempt avoids replacing assets and resetting download counters.
  const tag = `esphome-${compiler}-${runId}-${attempt}`;
  const releaseUrl = `https://github.com/${repository}/releases/tag/${tag}`;
  const notes = join(incoming, 'release-notes.md');
  writeFileSync(notes, [
    `Built with ESPHome ${compiler}.`, '',
    ...ready.map(({ entry, manifest }) => `- ${entry.binary}: firmware ${manifest.version}`), '',
    'Download counts measure asset downloads, including retries; they are not unique-device counts.',
  ].join('\n'));
  const gh = options.gh ?? (args => { execFileSync('gh', [...args], { stdio: 'inherit' }); });
  gh(['release', 'create', tag, '--repo', repository, '--target', target, '--draft',
    '--title', `ESPHome ${compiler} · build ${runId}.${attempt}`, '--notes-file', notes]);
  // Only explicitly validated OTA images may be uploaded. Factory files never enter releases.
  gh(['release', 'upload', tag, ...ready.map(item => item.path), '--repo', repository]);
  gh(['release', 'edit', tag, '--repo', repository, '--draft=false', '--latest']);

  // The existing manifest and raw image become an immutable migration checkpoint.
  // Its firmware checks the new release manifest after reboot. Subsequent runs only
  // advance that new manifest and leave the checkpoint available to every older device.
  let migrations = 0;
  mkdirSync(join(root, 'ota', 'releases'), { recursive: true });
  mkdirSync(join(root, 'firmware-versions'), { recursive: true });
  for (const { entry, path, manifest, marker } of ready) {
    const releaseManifestPath = join(root, 'ota', 'releases', entry.manifest);
    if (!existsSync(releaseManifestPath)) {
      const bridge = structuredClone(manifest);
      const bridgeOta = getOta(bridge, entry.binary);
      bridgeOta.path = entry.binary;
      bridgeOta.summary = `Enlarged HTTP buffers; firmware ${bridge.version}; ESPHome ${compiler}`;
      copyFileSync(path, join(root, 'ota', entry.binary));
      writeFileSync(join(root, 'ota', entry.manifest), `${JSON.stringify(bridge, null, 2)}\n`);
      migrations += 1;
    }
    const releaseOta = getOta(manifest, entry.binary);
    releaseOta.path = `https://github.com/${repository}/releases/download/${tag}/${entry.binary}`;
    releaseOta.release_url = releaseUrl;
    writeFileSync(releaseManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(root, 'firmware-versions', `${entry.config}.txt`), `${marker}\n`);
  }
  return { published: ready.length, migrations, release: releaseUrl };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = publishFirmware({
      root: resolve(import.meta.dirname, '..'), incoming: resolve(process.argv[3] ?? 'incoming'),
      compiler: process.argv[2] ?? '', repository: process.env.GITHUB_REPOSITORY ?? '',
      target: process.env.GITHUB_SHA ?? '', runId: process.env.GITHUB_RUN_ID ?? '',
      attempt: process.env.GITHUB_RUN_ATTEMPT ?? '1',
    });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,
      `published=${result.published}\nmigrations=${result.migrations}\n`);
    if (process.env.GITHUB_STEP_SUMMARY && result.release) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `Published ${result.published} OTA assets: ${result.release}\n`);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Firmware release publication failed', error);
    process.exitCode = 1;
  }
}
