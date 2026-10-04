import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { KIND_NAMES, NOTICE, USAGE, VERSION, escapeData, escapeProperty, masvsSummary, parseArgs, toGithub, toJson, toText } from '../src/index.js';
import { appManifest, cli, columnOf, ios, lineOf, manifest, plist, reportOf, run, withFiles } from './helpers.js';

const CLEAN = { 'app/src/main/AndroidManifest.xml': appManifest('', '<activity android:name=".A" android:exported="false" />') };
const RISKY = { 'app/src/main/AndroidManifest.xml': appManifest('', '<activity android:name=".A" android:exported="true" />') };
const BROKEN = { 'app/src/main/AndroidManifest.xml': '<manifest>\n<application>\n</manifest>\n' };

test('cli: exit 0 below the fail-on level, 1 at or above it, from the flag or the configuration', async () => {
  const clean = await run(CLEAN, ['app']);
  assert.equal(clean.code, 0, clean.err);
  assert.match(clean.out, /^mobile-manifest-check: app\ninput: app \(1 file: 1 Android manifest\)\nconfig: built-in defaults: 3 file patterns, 5 exclude patterns, 17 placeholders; minimum severity info; fail on error\nrules: dangerous-permission \(info\); /);
  assert.match(clean.out, /RESULT: PASS - no finding at or above error\n$/);
  assert.match(clean.out, /note: no Info\.plist was read, so no iOS rule ran\n/);
  assert.equal(clean.err, '');
  const risky = await run(RISKY, ['app']);
  assert.equal(risky.code, 0, 'a warning does not fail the run by default');
  assert.equal((await run(RISKY, ['app', '--fail-on', 'warning'])).code, 1);
  assert.equal((await run({ ...CLEAN, 'ios/Info.plist': plist() }, ['.', '--fail-on', 'info'])).code, 0, 'nothing at all to report');
  const configured = await run({ ...RISKY, 'c.json': '{"failOn": "warning"}' }, ['app', '--config', 'c.json']);
  assert.equal(configured.code, 1);
  assert.match(configured.out, /RESULT: FAIL - 1 finding at or above warning \(1 warning\)\n$/);
  assert.equal((await run({ ...RISKY, 'c.json': '{"failOn": "warning"}' }, ['app', '--config', 'c.json', '--fail-on', 'error'])).code, 0, 'the flag wins over the configuration');
  const broken = await run(BROKEN, ['app']);
  assert.equal(broken.code, 1, 'a file that cannot be parsed fails the run at the default level');
  assert.match(broken.out, /ERROR {4}unparsable-file {12}app\/src\/main\/AndroidManifest\.xml:3\n {11}line 3, column 1: the end tag <\/manifest> does not match <application>; nothing in the file is checked/);
});

test('cli: a manifest reads its resources next to it, once, and an iOS app and an Android app are read together', async () => {
  const files = {
    'a/src/main/AndroidManifest.xml': appManifest('android:networkSecurityConfig="@xml/nsc"'),
    'a/src/main/res/xml/nsc.xml': '<network-security-config><base-config cleartextTrafficPermitted="true" /></network-security-config>',
    'a/src/main/res/xml/other.xml': '<not-read />',
    'i/App/Info.plist': plist(),
    'i/Old-Info.plist': plist()
  };
  const r = await run(files, ['a', 'i', 'a/src/main/AndroidManifest.xml', '--json']);
  assert.equal(r.code, 1, r.err);
  const json = JSON.parse(r.out);
  assert.deepEqual(json.input.paths, ['a', 'i', 'a/src/main/AndroidManifest.xml']);
  assert.deepEqual(json.input.files.map((f) => [f.file, f.kind]), [['a/src/main/AndroidManifest.xml', 'android-manifest'], ['a/src/main/res/xml/nsc.xml', 'android-resource'], ['i/App/Info.plist', 'ios-plist'], ['i/Old-Info.plist', 'ios-plist']]);
  assert.deepEqual(json.findings.map((f) => [f.rule, f.file]), [['cleartext-traffic', 'a/src/main/res/xml/nsc.xml']]);
  assert.deepEqual(json.summary.manifests[0].resources, [{ use: 'network', name: 'nsc', file: 'a/src/main/res/xml/nsc.xml', found: true }]);
});

