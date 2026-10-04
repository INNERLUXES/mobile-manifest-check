// An XML property list (Info.plist) read from the tree of src/xml.js into plain values, each with the offset of the
// element that holds it. A dictionary is kept as a list of entries, never as an object, so a key such as __proto__ is
// only a key. A binary property list is not read here: src/files.js refuses it before, with a note on how to convert
// it. A structure that is not a property list (no <plist> root, a <key> without a value, a key named twice in one
// dictionary, an element a property list does not have) is refused with its place, like a file that is not XML.

import { XmlError } from './xml.js';

// The value elements of a property list.
export const PLIST_TYPES = ['dict', 'array', 'string', 'integer', 'real', 'true', 'false', 'date', 'data'];

const rawText = (element) => element.texts.map((t) => t.value).join('');

// One value element as { type, value, offset }: value is an entry list for a dict ({ key, offset, value }), a list
// for an array, true or false, or the text of the element.
function valueOf(element, depth) {
  if (!PLIST_TYPES.includes(element.name)) throw new XmlError(`<${element.name.slice(0, 60)}> is not a value of a property list`, element.offset);
  if (depth > 128) throw new XmlError('values nested more than 128 deep', element.offset);
  const at = element.offset;
  if (element.name === 'true' || element.name === 'false') {
    if (element.children.length || rawText(element).trim()) throw new XmlError(`<${element.name}/> holds content`, at);
    return { type: 'boolean', value: element.name === 'true', offset: at };
  }
  if (element.name === 'array') {
    if (rawText(element).trim()) throw new XmlError('an <array> holds text outside its values', at);
    return { type: 'array', value: element.children.map((c) => valueOf(c, depth + 1)), offset: at };
  }
  if (element.name === 'dict') {
    if (rawText(element).trim()) throw new XmlError('a <dict> holds text outside its keys and values', at);
    const entries = [];
    const seen = new Set();
    const kids = element.children;
    for (let k = 0; k < kids.length; k += 2) {
      const key = kids[k];
      if (key.name !== 'key') throw new XmlError(`a <dict> holds <${key.name.slice(0, 60)}> where a <key> was expected`, key.offset);
      if (key.children.length) throw new XmlError('a <key> holds an element', key.offset);
      const name = rawText(key);
      if (k + 1 >= kids.length) throw new XmlError(`the key ${name.slice(0, 60)} has no value`, key.offset);
      if (seen.has(name)) throw new XmlError(`the key ${name.slice(0, 60)} appears twice in one dictionary`, key.offset);
      seen.add(name);
      entries.push({ key: name, offset: key.offset, value: valueOf(kids[k + 1], depth + 1) });
    }
    return { type: 'dict', value: entries, offset: at };
  }
  if (element.children.length) throw new XmlError(`a <${element.name}> holds an element`, at);
  return { type: element.name, value: rawText(element), offset: at };
}

// The property list of a parsed document: its top value, which must be a dictionary for an Info.plist.
export function readPlist(root) {
  if (root.name !== 'plist') throw new XmlError(`the root element is <${root.name.slice(0, 60)}>, not <plist>`, root.offset);
  if (root.children.length !== 1) throw new XmlError('a <plist> must hold exactly one value', root.offset);
  const top = valueOf(root.children[0], 0);
  if (top.type !== 'dict') throw new XmlError('the property list does not hold a dictionary at its top', top.offset);
  return top;
}

// The entry of a dictionary value with this key, or null.
export const entryOf = (dict, key) => (dict && dict.type === 'dict' ? dict.value.find((e) => e.key === key) ?? null : null);

// True when a value is true as the system reads a Boolean key: <true/>, an integer other than 0, or the strings YES,
// true or 1 in any case of the letters. Everything else is false.
export function isTrue(value) {
  if (!value) return false;
  if (value.type === 'boolean') return value.value;
  if (value.type === 'integer') return /^\s*[+-]?0*[1-9][0-9]*\s*$/.test(value.value);
  if (value.type === 'string') return ['yes', 'true', '1'].includes(value.value.trim().replace(/[A-Z]/g, (c) => c.toLowerCase()));
  return false;
}

// The strings of an array value, or the keys of a dictionary whose value is true (UIRequiredDeviceCapabilities takes
// both forms).
export function namesOf(value) {
  if (!value) return [];
  if (value.type === 'array') return value.value.filter((v) => v.type === 'string').map((v) => v.value.trim());
  if (value.type === 'dict') return value.value.filter((e) => isTrue(e.value)).map((e) => e.key);
  return [];
}
