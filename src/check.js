// A run: read the configuration, the manifests, the XML resources they name and the property lists, run the checks, and
// build the report of the run. A path on the command line that cannot be used (missing, a link, a folder with no file
// to read, a file of no kind the tool reads), a configuration with a problem, or input past the limit of a run stops
// the run with an InputError and no result. A file of the input that cannot be read, or that the XML reader refuses, is
// an error finding of its own, so the run fails at the default level and never passes because a part of the input was
// passed over.

import { dirname, resolve } from 'node:path';
import { READ_LIMITS, analyse, readInput, resourcePath, unreadableInput } from './analyse.js';
import { referencesOf } from './android.js';
import { ConfigError, defaultConfig, readConfig } from './config.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, collectFiles, readText, readTextFile, resourceState } from './files.js';
import { KINDS, fileKind } from './kinds.js';
import { MASVS_GROUPS, groupOf, masvsControl } from './masvs.js';
import { RULES, atOrAbove, decide } from './rules.js';
import { grouped, plural } from './size.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS, ...READ_LIMITS, maxFindingsPerRule: 500 };
export const MAX_PROBLEMS = 20;

export class InputError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.problems = problems;
  }
}

// A copy of a value with every text in it cleaned by safeText, for the parts of the report that come from the input.
export function cleanTexts(value) {
  if (typeof value === 'string') return safeText(value, 300);
  if (Array.isArray(value)) return value.map(cleanTexts);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanTexts(v)]));
  return value;
}

// A list of problems for an error message: the first twenty, then a count.
export function capped(problems) {
  return problems.length > MAX_PROBLEMS ? [...problems.slice(0, MAX_PROBLEMS), `and ${grouped(problems.length - MAX_PROBLEMS)} more`] : problems;
}

// The level of a rule under a configuration: the rules of input problems are always errors.
export const levelOf = (rule, config) => (rule.key === null ? 'error' : config.rules[rule.key]);

// The MASVS groups of the findings shown: [{ group, title, url, findings, controls: [{ id, text, findings }] }], in
// the order of the MASVS, with only the groups that have a finding.
export function masvsSummary(findings) {
  const out = [];
  for (const g of MASVS_GROUPS) {
    const mine = findings.filter((f) => f.masvs.some((c) => groupOf(c) === g.id));
    if (!mine.length) continue;
    const ids = [...new Set(mine.flatMap((f) => f.masvs.filter((c) => groupOf(c) === g.id)))].sort();
    out.push({ group: g.id, title: g.title, url: g.url, findings: mine.length, controls: ids.map((id) => ({ id, text: masvsControl(id).text, findings: mine.filter((f) => f.masvs.includes(id)).length })) });
  }
  return out;
}

// The run as a report object, from the files that were read and the configuration.
export function buildReport({ input, files, config, minSeverity, failOn, version, limits = LIMITS }) {
  const { findings: raw, summary } = analyse(files, config);
  const ruleOrder = new Map(RULES.map((r, i) => [r.id, i]));
  const fileOrder = new Map(files.map((f, i) => [f.file, i]));
  const level = (id) => levelOf(RULES.find((r) => r.id === id), config);
  const order = (a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level) || fileOrder.get(a.file) - fileOrder.get(b.file) || a.line - b.line || a.column - b.column || ruleOrder.get(a.rule) - ruleOrder.get(b.rule);
  const all = raw.filter((f) => level(f.rule) !== 'off').map((f) => ({ ...f, level: level(f.rule) })).sort(order);
  const shown = all.filter((f) => atOrAbove(f.level, minSeverity));
  const hidden = all.length - shown.length;
  const perRule = new Map();
  const findings = [];
  let cut = 0;
  for (const f of shown) {
    const n = (perRule.get(f.rule) ?? 0) + 1;
    perRule.set(f.rule, n);
    if (n > limits.maxFindingsPerRule) cut += 1;
    else {
      const rule = RULES.find((r) => r.id === f.rule);
      const file = safeText(f.file);
      findings.push({
        rule: f.rule,
        level: f.level,
        platform: rule.platform,
        masvs: rule.masvs,
        file,
        line: f.line,
        column: f.column,
        at: `${file}:${f.line}`,
        found: safeText(f.found, 600),
        fix: rule.fix,
        basis: rule.basis.map((k) => ({ text: POINTS[k].text, source: pointPage(k).title, url: pointPage(k).url })),
        own: rule.own
      });
    }
  }
  // The result counts every finding at or above the minimum severity, including the ones past the limit of a rule.
  const result = decide(shown, failOn);
  const notes = [];
  if (input.skippedLinks) notes.push(`${plural(input.skippedLinks, 'symbolic link')} inside the folders ${input.skippedLinks === 1 ? 'was' : 'were'} skipped, not followed`);
  if (cut) notes.push(`${plural(cut, 'finding')} past the limit of ${grouped(limits.maxFindingsPerRule)} per rule ${cut === 1 ? 'is' : 'are'} counted but not listed`);
  if (hidden) notes.push(`${plural(hidden, 'finding')} below ${minSeverity} ${hidden === 1 ? 'is' : 'are'} not shown`);
  const off = RULES.filter((r) => r.key !== null && config.rules[r.key] === 'off');
  if (off.length) notes.push(`${plural(off.length, 'rule')} ${off.length === 1 ? 'is' : 'are'} off: ${off.map((r) => r.id).join(', ')}`);
  if (!summary.manifests.length) notes.push('no Android manifest was read, so no Android rule ran');
  if (!summary.plists.length) notes.push('no Info.plist was read, so no iOS rule ran');
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of shown) byLevel[f.level] += 1;
  const byKind = Object.fromEntries(KINDS.map((k) => [k, files.filter((f) => f.kind === k).length]));
  return {
    tool: 'mobile-manifest-check',
    version,
    input: { paths: input.paths.map((p) => safeText(p)), files: files.map((f) => ({ file: safeText(f.file), kind: f.kind, read: f.read })), byKind },
    config: {
      file: config.file === null ? null : safeText(config.file),
      name: config.name === null ? null : safeText(config.name, 120),
      files: config.files,
      exclude: config.exclude,
      placeholders: config.placeholders,
      minSeverity,
      failOn,
      rules: RULES.map((r) => ({ id: r.id, key: r.key, platform: r.platform, level: levelOf(r, config), masvs: r.masvs, rule: safeText(r.rule(config), 600) }))
    },
    findings,
    summary: { ...cleanTexts(summary), masvs: masvsSummary(findings) },
    totals: { findings: shown.length, byLevel, hidden, notListed: cut },
    result,
    notes: notes.map((n) => safeText(n, 600)),
    notice: NOTICE
  };
}

