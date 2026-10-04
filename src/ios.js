// The iOS side: the findings of the iOS rules in an Info.plist, read by src/plist.js. Only the keys at the top of the
// property list are read, as the system reads them; a value set through a build setting such as $(VALUE) is taken as
// written, and InfoPlist.strings and string catalogs are not read (docs/limits.md). docs/method.md says what each rule
// looks at.

import { entryOf, isTrue, namesOf } from './plist.js';
import { grouped } from './size.js';
import { placeholderForm } from './words.js';

// The protected resources of the usage description keys the reports name; any other key that ends in
// UsageDescription is read too, under its own name.
export const USAGE_KEYS = {
  NSAppleMusicUsageDescription: 'media library',
  NSBluetoothAlwaysUsageDescription: 'Bluetooth',
  NSBluetoothPeripheralUsageDescription: 'Bluetooth, before iOS 13',
  NSCalendarsFullAccessUsageDescription: 'calendars, full access',
  NSCalendarsUsageDescription: 'calendars',
  NSCalendarsWriteOnlyAccessUsageDescription: 'calendars, adding events',
  NSCameraUsageDescription: 'camera',
  NSContactsUsageDescription: 'contacts',
  NSFaceIDUsageDescription: 'Face ID',
  NSFocusStatusUsageDescription: 'Focus status',
  NSHealthShareUsageDescription: 'reading health data',
  NSHealthUpdateUsageDescription: 'writing health data',
  NSHomeKitUsageDescription: 'home data',
  NSLocalNetworkUsageDescription: 'local network',
  NSLocationAlwaysAndWhenInUseUsageDescription: 'location at all times',
  NSLocationAlwaysUsageDescription: 'location at all times, before iOS 11',
  NSLocationWhenInUseUsageDescription: 'location while in use',
  NSMicrophoneUsageDescription: 'microphone',
  NSMotionUsageDescription: 'motion and fitness',
  NSNearbyInteractionUsageDescription: 'nearby interaction',
  NSPhotoLibraryAddUsageDescription: 'adding to the photo library',
  NSPhotoLibraryUsageDescription: 'photo library',
  NSRemindersFullAccessUsageDescription: 'reminders, full access',
  NSRemindersUsageDescription: 'reminders',
  NSSensorKitUsageDescription: 'SensorKit',
  NSSiriUsageDescription: 'Siri',
  NSSpeechRecognitionUsageDescription: 'speech recognition',
  NSUserTrackingUsageDescription: 'tracking across apps and websites',
  NFCReaderUsageDescription: 'NFC'
};

// The usage descriptions a value of UIBackgroundModes or UIRequiredDeviceCapabilities needs.
export const BACKGROUND_NEEDS = {
  location: ['NSLocationWhenInUseUsageDescription', 'NSLocationAlwaysAndWhenInUseUsageDescription'],
  'bluetooth-central': ['NSBluetoothAlwaysUsageDescription'],
  'bluetooth-peripheral': ['NSBluetoothAlwaysUsageDescription']
};
export const CAPABILITY_NEEDS = {
  'still-camera': ['NSCameraUsageDescription'],
  'auto-focus-camera': ['NSCameraUsageDescription'],
  'front-facing-camera': ['NSCameraUsageDescription'],
  'camera-flash': ['NSCameraUsageDescription'],
  'video-camera': ['NSCameraUsageDescription'],
  microphone: ['NSMicrophoneUsageDescription'],
  'location-services': ['NSLocationWhenInUseUsageDescription'],
  gps: ['NSLocationWhenInUseUsageDescription'],
  'bluetooth-le': ['NSBluetoothAlwaysUsageDescription'],
  healthkit: ['NSHealthShareUsageDescription'],
  nfc: ['NFCReaderUsageDescription']
};

// The beginnings that mark a text as a placeholder, in the compared form.
export const PLACEHOLDER_STARTS = ['todo', 'fixme', 'tbd', 'lorem ipsum', 'placeholder'];

