import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FILE_LIMITS, LIMITS, MAX_PROBLEMS, XmlError, parseXml, readManifest, readPlist, readResource } from '../src/index.js';
import { ANDROID, appManifest, cli, ios, manifest, plist, reportOf, rulesOf, run, withFiles } from './helpers.js';

// Hostile input: files built to exhaust the memory or the time, to make the tool expand an entity, fetch a document type
// or follow a link, to rewrite the terminal, to start a second workflow command or to change how objects behave. Each
// heavy test also checks the time, because work that grows faster than the input is a failure even when the answer is
// right. Tests that need a symbolic link, a device or file permissions are guarded with process.platform, and none of
// them asserts a line: lines are asserted in the tests that run everywhere.

const LIMIT = { timeout: 180000 };
// Coverage counting slows every line of the tool several times over, so a run with --experimental-test-coverage gets a
// wider time limit. A plain `npm test` keeps the tight one, and that is the run that guards against slow growth.
// The runner sets NODE_V8_COVERAGE for its test processes only when coverage is on.
const COVERAGE = Boolean(process.env.NODE_V8_COVERAGE);
const fast = async (fn, ms = 5000) => {
  const limit = COVERAGE ? ms * 4 : ms;
  const start = Date.now();
  const result = await fn();
  assert.ok(Date.now() - start < limit, `took ${Date.now() - start} ms`);
  return result;
};

const BAD = appManifest('android:debuggable="true"');
const GOOD = { 'p/AndroidManifest.xml': BAD };

test('hostile: a file over its size limit is an error finding, a configuration over its limit stops the run', LIMIT, async () => {
  const big = await fast(() => run({ 'q/AndroidManifest.xml': `<manifest>\n${' '.repeat(FILE_LIMITS.maxFileBytes)}</manifest>`, ...GOOD }, ['p', 'q']));
  assert.equal(big.code, 1);
  assert.match(big.out, /q\/AndroidManifest\.xml:1\n {11}the file cannot be read: [\d,]+ bytes is over the 4 MB limit; nothing in it is checked/);
  const config = await run({ ...GOOD, 'c.json': ' '.repeat(FILE_LIMITS.maxConfigBytes + 1) }, ['p', '--config', 'c.json']);
  assert.equal(config.code, 2);
  assert.match(config.err, /c\.json: [\d,]+ bytes is over the 1 MB limit/);
});

test('hostile: a billion laughs, an external entity and a parameter entity are refused without any expansion or fetch', LIMIT, async () => {
  const laughs = `<?xml version="1.0"?>\n<!DOCTYPE lolz [\n<!ENTITY lol "lol">\n${Array.from({ length: 9 }, (_, i) => `<!ENTITY lol${i + 1} "${`&lol${i === 0 ? '' : i};`.repeat(10)}">`).join('\n')}\n]>\n<plist version="1.0"><dict><key>NSCameraUsageDescription</key><string>&lol9;</string></dict></plist>\n`;
  const external = '<?xml version="1.0"?>\n<!DOCTYPE manifest [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>\n<manifest>&xxe;</manifest>\n';
  const parameter = '<!DOCTYPE plist [ <!ENTITY % remote SYSTEM "file:///nowhere/evil.dtd"> %remote; ]><plist/>';
  for (const text of [laughs, external, parameter]) await fast(() => assert.throws(() => parseXml(text), (e) => e instanceof XmlError && /internal subset/.test(e.reason)), 1000);
  const r = await run({ 'i/Info.plist': laughs, 'a/AndroidManifest.xml': external, 'a/res/xml/x.xml': parameter }, ['.']);
  assert.equal(r.code, 1);
  assert.deepEqual(r.out.match(/unparsable-file/g).length, 3, 'the two files and the rules line');
  assert.ok(!r.out.includes('lollol'));
  const entityOnly = '<plist version="1.0"><dict><key>NSCameraUsageDescription</key><string>&lol9;</string></dict></plist>';
  assert.throws(() => parseXml(entityOnly), /&lol9; is not one of the five of XML/);
});

test('hostile: a thousand manifests of fifty permissions each are read in seconds, and each rule lists at most its limit', LIMIT, async () => {
  const perms = Array.from({ length: 50 }, (_, i) => `<uses-permission android:name="android.permission.${i % 2 ? 'CAMERA' : 'READ_CONTACTS'}${i > 1 ? `_${i}` : ''}" />`).join('\n');
  const files = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`x/m${String(i).padStart(4, '0')}/AndroidManifest.xml`, manifest(perms, '<application android:debuggable="true" />')]));
  const r = await fast(() => run(files, ['x', '--json']), 60000);
  const json = JSON.parse(r.out);
  assert.equal(json.summary.manifests.length, 1000);
  assert.equal(json.findings.filter((f) => f.rule === 'debuggable').length, LIMITS.maxFindingsPerRule);
  assert.equal(json.totals.findings, 1000 * 4, 'two permissions, debuggable and backup in each');
  assert.ok(json.notes.some((n) => /findings past the limit of 500 per rule are counted but not listed/.test(n)));
});

