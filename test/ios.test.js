import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACKGROUND_NEEDS, CAPABILITY_NEEDS, DEFAULT_PLACEHOLDERS, MAX_PURPOSE_BYTES, PLACEHOLDER_STARTS, USAGE_KEYS, purposeProblem } from '../src/index.js';
import { findingsOf, ios, lineOf, plist, reportOf, rulesIn, rulesOf } from './helpers.js';

// The iOS rules, each with the form that is reported and the form next to it that is not, written inline.

const only = (r, rule) => findingsOf(r, rule).map((f) => f.found);
const str = (key, value) => `<key>${key}</key><string>${value}</string>`;

test('ios: the usage keys, the capabilities and the limits the checks know', () => {
  assert.equal(USAGE_KEYS.NSCameraUsageDescription, 'camera');
  assert.equal(USAGE_KEYS.NFCReaderUsageDescription, 'NFC');
  for (const keys of [...Object.values(BACKGROUND_NEEDS), ...Object.values(CAPABILITY_NEEDS)]) for (const k of keys) assert.ok(Object.hasOwn(USAGE_KEYS, k), k);
  assert.equal(MAX_PURPOSE_BYTES, 4000);
  assert.deepEqual(PLACEHOLDER_STARTS, ['todo', 'fixme', 'tbd', 'lorem ipsum', 'placeholder']);
});

test('usage-description: every key that ends in UsageDescription, with its text, as info', () => {
  const text = plist(str('NSCameraUsageDescription', 'Scan a receipt to add it to a trip.'), str('NSFancyNewUsageDescription', 'Read the fancy sensor for the step counter.'), str('CFBundleName', 'Usage'), '<key>Nested</key><dict>' + str('NSMicrophoneUsageDescription', '') + '</dict>');
  const r = reportOf(ios(text));
  assert.deepEqual(only(r, 'usage-description'), ['NSCameraUsageDescription (camera): "Scan a receipt to add it to a trip."', 'NSFancyNewUsageDescription: "Read the fancy sensor for the step counter."']);
  assert.equal(findingsOf(r, 'usage-description')[0].line, lineOf(text, 'NSCameraUsageDescription'));
  assert.deepEqual(rulesOf(r), ['usage-description', 'usage-description'], 'a key inside a nested dictionary is not a usage description of the app');
  const long = 'a'.repeat(200);
  assert.match(only(reportOf(ios(plist(str('NSCameraUsageDescription', long)))), 'usage-description')[0], /"a{117}\.\.\."$/);
});

test('empty-usage-description: empty, white space, placeholders, punctuation, the key name, too long and not a string', () => {
  const cases = [
    ['', 'is empty'],
    ['   \n  ', 'is empty'],
    ['TODO', 'holds the placeholder "TODO"'],
    ['todo: write this', 'holds the placeholder "todo: write this"'],
    ['FIXME later', 'holds the placeholder "FIXME later"'],
    ['Lorem ipsum dolor sit amet', 'holds the placeholder "Lorem ipsum dolor sit amet"'],
    ['Description.', 'holds the placeholder "Description."'],
    ['  Usage   Description ', 'holds the placeholder "Usage   Description"'],
    ['...', 'holds only punctuation ("...")'],
    ['NSCameraUsageDescription', 'holds only the name of the key'],
    ['x'.repeat(MAX_PURPOSE_BYTES), 'is 4,000 bytes long; a purpose string must be shorter than 4,000 bytes']
  ];
  for (const [value, problem] of cases) {
    const r = reportOf(ios(plist(str('NSCameraUsageDescription', value))));
    assert.deepEqual(only(r, 'empty-usage-description'), [`NSCameraUsageDescription (camera) ${problem}: the system shows no useful reason when it asks the user, and App Review rejects an app whose purpose string is not valid`], JSON.stringify(value.slice(0, 30)));
    assert.equal(findingsOf(r, 'empty-usage-description')[0].level, 'error');
  }
  assert.deepEqual(only(reportOf(ios(plist('<key>NSCameraUsageDescription</key><true/>'))), 'empty-usage-description')[0].split(':')[0], 'NSCameraUsageDescription (camera) is a Boolean, not a string');
  for (const fine of ['To do the scan, the app needs the camera.', 'Todos are photographed with the camera.', 'x'.repeat(MAX_PURPOSE_BYTES - 1), 'Kamera f\u00fcr Belege.', '$(CAMERA_REASON)']) {
    assert.deepEqual(rulesIn(ios(plist(str('NSCameraUsageDescription', fine)))), ['usage-description'], fine.slice(0, 30));
  }
});

