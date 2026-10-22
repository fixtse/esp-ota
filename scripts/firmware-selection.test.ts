import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { sourceFingerprint, selectFirmware } from './firmware-selection.ts';

test('selects only affected firmware, follows nested shared packages, and retries until publication', () => {
  const root = mkdtempSync(join(tmpdir(), 'firmware-selection-'));
  const entries = ['voice', 'respeaker', 'sensor'].map(name => ({ config: `${name}.yaml`, binary: `${name}.ota.bin`, manifest: `${name}.json`, node: name }));
  const read = (path: string) => readFileSync(join(root, path), 'utf8');
  try {
    for (const path of ['configs/common', 'ota/releases', 'firmware-versions']) mkdirSync(join(root, path), { recursive: true });
    writeFileSync(join(root, 'configs/common/shared.yaml'), 'globals: []\n');
    writeFileSync(join(root, 'configs/common/wrapper.yaml'), 'packages:\n  sound: !include shared.yaml\n');
    for (const entry of entries) {
      writeFileSync(join(root, `configs/${entry.config}`), entry.node === 'sensor' ? 'sensor: []\n' : 'packages:\n  common: !include common/wrapper.yaml\n');
      writeFileSync(join(root, `ota/releases/${entry.manifest}`), '{}');
      writeFileSync(join(root, `firmware-versions/${entry.config}.txt`), '2026.10.0');
      writeFileSync(join(root, `firmware-versions/${entry.config}.source-sha256`), sourceFingerprint(entry, read));
    }
    const pending = () => selectFirmware(root, entries, '2026.10.0').map(entry => entry.node);
    assert.deepEqual(pending(), []);
    writeFileSync(join(root, 'configs/voice.yaml'), 'packages:\n  common: !include common/wrapper.yaml\n# voice change\n');
    assert.deepEqual(pending(), ['voice']);
    assert.deepEqual(pending(), ['voice']); // Failed build never advances the fingerprint.
    writeFileSync(join(root, 'firmware-versions/voice.yaml.source-sha256'), sourceFingerprint(entries[0], read));
    assert.deepEqual(pending(), []);
    writeFileSync(join(root, 'configs/common/shared.yaml'), 'globals: []\n# shared change\n');
    assert.deepEqual(pending(), ['voice', 'respeaker']);
    assert.equal(selectFirmware(root, entries, '2026.10.1').length, 3);
    assert.equal(selectFirmware(root, entries, '2026.10.0', true).length, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('include cycles terminate and missing or unsupported dependencies fail safely', () => {
  const entry = { config: 'one.yaml', binary: 'one.bin', manifest: 'one.json', node: 'one' };
  assert.equal(sourceFingerprint(entry, () => 'package: !include one.yaml').length, 64);
  assert.throws(() => sourceFingerprint(entry, () => 'package: !include ../outside.yaml'), /outside configs/);
  assert.throws(() => sourceFingerprint(entry, () => 'package: !include ${dynamic}.yaml'), /Unsupported include/);
});
