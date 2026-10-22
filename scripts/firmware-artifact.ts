import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function findOtaFirmware(buildRoot: string, node: string): string {
  const candidates = [
    // ESPHome's native ESP-IDF builds (including ESPHome 2026.10).
    join(buildRoot, 'build', 'firmware.ota.bin'),
    // PlatformIO builds used by older releases and other frameworks.
    join(buildRoot, '.pioenvs', node, 'firmware.ota.bin'),
  ];
  const firmware = candidates.find(path => {
    if (!existsSync(path)) return false;
    const stat = statSync(path);
    return stat.isFile() && stat.size > 0;
  });
  if (!firmware) throw new Error(`Missing or empty OTA binary. Checked: ${candidates.join(', ')}`);
  return firmware;
}