test('cli: build output, Pods and dependency folders are not read, and the patterns of the configuration are', async () => {
  const bad = appManifest('android:debuggable="true"');
  const files = { ...CLEAN, 'app/build/AndroidManifest.xml': bad, 'ios/Pods/X/Info.plist': '<plist/>', 'app/node_modules/x/AndroidManifest.xml': bad, 'app/.gradle/AndroidManifest.xml': bad, 'app/notes.md': 'x', 'app/src/debug/AndroidManifest.xml': bad };
  const r = await run(files, ['.', '--json']);
  assert.deepEqual(JSON.parse(r.out).input.files.map((f) => f.file), ['app/src/debug/AndroidManifest.xml', 'app/src/main/AndroidManifest.xml']);
  const only = await run({ ...files, 'c.json': '{"files": ["**/main/AndroidManifest.xml"], "exclude": []}' }, ['app', '--config', 'c.json', '--json']);
  assert.deepEqual(JSON.parse(only.out).input.files.map((f) => f.file), ['app/src/main/AndroidManifest.xml']);
  const named = await run(files, ['app/build/AndroidManifest.xml']);
  assert.match(named.out, /input: app\/build\/AndroidManifest\.xml \(1 file: 1 Android manifest\)/, 'a file named directly is read even when a pattern leaves it out');
});

test('cli: exit 2 for usage errors, with the usage and nothing on standard output', async () => {
  for (const [args, message] of [
    [[], /give the app to check: a folder, or AndroidManifest\.xml and Info\.plist files/],
    [['app', 'app'], /app is named twice/],
    [['app', '--bogus'], /unknown argument --bogus/],
    [['app', '--format', 'csv'], /unknown format csv \(text, json or github\)/],
    [['app', '--format', 'json', '--format', 'text'], /--format was given twice/],
    [['app', '--json', '--format', 'github'], /--json and --format github ask for two formats; give one/],
    [['app', '--min-severity', 'notice'], /--min-severity: unknown level notice \(info, warning, error\)/],
    [['app', '--fail-on', 'fatal'], /--fail-on: unknown level fatal/],
    [['app', '--fail-on', 'error', '--fail-on', 'info'], /--fail-on was given twice/],
    [['app', '--config'], /--config needs a value/],
    [['app', '--config', '--json'], /--config needs a value/],
    [['app', '--explain', '--format', 'github'], /--explain adds the sources of each finding to the text and JSON reports; the github format has no place for them/],
    [['-'], /reading from standard input is not supported/],
    [['app', '--config', '-'], /reading from standard input is not supported/],
    [['https://example.com/app'], /give a local path; the tool never fetches a URL/],
    [['app', '--config', 'file://c.json'], /give a local path/]
  ]) {
    const r = await run(CLEAN, args);
    assert.equal(r.code, 2, args.join(' '));
    assert.match(r.err, message, args.join(' '));
    assert.ok(r.err.includes('Usage: mobile-manifest-check'), args.join(' '));
    assert.equal(r.out, '');
  }
  assert.throws(() => parseArgs(Array.from({ length: 101 }, (_, i) => `p${i}`)), /more than 100 paths/);
});

test('cli: exit 2 for input errors, with the problems and no result', async () => {
  for (const [files, args, message] of [
    [CLEAN, ['missing'], /missing: no such file/],
    [{ ...CLEAN, 'empty/notes.md': 'x' }, ['empty'], /empty: no file in this folder matches \*\*\/AndroidManifest\.xml/],
    [{ 'a.xml': '<a/>' }, ['a.xml'], /a\.xml: not a kind of file the tool reads \(AndroidManifest\.xml, Info\.plist or a name ending in -Info\.plist\)/],
    [{ 'info.plist': '<plist/>' }, ['info.plist'], /info\.plist: not a kind of file the tool reads/],
    [{ ...CLEAN, 'c.json': '{"exlude": []}' }, ['app', '--config', 'c.json'], /c\.json: line 1: "exlude" is not a key of the configuration; did you mean "exclude"\?/],
    [{ ...CLEAN, 'c.json': '{"files": ["**/*.md"]}', 'app/x.md': 'x' }, ['app', '--config', 'c.json'], /app\/x\.md: not a kind of file the tool reads/],
    [CLEAN, ['app', '--config', 'nope.json'], /nope\.json: no such file/],
    [CLEAN, ['app', '--config', 'app'], /app: is a folder; give the file itself/]
  ]) {
    const r = await run(files, args);
    assert.equal(r.code, 2, `${args.join(' ')}: ${r.err}`);
    assert.match(r.err, /^mobile-manifest-check: no result, the input has (?:a problem|problems):\n/);
    assert.match(r.err, message);
    assert.equal(r.out, '');
  }
});

