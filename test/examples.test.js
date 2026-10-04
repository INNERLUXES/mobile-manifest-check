import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLEAN, EXPECTED, RISKY, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');

test('examples: the risky app fails with the report that is saved in examples/output', async () => {
  const r = await run(RISKY);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('risky.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the clean app passes with the report that is saved', async () => {
  const r = await run(CLEAN);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('clean.txt'));
  assert.match(r.out, /\nfindings: 2 \(2 info\)\n/);
});

test('examples: --explain, JSON, the GitHub commands and the defaults are the reports that are saved', async () => {
  assert.equal((await run([...RISKY, '--explain'])).out, await saved('risky-explain.txt'));
  assert.equal((await run([...RISKY, '--json', '--explain'])).out, await saved('risky.json'));
  assert.equal((await run([...RISKY, '--format', 'github'])).out, await saved('risky-github.txt'));
  assert.equal((await run(['--print-defaults'])).out, await saved('defaults.json'));
});

test('examples: the rules that fire on the risky app, each on the line built for it', async () => {
  const report = JSON.parse((await run([...RISKY, '--json'])).out);
  const byRule = {};
  for (const f of report.findings) (byRule[f.rule] ??= []).push(f.at.replace('examples/risky/', ''));
  // The place of the first line of a file that holds needle, after the line that holds after.
  const at = async (rel, needle, after = null) => {
    const lines = (await readFile(resolve(root, 'examples/risky', rel), 'utf8')).split('\n');
    const from = after === null ? 0 : lines.findIndex((l) => l.includes(after));
    return `${rel}:${lines.findIndex((l, i) => i >= from && l.includes(needle)) + 1}`;
  };
  const m = 'android/app/src/main/AndroidManifest.xml';
  const nsc = 'android/app/src/main/res/xml/network_security_config.xml';
  const paths = 'android/app/src/main/res/xml/file_paths.xml';
  const p = 'ios/Tidepool/Info.plist';
  assert.deepEqual(byRule, {
    debuggable: [await at(m, 'android:debuggable')],
    'cleartext-traffic': [await at(m, 'android:usesCleartextTraffic'), await at(nsc, '<base-config')],
    'missing-exported': [await at(m, '.DeepLinkActivity')],
    'empty-usage-description': [await at(p, 'NSMicrophoneUsageDescription'), await at(p, 'NSContactsUsageDescription'), await at(p, 'NSPhotoLibraryUsageDescription')],
    'missing-usage-description': [await at(p, '<string>location'), await at(p, 'bluetooth-le')],
    'ats-arbitrary-loads': [await at(p, '<key>NSAllowsArbitraryLoads<')],
    'unparsable-file': [await at('ios/TidepoolWidget/Info.plist', '<!DOCTYPE')],
    'restricted-permission': [await at(m, 'ACCESS_BACKGROUND_LOCATION'), await at(m, 'READ_SMS'), await at(m, 'QUERY_ALL_PACKAGES')],
    'allow-backup': [await at(m, '<application')],
    'exported-component': [await at(m, 'android:exported="true"', '.ShareTideActivity'), await at(m, 'android:exported="true"', '.SyncService'), await at(m, 'android:exported="true"', '.TideLogProvider')],
    'missing-resource': [await at(m, '<meta-data', '.PhotoProvider')],
    'provider-broad-paths': [await at(m, '<grant-uri-permission'), await at(paths, '<external-path'), await at(paths, '<root-path')],
    'user-certificates': [await at(nsc, 'src="user"')],
    'cleartext-domain': [await at(nsc, 'cleartextTrafficPermitted="true"', '</base-config>')],
    'ats-exception': [await at(p, 'NSAllowsArbitraryLoadsInWebContent'), await at(p, 'NSExceptionAllowsInsecureHTTPLoads'), await at(p, 'NSExceptionMinimumTLSVersion')],
    'dangerous-permission': [await at(m, 'permission.CAMERA'), await at(m, 'ACCESS_FINE_LOCATION'), await at(m, 'READ_CONTACTS'), `${m}:${Number((await at(m, 'WRITE_EXTERNAL_STORAGE')).split(':')[1]) - 1}`, await at(m, 'SYSTEM_ALERT_WINDOW'), await at(m, 'RECORD_AUDIO')],
    'encryption-declaration': [await at(p, '<dict>')],
    'usage-description': [await at(p, 'NSCameraUsageDescription'), await at(p, 'NSLocationAlwaysAndWhenInUseUsageDescription')],
    'file-sharing': [await at(p, 'UIFileSharingEnabled')]
  });
});

test('examples: the same files written with CRLF line ends give the same output', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'mobile-manifest-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    const walk = async (sub) => {
      for (const e of await readdir(resolve(dir, sub), { withFileTypes: true })) {
        const rel = `${sub}/${e.name}`;
        if (e.isDirectory()) {
          if (e.name !== 'output') await walk(rel);
        } else if (!e.name.endsWith('.md')) {
          const t = (await readFile(resolve(dir, rel), 'utf8')).split('\r\n').join('\n');
          await writeFile(resolve(dir, rel), t.split('\n').join('\r\n'));
        }
      }
    };
    await walk('examples');
    assert.equal((await run([...RISKY, '--explain'], dir)).out, await saved('risky-explain.txt'));
    assert.equal((await run(CLEAN, dir)).out, await saved('clean.txt'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
