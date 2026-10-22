import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { findOtaFirmware } from './firmware-artifact.ts';

let buildRoot: string;
beforeEach(() => { buildRoot = mkdtempSync(join(tmpdir(), 'ota-artifact-test-')); });
afterEach(() => { rmSync(buildRoot, { recursive: true, force: true }); });
const put = (path: string, content: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

test('finds the native ESP-IDF artifact from the reported successful build', () => {
  const path = join(buildRoot, 'build', 'firmware.ota.bin');
  put(path, 'firmware');
  assert.equal(findOtaFirmware(buildRoot, 'mmwave-sensor'), path);
});

test('supports the legacy PlatformIO output directory', () => {
  const path = join(buildRoot, '.pioenvs', 'mmwave-sensor', 'firmware.ota.bin');
  put(path, 'firmware');
  assert.equal(findOtaFirmware(buildRoot, 'mmwave-sensor'), path);
});

test('prefers native output if both layouts are present', () => {
  const native = join(buildRoot, 'build', 'firmware.ota.bin');
  put(native, 'new');
  put(join(buildRoot, '.pioenvs', 'mmwave-sensor', 'firmware.ota.bin'), 'old');
  assert.equal(findOtaFirmware(buildRoot, 'mmwave-sensor'), native);
});

test('rejects empty firmware and reports both checked locations', () => {
  put(join(buildRoot, 'build', 'firmware.ota.bin'), '');
  assert.throws(() => findOtaFirmware(buildRoot, 'mmwave-sensor'), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Missing or empty OTA binary/);
    assert.ok(error.message.includes(join(buildRoot, 'build', 'firmware.ota.bin')));
    assert.ok(error.message.includes(join(buildRoot, '.pioenvs', 'mmwave-sensor', 'firmware.ota.bin')));
    return true;
  });
});

test('rejects a missing artifact or a directory named firmware.ota.bin', () => {
  assert.throws(() => findOtaFirmware(buildRoot, 'mmwave-sensor'), /Missing or empty OTA binary/);
  mkdirSync(join(buildRoot, 'build', 'firmware.ota.bin'), { recursive: true });
  assert.throws(() => findOtaFirmware(buildRoot, 'mmwave-sensor'), /Missing or empty OTA binary/);
});
