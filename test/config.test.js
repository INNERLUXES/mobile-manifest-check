import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigError, DEFAULT_EXCLUDE, DEFAULT_FAIL_ON, DEFAULT_FILES, DEFAULT_MIN_SEVERITY, DEFAULT_PLACEHOLDERS, DEFAULT_RULES, KEYS, RULES, SKIPPED_FOLDERS, defaultConfig, defaultsAsConfig, distance, globMatch, globProblem, isIncluded, isObject, kindOf, readConfig, suggestion, validateConfig } from '../src/index.js';

// The configuration file: every key, the list operations, the errors with their lines and suggestions.

const problems = (text) => {
  try {
    readConfig(text, 'c.json');
  } catch (error) {
    assert.ok(error instanceof ConfigError, error.message);
    return error.problems;
  }
  assert.fail('not refused');
  return [];
};

test('config: the defaults, and --print-defaults read back give the same configuration', () => {
  const d = defaultConfig();
  assert.deepEqual(d.files, DEFAULT_FILES);
  assert.deepEqual(d.exclude, DEFAULT_EXCLUDE);
  assert.deepEqual(d.rules, DEFAULT_RULES);
  assert.deepEqual(d.placeholders, DEFAULT_PLACEHOLDERS);
  assert.equal(d.minSeverity, DEFAULT_MIN_SEVERITY);
  assert.equal(d.failOn, DEFAULT_FAIL_ON);
  assert.equal(DEFAULT_MIN_SEVERITY, 'info');
  assert.equal(DEFAULT_FAIL_ON, 'error');
  const back = readConfig(JSON.stringify(defaultsAsConfig()), 'd.json');
  assert.deepEqual({ ...back, file: null, name: null }, d);
  assert.deepEqual(Object.keys(defaultsAsConfig()), Object.keys(KEYS));
  assert.deepEqual(SKIPPED_FOLDERS, ['.git', 'node_modules', '.gradle', '.idea', '.dart_tool']);
});

test('config: every rule but the two of input problems has a key, and every key a rule', () => {
  assert.deepEqual(RULES.filter((r) => r.key !== null).map((r) => r.key).sort(), Object.keys(DEFAULT_RULES).sort());
  assert.deepEqual(RULES.filter((r) => r.key === null).map((r) => r.id), ['unreadable-file', 'unparsable-file']);
  for (const r of RULES) if (r.key) assert.ok(['info', 'warning', 'error'].includes(DEFAULT_RULES[r.key]), r.id);
  assert.deepEqual(RULES.filter((r) => r.key && DEFAULT_RULES[r.key] === 'error').map((r) => r.id), ['debuggable', 'cleartext-traffic', 'missing-exported', 'empty-usage-description', 'missing-usage-description', 'ats-arbitrary-loads']);
});

test('config: every key with a good value', () => {
  const c = readConfig(JSON.stringify({ name: 'Shop', files: ['app/**/AndroidManifest.xml'], exclude: { add: ['**/legacy/**'], remove: ['**/Pods/**'] }, rules: { allowBackup: 'off', exportedComponent: 'error', dangerousPermission: 'warning' }, placeholders: { add: ['Coming soon!'], remove: ['test'] }, minSeverity: 'warning', failOn: 'warning' }), 'c.json');
  assert.equal(c.name, 'Shop');
  assert.equal(c.file, 'c.json');
  assert.deepEqual(c.files, ['app/**/AndroidManifest.xml']);
  assert.deepEqual(c.exclude, [...DEFAULT_EXCLUDE.filter((x) => x !== '**/Pods/**'), '**/legacy/**']);
  assert.equal(c.rules.allowBackup, 'off');
  assert.equal(c.rules.exportedComponent, 'error');
  assert.equal(c.rules.dangerousPermission, 'warning');
  assert.deepEqual(c.placeholders, [...DEFAULT_PLACEHOLDERS.filter((x) => x !== 'test'), 'coming soon']);
  assert.equal(c.minSeverity, 'warning');
  assert.equal(c.failOn, 'warning');
});

