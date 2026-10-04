import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLIST_TYPES, XmlError, attributeIn, decodeEntities, entryOf, isTrue, namesOf, namespacesOf, parseXml, plainAttribute, readPlist, textOf, xmlProblem } from '../src/index.js';

// The XML reader and the property list reader: what they read, what they refuse, and that they never expand a
// declared entity or fetch a document type.

const xmlFails = (text, pattern) => assert.throws(() => parseXml(text), (e) => e instanceof XmlError && pattern.test(e.reason), text.slice(0, 60));
const plistOf = (body) => readPlist(parseXml(`<plist version="1.0">${body}</plist>`));
const plistFails = (body, pattern) => assert.throws(() => plistOf(body), (e) => e instanceof XmlError && pattern.test(e.reason), body.slice(0, 60));

test('xml: elements, attributes, text, CDATA, comments, processing instructions and the five entities, with offsets', () => {
  const text = '<?xml version="1.0"?>\n<!-- c -->\n<a x=\'1\' y="&lt;&amp;&#65;&#x42;&quot;&apos;&gt;">t1<b/>t2<![CDATA[<c>&x;]]><p:d>v</p:d></a>\n';
  const root = parseXml(text);
  assert.equal(root.name, 'a');
  assert.equal(root.offset, text.indexOf('<a'));
  assert.deepEqual(root.attributes.map((x) => [x.name, x.value]), [['x', '1'], ['y', '<&AB"\'>']]);
  assert.equal(root.attributes[1].offset, text.indexOf('y="'));
  assert.deepEqual(root.children.map((c) => c.name), ['b', 'p:d']);
  assert.equal(root.children[0].empty, true);
  assert.equal(textOf(root), 't1t2<c>&x;');
  assert.equal(plainAttribute(root, 'x').value, '1');
  assert.equal(plainAttribute(root, 'z'), null);
});

test('xml: a plain document type declaration is skipped and never fetched, as every Info.plist that Xcode writes has one', () => {
  const root = parseXml('<?xml version="1.0"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "file:///nowhere/x.dtd">\n<plist/>');
  assert.equal(root.name, 'plist');
  assert.equal(parseXml("<!DOCTYPE a SYSTEM 'a>b.dtd'><a/>").name, 'a', 'a > inside the identifier is only text');
  assert.equal(parseXml('<!DOCTYPE a><a/>').name, 'a');
});

