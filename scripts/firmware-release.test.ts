import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, test } from 'node:test';
import { nextFirmwareVersion } from './firmware-domain.ts';
import { publishFirmware } from './publish-firmware.ts';
import { downloadSummary } from './download-statistics.ts';

let root: string;
let incoming: string;
let calls: (readonly string[])[];
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'firmware-release-test-'));
  incoming = join(root, 'incoming');
  calls = [];
  for (const name of ['ota', 'incoming/ota', 'incoming/firmware-versions']) mkdirSync(join(root, name), { recursive: true });
  writeFileSync(join(root, 'firmware_list.txt'), 'one.yaml,one.ota.bin,one_manifest.yml,one\ntwo.yaml,two.ota.bin,two_manifest.yml,two\n');
  for (const name of ['one', 'two']) {
    writeFileSync(join(root, 'ota', `${name}.ota.bin`), 'old image');
    writeFileSync(join(root, 'ota', `${name}_manifest.yml`), JSON.stringify({ version: '2026.10.0', builds: [{ ota: { path: `${name}.ota.bin`, md5: 'old', summary: 'old' } }] }));
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
function stage(name: string, version = '2026.10.0.1') {
  const content = Buffer.from(`new:${version}`);
  writeFileSync(join(incoming, 'ota', `${name}.ota.bin`), content);
  writeFileSync(join(incoming, 'ota', `${name}_manifest.yml`), JSON.stringify({ version, builds: [{ ota: {
    path: `${name}.ota.bin`, md5: createHash('md5').update(content).digest('hex'), summary: 'built',
  } }] }));
  writeFileSync(join(incoming, 'firmware-versions', `${name}.yaml.txt`), '2026.10.0');
  writeFileSync(join(incoming, 'firmware-versions', `${name}.yaml.source-sha256`), 'a'.repeat(64));
}
function publish(gh: (args: readonly string[]) => void = args => { calls.push(args); }, runId = '10') {
  return publishFirmware({ root, incoming, compiler: '2026.10.0', repository: 'fixtse/esp-ota',
    target: 'a'.repeat(40), runId, attempt: '1', gh });
}

test('firmware revisions follow the compiler release', () => {
  assert.equal(nextFirmwareVersion('2026.10.0', '2026.9.0.9'), '2026.10.0');
  assert.equal(nextFirmwareVersion('2026.10.0', '2026.10.0'), '2026.10.0.1');
  assert.equal(nextFirmwareVersion('2026.10.0', '2026.10.0.1'), '2026.10.0.2');
  assert.equal(nextFirmwareVersion('2026.10.1', '2026.10.0.99'), '2026.10.1');
});

test('first publication stages a raw migration and a release manifest for successful firmware only', () => {
  stage('one');
  writeFileSync(join(incoming, 'ota', 'do-not-upload.factory.bin'), 'factory');
  const result = publish();
  assert.equal(result.migrations, 1);
  assert.deepEqual(calls.map(args => args[1]), ['create', 'upload', 'edit']);
  assert.ok(calls[0].includes('--draft'));
  assert.ok(!calls[1].some(arg => arg.includes('factory')));
  const legacy = JSON.parse(readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8'));
  const current = JSON.parse(readFileSync(join(root, 'ota/releases/one_manifest.yml'), 'utf8'));
  assert.equal(legacy.version, '2026.10.0.1');
  assert.equal(legacy.builds[0].ota.path, 'one.ota.bin');
  assert.match(current.builds[0].ota.path, /releases\/download\/esphome-2026\.10\.0-10-1\/one\.ota\.bin$/);
  assert.equal(readFileSync(join(root, 'ota/two.ota.bin'), 'utf8'), 'old image');
  assert.ok(!existsSync(join(root, 'firmware-versions/two.yaml.txt')));
});

test('later publications never replace the raw migration checkpoint or existing release assets', () => {
  stage('one'); publish();
  const legacyManifest = readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8');
  const legacyImage = readFileSync(join(root, 'ota/one.ota.bin'));
  stage('one', '2026.10.0.2'); calls = []; const result = publish(undefined, '11');
  assert.equal(result.migrations, 0);
  assert.equal(readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8'), legacyManifest);
  assert.deepEqual(readFileSync(join(root, 'ota/one.ota.bin')), legacyImage);
  assert.equal(JSON.parse(readFileSync(join(root, 'ota/releases/one_manifest.yml'), 'utf8')).version, '2026.10.0.2');
  assert.ok(calls[0].includes('esphome-2026.10.0-11-1'));
  assert.ok(!calls.flat().includes('--clobber'));
});

test('upload failure leaves all published images, manifests, and markers unchanged', () => {
  stage('one');
  const old = readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8');
  assert.throws(() => publish(args => { if (args[1] === 'upload') throw new Error('upload failure'); }), /upload failure/);
  assert.equal(readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8'), old);
  assert.ok(!existsSync(join(root, 'ota/releases/one_manifest.yml')));
  assert.ok(!existsSync(join(root, 'firmware-versions/one.yaml.txt')));
});

test('bad checksum and empty batches never create releases', () => {
  assert.equal(publish().published, 0);
  assert.equal(calls.length, 0);
  stage('one'); writeFileSync(join(incoming, 'ota/one.ota.bin'), 'corrupted');
  assert.throws(() => publish(), /Invalid built firmware/);
  assert.equal(calls.length, 0);
});

test('statistics select the latest asset per firmware across partial releases, regardless of API order', () => {
  const release = (tag: string, date: string, assets: { name: string; download_count: number }[]) => ({
    tag_name: `esphome-${tag}`, html_url: `https://example.com/${tag}`, draft: false, published_at: date, assets,
  });
  const summary = downloadSummary([
    release('old', '2026-10-01', [{ name: 'one.ota.bin', download_count: 100 }, { name: 'two.ota.bin', download_count: 7 }]),
    release('new', '2026-10-02', [{ name: 'one.ota.bin', download_count: 4 }, { name: 'one.factory.bin', download_count: 99 }]),
    { ...release('draft', '2026-10-03', [{ name: 'one.ota.bin', download_count: 99 }]), draft: true },
    { ...release('preview', '2026-10-04', [{ name: 'two.ota.bin', download_count: 99 }]), prerelease: true },
  ]);
  assert.ok(summary.includes('| one.ota.bin | [esphome-new](https://example.com/new) | 4 |'));
  assert.ok(summary.includes('| two.ota.bin | [esphome-old](https://example.com/old) | 7 |'));
  assert.ok(!summary.includes('factory.bin'));
  assert.ok(!summary.includes('esphome-draft'));
  assert.ok(!summary.includes('esphome-preview'));
  assert.ok(!summary.includes('100'));
});