test('empty-usage-description: the placeholders of the configuration are added, removed and replaced', () => {
  const soon = ios(plist(str('NSCameraUsageDescription', 'Coming soon!')));
  assert.deepEqual(rulesIn(soon), ['usage-description']);
  assert.deepEqual(rulesIn(soon, { placeholders: { add: ['COMING   soon'] } }), ['empty-usage-description']);
  assert.deepEqual(rulesIn(ios(plist(str('NSCameraUsageDescription', 'test'))), { placeholders: { remove: ['test'] } }), ['usage-description']);
  assert.deepEqual(rulesIn(ios(plist(str('NSCameraUsageDescription', 'n/a'))), { placeholders: ['other'] }), ['usage-description']);
  assert.ok(DEFAULT_PLACEHOLDERS.includes('n/a'));
  assert.equal(purposeProblem('K', { type: 'string', value: 'Fine reason here.' }, []), null);
  assert.equal(purposeProblem('K', { type: 'array', value: [] }, []), 'is an array, not a string');
});

test('missing-usage-description: background modes, device capabilities and the always-location key, each missing key once', () => {
  const text = plist(
    '<key>UIBackgroundModes</key><array><string>location</string><string>bluetooth-central</string><string>audio</string></array>',
    '<key>UIRequiredDeviceCapabilities</key><array><string>still-camera</string><string>video-camera</string><string>microphone</string><string>gps</string><string>healthkit</string><string>nfc</string><string>arm64</string></array>',
    str('NSMicrophoneUsageDescription', 'Record the sound of the waves for the tide entry.')
  );
  const r = reportOf(ios(text));
  assert.deepEqual(only(r, 'missing-usage-description').map((f) => f.split(':')[0]), [
    'UIBackgroundModes holds location, but NSLocationWhenInUseUsageDescription (location while in use) is missing',
    'UIBackgroundModes holds location, but NSLocationAlwaysAndWhenInUseUsageDescription (location at all times) is missing',
    'UIBackgroundModes holds bluetooth-central, but NSBluetoothAlwaysUsageDescription (Bluetooth) is missing',
    'UIRequiredDeviceCapabilities requires still-camera, but NSCameraUsageDescription (camera) is missing',
    'UIRequiredDeviceCapabilities requires healthkit, but NSHealthShareUsageDescription (reading health data) is missing',
    'UIRequiredDeviceCapabilities requires nfc, but NFCReaderUsageDescription (NFC) is missing'
  ]);
  assert.equal(findingsOf(r, 'missing-usage-description')[0].line, lineOf(text, '<string>location'));
  const dict = plist('<key>UIRequiredDeviceCapabilities</key><dict><key>microphone</key><true/><key>front-facing-camera</key><false/></dict>');
  assert.deepEqual(only(reportOf(ios(dict)), 'missing-usage-description').map((f) => f.split(',')[0]), ['UIRequiredDeviceCapabilities requires microphone']);
  const always = plist(str('NSLocationAlwaysAndWhenInUseUsageDescription', 'Log the tide at your beach in the background.'));
  assert.deepEqual(only(reportOf(ios(always)), 'missing-usage-description').map((f) => f.split(':')[0]), ['NSLocationAlwaysAndWhenInUseUsageDescription is set, but NSLocationWhenInUseUsageDescription (location while in use) is missing']);
  const both = plist(always.slice(always.indexOf('<key>NSLocationAlways'), always.lastIndexOf('</dict>')), str('NSLocationWhenInUseUsageDescription', 'Show the tide at your beach.'));
  assert.deepEqual(rulesIn(ios(both)), ['usage-description', 'usage-description']);
  assert.deepEqual(rulesIn(ios(plist('<key>UIBackgroundModes</key><string>location</string>'))), [], 'a background mode that is not an array is not read');
});

test('ats-arbitrary-loads: NSAllowsArbitraryLoads true, with a note when a narrower key makes newer systems ignore it', () => {
  const r = reportOf(ios(plist('<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><true/></dict>')));
  assert.deepEqual(only(r, 'ats-arbitrary-loads'), ['NSAllowsArbitraryLoads is true: App Transport Security is off for every domain not named in NSExceptionDomains, so plain HTTP and weak TLS are allowed']);
  const narrow = reportOf(ios(plist('<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><string>YES</string><key>NSAllowsLocalNetworking</key><true/><key>NSAllowsArbitraryLoadsForMedia</key><false/></dict>')));
  assert.match(only(narrow, 'ats-arbitrary-loads')[0], /; iOS 10 and later ignore it because NSAllowsArbitraryLoadsForMedia and NSAllowsLocalNetworking are also set, older systems do not$/);
  assert.deepEqual(rulesIn(ios(plist('<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><false/></dict>'))), []);
  assert.deepEqual(rulesIn(ios(plist('<key>NSAllowsArbitraryLoads</key><true/>'))), [], 'outside NSAppTransportSecurity the key means nothing');
  assert.deepEqual(rulesIn(ios(plist('<key>NSAppTransportSecurity</key><array/>'))), []);
});

