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

// Room Companion's deployed 16 MB partition table has two 0x7C0000 app slots.
// OTA cannot change the partition table of a panel already in service.
export function validateRoomCompanionOta(content: Buffer): void {
  const slotSize = 0x7c0000;
  // ESP32-S3 image header and ESP-IDF application descriptor in segment zero.
  if (content.length < 288 || content.length > slotSize || content[0] !== 0xe9 ||
      content.readUInt16LE(12) !== 9 || content.readUInt32LE(32) !== 0xabcd5432) {
    throw new Error('Room Companion OTA requires an ESP32-S3 application image that fits its OTA slot');
  }
}