for (const [name, text, pattern] of [
  ['a document type with an internal subset', '<!DOCTYPE a [ <!ENTITY e "x"> ]><a>&e;</a>', /internal subset, where entities are declared/],
  ['a parameter entity in an internal subset', '<!DOCTYPE a [<!ENTITY % p SYSTEM "file:///etc/hosts"> %p;]><a/>', /internal subset/],
  ['an entity declared outside a document type', '<!ENTITY e "x"><a/>', /refuses every declaration but a plain document type/],
  ['an element declaration', '<a><!ELEMENT a ANY></a>', /refuses every declaration/],
  ['a second document type', '<!DOCTYPE a><!DOCTYPE a><a/>', /a second document type declaration/],
  ['a document type after the root', '<a/><!DOCTYPE a>', /a second document type declaration, or one after the root/],
  ['a document type that is not closed', '<!DOCTYPE a PUBLIC "x" "y"', /document type declaration that is not closed/],
  ['a document type with an identifier that is not closed', '<!DOCTYPE a SYSTEM "x><a/>', /quoted identifier that is not closed/],
  ['a document type that runs into a tag', '<!DOCTYPE a <a/>', /document type declaration that is not closed/],
  ['an entity reference that is not declared', '<a>&e;</a>', /the entity reference &e; is not one of the five of XML/],
  ['an external entity reference in an attribute', '<a x="&xxe;"/>', /&xxe; is not one of the five/],
  ['a bare ampersand', '<a>fish & chips</a>', /a & that starts no reference/],
  ['an ampersand with an empty name', '<a>&;</a>', /a & that starts no reference/],
  ['a character reference to nothing', '<a>&#0;</a>', /is not a character/],
  ['a character reference past Unicode', '<a>&#x110000;</a>', /is not a character/],
  ['a character reference with a letter', '<a>&#12a;</a>', /is not a character/],
  ['a tag that is not closed', '<a', /a tag that is not closed/],
  ['an element that is not closed', '<a><b></b>', /the element <a> is not closed/],
  ['an end tag that does not match', '<a></b>', /the end tag <\/b> does not match <a>/],
  ['an end tag with no element open', '<a/></a>', /no element open/],
  ['an end tag that is not closed', '<a></a', /an end tag that is not closed/],
  ['a comment that is not closed', '<a><!-- x', /a comment that is not closed/],
  ['a CDATA section that is not closed', '<a><![CDATA[x', /a CDATA section that is not closed/],
  ['a CDATA section outside the root', '<![CDATA[x]]><a/>', /CDATA section outside the root/],
  ['a processing instruction that is not closed', '<?xml version="1.0"', /a processing instruction that is not closed/],
  ['an attribute without a value', '<a x/>', /the attribute x has no value/],
  ['an attribute value without quotes', '<a x=1/>', /is not in quotes/],
  ['an attribute value that is not closed', '<a x="1/>', /is not closed/],
  ['an attribute named twice', '<a x="1" x="2"/>', /appears twice in one tag/],
  ['a < inside an attribute value', '<a x="<b>"/>', /holds a </],
  ['text outside the root', 'x<a/>', /text outside the root element/],
  ['a second root element', '<a/><b/>', /a second root element/],
  ['no root element', '<!-- only -->', /no root element/],
  ['a tag with no name', '< a/>', /a name was expected/]
]) {
  test(`xml: ${name} is refused`, () => xmlFails(text, pattern));
}

test('xml: entities are decoded only in their five forms and as character references', () => {
  assert.equal(decodeEntities('a &amp;amp; b'), 'a &amp; b', 'decoded once, never twice');
  assert.equal(decodeEntities('no reference'), 'no reference');
  assert.equal(decodeEntities('&#x1F30A;'), String.fromCodePoint(0x1f30a));
  assert.throws(() => decodeEntities('x &bogus;', 10), (e) => e instanceof XmlError && e.offset === 12);
  assert.throws(() => decodeEntities(`&${'a'.repeat(20)};`), /starts no reference/);
});

test('xml: limits on depth, elements and attributes, and a problem with its line and column', () => {
  assert.throws(() => parseXml(`${'<a>'.repeat(300)}`), /nested more than 256 deep/);
  assert.throws(() => parseXml('<a><b/><b/><b/></a>', { maxElements: 3 }), /more than 3 elements/);
  assert.throws(() => parseXml('<a x="1" y="2"/>', { maxAttributes: 1 }), /more than 1 attributes/);
  const text = '<a>\n<b>\n</a>';
  try {
    parseXml(text);
    assert.fail('not refused');
  } catch (error) {
    assert.deepEqual(xmlProblem(error, text), { line: 3, column: 1, text: 'line 3, column 1: the end tag </a> does not match <b>' });
  }
});

test('xml: an attribute in a namespace is found by the URI its prefix is bound to, on the element or an ancestor', () => {
  const root = parseXml('<m xmlns:a="urn:x" xmlns:b="urn:y"><c a:k="1" b:k="2" k="3"><d xmlns:a="urn:y" a:k="4"/></c></m>');
  const scopes = namespacesOf(root);
  const c = root.children[0];
  const d = c.children[0];
  assert.equal(attributeIn(c, scopes.get(c), 'urn:x', 'k').value, '1');
  assert.equal(attributeIn(c, scopes.get(c), 'urn:y', 'k').value, '2');
  assert.equal(attributeIn(d, scopes.get(d), 'urn:y', 'k').value, '4', 'a prefix bound again lower down');
  assert.equal(attributeIn(d, scopes.get(d), 'urn:x', 'k'), null);
  assert.equal(attributeIn(c, scopes.get(c), 'urn:z', 'k'), null);
  assert.equal(attributeIn(root, scopes.get(root), 'urn:x', 'a'), null, 'an xmlns declaration is not an attribute of the namespace');
});