test('cli: a binary plist, a binary, UTF-16 or invalid UTF-8 file is an error finding, and the rest is still read', async () => {
  const r = await run({ ...RISKY, 'i/Info.plist': Buffer.from('bplist00x'), 'j/Info.plist': Buffer.from([0x3c, 0, 0x61]), 'k/Info.plist': Buffer.from([0xff, 0xfe, 0x3c, 0]), 'l/Info.plist': Buffer.from([0x3c, 0x61, 0xe9, 0x3e]) }, ['.']);
  assert.equal(r.code, 1);
  assert.match(r.out, /i\/Info\.plist:1\n {11}the file cannot be read: is a binary property list, which is not read; convert it to XML with plutil -convert xml1 and check that copy; nothing in it is checked/);
  assert.match(r.out, /the file cannot be read: holds binary data \(a null byte\); only text is read/);
  assert.match(r.out, /the file cannot be read: is UTF-16; only UTF-8 is read/);
  assert.match(r.out, /the file cannot be read: is not valid UTF-8; only UTF-8 text is read/);
  assert.match(r.out, /<activity android:name="\.A"> is exported with no permission/);
  const big = await run(RISKY, ['app'], { maxFileBytes: 10 });
  assert.match(big.out, /the file cannot be read: \d+ bytes is over the 10 byte limit/);
  const one = appManifest('android:networkSecurityConfig="@xml/n"').length;
  const total = await run({ 'x/AndroidManifest.xml': appManifest(''), 'y/AndroidManifest.xml': appManifest('') }, ['x', 'y'], { maxTotalBytes: one });
  assert.equal(total.code, 2);
  assert.match(total.err, /y\/AndroidManifest\.xml: the files read so far hold more than [\d,]+ bytes, the limit of one run/);
  const resource = await run({ 'x/AndroidManifest.xml': appManifest('android:networkSecurityConfig="@xml/n"'), 'x/res/xml/n.xml': '<network-security-config/>' }, ['x'], { maxTotalBytes: one + 5 });
  assert.equal(resource.code, 2);
  assert.match(resource.err, /x\/res\/xml\/n\.xml: the files read so far hold more than [\d,]+ bytes/);
});

test('cli: --help, --version and --print-defaults', async () => {
  const help = await cli(['--help'], '.');
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const s of ['--fail-on', '--min-severity', '--format', 'github', 'debuggable (rules.debuggable)', 'unparsable-file (always error)', 'Exit codes: 0 no finding at or above the fail-on level']) assert.ok(USAGE.includes(s), s);
  const version = await cli(['--version'], '.');
  assert.equal(version.out, `${VERSION}\n`);
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  const defaults = await cli(['--print-defaults'], '.');
  assert.equal(defaults.code, 0);
  assert.deepEqual(Object.keys(JSON.parse(defaults.out)), ['name', 'files', 'exclude', 'rules', 'placeholders', 'minSeverity', 'failOn']);
});

