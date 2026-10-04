// The analysis of a run: each file read into its model (src/android.js, src/plist.js), the findings of every rule with
// their file, line and column, and a summary of every manifest and property list. A file that cannot be read, or that
// the XML reader refuses, is a finding of its own and nothing in it is checked. The XML resources a manifest names are
// found by their path, res/xml/<name>.xml next to the manifest, among the files of the run.

import { boolOf, checkManifest, readManifest, readResource, referencesOf } from './android.js';
import { checkPlist } from './ios.js';
import { lineStarts, positionOf } from './json.js';
import { readPlist } from './plist.js';
import { parseXml, XML_LIMITS, XmlError, xmlProblem } from './xml.js';
import { folderOf } from './words.js';

export const READ_LIMITS = { ...XML_LIMITS };

// The path a manifest gives to the XML resource it names, as the report shows paths: res/xml/<name>.xml in the folder
// of the manifest.
export const resourcePath = (manifest, name) => `${folderOf(manifest)}res/xml/${name}.xml`;

// One file read into its model: { file, kind, read: true, starts, model } or, when the XML reader refuses it,
// { file, kind, read: false, problem }.
export function readInput(text, file, kind, limits = READ_LIMITS) {
  const starts = lineStarts(text);
  try {
    const root = parseXml(text, limits);
    const model = kind === 'android-manifest' ? readManifest(root) : kind === 'android-resource' ? readResource(root) : readPlist(root);
    return { file, kind, read: true, starts, model };
  } catch (error) {
    if (!(error instanceof XmlError)) throw error;
    return { file, kind, read: false, starts, problem: xmlProblem(error, text) };
  }
}

// A file of the input that could not be read, with the reason.
export const unreadableInput = (file, kind, reason) => ({ file, kind, read: false, starts: [0], reason });

// The findings and the summary of the files of a run.
export function analyse(files, config) {
  const byFile = new Map(files.map((f) => [f.file, f]));
  const raw = [];
  const manifests = [];
  const plists = [];
  for (const f of files) {
    if (!f.read) {
      if (f.reason !== undefined) raw.push({ rule: 'unreadable-file', file: f.file, line: 1, column: 1, found: `the file cannot be read: ${f.reason}; nothing in it is checked` });
      else raw.push({ rule: 'unparsable-file', file: f.file, line: f.problem.line, column: f.problem.column, found: `${f.problem.text}; nothing in the file is checked` });
      continue;
    }
    if (f.kind === 'android-manifest') {
      const resourceOf = (ref) => {
        const r = byFile.get(resourcePath(f.file, ref.name));
        return r && r.kind === 'android-resource' ? { file: r.file, model: r.read ? r.model : null } : null;
      };
      const found = checkManifest(f.file, f.model, resourceOf);
      raw.push(...found);
      const m = f.model;
      const has = (rule) => found.some((x) => x.rule === rule);
      const backup = boolOf(m.application?.attrs.allowBackup ?? null);
      const debug = m.application?.attrs.debuggable ?? null;
      manifests.push({
        file: f.file,
        package: m.package,
        targetSdk: m.targetSdk?.value ?? null,
        permissions: [...new Set(m.permissions.map((p) => p.name))],
        sensitive: found.filter((x) => x.rule === 'dangerous-permission' || x.rule === 'restricted-permission').length,
        components: m.components.length,
        exported: m.components.filter((c) => boolOf(c.exported) === true || (c.exported === null && c.filters.length)).length,
        backup: !m.application ? 'no application' : backup === true ? 'on' : backup === false ? 'off' : m.application.attrs.allowBackup ? 'not literal' : 'on by default',
        cleartext: has('cleartext-traffic') ? 'app-wide' : has('cleartext-domain') ? 'some domains' : 'not permitted',
        debuggable: boolOf(debug) === true ? 'yes' : debug && boolOf(debug) === null ? 'not literal' : 'no',
        resources: referencesOf(m).map((r) => ({ use: r.use, name: r.name, file: r.plain ? resourcePath(f.file, r.name) : null, found: r.plain && byFile.has(resourcePath(f.file, r.name)) }))
      });
    } else if (f.kind === 'ios-plist') {
      const { findings, summary } = checkPlist(f.file, f.model, config);
      raw.push(...findings);
      plists.push({ file: f.file, ...summary });
    }
  }
  // The place of every finding that holds an offset, in the lines of its own file; the same finding reached through
  // two manifests is kept once.
  const seen = new Set();
  const findings = [];
  for (const x of raw) {
    let { line, column } = x;
    if (x.offset !== undefined) ({ line, column } = positionOf(byFile.get(x.file).starts, x.offset));
    const key = `${x.rule}\u0000${x.file}\u0000${line}\u0000${column}\u0000${x.found}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ rule: x.rule, file: x.file, line, column, found: x.found });
  }
  return { findings, summary: { manifests, plists } };
}