// The longest usage description, in bytes of UTF-8, that the system accepts is one byte under this.
export const MAX_PURPOSE_BYTES = 4000;

const TYPE_NAMES = { boolean: 'a Boolean', integer: 'an integer', real: 'a real number', date: 'a date', data: 'data', array: 'an array', dict: 'a dictionary' };

// Why a usage description text is not a valid purpose string, or null when it is one.
export function purposeProblem(key, value, placeholders) {
  if (value.type !== 'string') return `is ${TYPE_NAMES[value.type]}, not a string`;
  const text = value.value;
  if (!text.trim()) return 'is empty';
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes >= MAX_PURPOSE_BYTES) return `is ${grouped(bytes)} bytes long; a purpose string must be shorter than ${grouped(MAX_PURPOSE_BYTES)} bytes`;
  const form = placeholderForm(text);
  const shown = text.trim().slice(0, 40);
  if (placeholders.includes(form) || PLACEHOLDER_STARTS.some((p) => form === p || form.startsWith(`${p} `) || form.startsWith(`${p}:`))) return `holds the placeholder "${shown}"`;
  if (!/[a-z0-9]/.test(form) && !/[^\x00-\x7f]/.test(form)) return `holds only punctuation ("${shown}")`;
  if (form === placeholderForm(key)) return 'holds only the name of the key';
  return null;
}

const quoted = (text) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return `"${t.length > 120 ? `${t.slice(0, 117)}...` : t}"`;
};

