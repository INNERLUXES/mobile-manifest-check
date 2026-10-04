// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// apps to examples/output. CI runs it and then fails if those files changed, so the example output in the repository is
// always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const RISKY = ['examples/risky', '--config', 'examples/config.json'];
export const CLEAN = ['examples/clean'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the risky app: the counts, one finding of every rule that fires, the summary and the result.
export const EXPECTED = [
  'input: examples/risky (5 files: 1 Android manifest, 2 XML resources, 2 Info.plist files)',
  'findings: 37 (11 error, 16 warning, 10 info)',
  'android:debuggable="true" on <application>',
  'android:usesCleartextTraffic="true": every connection of the app may use cleartext HTTP',
  '<activity android:name=".DeepLinkActivity"> has an <intent-filter> and no android:exported',
  '<base-config cleartextTrafficPermitted="true">',
  'NSMicrophoneUsageDescription (microphone) holds the placeholder "TODO"',
  'NSContactsUsageDescription (contacts) is empty',
  'NSPhotoLibraryUsageDescription (photo library) holds the placeholder "Coming soon."',
  'UIBackgroundModes holds location, but NSLocationWhenInUseUsageDescription (location while in use) is missing',
  'UIRequiredDeviceCapabilities requires bluetooth-le, but NSBluetoothAlwaysUsageDescription (Bluetooth) is missing',
  'NSAllowsArbitraryLoads is true',
  'a document type declaration with an internal subset, where entities are declared; the reader refuses it',
  'android.permission.ACCESS_BACKGROUND_LOCATION is requested',
  'android.permission.READ_SMS is requested',
  'android.permission.QUERY_ALL_PACKAGES is requested',
  'android:allowBackup is not set, and it is true by default',
  '<activity android:name=".ShareTideActivity"> is exported with no permission',
  'which this manifest declares with protection level normal',
  'names @xml/photo_paths, but res/xml/photo_paths.xml is not next to this manifest',
  '<provider android:name=".TideLogProvider"> is exported with a permission for only one of reading and writing',
  '<grant-uri-permission android:pathPrefix="/">',
  '<certificates src="user"/> in the base-config',
  'permits cleartext traffic to tiles.tidepool.test and its subdomains',
  '<external-path name="everything" path="."> shares the whole external storage',
  '<root-path name="root" path=""> shares the root of the device file system',
  'NSAllowsArbitraryLoadsInWebContent is true',
  'NSExceptionAllowsInsecureHTTPLoads is true for legacy.tidepool.test and its subdomains',
  'NSExceptionMinimumTLSVersion is TLSv1.0 for legacy.tidepool.test',
  'android.permission.WRITE_EXTERNAL_STORAGE is requested: a dangerous permission (shared storage) that the user grants at run time; requested up to API level 28 only',
  'android.permission.SYSTEM_ALERT_WINDOW is requested: a special permission (drawing over other apps)',
  'android.permission.RECORD_AUDIO is requested',
  'ITSAppUsesNonExemptEncryption is not set',
  'NSCameraUsageDescription (camera): "Take a photo of the shore to add it to a tide entry."',
  'UIFileSharingEnabled is true',
  'MASVS-NETWORK (Network Communication): 9 findings',
  'RESULT: FAIL - 27 findings at or above warning (11 error, 16 warning, 10 info)'
];
// The launcher activity, the receiver guarded by a system permission, the debug overrides, the domain with cleartext
// off, the exception domain with TLS 1.2, the settings that are false, the comments, INTERNET and the build output and
// Pods folder that the default exclude patterns leave out are not reported.
export const UNWANTED = ['RESULT: PASS', '.MainActivity', '.BootReceiver', '.SettingsActivity', '.OldActivity', 'api.tidepool.test', 'LSSupportsOpeningDocumentsInPlace', 'NSAllowsArbitraryLoadsForMedia', 'android.permission.INTERNET', 'intermediates', 'Pods/'];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const risky = await run(RISKY);
  process.stdout.write(risky.out);
  expect('risky app', risky, 1, EXPECTED, UNWANTED);

  const clean = await run(CLEAN);
  expect('clean app', clean, 0, ['input: examples/clean (4 files: 1 Android manifest, 2 XML resources, 1 Info.plist)', 'findings: 2 (2 info)', 'NSCameraUsageDescription (camera): "Scan a page from a paper notebook into a note."', 'RESULT: PASS - no finding at or above error (2 info)'], ['  WARNING  ', '  ERROR  ', 'RESULT: FAIL']);

  // Without the configuration the placeholder the configuration adds is a usage description, and only errors fail.
  expect('risky, built-in configuration', await run(['examples/risky']), 1, ['config: built-in defaults:', 'NSPhotoLibraryUsageDescription (photo library): "Coming soon."', 'RESULT: FAIL - 10 findings at or above error'], []);
  // The clean app passes when warnings fail the run too.
  expect('clean, fail on warning', await run([...CLEAN, '--fail-on', 'warning']), 0, ['RESULT: PASS - no finding at or above warning'], []);
  // Only the errors can be shown, and one file can be named on its own.
  expect('risky, errors only', await run([...RISKY, '--min-severity', 'error']), 1, ['findings: 11 (11 error); 26 below error not shown'], ['  INFO  ', '  WARNING  ']);
  expect('risky, one file', await run(['examples/risky/ios/Tidepool/Info.plist']), 1, ['mobile-manifest-check: examples/risky/ios/Tidepool/Info.plist', 'findings: 13 (5 error, 3 warning, 5 info)'], []);
  // A file of no kind the tool reads stops the run.
  expect('risky, a README named', await run(['examples/risky/README.md']), 2, ['examples/risky/README.md: not a kind of file the tool reads'], [], 'err');

  // The README shows the whole report of the risky app, the --explain lines of one finding, the GitHub annotations of
  // two findings and the report of the clean app.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  if (!readme.includes(risky.out)) problems.push('README: the sample output of the risky app differs from a real run');
  if (!readme.includes(clean.out)) problems.push('README: the sample output of the clean app differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/risky.txt'), risky.out);
  await writeFile(resolve(root, 'examples/output/clean.txt'), clean.out);
  const explain = await run([...RISKY, '--explain']);
  if (explain.code !== 1) problems.push(`explain: exit code ${explain.code}, expected 1`);
  const lines = explain.out.split('\n');
  const at = lines.findIndex((l) => l.includes('cleartext-domain') && l.includes('network_security_config.xml:'));
  const sample = lines.slice(at, at + 9).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the --explain sample of the cleartext domain differs from a real run');
  await writeFile(resolve(root, 'examples/output/risky-explain.txt'), explain.out);
  const github = await run([...RISKY, '--format', 'github']);
  if (github.code !== 1) problems.push(`github: exit code ${github.code}, expected 1`);
  const picked = github.out.split('\n').filter((x) => x.includes('title=mobile-manifest-check missing-exported::') || x.includes('title=mobile-manifest-check ats-arbitrary-loads::'));
  if (picked.length !== 2) problems.push('github: the sample lines are not in the output');
  for (const l of picked) if (!readme.includes(l)) problems.push('README: the GitHub sample differs from a real run');
  await writeFile(resolve(root, 'examples/output/risky-github.txt'), github.out);
  const json = await run([...RISKY, '--json', '--explain']);
  if (json.code !== 1) problems.push(`json: exit code ${json.code}, expected 1`);
  await writeFile(resolve(root, 'examples/output/risky.json'), json.out);
  const defaults = await run(['--print-defaults']);
  if (defaults.code !== 0) problems.push(`--print-defaults: exit code ${defaults.code}, expected 0`);
  await writeFile(resolve(root, 'examples/output/defaults.json'), defaults.out);

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
