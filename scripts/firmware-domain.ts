import { readFileSync } from 'node:fs';

export interface FirmwareEntry {
  readonly config: string;
  readonly binary: string;
  readonly manifest: string;
  readonly node: string;
}
export interface FirmwareManifest {
  version: string;
  builds: { ota?: { md5: string; path: string; summary: string; release_url?: string } }[];
}

export function loadFirmwareList(path: string): readonly FirmwareEntry[] {
  const entries = readFileSync(path, 'utf8').split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith('#'))
    .map(line => {
      const fields = line.split(',').map(field => field.trim());
      if (fields.length !== 4 || fields.some(field => !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(field))) {
        throw new Error(`Invalid firmware list entry: ${line}`);
      }
      const [config, binary, manifest, node] = fields;
      return { config, binary, manifest, node };
    });
  if (!entries.length) throw new Error('Firmware list is empty');
  for (const key of ['config', 'binary', 'manifest'] as const) {
    if (new Set(entries.map(entry => entry[key])).size !== entries.length) throw new Error(`Duplicate ${key}`);
  }
  return entries;
}

export function readManifest(path: string): FirmwareManifest {
  return JSON.parse(readFileSync(path, 'utf8').replace(/,(\s*\n\s*[}\]])/g, '$1'));
}

export function nextFirmwareVersion(compiler: string, previous: string): string {
  if (!/^\d{4}\.\d+\.\d+$/.test(compiler)) throw new Error(`Invalid ESPHome version: ${compiler}`);
  if (previous === compiler) return `${compiler}.1`;
  if (previous.startsWith(`${compiler}.`)) {
    const revision = previous.slice(compiler.length + 1);
    if (!/^\d+$/.test(revision) || !Number.isSafeInteger(Number(revision) + 1)) {
      throw new Error(`Invalid firmware revision: ${previous}`);
    }
    return `${compiler}.${Number(revision) + 1}`;
  }
  return compiler;
}

export function getOta(manifest: FirmwareManifest, binary: string) {
  const matches = manifest.builds.filter(build => build.ota?.path.split('/').at(-1) === binary);
  if (matches.length !== 1 || !matches[0].ota) throw new Error(`Expected one OTA entry for ${binary}`);
  return matches[0].ota;
}
