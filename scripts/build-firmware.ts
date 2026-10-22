import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

interface FirmwareEntry {
  readonly config: string;
  readonly binary: string;
  readonly manifest: string;
  readonly node: string;
}
interface FirmwareManifest {
  version: string;
  builds: { ota: { md5: string; path: string; summary: string } }[];
}

const root = resolve(import.meta.dirname, '..');
const version = process.argv[2];
const selectedConfig = process.argv[3];
if (!version || !/^\d{4}\.\d+\.\d+$/.test(version) || !selectedConfig) {
  throw new Error('Usage: node scripts/build-firmware.ts YYYY.M.PATCH CONFIG.yaml');
}
const entries: readonly FirmwareEntry[] = readFileSync(join(root, 'firmware_list.txt'), 'utf8')
  .split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'))
  .map(line => {
    const fields = line.split(',').map(field => field.trim());
    if (fields.length !== 4 || fields.some(field => !field || basename(field) !== field || field === '..')) {
      throw new Error(`Invalid firmware_list entry: ${line}`);
    }
    const [config, binary, manifest, node] = fields;
    return { config, binary, manifest, node };
  });
const entry = entries.find(entry => entry.config === selectedConfig);
if (!entry) throw new Error(`Unknown configuration: ${selectedConfig}`);
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
    return `${prefix}${key} "${version}"`;
  });
  if (replacements !== 1) throw new Error(`Expected one project.version in ${entry.config}, found ${replacements}`);
  writeFileSync(configPath, config);
  const dockerArgs = ['run', '--rm', '--user', `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
    '-e', 'HOME=/tmp', '-v', `${join(work, 'config')}:/config`, image];
  // Two Wi-Fi variants share node names; clean to prevent reusing another variant's output.
  run([...dockerArgs, 'clean', entry.config]);
  run([...dockerArgs, 'compile', entry.config]);
  const firmware = join(work, 'config', '.esphome', 'build', entry.node, '.pioenvs', entry.node, 'firmware.ota.bin');
  if (!existsSync(firmware) || statSync(firmware).size === 0) throw new Error(`Missing or empty OTA binary: ${firmware}`);
  const content = readFileSync(firmware);
  const manifest: FirmwareManifest = JSON.parse(
    // Older manifests contain trailing commas before closing braces/arrays.
    readFileSync(join(root, 'ota', entry.manifest), 'utf8').replace(/,(\s*\n\s*[}\]])/g, '$1')
  );
  manifest.version = version;
  let matchingBuilds = 0;
  for (const build of manifest.builds) {
    if (build.ota?.path === entry.binary) {
      build.ota.md5 = createHash('md5').update(content).digest('hex');
      build.ota.summary = `Esphome version: ${version}`;
      matchingBuilds += 1;
    }
  }
  if (matchingBuilds !== 1) throw new Error(`Expected one matching OTA path in ${entry.manifest}`);
  // Publish only this successful configuration and advance only its marker.
  writeFileSync(join(root, 'ota', entry.binary), content);
  writeFileSync(join(root, 'ota', entry.manifest), `${JSON.stringify(manifest, null, 2)}\n`);
  mkdirSync(join(root, 'firmware-versions'), { recursive: true });
  writeFileSync(join(root, 'firmware-versions', `${entry.config}.txt`), `${version}\n`);
} catch (error) {
  console.error(`Firmware build failed for ${selectedConfig} with ESPHome ${version}`, error);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
