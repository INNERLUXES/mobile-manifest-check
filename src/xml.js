// A small XML reader for AndroidManifest.xml, the XML resources a manifest names and Info.plist. It reads the text
// once, left to right, and builds a tree of elements with their attributes, their text and the offset of each, which
// is all the checks need. It never loads, fetches or expands anything:
//   - a document type declaration is accepted only in its plain form, a name with a PUBLIC or SYSTEM identifier and no
//     internal subset, because every Info.plist that Xcode writes starts with one; the identifier is only text and is
//     never fetched. A declaration with an internal subset ([ ... ]), where entities are declared, is refused, and so is
//     any other declaration (<!ENTITY, <!ELEMENT and the rest) and a second document type declaration;
//   - only the five entities of XML (&lt; &gt; &amp; &quot; &apos;) and character references are decoded. Any other
//     entity reference, and a & that starts no reference, is refused with its line, because the reader declares no
//     entity and will not guess what one would hold.
// A tag that is not closed, an end tag that does not match, an attribute without quotes or named twice, a < inside an
// attribute value and text outside the root element are refused too, so a file is never judged on a part the reader
// could not place. docs/limits.md lists the limits and docs/decisions/0002 says why.

import { lineStarts, positionOf } from './json.js';

export const XML_LIMITS = { maxDepth: 256, maxElements: 1000000, maxAttributes: 256 };

export class XmlError extends Error {
  constructor(reason, offset) {
    super(reason);
    this.reason = reason;
    this.offset = offset;
  }
}

const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 13;
const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

// Text with the five entities of XML and character references decoded. offset is where the text starts in the file,
// so a reference the reader refuses is reported at its own place.
export function decodeEntities(text, offset = 0) {
  if (!text.includes('&')) return text;
  let out = '';
  let from = 0;
  for (let at = text.indexOf('&'); at >= 0; at = text.indexOf('&', from)) {
    out += text.slice(from, at);
    const end = text.indexOf(';', at);
    const name = end < 0 || end - at > 12 ? null : text.slice(at + 1, end);
    if (name === null || name === '') throw new XmlError('a & that starts no reference; write it as &amp;', offset + at);
    if (name[0] === '#') {
      const digits = name[1] === 'x' ? name.slice(2) : name.slice(1);
      const valid = name[1] === 'x' ? /^[0-9a-fA-F]{1,6}$/.test(digits) : /^[0-9]{1,7}$/.test(digits);
      const code = valid ? parseInt(digits, name[1] === 'x' ? 16 : 10) : -1;
      if (code <= 0 || code > 0x10ffff) throw new XmlError(`the character reference &${name.slice(0, 12)}; is not a character`, offset + at);
      out += String.fromCodePoint(code);
    } else if (Object.hasOwn(ENTITIES, name)) out += ENTITIES[name];
    else throw new XmlError(`the entity reference &${name.slice(0, 12)}; is not one of the five of XML; the reader expands no declared entity, so the file is refused`, offset + at);
    from = end + 1;
  }
  return out + text.slice(from);
}