test('text: the findings with the fix and the MASVS controls, --explain with the rule and its sources, and the summary', () => {
  const r = reportOf({ ...RISKY, ...ios(plist('<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><true/></dict>')) });
  const text = toText(r);
  assert.match(text, /\n {2}WARNING {2}exported-component {9}app\/src\/main\/AndroidManifest\.xml:3\n {11}<activity android:name="\.A"> is exported with no permission: any app can start it\n {11}fix: set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature\n {11}masvs: MASVS-PLATFORM-1\n/);
  assert.ok(text.includes('Android manifests\n\n  file                              package      target   permissions  sensitive  exported  backup  cleartext      debuggable\n  app/src/main/AndroidManifest.xml  example.app  not set  0            0          1 of 1    off     not permitted  no\n'));
  assert.ok(text.includes('iOS property lists\n\n  file            bundle id  usage descriptions  arbitrary loads  exception domains  background modes\n  App/Info.plist  -          0                   yes              0                  none\n'));
  assert.ok(text.includes('OWASP MASVS groups of the findings\n\n  MASVS-NETWORK (Network Communication): 1 finding\n    MASVS-NETWORK-1, the app secures all of its network traffic with current good practice: 1\n  MASVS-PLATFORM (Platform Interaction): 1 finding\n'));
  assert.ok(text.includes(NOTICE));
  assert.ok(!text.includes('basis:'));
  const explained = toText(r, { explain: true });
  assert.match(explained, /\n {11}rule: an app component with android:exported="true" and no permission that other apps must hold\n {11}basis: an exported activity can be started .+ \(<activity> \(Android Developers\), https:\/\/developer\.android\.com\/guide\/topics\/manifest\/activity-element\)\n/);
  assert.match(explained, /the tool's own choice: an activity, activity-alias, service, receiver or provider/);
  const empty = toText(reportOf({ 'x/AndroidManifest.xml': '<manifest/>' }));
  assert.ok(empty.includes('Findings (0)\n\n  none\n'));
  assert.ok(empty.includes('iOS property lists\n\n  none\n'));
  assert.ok(empty.includes('OWASP MASVS groups of the findings\n\n  none\n'));
  assert.deepEqual(KIND_NAMES['ios-plist'], ['Info.plist', 'Info.plist files']);
});

test('text: the resources of a manifest, found, not found and not plain', () => {
  const r = reportOf({ 'm/AndroidManifest.xml': appManifest('android:networkSecurityConfig="@xml/n"', '<provider android:name=".P" android:authorities="p" android:exported="false"><meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/../x" /></provider>', '<provider android:name=".Q" android:authorities="q" android:exported="false"><meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/q" /></provider>'), 'm/res/xml/q.xml': '<paths><files-path name="a" path="a/" /></paths>' });
  const text = toText(r);
  assert.ok(text.includes('  @xml/n (network security config) of m/AndroidManifest.xml: m/res/xml/n.xml not found\n  @xml/../x (FileProvider paths) of m/AndroidManifest.xml: not a plain resource name\n  @xml/q (FileProvider paths) of m/AndroidManifest.xml: m/res/xml/q.xml\n'));
});

test('json: the whole report, without the sources unless --explain', () => {
  const r = reportOf(RISKY);
  const json = JSON.parse(toJson(r));
  assert.deepEqual(Object.keys(json), ['tool', 'version', 'input', 'config', 'findings', 'summary', 'totals', 'result', 'notes', 'notice']);
  assert.equal(json.findings[0].basis, undefined);
  assert.deepEqual(Object.keys(json.findings[0]), ['rule', 'level', 'platform', 'masvs', 'file', 'line', 'column', 'at', 'found', 'fix']);
  assert.deepEqual(json.findings[0].masvs, ['MASVS-PLATFORM-1']);
  assert.deepEqual(Object.keys(json.summary), ['manifests', 'plists', 'masvs']);
  assert.ok(JSON.parse(toJson(r, { explain: true })).findings[0].basis.length > 0);
  assert.deepEqual(json.result, { pass: true, failOn: 'error', failing: 0, byLevel: { error: 0, warning: 1, info: 0 }, text: 'PASS - no finding at or above error (1 warning)' });
  assert.deepEqual(masvsSummary([{ masvs: ['MASVS-STORAGE-2', 'MASVS-PLATFORM-1'] }, { masvs: ['MASVS-PLATFORM-1'] }]).map((g) => [g.group, g.findings]), [['MASVS-STORAGE', 1], ['MASVS-PLATFORM', 2]]);
});

test('github: one workflow command per finding, info as notice, with its properties and message escaped', () => {
  const text = manifest('<uses-permission android:name="android.permission.CAMERA" />', '<application android:allowBackup="false">', '<activity android:name=".100%\n::error" android:exported="true" />', '</application>');
  const r = reportOf({ 'a,b:c/AndroidManifest.xml': text });
  const out = toGithub(r);
  const lines = out.trimEnd().split('\n');
  assert.equal(lines[0], `::warning file=a%2Cb%3Ac/AndroidManifest.xml,line=${lineOf(text, 'android:exported')},col=${columnOf(text, 'android:exported')},title=mobile-manifest-check exported-component::<activity android:name=".100%25 ::error"> is exported with no permission: any app can start it; fix: set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature; MASVS-PLATFORM-1`);
  assert.match(lines[1], /^::notice file=a%2Cb%3Ac\/AndroidManifest\.xml,line=\d+,col=1,title=mobile-manifest-check dangerous-permission::android\.permission\.CAMERA is requested/);
  assert.equal(lines[2], 'mobile-manifest-check: a,b:c/AndroidManifest.xml: 1 file, 1 Android manifest, 0 Info.plist files, 2 findings; RESULT: PASS - no finding at or above error (1 warning, 1 info)');
  assert.equal(escapeData('a%\r\nb'), 'a%25%0D%0Ab');
  assert.equal(escapeProperty('a:b,c'), 'a%3Ab%2Cc');
});

test('cli: a run writes nothing to disk', async () => {
  await withFiles(RISKY, async (dir) => {
    const before = await readdir(resolve(dir), { recursive: true });
    for (const format of ['text', 'json', 'github']) assert.equal((await cli(['app', '--format', format], dir)).code, 0);
    assert.deepEqual(await readdir(resolve(dir), { recursive: true }), before);
  });
});
