import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFirmwareList, type FirmwareEntry } from './firmware-domain.ts';

// Follow local package includes so shared changes rebuild all their consumers.
export function sourceFingerprint(entry: FirmwareEntry, read: (path: string) => string): string {
  const sources = new Map<string, string>();
  const visit = (path: string) => {
    if (!path.startsWith('configs/')) throw new Error(`Include outside configs: ${path}`);
    if (sources.has(path)) return;
    const content = read(path);
    sources.set(path, content);
    for (const line of content.split('\n')) {
      if (line.trimStart().startsWith('#')) continue;
      const include = line.match(/!include\s+(?:"([^"]+)"|'([^']+)'|([^\s#]+))/);
      if (!include) continue;
      const relative = include[1] ?? include[2] ?? include[3];
      if (relative.includes('$') || relative.startsWith('{')) throw new Error(`Unsupported include: ${line}`);
      visit(posix.normalize(posix.join(posix.dirname(path), relative)));
    }
  };
  visit(`configs/${entry.config}`);
  return createHash('sha256').update(JSON.stringify([
    entry, [...sources].sort(([a], [b]) => a.localeCompare(b)),
  ])).digest('hex');
}

export function selectFirmware(root: string, entries: readonly FirmwareEntry[], compiler: string, force = false): readonly FirmwareEntry[] {
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  const marker = (path: string) => existsSync(join(root, path)) ? read(path).trim() : '';
  return entries.filter(entry => force ||
    !existsSync(join(root, 'ota', 'releases', entry.manifest)) ||
    (marker(`firmware-versions/${entry.config}.txt`) || marker('.esphome-version')) !== compiler ||
    marker(`firmware-versions/${entry.config}.source-sha256`) !== sourceFingerprint(entry, read));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const compiler = process.argv[2] ?? '';
    if (!/^\d{4}\.\d+\.\d+$/.test(compiler)) throw new Error('Invalid ESPHome version');
    const root = resolve(import.meta.dirname, '..');
    console.log(JSON.stringify(selectFirmware(root, loadFirmwareList(join(root, 'firmware_list.txt')), compiler, process.env.FORCE === 'true')));
  } catch (error) {
    console.error('Firmware selection failed', error);
    process.exitCode = 1;
  }
}