// Reads one XML document. Returns the root element: { name, offset, attributes: [{ name, value, offset }], children,
// texts: [{ value, offset }] }. Throws XmlError with the offset of the problem.
export function parseXml(text, limits = XML_LIMITS) {
  const lim = { ...XML_LIMITS, ...limits };
  const n = text.length;
  let i = 0;
  let root = null;
  let doctype = false;
  let elements = 0;
  const stack = [];
  const fail = (reason, at = i) => {
    throw new XmlError(reason, at);
  };
  const skipTo = (end, what, start) => {
    const at = text.indexOf(end, i);
    if (at < 0) fail(`${what} that is not closed`, start);
    i = at + end.length;
  };
  const readName = () => {
    const start = i;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (isSpace(c) || c === 47 || c === 62 || c === 61 || c === 60 || c === 34 || c === 39 || c === 91) break;
      i += 1;
    }
    if (i === start) fail('a name was expected');
    return text.slice(start, i);
  };
  const skipSpace = () => {
    while (i < n && isSpace(text.charCodeAt(i))) i += 1;
  };

  while (i < n) {
    if (text.charCodeAt(i) !== 60) {
      const start = i;
      const at = text.indexOf('<', i);
      i = at < 0 ? n : at;
      const raw = text.slice(start, i);
      if (stack.length) stack.at(-1).texts.push({ value: decodeEntities(raw, start), offset: start });
      else if (raw.trim()) fail('text outside the root element', start);
      continue;
    }
    const start = i;
    if (text.startsWith('<!--', i)) {
      skipTo('-->', 'a comment', start);
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      if (!stack.length) fail('a CDATA section outside the root element');
      i += 9;
      const at = text.indexOf(']]>', i);
      if (at < 0) fail('a CDATA section that is not closed', start);
      stack.at(-1).texts.push({ value: text.slice(i, at), offset: i });
      i = at + 3;
      continue;
    }
    if (text.startsWith('<?', i)) {
      skipTo('?>', 'a processing instruction', start);
      continue;
    }
    if (text.startsWith('<!DOCTYPE', i)) {
      // The plain form only: <!DOCTYPE name PUBLIC "..." "..."> or <!DOCTYPE name SYSTEM "...">, or the name alone.
      if (doctype || root) fail('a second document type declaration, or one after the root element');
      doctype = true;
      i += 9;
      for (;;) {
        if (i >= n) fail('a document type declaration that is not closed', start);
        const c = text[i];
        if (c === '"' || c === "'") {
          const at = text.indexOf(c, i + 1);
          if (at < 0) fail('a quoted identifier that is not closed', i);
          i = at + 1;
          continue;
        }
        if (c === '[') fail('a document type declaration with an internal subset, where entities are declared; the reader refuses it', start);
        if (c === '<') fail('a document type declaration that is not closed', start);
        if (c === '>') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (text.startsWith('<!', i)) fail('a declaration such as <!ENTITY or <!ELEMENT; the reader refuses every declaration but a plain document type');
    if (text.startsWith('</', i)) {
      i += 2;
      const name = readName();
      skipSpace();
      if (text[i] !== '>') fail('an end tag that is not closed', start);
      i += 1;
      const open = stack.pop();
      if (!open) fail(`an end tag </${name.slice(0, 60)}> with no element open`, start);
      if (open.name !== name) fail(`the end tag </${name.slice(0, 60)}> does not match <${open.name.slice(0, 60)}>`, start);
      continue;
    }
    i += 1;
    const element = { name: readName(), offset: start, attributes: [], children: [], texts: [] };
    elements += 1;
    if (elements > lim.maxElements) fail(`more than ${lim.maxElements} elements`, start);
    if (!stack.length && root) fail('a second root element', start);
    for (;;) {
      skipSpace();
      if (i >= n) fail('a tag that is not closed', start);
      if (text[i] === '/' && text[i + 1] === '>') {
        i += 2;
        element.empty = true;
        break;
      }
      if (text[i] === '>') {
        i += 1;
        break;
      }
      const at = i;
      const name = readName();
      skipSpace();
      if (text[i] !== '=') fail(`the attribute ${name.slice(0, 60)} has no value`, at);
      i += 1;
      skipSpace();
      const q = text[i];
      if (q !== '"' && q !== "'") fail(`the value of the attribute ${name.slice(0, 60)} is not in quotes`, at);
      const end = text.indexOf(q, i + 1);
      if (end < 0) fail(`the value of the attribute ${name.slice(0, 60)} is not closed`, at);
      const raw = text.slice(i + 1, end);
      if (raw.includes('<')) fail(`the value of the attribute ${name.slice(0, 60)} holds a <`, at);
      if (element.attributes.some((a) => a.name === name)) fail(`the attribute ${name.slice(0, 60)} appears twice in one tag`, at);
      if (element.attributes.length >= lim.maxAttributes) fail(`more than ${lim.maxAttributes} attributes in one tag`, at);
      element.attributes.push({ name, value: decodeEntities(raw, i + 1), offset: at });
      i = end + 1;
    }
    if (stack.length) stack.at(-1).children.push(element);
    else root = element;
    if (!element.empty) {
      if (stack.length >= lim.maxDepth) fail(`elements nested more than ${lim.maxDepth} deep`, start);
      stack.push(element);
    }
  }
  if (stack.length) fail(`the element <${stack.at(-1).name.slice(0, 60)}> is not closed`, stack.at(-1).offset);
  if (!root) fail('no root element', 0);
  return root;
}

// The namespace URI of every prefix in scope at each element, walked without recursion: Map(element -> Map(prefix ->
// uri)). A prefix is bound by an xmlns:prefix attribute on the element or on one of its ancestors.
export function namespacesOf(root) {
  const scopes = new Map();
  const todo = [{ element: root, outer: new Map() }];
  while (todo.length) {
    const { element, outer } = todo.pop();
    let scope = outer;
    for (const a of element.attributes) {
      if (!a.name.startsWith('xmlns:')) continue;
      if (scope === outer) scope = new Map(outer);
      scope.set(a.name.slice(6), a.value);
    }
    scopes.set(element, scope);
    for (const child of element.children) todo.push({ element: child, outer: scope });
  }
  return scopes;
}

// The attribute of an element in a namespace, by its local name: { name, value, offset } or null.
export function attributeIn(element, scope, uri, local) {
  for (const a of element.attributes) {
    const colon = a.name.indexOf(':');
    if (colon < 0 || a.name.slice(colon + 1) !== local) continue;
    const prefix = a.name.slice(0, colon);
    if (prefix !== 'xmlns' && scope.get(prefix) === uri) return a;
  }
  return null;
}

// The attribute of an element with no prefix, by its name: { name, value, offset } or null.
export const plainAttribute = (element, name) => element.attributes.find((a) => a.name === name) ?? null;

// The text of an element: its text parts joined and trimmed.
export const textOf = (element) => element.texts.map((t) => t.value).join('').trim();

// The line and column of an XmlError, for a finding.
export function xmlProblem(error, text) {
  const pos = positionOf(lineStarts(text), Math.min(error.offset, text.length));
  return { line: pos.line, column: pos.column, text: `line ${pos.line}, column ${pos.column}: ${error.reason}` };
}