test('config: an unknown key is an error with its line and a suggestion, at every level', () => {
  assert.deepEqual(problems('{\n  "exlude": []\n}'), ['c.json: line 2: "exlude" is not a key of the configuration; did you mean "exclude"?']);
  assert.deepEqual(problems('{\n  "rules": {\n    "debugable": "off"\n  }\n}'), ['c.json: line 3: "debugable" is not a key of rules; did you mean "debuggable"?']);
  assert.deepEqual(problems('{"files": {"ad": ["*.xml"]}}'), ['c.json: line 1: "ad" is not a key of files (replace, add, remove); did you mean "add"?']);
  assert.deepEqual(problems('{"placeholder": ["x"]}'), ['c.json: line 1: "placeholder" is not a key of the configuration; did you mean "placeholders"?']);
  assert.deepEqual(problems('{"failon": "info"}'), ['c.json: line 1: "failon" is not a key of the configuration; did you mean "failOn"?']);
  assert.deepEqual(problems('{"colour": 1}'), ['c.json: line 1: "colour" is not a key of the configuration']);
  assert.deepEqual(problems('{"rules": {"unparsableFile": "off"}}'), ['c.json: line 1: "unparsableFile" is not a key of rules'], 'the rules of input problems have no key');
});

test('config: a key named twice is refused, as RFC 8259 leaves the result open', () => {
  assert.match(problems('{"name": "a", "name": "b"}')[0], /^c\.json: line 1, column 15: the name "name" appears twice in one object/);
});

test('config: values of the wrong kind, each with its line', () => {
  const text = JSON.stringify({ name: '', files: 'x', exclude: [1], rules: [], placeholders: ['...'], minSeverity: 'notice', failOn: 3 }, null, 2);
  assert.deepEqual(problems(text), [
    'c.json: line 2: name must be a text of 1 to 120 characters',
    'c.json: line 3: files must be a list or an object with replace, add or remove, not a string',
    'c.json: line 5: exclude[0] must be a text, not a number',
    'c.json: line 7: rules must be an object, not a list',
    'c.json: line 9: placeholders[0]: "..." is not a text with a letter or a digit in it',
    'c.json: line 11: minSeverity must be one of info, warning, error',
    'c.json: line 12: failOn must be one of info, warning, error'
  ]);
});

test('config: a name such as __proto__ is an ordinary key and is refused like any other', () => {
  assert.match(problems('{"__proto__": {"files": []}}')[0], /"__proto__" is not a key of the configuration/);
  assert.match(problems('{"rules": {"constructor": "off"}}')[0], /"constructor" is not a key of rules/);
  assert.equal({}.files, undefined);
});

test('config: the list operations replace, add and remove, and their errors', () => {
  assert.deepEqual(readConfig('{"files": {"replace": ["a/Info.plist"], "add": ["b/AndroidManifest.xml"]}}', 'c').files, ['a/Info.plist', 'b/AndroidManifest.xml']);
  assert.deepEqual(problems('{"exclude": {"remove": ["nope/**"]}}'), ['c.json: line 1: exclude.remove names "nope/**", which is not on the list']);
  assert.deepEqual(problems('{"exclude": {"add": ["**/build/**"]}}'), ['c.json: line 1: exclude.add names "**/build/**", which is already on the list']);
  assert.deepEqual(problems('{"files": ["a.xml", "a.xml"]}'), ['c.json: line 1: files names "a.xml" twice']);
  assert.deepEqual(problems('{"placeholders": ["TODO", "todo."]}'), ['c.json: line 1: placeholders names "todo" twice'], 'placeholders are compared in their compared form');
  assert.deepEqual(problems('{"files": []}'), ['c.json: line 1: files has no pattern left, so no file of a folder would be read']);
  assert.deepEqual(readConfig('{"placeholders": []}', 'c').placeholders, [], 'the placeholders may be emptied');
  assert.match(problems(JSON.stringify({ exclude: Array.from({ length: 501 }, (_, i) => `a${i}/**`) }))[0], /holds more than 500 entries/);
  assert.match(problems(JSON.stringify({ files: [`${'a'.repeat(300)}.xml`] }))[0], /must hold 1 to 200 characters/);
});

