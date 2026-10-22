import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

let root: string;
let temp: string;
beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), 'firmware-build-test-'));
  root = join(temp, 'repo');
  for (const path of ['configs', 'ota', 'bin']) mkdirSync(join(root, path), { recursive: true });
  cpSync(import.meta.dirname, join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'firmware_list.txt'), 'one.yaml,one.ota.bin,one_manifest.yml,one\n');
  writeFileSync(join(root, 'configs/one.yaml'), 'esphome:\n  project:\n    name: test.One\n    version: 2026.10.0.1\n');
  writeFileSync(join(root, 'ota/one.ota.bin'), 'previous published binary');
  writeFileSync(join(root, 'ota/one_manifest.yml'), JSON.stringify({ version: '2026.10.0', builds: [{ ota: {
    path: 'one.ota.bin', md5: 'previous', summary: 'previous',
  } }] }));
  writeFileSync(join(root, 'bin/docker'), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'pull' || args.at(-2) === 'clean') process.exit(0);
if (process.env.FAIL_BUILD === 'true') process.exit(42);
const mount = args[args.indexOf('-v') + 1].slice(0, -8);
const text = fs.readFileSync(path.join(mount, 'one.yaml'), 'utf8');
const version = text.match(/version: "([^"\\n]+)"/)[1];
const out = path.join(mount, '.esphome/build/one/build');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'firmware.ota.bin'), version);
`, { mode: 0o755 });
});
afterEach(() => rmSync(temp, { recursive: true, force: true }));
function build(fail = false) {
  return spawnSync(process.execPath, [join(root, 'scripts/build-firmware.ts'), '2026.10.0', 'one.yaml'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${root}/bin:${process.env.PATH ?? ''}`, FAIL_BUILD: String(fail) },
  });
}

test('build embeds the next revision and stages artifacts without changing the published migration', () => {
  const previous = readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8');
  const result = build();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, 'built/ota/one.ota.bin'), 'utf8'), '2026.10.0.1');
  assert.equal(JSON.parse(readFileSync(join(root, 'built/ota/one_manifest.yml'), 'utf8')).version, '2026.10.0.1');
  assert.equal(readFileSync(join(root, 'built/firmware-versions/one.yaml.txt'), 'utf8').trim(), '2026.10.0');
  assert.equal(readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8'), previous);
  assert.equal(readFileSync(join(root, 'ota/one.ota.bin'), 'utf8'), 'previous published binary');
});

test('rebuilds read the release manifest and preserve the frozen migration version', () => {
  mkdirSync(join(root, 'ota/releases'));
  writeFileSync(join(root, 'ota/releases/one_manifest.yml'), JSON.stringify({ version: '2026.10.0.4', builds: [{ ota: {
    path: 'https://github.com/fixtse/esp-ota/releases/download/old-tag/one.ota.bin', md5: 'previous', summary: 'previous',
  } }] }));
  const result = build();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, 'built/ota/one.ota.bin'), 'utf8'), '2026.10.0.5');
  assert.equal(JSON.parse(readFileSync(join(root, 'ota/one_manifest.yml'), 'utf8')).version, '2026.10.0');
});

test('compile failures do not stage a successful version marker', () => {
  const result = build(true);
  assert.notEqual(result.status, 0);
  assert.ok(!existsSync(join(root, 'built/firmware-versions/one.yaml.txt')));
});