test('plist: every value type, dictionaries as entry lists with offsets, and __proto__ only a key', () => {
  const top = plistOf('<dict><key>s</key><string> a &amp; b </string><key>i</key><integer>7</integer><key>r</key><real>1.5</real><key>t</key><true/><key>f</key><false/><key>d</key><date>x</date><key>b</key><data>QQ==</data><key>a</key><array><string>x</string><integer>1</integer></array><key>__proto__</key><dict/></dict>');
  assert.equal(top.type, 'dict');
  assert.deepEqual(top.value.map((e) => [e.key, e.value.type]), [['s', 'string'], ['i', 'integer'], ['r', 'real'], ['t', 'boolean'], ['f', 'boolean'], ['d', 'date'], ['b', 'data'], ['a', 'array'], ['__proto__', 'dict']]);
  assert.equal(entryOf(top, 's').value.value, ' a & b ', 'a string keeps its white space');
  assert.equal(entryOf(top, 'none'), null);
  assert.equal(entryOf(null, 's'), null);
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
  assert.deepEqual(PLIST_TYPES, ['dict', 'array', 'string', 'integer', 'real', 'true', 'false', 'date', 'data']);
});

test('plist: a Boolean key is true for <true/>, a non-zero integer and YES, true or 1 in any case', () => {
  const top = plistOf('<dict><key>a</key><true/><key>b</key><string>YES</string><key>c</key><string> true </string><key>d</key><integer>1</integer><key>e</key><false/><key>f</key><string>no</string><key>g</key><integer>0</integer><key>h</key><array/><key>i</key><integer>-2</integer></dict>');
  assert.deepEqual(top.value.map((e) => isTrue(e.value)), [true, true, true, true, false, false, false, false, true]);
  assert.equal(isTrue(null), false);
  assert.deepEqual(namesOf(plistOf('<dict><key>x</key><array><string> gps </string><true/></array></dict>').value[0].value), ['gps']);
  assert.deepEqual(namesOf(plistOf('<dict><key>x</key><dict><key>nfc</key><true/><key>gps</key><false/></dict></dict>').value[0].value), ['nfc']);
  assert.deepEqual(namesOf(null), []);
  assert.deepEqual(namesOf({ type: 'string', value: 'x' }), []);
});

for (const [name, body, pattern] of [
  ['a root that is not plist', null, /the root element is <dict>, not <plist>/],
  ['a plist with two values', '<dict/><dict/>', /exactly one value/],
  ['a top value that is not a dictionary', '<array/>', /does not hold a dictionary at its top/],
  ['a key with no value', '<dict><key>a</key></dict>', /the key a has no value/],
  ['a value with no key', '<dict><string>a</string></dict>', /holds <string> where a <key> was expected/],
  ['a key named twice', '<dict><key>a</key><true/><key>a</key><false/></dict>', /the key a appears twice in one dictionary/],
  ['an element a property list does not have', '<dict><key>a</key><bool/></dict>', /<bool> is not a value of a property list/],
  ['text inside a dictionary', '<dict>x<key>a</key><true/></dict>', /holds text outside its keys/],
  ['text inside an array', '<dict><key>a</key><array>x</array></dict>', /holds text outside its values/],
  ['content inside true', '<dict><key>a</key><true>x</true></dict>', /<true\/> holds content/],
  ['an element inside a string', '<dict><key>a</key><string><b/></string></dict>', /a <string> holds an element/],
  ['an element inside a key', '<dict><key><b/></key><true/></dict>', /a <key> holds an element/],
  ['values nested too deep', `<dict><key>a</key>${'<array>'.repeat(130)}${'</array>'.repeat(130)}</dict>`, /nested more than 128 deep/]
]) {
  test(`plist: ${name} is refused`, () => {
    if (body === null) assert.throws(() => readPlist(parseXml('<dict/>')), pattern);
    else plistFails(body, pattern);
  });
}