test('config: a file pattern is checked, and a rule level must be a level or off', () => {
  for (const bad of ['/abs/*.xml', '../x', 'a/**b', '[ab].xml', 'a\\b']) assert.match(problems(JSON.stringify({ files: [bad] }))[0], /is not a file pattern/, bad);
  assert.match(problems('{"rules": {"debuggable": "fatal"}}')[0], /rules\.debuggable must be one of info, warning, error, off, not "fatal"/);
  assert.match(problems('{"rules": {"debuggable": 1}}')[0], /not a number/);
});

test('config: the configuration must be an object, and JSON errors have their line and column', () => {
  assert.deepEqual(problems('[]'), ['c.json: line 1: the configuration must be a JSON object, not a list']);
  assert.deepEqual(problems('{\n  "name": "x",\n}'), ['c.json: line 3, column 1: a comma before the closing brace; JSON has no trailing comma']);
  assert.throws(() => validateConfig(null), /must be a JSON object, not null/);
});

test('config: helpers for the suggestions and the kinds of values', () => {
  assert.equal(distance('name', 'nmae'), 1);
  assert.equal(distance('', 'abc'), 3);
  assert.equal(suggestion('exclud', ['exclude', 'files']), '; did you mean "exclude"?');
  assert.equal(suggestion('somethingelse', ['files']), '');
  assert.deepEqual([null, [], {}, 1, 'x', true].map(kindOf), ['null', 'a list', 'an object', 'a number', 'a string', 'a boolean']);
  assert.equal(isObject({}), true);
  assert.equal(isObject([]), false);
});

test('patterns: *, ? and ** match by parts, a pattern with no slash matches the file name anywhere, and the rest is refused', () => {
  assert.equal(globMatch('**/AndroidManifest.xml', 'AndroidManifest.xml'), true);
  assert.equal(globMatch('**/AndroidManifest.xml', 'app/src/main/AndroidManifest.xml'), true);
  assert.equal(globMatch('**/*-Info.plist', 'ios/App-Info.plist'), true);
  assert.equal(globMatch('**/*-Info.plist', 'ios/Info.plist'), false);
  assert.equal(globMatch('src/*.xml', 'src/a.xml'), true);
  assert.equal(globMatch('src/*.xml', 'src/x/a.xml'), false);
  assert.equal(globMatch('**/t?.xml', 'a/b/t1.xml'), true);
  assert.equal(globMatch('**/t?.xml', 't12.xml'), false);
  assert.equal(globMatch('Info.plist', 'deep/down/Info.plist'), true);
  assert.equal(globMatch('a*b*c', 'aXbYbZc'), true);
  assert.equal(globMatch('a*b*c', 'aXbYbZ'), false);
  assert.equal(isIncluded('app/build/intermediates/merged_manifests/release/AndroidManifest.xml', DEFAULT_FILES, DEFAULT_EXCLUDE), false);
  assert.equal(isIncluded('build/AndroidManifest.xml', DEFAULT_FILES, DEFAULT_EXCLUDE), false);
  assert.equal(isIncluded('ios/Pods/Lib/Info.plist', DEFAULT_FILES, DEFAULT_EXCLUDE), false);
  assert.equal(isIncluded('ios/App.xcarchive/Info.plist', DEFAULT_FILES, DEFAULT_EXCLUDE), false);
  assert.equal(isIncluded('app/src/main/AndroidManifest.xml', DEFAULT_FILES, DEFAULT_EXCLUDE), true);
  assert.equal(isIncluded('ios/App/Info.plist', DEFAULT_FILES, DEFAULT_EXCLUDE), true);
  assert.equal(isIncluded('app/src/main/res/xml/network_security_config.xml', DEFAULT_FILES, DEFAULT_EXCLUDE), false, 'a resource is read through its manifest');
  for (const bad of ['', '/abs', 'a/../b', 'a//b', './a', '[ab].xml', '{a,b}.xml', '!a.xml', 'a\\b', 'a**', 'x'.repeat(201), `a${String.fromCharCode(1)}`]) assert.notEqual(globProblem(bad), null, bad);
  assert.equal(globProblem('src/**/*.xml'), null);
  assert.equal(globProblem(3), 'must hold 1 to 200 characters');
});
