import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sourceFingerprint } from './firmware-selection.ts';
import { findOtaFirmware } from './firmware-artifact.ts';

import { getOta, loadFirmwareList, nextFirmwareVersion, readManifest } from './firmware-domain.ts';

const root = resolve(import.meta.dirname, '..');
const version = process.argv[2];
const selectedConfig = process.argv[3];
if (!version || !/^\d{4}\.\d+\.\d+$/.test(version) || !selectedConfig) {
  throw new Error('Usage: node scripts/build-firmware.ts YYYY.M.PATCH CONFIG.yaml');
}
const entries = loadFirmwareList(join(root, 'firmware_list.txt'));
const entry = entries.find(entry => entry.config === selectedConfig);
if (!entry) throw new Error(`Unknown configuration: ${selectedConfig}`);
const publishedPath = join(root, 'ota', 'releases', entry.manifest);
const published = readManifest(existsSync(publishedPath) ? publishedPath : join(root, 'ota', entry.manifest));
const firmwareVersion = nextFirmwareVersion(version, published.version);
const work = mkdtempSync(join(tmpdir(), 'esp-ota-'));
const image = `ghcr.io/esphome/esphome:${version}`;
const run = (args: readonly string[]) => execFileSync('docker', [...args], { stdio: 'inherit' });
try {
  cpSync(join(root, 'configs'), join(work, 'config'), { recursive: true });
  run(['pull', image]);
  console.log(`Building ${entry.config} with ESPHome ${version}`);
  const configPath = join(work, 'config', entry.config);
  const source = readFileSync(configPath, 'utf8');
  let replacements = 0;
  // Only change the version under esphome.project, retaining ESPHome YAML tags and comments.
  const projectVersion = /(^[ \t]+project:[^\n]*\n(?:[ \t]*\n|[ \t]+(?!version:)[^\n]+\n)*?)([ \t]+version:)[^\n]*/gm;
  const config = source.replace(projectVersion, (_match, prefix: string, key: string) => {
    replacements += 1;
    return `${prefix}${key} "${firmwareVersion}"`;
  });
  if (replacements !== 1) throw new Error(`Expected one project.version in ${entry.config}, found ${replacements}`);
  writeFileSync(configPath, config);
  const dockerArgs = ['run', '--rm', '--user', `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    '-e', 'HOME=/tmp', '-v', `${join(work, 'config')}:/config`, image];
  // Two Wi-Fi variants share node names; clean to prevent reusing another variant's output.
  run([...dockerArgs, 'clean', entry.config]);
  run([...dockerArgs, 'compile', entry.config]);
  const firmware = findOtaFirmware(join(work, 'config', '.esphome', 'build', entry.node), entry.node);
  console.log(`Using OTA binary: ${firmware}`);
  const content = readFileSync(firmware);
  const manifest = structuredClone(published);
  manifest.version = firmwareVersion;
  const ota = getOta(manifest, entry.binary);
  ota.path = entry.binary;
  ota.md5 = createHash('md5').update(content).digest('hex');
  ota.summary = `Firmware ${firmwareVersion}; ESPHome ${version}`;
  // Build artifacts are staged separately; the publisher freezes the migration files.
  mkdirSync(join(root, 'built', 'ota'), { recursive: true });
  writeFileSync(join(root, 'built', 'ota', entry.binary), content);
  writeFileSync(join(root, 'built', 'ota', entry.manifest), `${JSON.stringify(manifest, null, 2)}\n`);
  mkdirSync(join(root, 'built', 'firmware-versions'), { recursive: true });
  writeFileSync(join(root, 'built', 'firmware-versions', `${entry.config}.txt`), `${version}\n`);
  writeFileSync(join(root, 'built', 'firmware-versions', `${entry.config}.source-sha256`),
    `${sourceFingerprint(entry, path => readFileSync(join(root, path), 'utf8'))}\n`);
} catch (error) {
  console.error(`Firmware build failed for ${selectedConfig} with ESPHome ${version}`, error);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