// The XML resources a manifest names that are next to it: [{ full, shown, link }]. A resource that is not there is left
// to the missing-resource rule. One in a folder that is a symbolic link is not read and becomes an unreadable-file
// finding; one that is itself a link, a folder or a device is refused by readText with its reason.
async function resourcesOf(manifest, model) {
  const out = [];
  for (const ref of referencesOf(model)) {
    if (!ref.plain) continue;
    const state = await resourceState(dirname(manifest.full), ref.name);
    if (state === 'missing') continue;
    out.push({ full: resolve(dirname(manifest.full), 'res', 'xml', `${ref.name}.xml`), shown: resourcePath(manifest.shown, ref.name), link: state === 'link' });
  }
  return out;
}

// Reads the configuration and the files named and checks them: the report object of the run.
export async function checkPaths({ inputs, config: configPath = null, minSeverity = null, failOn = null, version = '0.0.0', limits = LIMITS, base = process.cwd() }) {
  let config;
  try {
    if (configPath) {
      const c = await readTextFile(configPath, base, limits.maxConfigBytes);
      config = readConfig(c.text, c.file);
    } else config = defaultConfig();
  } catch (error) {
    if (error instanceof ConfigError) throw new InputError(capped(error.problems));
    throw new InputError([error.message]);
  }
  let collected;
  try {
    collected = await collectFiles(inputs, base, config, limits);
  } catch (error) {
    throw new InputError([error.message]);
  }
  const files = [];
  const problems = [];
  const done = new Set();
  let total = 0;
  const readOne = async (full, shown, kind) => {
    done.add(full);
    let read;
    try {
      read = await readText(full, shown, limits.maxFileBytes);
    } catch (error) {
      files.push(unreadableInput(shown, kind, error.reason ?? error.message));
      return null;
    }
    total += read.size;
    if (total > limits.maxTotalBytes) {
      problems.push(`${shown}: the files read so far hold more than ${grouped(limits.maxTotalBytes)} bytes, the limit of one run`);
      return false;
    }
    const input = readInput(read.text, shown, kind, limits);
    files.push(input);
    return input;
  };
  for (const { full, shown } of collected.files) {
    if (done.has(full)) continue;
    const kind = fileKind(shown);
    if (kind === null) {
      problems.push(`${shown}: not a kind of file the tool reads (AndroidManifest.xml, Info.plist or a name ending in -Info.plist)`);
      continue;
    }
    const input = await readOne(full, shown, kind);
    if (input === false) break;
    if (input && input.read && kind === 'android-manifest') {
      for (const r of await resourcesOf({ full, shown }, input.model)) {
        if (done.has(r.full)) continue;
        if (r.link) {
          done.add(r.full);
          files.push(unreadableInput(r.shown, 'android-resource', 'is in a folder that is a symbolic link, which is not followed'));
        } else if ((await readOne(r.full, r.shown, 'android-resource')) === false) break;
      }
    }
    if (problems.length && total > limits.maxTotalBytes) break;
  }
  if (problems.length) throw new InputError(capped(problems));
  return buildReport({ input: { paths: collected.named, skippedLinks: collected.skippedLinks }, files, config, minSeverity: minSeverity ?? config.minSeverity, failOn: failOn ?? config.failOn, version, limits });
}