test('hostile: long runs of brackets, quotes, ampersands, comment openers and attributes are read or refused in one pass', LIMIT, async () => {
  for (const text of [
    `<a>${'<'.repeat(500000)}`,
    `<a>${'&'.repeat(500000)}</a>`,
    `<a>${'&amp;'.repeat(200000)}</a>`,
    `<a x="${'&quot;'.repeat(200000)}"/>`,
    `<a>${'<!--'.repeat(300000)}`,
    `<a>${'<!-- x -->'.repeat(200000)}</a>`,
    `<a>${'<![CDATA['.repeat(200000)}`,
    `<a ${'x'.repeat(500000)}`,
    `<a>${'<b>'.repeat(200000)}`,
    `${'<?x'.repeat(200000)}`,
    `<!DOCTYPE a ${'"'.repeat(500001)}`,
    `<!DOCTYPE a ${'x'.repeat(500000)}`,
    `<a>${'</a>'.repeat(200000)}`,
    `<a>${'<b x="1"/>'.repeat(200000)}</a>`
  ]) {
    await fast(() => {
      try {
        parseXml(text);
      } catch (error) {
        assert.ok(error instanceof XmlError, error.message);
      }
    });
  }
});

test('hostile: wide and deep manifests, configs and property lists are read fast', LIMIT, async () => {
  const wide = manifest('<application android:allowBackup="false">', '<activity android:name=".A" android:exported="true" />'.repeat(100000), '</application>');
  const r = await fast(() => reportOf({ 'a/AndroidManifest.xml': wide }));
  assert.equal(r.totals.findings, 100000);
  const nested = `<network-security-config>${'<domain-config cleartextTrafficPermitted="true"><domain>a.test</domain>'.repeat(250)}${'</domain-config>'.repeat(250)}</network-security-config>`;
  assert.equal((await fast(() => readResource(parseXml(nested)))).domains.length, 250);
  const flat = `<network-security-config>${'<domain-config><domain>a.test</domain></domain-config>'.repeat(100000)}</network-security-config>`;
  assert.equal((await fast(() => readResource(parseXml(flat)))).domains.length, 100000);
  const keys = `<plist><dict>${Array.from({ length: 100000 }, (_, i) => `<key>K${i}UsageDescription</key><string>Reason number ${i} for the access.</string>`).join('')}</dict></plist>`;
  assert.equal((await fast(() => readPlist(parseXml(keys)))).value.length, 100000);
  await fast(() => assert.throws(() => readManifest(parseXml(`<manifest ${ANDROID}><a ${Array.from({ length: 300 }, (_, i) => `x${i}="1"`).join(' ')}/></manifest>`)), /more than 256 attributes/));
  const plistReport = await fast(() => reportOf(ios(keys.replace('<plist>', '<plist version="1.0">'))));
  assert.equal(plistReport.totals.findings, 100000 + 1);
});

test('hostile: a set with a hundred files of no kind the tool reads lists twenty problems and a count', LIMIT, async () => {
  const files = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`x/F${String(i).padStart(3, '0')}.txt`, 'x']));
  const r = await fast(() => run({ ...files, 'c.json': '{"files": ["*.txt"]}' }, ['x', '--config', 'c.json']));
  assert.equal(r.code, 2);
  assert.match(r.err, /the input has problems:/);
  assert.match(r.err, /\n {2}and 80 more\n$/);
  assert.equal(r.err.split('\n').filter((l) => l.startsWith('  x/')).length, MAX_PROBLEMS);
});

