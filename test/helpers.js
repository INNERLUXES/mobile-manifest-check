// Shared test helpers: apps built inline, checked in memory or written into a temporary folder that is removed after
// the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux, macOS and Windows.
// The line a test expects is found with lineOf(), which counts lines the way the tool does, so a test never holds a
// line number worked out by hand for one system only. No test reads the clock, the time zone or the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { buildReport, defaultConfig, fileKind, lineStarts, main, positionOf, readConfig, readInput } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'mobile-manifest-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function offsetOf(text, needle, n) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return at;
}

// The line (from 1) of the n-th place where needle starts in text.
export const lineOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).line;

// The column (from 1) of the n-th place where needle starts in text.
export const columnOf = (text, needle, n = 1) => positionOf(lineStarts(text), offsetOf(text, needle, n)).column;

// The configuration of a configuration object, through the real reader, or the defaults.
export const configOf = (object = null) => (object === null ? defaultConfig() : readConfig(JSON.stringify(object), 'config.json'));

// The report object of files checked in memory: an object of path to text, with a configuration object or none. A file
// under res/xml/ is read as an XML resource; any other file by its kind.
export function reportOf(sources, config = null, { minSeverity = 'info', failOn = 'error' } = {}) {
  const cfg = configOf(config);
  const files = Object.entries(sources).map(([file, text]) => readInput(text, file, file.includes('res/xml/') ? 'android-resource' : fileKind(file)));
  return buildReport({ input: { paths: Object.keys(sources), skippedLinks: 0 }, files, config: cfg, minSeverity, failOn, version: 'test' });
}

// The findings of a report, of one rule or of all.
export const findingsOf = (r, rule) => r.findings.filter((f) => !rule || f.rule === rule);

// The rule ids of the findings of a report, in order.
export const rulesOf = (r) => r.findings.map((f) => f.rule);

export const ANDROID = 'xmlns:android="http://schemas.android.com/apk/res/android"';

// A manifest with these lines inside <manifest>, as app/AndroidManifest.xml.
export const manifest = (...lines) => `<manifest ${ANDROID} package="example.app">\n${lines.join('\n')}\n</manifest>\n`;

// A manifest with these lines inside its <application>, with backups off so that only the lines are reported.
export const appManifest = (attrs, ...lines) => manifest(`<application android:allowBackup="false"${attrs ? ` ${attrs}` : ''}>`, ...lines, '</application>');

// The files of a manifest, at app/AndroidManifest.xml, with resources at app/res/xml/<name>.xml.
export const android = (text, resources = {}) => ({ 'app/AndroidManifest.xml': text, ...Object.fromEntries(Object.entries(resources).map(([k, v]) => [`app/res/xml/${k}.xml`, v])) });

// An Info.plist with these lines inside its top <dict>, with the encryption key set so that only the lines are
// reported.
export const plist = (...lines) => `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n<key>ITSAppUsesNonExemptEncryption</key><false/>\n${lines.join('\n')}\n</dict>\n</plist>\n`;

// The files of an Info.plist, at App/Info.plist.
export const ios = (text) => ({ 'App/Info.plist': text });

// The rule ids of the findings of a set of files, sorted.
export const rulesIn = (files, config = null) => rulesOf(reportOf(files, config)).sort();

// Writes the files and runs the command line with these arguments (paths relative to the folder).
export async function run(files, args = [], limits) {
  return withFiles(files, async (dir) => {
    let out = '';
    let err = '';
    const code = await main(args, { out: (t) => { out += t; }, err: (t) => { err += t; } }, limits, dir);
    return { code, out, err, dir };
  });
}

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, dir) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, dir);
  return { code, out, err };
}
