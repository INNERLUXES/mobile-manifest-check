// The reports: text for a terminal, JSON for other tools, and GitHub workflow commands that turn each finding into an
// annotation on the file, line and column. Every text from the input (a file name, a package name, a key or a value)
// was cleaned by safeText before it reached the report object. The GitHub commands also escape the characters a command
// gives a meaning to, so a text in the input cannot end a command early or start another one.

import { KINDS } from './kinds.js';
import { grouped, listText, plural } from './size.js';
import { safeText } from './text.js';

const clean = (t, max = 200) => safeText(t, max);
const pathsText = (r) => r.input.paths.join(', ');

// The kinds of files as the report names them, one and many.
export const KIND_NAMES = { 'android-manifest': ['Android manifest', 'Android manifests'], 'android-resource': ['XML resource', 'XML resources'], 'ios-plist': ['Info.plist', 'Info.plist files'] };

function inputLine(r) {
  const n = r.input.byKind;
  const kinds = KINDS.filter((k) => n[k]).map((k) => `${grouped(n[k])} ${KIND_NAMES[k][n[k] === 1 ? 0 : 1]}`).join(', ');
  return `${pathsText(r)} (${plural(r.input.files.length, 'file')}${kinds ? `: ${kinds}` : ''})`;
}

function configLine(r) {
  const c = r.config;
  const where = c.file ? `${c.file}${c.name ? ` (${clean(c.name, 120)})` : ''}` : 'built-in defaults';
  return `${where}: ${plural(c.files.length, 'file pattern')}, ${plural(c.exclude.length, 'exclude pattern')}, ${plural(c.placeholders.length, 'placeholder')}; minimum severity ${c.minSeverity}; fail on ${c.failOn}`;
}

const rulesLine = (r) => r.config.rules.map((x) => `${x.id} (${x.level})`).join('; ');

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'info'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

// A table with a header row and its columns padded to the widest cell.
function table(head, rows) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => `  ${cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ')}`.trimEnd();
  return [line(head), ...rows.map(line)];
}

const USES = { network: 'network security config', paths: 'FileProvider paths' };

// The summary: every manifest and property list, and the MASVS groups of the findings.
function summaryLines(r) {
  const s = r.summary;
  const out = [];
  out.push('Android manifests', '');
  if (!s.manifests.length) out.push('  none');
  else {
    out.push(...table(['file', 'package', 'target', 'permissions', 'sensitive', 'exported', 'backup', 'cleartext', 'debuggable'], s.manifests.map((m) => [
      m.file,
      m.package ?? '-',
      m.targetSdk === null ? 'not set' : String(m.targetSdk),
      grouped(m.permissions.length),
      grouped(m.sensitive),
      `${grouped(m.exported)} of ${grouped(m.components)}`,
      m.backup,
      m.cleartext,
      m.debuggable
    ])));
    const refs = s.manifests.flatMap((m) => m.resources.map((x) => `  @xml/${x.name} (${USES[x.use]}) of ${m.file}: ${x.file === null ? 'not a plain resource name' : x.found ? x.file : `${x.file} not found`}`));
    if (refs.length) out.push('', ...refs);
  }
  out.push('', 'iOS property lists', '');
  if (!s.plists.length) out.push('  none');
  else {
    out.push(...table(['file', 'bundle id', 'usage descriptions', 'arbitrary loads', 'exception domains', 'background modes'], s.plists.map((p) => [
      p.file,
      p.bundleId ?? '-',
      grouped(p.usageDescriptions.length),
      p.arbitraryLoads ? 'yes' : 'no',
      grouped(p.exceptionDomains),
      p.backgroundModes.length ? p.backgroundModes.join(', ') : 'none'
    ])));
  }
  out.push('', 'OWASP MASVS groups of the findings', '');
  if (!s.masvs.length) out.push('  none');
  for (const g of s.masvs) {
    out.push(`  ${g.group} (${g.title}): ${plural(g.findings, 'finding')}`);
    for (const c of g.controls) out.push(`    ${c.id}, ${c.text}: ${grouped(c.findings)}`);
  }
  return out;
}

export function toText(r, { explain = false } = {}) {
  const out = [];
  out.push(`mobile-manifest-check: ${pathsText(r)}`);
  out.push(`input: ${inputLine(r)}`);
  out.push(`config: ${configLine(r)}`);
  out.push(`rules: ${rulesLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...r.config.rules.map((x) => x.id.length));
  const pad = ' '.repeat(11);
  for (const f of r.findings) {
    out.push(`  ${f.level.toUpperCase().padEnd(8)} ${f.rule.padEnd(width)}  ${f.at}`);
    out.push(`${pad}${f.found}`);
    out.push(`${pad}fix: ${f.fix}`);
    if (f.masvs.length) out.push(`${pad}masvs: ${listText(f.masvs, 4)}`);
    if (explain) {
      out.push(`${pad}rule: ${r.config.rules.find((x) => x.id === f.rule).rule}`);
      for (const b of f.basis) out.push(`${pad}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${pad}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  out.push(...summaryLines(r), '');
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

// The message of a workflow command: %, CR and LF escaped.
export const escapeData = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

// A property of a workflow command: also : and , escaped.
export const escapeProperty = (t) => escapeData(t).replace(/:/g, '%3A').replace(/,/g, '%2C');

const COMMANDS = { error: 'error', warning: 'warning', info: 'notice' };

export function toGithub(r) {
  const out = [];
  for (const f of r.findings) {
    const props = [`file=${escapeProperty(f.file)}`, `line=${f.line}`, ...(f.column ? [`col=${f.column}`] : []), `title=${escapeProperty(`mobile-manifest-check ${f.rule}`)}`];
    out.push(`::${COMMANDS[f.level]} ${props.join(',')}::${escapeData(`${f.found}; fix: ${f.fix}${f.masvs.length ? `; ${f.masvs.join(', ')}` : ''}`)}`);
  }
  out.push(`mobile-manifest-check: ${pathsText(r)}: ${plural(r.input.files.length, 'file')}, ${plural(r.summary.manifests.length, 'Android manifest')}, ${plural(r.summary.plists.length, 'Info.plist', 'Info.plist files')}, ${grouped(r.totals.findings)} ${r.totals.findings === 1 ? 'finding' : 'findings'}; RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}