// The findings of an Info.plist: [{ rule, file, offset, found }], and a summary of what it declares.
export function checkPlist(file, top, config) {
  const out = [];
  const add = (rule, offset, found) => out.push({ rule, file, offset, found });
  const usage = top.value.filter((e) => e.key.endsWith('UsageDescription'));
  for (const e of usage) {
    const what = Object.hasOwn(USAGE_KEYS, e.key) ? ` (${USAGE_KEYS[e.key]})` : '';
    const problem = purposeProblem(e.key, e.value, config.placeholders);
    if (problem) add('empty-usage-description', e.offset, `${e.key}${what} ${problem}: the system shows no useful reason when it asks the user, and App Review rejects an app whose purpose string is not valid`);
    else add('usage-description', e.offset, `${e.key}${what}: ${quoted(e.value.value)}`);
  }
  const has = (key) => top.value.some((e) => e.key === key);
  const missing = new Map();
  const need = (keys, offset, because) => {
    for (const k of keys) if (!has(k) && !missing.has(k)) missing.set(k, { offset, because });
  };
  const modes = entryOf(top, 'UIBackgroundModes');
  if (modes && modes.value.type === 'array') {
    for (const v of modes.value.value) if (v.type === 'string' && Object.hasOwn(BACKGROUND_NEEDS, v.value.trim())) need(BACKGROUND_NEEDS[v.value.trim()], v.offset, `UIBackgroundModes holds ${v.value.trim()}`);
  }
  const caps = entryOf(top, 'UIRequiredDeviceCapabilities');
  if (caps) {
    const items = caps.value.type === 'array' ? caps.value.value.filter((v) => v.type === 'string').map((v) => ({ name: v.value.trim(), offset: v.offset })) : caps.value.type === 'dict' ? caps.value.value.filter((x) => isTrue(x.value)).map((x) => ({ name: x.key, offset: x.offset })) : [];
    for (const c of items) if (Object.hasOwn(CAPABILITY_NEEDS, c.name)) need(CAPABILITY_NEEDS[c.name], c.offset, `UIRequiredDeviceCapabilities requires ${c.name}`);
  }
  const always = entryOf(top, 'NSLocationAlwaysAndWhenInUseUsageDescription');
  if (always) need(['NSLocationWhenInUseUsageDescription'], always.offset, 'NSLocationAlwaysAndWhenInUseUsageDescription is set');
  for (const [k, m] of missing) add('missing-usage-description', m.offset, `${m.because}, but ${k}${Object.hasOwn(USAGE_KEYS, k) ? ` (${USAGE_KEYS[k]})` : ''} is missing: the app cannot ask for that access, and an attempt to use it fails and may end the app`);

  const ats = entryOf(top, 'NSAppTransportSecurity');
  const atsDict = ats && ats.value.type === 'dict' ? ats.value : null;
  let arbitrary = false;
  let exceptionDomains = 0;
  if (atsDict) {
    const loads = entryOf(atsDict, 'NSAllowsArbitraryLoads');
    const narrower = ['NSAllowsArbitraryLoadsInWebContent', 'NSAllowsArbitraryLoadsForMedia', 'NSAllowsLocalNetworking'].filter((k) => entryOf(atsDict, k));
    if (loads && isTrue(loads.value)) {
      arbitrary = true;
      const ignored = narrower.length ? `; iOS 10 and later ignore it because ${narrower.join(' and ')} ${narrower.length === 1 ? 'is' : 'are'} also set, older systems do not` : '';
      add('ats-arbitrary-loads', loads.offset, `NSAllowsArbitraryLoads is true: App Transport Security is off for every domain not named in NSExceptionDomains, so plain HTTP and weak TLS are allowed${ignored}`);
    }
    const web = entryOf(atsDict, 'NSAllowsArbitraryLoadsInWebContent');
    if (web && isTrue(web.value)) add('ats-exception', web.offset, 'NSAllowsArbitraryLoadsInWebContent is true: web views may load pages over plain HTTP');
    const media = entryOf(atsDict, 'NSAllowsArbitraryLoadsForMedia');
    if (media && isTrue(media.value)) add('ats-exception', media.offset, 'NSAllowsArbitraryLoadsForMedia is true: media may load over plain HTTP');
    const domains = entryOf(atsDict, 'NSExceptionDomains');
    if (domains && domains.value.type === 'dict') {
      exceptionDomains = domains.value.value.length;
      for (const d of domains.value.value) {
        if (d.value.type !== 'dict') continue;
        const sub = isTrue(entryOf(d.value, 'NSIncludesSubdomains')?.value) ? ' and its subdomains' : '';
        for (const k of ['NSExceptionAllowsInsecureHTTPLoads', 'NSThirdPartyExceptionAllowsInsecureHTTPLoads']) {
          const x = entryOf(d.value, k);
          if (x && isTrue(x.value)) add('ats-exception', x.offset, `${k} is true for ${d.key}${sub}: plain HTTP is allowed to it`);
        }
        for (const k of ['NSExceptionMinimumTLSVersion', 'NSThirdPartyExceptionMinimumTLSVersion']) {
          const x = entryOf(d.value, k);
          if (x && x.value.type === 'string' && ['TLSv1.0', 'TLSv1.1'].includes(x.value.value.trim())) add('ats-exception', x.offset, `${k} is ${x.value.value.trim()} for ${d.key}${sub}: TLS versions below 1.2 are allowed to it`);
        }
      }
    }
  }
  const sharing = entryOf(top, 'UIFileSharingEnabled');
  if (sharing && isTrue(sharing.value)) add('file-sharing', sharing.offset, 'UIFileSharingEnabled is true: the files of the Documents folder of the app are shared with the user');
  const inPlace = entryOf(top, 'LSSupportsOpeningDocumentsInPlace');
  if (inPlace && isTrue(inPlace.value)) add('file-sharing', inPlace.offset, 'LSSupportsOpeningDocumentsInPlace is true: the app may open the original document of a file provider in place, not a copy');
  if (!has('ITSAppUsesNonExemptEncryption')) add('encryption-declaration', top.offset, 'ITSAppUsesNonExemptEncryption is not set: App Store Connect asks the export compliance questions at every upload');

  const bundle = entryOf(top, 'CFBundleIdentifier');
  const summary = {
    bundleId: bundle && bundle.value.type === 'string' ? bundle.value.value.trim() : null,
    usageDescriptions: usage.map((e) => e.key),
    arbitraryLoads: arbitrary,
    exceptionDomains,
    backgroundModes: modes ? namesOf(modes.value) : []
  };
  return { findings: out, summary };
}