test('ats-exception: web content, media, insecure HTTP and old TLS per domain, but not TLS 1.2 or a key set to false', () => {
  const text = plist('<key>NSAppTransportSecurity</key><dict>',
    '<key>NSAllowsArbitraryLoadsInWebContent</key><true/><key>NSAllowsArbitraryLoadsForMedia</key><true/>',
    '<key>NSExceptionDomains</key><dict>',
    '<key>old.test</key><dict><key>NSIncludesSubdomains</key><true/><key>NSExceptionAllowsInsecureHTTPLoads</key><true/><key>NSExceptionMinimumTLSVersion</key><string>TLSv1.1</string></dict>',
    '<key>cdn.test</key><dict><key>NSThirdPartyExceptionAllowsInsecureHTTPLoads</key><true/><key>NSThirdPartyExceptionMinimumTLSVersion</key><string>TLSv1.0</string></dict>',
    '<key>fine.test</key><dict><key>NSExceptionAllowsInsecureHTTPLoads</key><false/><key>NSExceptionMinimumTLSVersion</key><string>TLSv1.2</string></dict>',
    '<key>odd.test</key><string>x</string>',
    '</dict></dict>');
  assert.deepEqual(only(reportOf(ios(text)), 'ats-exception'), [
    'NSAllowsArbitraryLoadsInWebContent is true: web views may load pages over plain HTTP',
    'NSAllowsArbitraryLoadsForMedia is true: media may load over plain HTTP',
    'NSExceptionAllowsInsecureHTTPLoads is true for old.test and its subdomains: plain HTTP is allowed to it',
    'NSExceptionMinimumTLSVersion is TLSv1.1 for old.test and its subdomains: TLS versions below 1.2 are allowed to it',
    'NSThirdPartyExceptionAllowsInsecureHTTPLoads is true for cdn.test: plain HTTP is allowed to it',
    'NSThirdPartyExceptionMinimumTLSVersion is TLSv1.0 for cdn.test: TLS versions below 1.2 are allowed to it'
  ]);
  const summary = reportOf(ios(text)).summary.plists[0];
  assert.equal(summary.exceptionDomains, 4);
  assert.equal(summary.arbitraryLoads, false);
});

test('file-sharing and encryption-declaration: info for file sharing and opening in place, and for a missing encryption key', () => {
  const r = reportOf(ios(plist('<key>UIFileSharingEnabled</key><true/><key>LSSupportsOpeningDocumentsInPlace</key><true/>')));
  assert.deepEqual(only(r, 'file-sharing'), ['UIFileSharingEnabled is true: the files of the Documents folder of the app are shared with the user', 'LSSupportsOpeningDocumentsInPlace is true: the app may open the original document of a file provider in place, not a copy']);
  assert.deepEqual(rulesIn(ios(plist('<key>UIFileSharingEnabled</key><false/><key>LSSupportsOpeningDocumentsInPlace</key><string>NO</string>'))), []);
  const bare = '<plist version="1.0">\n<dict>\n<key>CFBundleIdentifier</key><string>example.app</string>\n</dict>\n</plist>\n';
  const e = reportOf(ios(bare));
  assert.deepEqual(only(e, 'encryption-declaration'), ['ITSAppUsesNonExemptEncryption is not set: App Store Connect asks the export compliance questions at every upload']);
  assert.equal(findingsOf(e, 'encryption-declaration')[0].line, lineOf(bare, '<dict>'));
  assert.equal(e.summary.plists[0].bundleId, 'example.app');
  assert.deepEqual(rulesIn(ios(plist())), [], 'the key set to false declares the answer');
});

test('plist: a document type with an entity is refused and nothing in the file is reported; a key in a comment is not read', () => {
  const text = '<?xml version="1.0"?>\n<!DOCTYPE plist [\n<!ENTITY r "x">\n]>\n<plist version="1.0"><dict><key>NSCameraUsageDescription</key><string>&r;</string></dict></plist>\n';
  const r = reportOf(ios(text));
  assert.deepEqual(rulesOf(r), ['unparsable-file']);
  assert.equal(r.findings[0].line, 2);
  assert.deepEqual(rulesIn(ios(plist('<!-- <key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><true/></dict> -->'))), []);
});