test('hostile: CRLF, CR and a byte order mark give the same report as LF', async () => {
  const files = {
    'a/AndroidManifest.xml': `<?xml version="1.0"?>\n<manifest ${ANDROID}>\n  <uses-permission\n    android:name="android.permission.CAMERA" />\n  <application android:networkSecurityConfig="@xml/n"\n    android:debuggable="true">\n  </application>\n</manifest>\n`,
    'a/res/xml/n.xml': '<network-security-config>\n<domain-config cleartextTrafficPermitted="true">\n<domain>a.test</domain>\n</domain-config>\n</network-security-config>\n',
    'i/Info.plist': '<?xml version="1.0"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "x.dtd">\n<plist version="1.0">\n<dict>\n<key>NSCameraUsageDescription</key>\n<string>Line one\nline two.</string>\n<!-- x\n-->\n</dict>\n</plist>\n'
  };
  const lf = await run(files, ['.', '--json']);
  assert.equal(lf.code, 1, lf.err);
  assert.equal(JSON.parse(lf.out).totals.findings, 6);
  for (const eol of ['\r\n', '\r']) {
    const changed = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, `${String.fromCharCode(0xfeff)}${v.split('\n').join(eol)}`]));
    const r = await run(changed, ['.', '--json']);
    const strip = (t) => t.split('Line one\\r\\nline two').join('Line one\\nline two').split('Line one\\rline two').join('Line one\\nline two').split('"Line one line two."').join('');
    assert.equal(strip(r.out), strip(lf.out), JSON.stringify(eol));
  }
});

test('hostile: control, escape and direction characters in file names, names and values never reach the reports', async () => {
  const esc = String.fromCharCode(27);
  const rlo = String.fromCharCode(0x202e);
  const ls = String.fromCharCode(0x2028);
  const files = { [`p${rlo}/AndroidManifest.xml`]: appManifest('', `<activity android:name=".A${esc}[2J${rlo}${ls}" android:exported="true" />`), [`q${rlo}/Info.plist`]: plist(`<key>NSCameraUsageDescription</key><string>Scan${esc}[1m a ${rlo}page${ls}.</string>`, `<key>CFBundleIdentifier</key><string>x${esc}y</string>`) };
  for (const format of ['text', 'json', 'github']) {
    const r = await run(files, ['.', '--format', format, ...(format === 'github' ? [] : ['--explain'])]);
    assert.equal(r.code, 0, r.err);
    for (const c of [esc, rlo, ls]) assert.ok(!r.out.includes(c) && !r.err.includes(c), `${format}: ${c.charCodeAt(0)}`);
  }
  const bad = await run({ [`bad${rlo}.txt`]: 'x' }, [`bad${rlo}.txt`]);
  assert.equal(bad.code, 2);
  assert.ok(!bad.err.includes(rlo));
});

test('hostile: a text cannot start a second workflow command', async () => {
  const r = await run({ 'p/AndroidManifest.xml': appManifest('', '<service android:name="%0A::error::x" android:exported="true" />', '<receiver android:name=".R&#10;::error file=x::y" android:exported="true" />') }, ['p', '--format', 'github']);
  const lines = r.out.trimEnd().split('\n');
  assert.ok(lines.every((l) => l.startsWith('::warning ') || l.startsWith('::notice ') || l.startsWith('mobile-manifest-check: ')), r.out);
  assert.ok(r.out.includes('%250A::error::x'));
  assert.equal(lines.length, 3);
});

test('hostile: constructor, toString and __proto__ as names, keys and values are only data', async () => {
  const r = reportOf({
    'a/AndroidManifest.xml': manifest('<permission android:name="__proto__" />', '<uses-permission android:name="__proto__" />', '<application android:allowBackup="false" android:networkSecurityConfig="@xml/__proto__">', '<service android:name="constructor" android:exported="true" android:permission="__proto__" />', '</application>'),
    'a/res/xml/__proto__.xml': '<network-security-config><domain-config cleartextTrafficPermitted="true"><domain>toString</domain></domain-config></network-security-config>',
    'i/Info.plist': plist('<key>__proto__</key><dict/><key>constructor</key><true/><key>toStringUsageDescription</key><string>toString</string>')
  });
  assert.deepEqual(rulesOf(r).sort(), ['cleartext-domain', 'exported-component', 'usage-description']);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  const cfg = await run({ ...GOOD, 'c.json': '{"rules": {"toString": "off"}, "placeholders": {"__proto__": []}}' }, ['p', '--config', 'c.json']);
  assert.equal(cfg.code, 2);
  assert.match(cfg.err, /"toString" is not a key of rules/);
  assert.match(cfg.err, /"__proto__" is not a key of placeholders/);
});

test('hostile: empty files of every kind are reported as files the reader refuses, without a crash', async () => {
  const r = await run({ 'a/AndroidManifest.xml': '', 'i/Info.plist': '', 'a/x/AndroidManifest.xml': '<manifest/>' }, ['.']);
  assert.equal(r.code, 1, r.err);
  assert.match(r.out, /\(3 files: 2 Android manifests, 1 Info\.plist\)/);
  assert.equal(r.out.match(/line 1, column 1: no root element; nothing in the file is checked/g).length, 2);
});

