import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { validateRoomCompanionOta } from './firmware-artifact.ts';
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
  readonly verifyDownload?: (url: string, size: number, sha256: string) => void;
  readonly gh?: (args: readonly string[]) => void;
}

function verifyPublicDownload(url: string, size: number, sha256: string): void {
  const work = mkdtempSync(join(tmpdir(), 'esp-ota-verify-'));
  try {
    const path = join(work, 'firmware.bin');
    execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '--proto', '=https',
      '--proto-redir', '=https', '--retry', '5', '--retry-all-errors', '--retry-max-time', '120',
      '--max-time', '60', '--max-filesize', String(size), '--output', path, url], { stdio: 'inherit' });
    const downloaded = readFileSync(path);
    if (downloaded.length !== size || createHash('sha256').update(downloaded).digest('hex') !== sha256) {
      throw new Error(`Published OTA bytes differ from the validated build: ${url}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function publishFirmware(options: PublishOptions): { published: number; migrations: number; release?: string } {
  const { root, incoming, compiler, repository, target, runId, attempt } = options;
  if (!/^\d{4}\.\d+\.\d+$/.test(compiler) || !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
      !/^\d+$/.test(runId) || !/^\d+$/.test(attempt) || !/^[a-f\d]{40}$/.test(target)) {
    throw new Error('Invalid release publication parameters');
  }
  const ready = loadFirmwareList(join(root, 'firmware_list.txt')).filter(entry =>
    existsSync(join(incoming, 'firmware-versions', `${entry.config}.txt`))).map(entry => {
      const fingerprint = readFileSync(join(incoming, 'firmware-versions', `${entry.config}.source-sha256`), 'utf8').trim();
      const marker = readFileSync(join(incoming, 'firmware-versions', `${entry.config}.txt`), 'utf8').trim();
      const path = join(incoming, 'ota', entry.binary);
      const content = readFileSync(path);
      const manifest = readManifest(join(incoming, 'ota', entry.manifest));
      const ota = getOta(manifest, entry.binary);
      if (!/^[a-f0-9]{64}$/.test(fingerprint) || marker !== (entry.compiler ?? compiler) || !content.length || ota.md5 !== createHash('md5').update(content).digest('hex') ||
          !new RegExp(`^${marker.replaceAll('.', '\\.')}([.]\\d+)?$`).test(manifest.version)) {
        throw new Error(`Invalid built firmware or checksum: ${entry.config}`);
      }
      if (entry.config === 'onx3248g035.yaml') validateRoomCompanionOta(content);
      const releaseManifest = join(root, 'ota', 'releases', entry.manifest);
      if (existsSync(releaseManifest)) {
        const previous = readManifest(releaseManifest).version;
        if (manifest.version.localeCompare(previous, 'en', { numeric: true }) <= 0) {
          throw new Error(`Firmware version must increase for ${entry.config}: ${previous} -> ${manifest.version}`);
        }
      }
      return { entry, path, manifest, marker, fingerprint, size: content.length,
        sha256: createHash('sha256').update(content).digest('hex') };
    });
  if (!ready.length) return { published: 0, migrations: 0 };

  // A new tag for every run/attempt avoids replacing assets and resetting download counters.
  const tag = `esphome-${compiler}-${runId}-${attempt}`;
  const releaseUrl = `https://github.com/${repository}/releases/tag/${tag}`;
  const notes = join(incoming, 'release-notes.md');
  writeFileSync(notes, [
    `ESPHome release ${compiler}; individual assets use their configured compiler pins.`, '',
    ...ready.map(({ entry, manifest }) => `- ${entry.binary}: firmware ${manifest.version}`), '',
    'Download counts measure asset downloads, including retries; they are not unique-device counts.',
  ].join('\n'));
  const gh = options.gh ?? (args => { execFileSync('gh', [...args], { stdio: 'inherit' }); });
  gh(['release', 'create', tag, '--repo', repository, '--target', target, '--draft',
    '--title', `ESPHome ${compiler} · build ${runId}.${attempt}`, '--notes-file', notes]);
  // Publish the validated OTA images together with their SHA-256 checksums.
  const checksums = join(incoming, 'SHA256SUMS');
  writeFileSync(checksums, ready.map(({ entry, sha256 }) => `${sha256}  ${entry.binary}\n`).join(''));
  gh(['release', 'upload', tag, ...ready.map(item => item.path), checksums, '--repo', repository]);
  gh(['release', 'edit', tag, '--repo', repository, '--draft=false', '--latest']);

  const downloadBase = `https://github.com/${repository}/releases/download/${tag}`;
  const verifyDownload = options.verifyDownload ?? verifyPublicDownload;
  for (const { entry, size, sha256 } of ready) {
    verifyDownload(`${downloadBase}/${entry.binary}`, size, sha256);
  }

  // The existing manifest and raw image become an immutable migration checkpoint.
  // Its firmware checks the new release manifest after reboot. Subsequent runs only
  // advance that new manifest and leave the checkpoint available to every older device.
  let migrations = 0;
  mkdirSync(join(root, 'ota', 'releases'), { recursive: true });
  mkdirSync(join(root, 'firmware-versions'), { recursive: true });
  for (const { entry, path, manifest, marker, fingerprint } of ready) {
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
    releaseOta.path = `${downloadBase}/${entry.binary}`;
    releaseOta.release_url = releaseUrl;
    writeFileSync(releaseManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(root, 'firmware-versions', `${entry.config}.txt`), `${marker}\n`);
    writeFileSync(join(root, 'firmware-versions', `${entry.config}.source-sha256`), `${fingerprint}\n`);
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