test('hostile: a file named through a symbolic link is refused, and a link inside a folder or as a resource is not followed', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows needs extra rights to make a symbolic link');
    return;
  }
  const withConfig = appManifest('android:networkSecurityConfig="@xml/n"');
  await withFiles({ 'x/AndroidManifest.xml': withConfig, 'secret/xml/n.xml': '<network-security-config><base-config cleartextTrafficPermitted="true"/></network-security-config>', 'secret/Info.plist': plist(), 'c.json': '{}' }, async (dir) => {
    await symlink(resolve(dir, 'x/AndroidManifest.xml'), resolve(dir, 'linked.xml'));
    await symlink(resolve(dir, 'x/AndroidManifest.xml'), resolve(dir, 'AndroidManifest.xml'));
    await symlink(resolve(dir, 'secret'), resolve(dir, 'x/inside'));
    await symlink(resolve(dir, 'secret/Info.plist'), resolve(dir, 'x/Info.plist'));
    await symlink(resolve(dir, 'c.json'), resolve(dir, 'c-link.json'));
    await symlink(resolve(dir, 'secret'), resolve(dir, 'x/res'));
    const r = await cli(['AndroidManifest.xml'], dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /AndroidManifest\.xml: is a symbolic link, which is not followed/);
    const c = await cli(['x', '--config', 'c-link.json'], dir);
    assert.equal(c.code, 2);
    assert.match(c.err, /is a symbolic link/);
    const walk = await cli(['x'], dir);
    assert.equal(walk.code, 1, walk.err);
    assert.match(walk.out, /\(2 files: 1 Android manifest, 1 XML resource\)/);
    assert.match(walk.out, /note: 3 symbolic links inside the folders were skipped, not followed/);
    assert.match(walk.out, /the file cannot be read: is in a folder that is a symbolic link, which is not followed/, 'a resource folder that is a link is not followed');
    assert.ok(!walk.out.includes('base-config cleartextTrafficPermitted'), 'the target is never read');
  });
});

test('hostile: a resource that is a symbolic link is an error, not read', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows needs extra rights to make a symbolic link');
    return;
  }
  await withFiles({ 'x/AndroidManifest.xml': appManifest('android:networkSecurityConfig="@xml/n"'), 'secret.xml': '<network-security-config><base-config cleartextTrafficPermitted="true"/></network-security-config>' }, async (dir) => {
    await mkdir(resolve(dir, 'x/res/xml'), { recursive: true });
    await symlink(resolve(dir, 'secret.xml'), resolve(dir, 'x/res/xml/n.xml'));
    const r = await cli(['x'], dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /unreadable-file +x\/res\/xml\/n\.xml/);
    assert.match(r.out, /the file cannot be read: is a symbolic link, which is not followed/);
    assert.ok(!r.out.includes('cleartext-traffic  '), 'the target is never read');
  });
});

test('hostile: a device named as a manifest or the configuration is refused', LIMIT, async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows has no /dev/zero to name as an input');
    return;
  }
  await withFiles(GOOD, async (dir) => {
    const config = await fast(() => cli(['p', '--config', '/dev/zero'], dir));
    assert.equal(config.code, 2);
    assert.match(config.err, /is not a regular file/);
    const input = await fast(() => cli(['/dev/zero'], dir));
    assert.equal(input.code, 2);
    assert.match(input.err, /is not a regular file|not a kind of file/);
  });
});

test('hostile: a file without read access is an error finding, and a folder without read access stops the run', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows does not take away read access with chmod');
    return;
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('the root user can read a file without read access');
    return;
  }
  await withFiles({ 'x/a/AndroidManifest.xml': BAD, 'x/b/AndroidManifest.xml': BAD, 'y/locked/AndroidManifest.xml': BAD, 'y/AndroidManifest.xml': BAD }, async (dir) => {
    await chmod(resolve(dir, 'x/a/AndroidManifest.xml'), 0o000);
    await chmod(resolve(dir, 'y/locked'), 0o000);
    try {
      const r = await cli(['x'], dir);
      assert.equal(r.code, 1);
      assert.match(r.out, /the file cannot be read: cannot be read \(EACCES\)/);
      const folder = await cli(['y'], dir);
      assert.equal(folder.code, 2);
      assert.match(folder.err, /y\/locked: cannot be read \(EACCES\)/);
    } finally {
      await chmod(resolve(dir, 'x/a/AndroidManifest.xml'), 0o644);
      await chmod(resolve(dir, 'y/locked'), 0o755);
    }
  });
});
