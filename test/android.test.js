import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANDROID_NS, COMPONENTS, DANGEROUS_PERMISSIONS, FILE_PROVIDER_PATHS, NEED_EXPORTED, PATH_ELEMENTS, RESTRICTED_PERMISSIONS, SPECIAL_PERMISSIONS, XmlError, boolOf, checkManifest, parseXml, permissionInfo, readManifest, readResource, referencesOf, resourcePath, xmlResource } from '../src/index.js';
import { ANDROID, android, appManifest, columnOf, findingsOf, lineOf, manifest, reportOf, rulesIn, rulesOf } from './helpers.js';

// The Android rules, each with the form that is reported and the form next to it that is not, written inline.

const only = (r, rule) => findingsOf(r, rule).map((f) => f.found);

test('android: the namespace, the components and the path elements the checks know', () => {
  assert.equal(ANDROID_NS, 'http://schemas.android.com/apk/res/android');
  assert.deepEqual(COMPONENTS, ['activity', 'activity-alias', 'service', 'receiver', 'provider']);
  assert.deepEqual(NEED_EXPORTED, ['activity', 'activity-alias', 'service', 'receiver']);
  assert.equal(FILE_PROVIDER_PATHS, 'android.support.FILE_PROVIDER_PATHS');
  assert.ok(Object.hasOwn(PATH_ELEMENTS, 'root-path'));
  assert.deepEqual([{ value: 'true' }, { value: ' false ' }, { value: '@bool/x' }, null].map(boolOf), [true, false, null, null]);
  assert.deepEqual(xmlResource('@xml/network_security_config'), { name: 'network_security_config', plain: true });
  assert.deepEqual(xmlResource('@xml/../x'), { name: '../x', plain: false });
  assert.equal(xmlResource('@raw/x'), null);
  assert.equal(resourcePath('a/b/AndroidManifest.xml', 'x'), 'a/b/res/xml/x.xml');
  assert.equal(resourcePath('AndroidManifest.xml', 'x'), 'res/xml/x.xml');
});

test('permissions: dangerous, special and restricted, from the Android reference and the Play pages', () => {
  assert.equal(Object.keys(DANGEROUS_PERMISSIONS).length, 43);
  for (const k of Object.keys(RESTRICTED_PERMISSIONS)) assert.ok(Object.hasOwn(DANGEROUS_PERMISSIONS, k) || Object.hasOwn(SPECIAL_PERMISSIONS, k), k);
  assert.deepEqual(permissionInfo('android.permission.CAMERA'), { short: 'CAMERA', kind: 'dangerous', what: 'camera', restricted: null });
  assert.equal(permissionInfo('android.permission.QUERY_ALL_PACKAGES').kind, 'special');
  assert.match(permissionInfo('android.permission.READ_SMS').restricted, /default SMS handler/);
  assert.equal(permissionInfo('android.permission.INTERNET'), null);
  assert.equal(permissionInfo('com.example.permission.CAMERA'), null);
  assert.equal(permissionInfo('android.permission.__proto__'), null);
  assert.equal(permissionInfo(null), null);
});

test('dangerous-permission: a runtime or special permission once per name, with maxSdkVersion; a normal one is not reported', () => {
  const text = appManifest('', '').replace('<application', [
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission-sdk-23 android:name="android.permission.RECORD_AUDIO" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />',
    '<uses-permission name="android.permission.READ_CONTACTS" />',
    '<application'
  ].join('\n'));
  const r = reportOf(android(text));
  assert.deepEqual(only(r, 'dangerous-permission'), [
    'android.permission.CAMERA is requested: a dangerous permission (camera) that the user grants at run time',
    'android.permission.RECORD_AUDIO is requested: a dangerous permission (microphone) that the user grants at run time',
    'android.permission.READ_EXTERNAL_STORAGE is requested: a dangerous permission (shared storage) that the user grants at run time; requested up to API level 32 only',
    'android.permission.REQUEST_INSTALL_PACKAGES is requested: a special permission (installing other apps)'
  ]);
  assert.equal(findingsOf(r, 'dangerous-permission')[0].line, lineOf(text, 'permission.CAMERA'));
  assert.deepEqual(rulesOf(r), ['dangerous-permission', 'dangerous-permission', 'dangerous-permission', 'dangerous-permission'], 'a name without the android prefix is not read');
});

test('restricted-permission: background location, SMS, call log and QUERY_ALL_PACKAGES are warnings instead of info', () => {
  const names = ['ACCESS_BACKGROUND_LOCATION', 'SEND_SMS', 'RECEIVE_SMS', 'READ_SMS', 'RECEIVE_WAP_PUSH', 'RECEIVE_MMS', 'READ_CALL_LOG', 'WRITE_CALL_LOG', 'PROCESS_OUTGOING_CALLS', 'QUERY_ALL_PACKAGES'];
  const text = manifest(...names.map((n) => `<uses-permission android:name="android.permission.${n}" />`), '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />');
  const r = reportOf(android(text));
  assert.equal(findingsOf(r, 'restricted-permission').length, 10);
  assert.equal(findingsOf(r, 'restricted-permission')[0].level, 'warning');
  assert.deepEqual(only(r, 'dangerous-permission'), ['android.permission.ACCESS_COARSE_LOCATION is requested: a dangerous permission (approximate location) that the user grants at run time']);
  assert.match(only(r, 'restricted-permission').at(-1), /QUERY_ALL_PACKAGES is requested: Google Play allows the visibility of every installed app only for an approved use/);
});

test('debuggable: only the literal true on <application>; false, a resource and the attribute on another element are not reported', () => {
  const text = appManifest('android:debuggable="true"');
  const r = reportOf(android(text));
  assert.deepEqual(only(r, 'debuggable'), ['android:debuggable="true" on <application>: the build can be debugged on any device, and app stores do not accept a debuggable app']);
  assert.equal(findingsOf(r, 'debuggable')[0].level, 'error');
  assert.equal(findingsOf(r, 'debuggable')[0].column, columnOf(text, 'android:debuggable'));
  for (const attrs of ['android:debuggable="false"', 'android:debuggable="@bool/debug"', 'android:debuggable="${debuggable}"', 'debuggable="true"']) assert.deepEqual(rulesIn(android(appManifest(attrs))), [], attrs);
  assert.deepEqual(rulesIn(android(appManifest('', '<activity android:name=".A" android:debuggable="true" />'))), []);
});

test('debuggable: the android namespace bound to another prefix is read the same, and another namespace is not', () => {
  const text = '<manifest xmlns:a="http://schemas.android.com/apk/res/android" xmlns:android="urn:other"><application a:allowBackup="false" android:debuggable="true" a:debuggable="true" /></manifest>';
  const r = reportOf(android(text));
  assert.deepEqual(rulesOf(r), ['debuggable']);
  assert.equal(findingsOf(r, 'debuggable')[0].column, text.indexOf('a:debuggable') - text.lastIndexOf('\n', text.indexOf('a:debuggable')));
});

test('allow-backup: true, or not set since true is the default; false is not reported; backup rules are named', () => {
  const missing = manifest('<application android:fullBackupContent="@xml/backup" android:dataExtractionRules="@xml/rules" />');
  assert.deepEqual(only(reportOf(android(missing)), 'allow-backup'), ['android:allowBackup is not set, and it is true by default: the app data goes into cloud backups and device-to-device transfers; backup rules are named in android:dataExtractionRules (@xml/rules) and android:fullBackupContent (@xml/backup), which the tool does not read']);
  const yes = manifest('<application android:allowBackup="true" />');
  assert.deepEqual(only(reportOf(android(yes)), 'allow-backup'), ['android:allowBackup="true": the app data goes into cloud backups and device-to-device transfers']);
  assert.deepEqual(rulesIn(android(manifest('<application android:allowBackup="false" />'))), []);
  assert.deepEqual(rulesIn(android(manifest('<application android:allowBackup="@bool/backup" />'))), [], 'a resource is not read');
  assert.deepEqual(rulesIn(android(manifest('<uses-sdk android:targetSdkVersion="34" />'))), [], 'no application, nothing to back up');
});

test('cleartext-traffic: usesCleartextTraffic true, a base-config that permits cleartext, and a target below 28', () => {
  const text = appManifest('android:usesCleartextTraffic="true"');
  assert.deepEqual(only(reportOf(android(text)), 'cleartext-traffic'), ['android:usesCleartextTraffic="true": every connection of the app may use cleartext HTTP']);
  const nsc = '<network-security-config>\n  <base-config cleartextTrafficPermitted="true" />\n</network-security-config>\n';
  const withConfig = reportOf(android(appManifest('android:usesCleartextTraffic="true" android:networkSecurityConfig="@xml/nsc"'), { nsc }));
  assert.deepEqual(findingsOf(withConfig, 'cleartext-traffic').map((f) => [f.file, f.line]), [['app/AndroidManifest.xml', 2], ['app/res/xml/nsc.xml', lineOf(nsc, 'cleartextTrafficPermitted')]]);
  assert.match(findingsOf(withConfig, 'cleartext-traffic')[0].found, /; on Android 7\.0 and higher the network security config @xml\/nsc decides instead$/);
  const old = manifest('<uses-sdk android:targetSdkVersion="27" />', '<application android:allowBackup="false" />');
  assert.deepEqual(only(reportOf(android(old)), 'cleartext-traffic'), ['android:targetSdkVersion 27 is below 28, so cleartext traffic is permitted by default, and neither android:usesCleartextTraffic nor a base-config turns it off']);
  for (const near of [
    manifest('<uses-sdk android:targetSdkVersion="28" />', '<application android:allowBackup="false" />'),
    manifest('<uses-sdk android:targetSdkVersion="27" />', '<application android:allowBackup="false" android:usesCleartextTraffic="false" />'),
    manifest('<uses-sdk android:targetSdkVersion="${target}" />', '<application android:allowBackup="false" />'),
    appManifest('android:usesCleartextTraffic="false"')
  ]) assert.deepEqual(rulesIn(android(near)), [], near);
  const off = '<network-security-config><base-config cleartextTrafficPermitted="false" /></network-security-config>';
  assert.deepEqual(rulesIn(android(manifest('<uses-sdk android:targetSdkVersion="23" />', '<application android:allowBackup="false" android:networkSecurityConfig="@xml/n" />'), { n: off })), [], 'a base-config that turns cleartext off');
});

test('cleartext-domain and user-certificates: per domain, nested, and never in debug-overrides', () => {
  const nsc = [
    '<network-security-config>',
    '  <base-config><trust-anchors><certificates src="system" /><certificates src="user" /></trust-anchors></base-config>',
    '  <domain-config cleartextTrafficPermitted="true">',
    '    <domain includeSubdomains="true">a.test</domain><domain>b.test</domain>',
    '    <domain-config cleartextTrafficPermitted="true"><domain>c.test</domain>',
    '      <trust-anchors><certificates src="user" /></trust-anchors></domain-config>',
    '  </domain-config>',
    '  <domain-config cleartextTrafficPermitted="false"><domain>d.test</domain></domain-config>',
    '  <domain-config><domain>e.test</domain></domain-config>',
    '  <debug-overrides><trust-anchors><certificates src="user" /></trust-anchors></debug-overrides>',
    '</network-security-config>'
  ].join('\n');
  const r = reportOf(android(appManifest('android:networkSecurityConfig="@xml/nsc"'), { nsc }));
  assert.deepEqual(only(r, 'cleartext-domain'), ['<domain-config cleartextTrafficPermitted="true"> permits cleartext traffic to a.test and its subdomains, b.test', '<domain-config cleartextTrafficPermitted="true"> permits cleartext traffic to c.test']);
  assert.deepEqual(only(r, 'user-certificates'), ['<certificates src="user"/> in the base-config: certificate authorities the user installed are trusted for every domain, so a proxy with such a certificate can read the traffic', '<certificates src="user"/> in the domain-config of c.test: certificate authorities the user installed are trusted for it']);
  assert.deepEqual(findingsOf(r, 'user-certificates').map((f) => f.line), [lineOf(nsc, 'src="user"'), lineOf(nsc, 'src="user"', 2)]);
  assert.equal(findingsOf(r, 'cleartext-domain')[0].level, 'warning');
  assert.deepEqual(rulesOf(r).sort(), ['cleartext-domain', 'cleartext-domain', 'user-certificates', 'user-certificates']);
});

test('exported-component: exported with no permission, with half a provider permission, or a permission of level normal', () => {
  const lines = [
    '<permission android:name="example.p.NORMAL" />',
    '<permission android:name="example.p.SIG" android:protectionLevel="signature" />',
    '<application android:allowBackup="false">',
    '<activity android:name=".Share" android:exported="true" />',
    '<service android:name=".Sync" android:exported="true" android:permission="example.p.NORMAL" />',
    '<receiver android:name=".Guarded" android:exported="true" android:permission="example.p.SIG" />',
    '<receiver android:name=".System" android:exported="true" android:permission="android.permission.RECEIVE_BOOT_COMPLETED" />',
    '<provider android:name=".Half" android:authorities="a" android:exported="true" android:readPermission="example.p.SIG" />',
    '<provider android:name=".Both" android:authorities="b" android:exported="true" android:readPermission="example.p.SIG" android:writePermission="example.p.SIG" />',
    '<activity-alias android:name=".Alias" android:exported="true" />',
    '<activity android:name=".Inner" android:exported="false" />',
    '<activity android:name=".Plain" />',
    '</application>'
  ];
  const text = manifest(...lines);
  const r = reportOf(android(text));
  assert.deepEqual(only(r, 'exported-component'), [
    '<activity android:name=".Share"> is exported with no permission: any app can start it',
    '<service android:name=".Sync"> is exported with the permission example.p.NORMAL, which this manifest declares with protection level normal, so any app can hold it: any app can start or bind to it',
    '<provider android:name=".Half"> is exported with a permission for only one of reading and writing: any app can query or change its data',
    '<activity-alias android:name=".Alias"> is exported with no permission: any app can start it'
  ]);
  assert.equal(findingsOf(r, 'exported-component')[0].line, lineOf(text, '.Share'));
});

test('exported-component: the launcher activity and a permission on the application are not reported', () => {
  const launcher = '<activity android:name=".Main" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter></activity>';
  const mainOnly = '<activity android:name=".Other" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN" /></intent-filter></activity>';
  assert.deepEqual(rulesIn(android(appManifest('', launcher))), []);
  assert.deepEqual(rulesIn(android(appManifest('', mainOnly))), ['exported-component'], 'MAIN without LAUNCHER');
  assert.deepEqual(rulesIn(android(appManifest('android:permission="example.p.SIG"', '<service android:name=".S" android:exported="true" />'))), [], 'the permission of the application applies');
  assert.deepEqual(rulesIn(android(appManifest('', '<service android:name=".S" android:exported="@bool/x" />'))), [], 'a resource is not read');
});

test('missing-exported: an intent filter without android:exported, but not on a provider or with the attribute set', () => {
  const filter = '<intent-filter><action android:name="android.intent.action.VIEW" /></intent-filter>';
  const text = appManifest('', `<activity android:name=".Link">${filter}</activity>`, `<service android:name=".S">${filter}</service>`, `<receiver android:name=".R">${filter}</receiver>`, `<activity-alias android:name=".A">${filter}</activity-alias>`, `<provider android:name=".P" android:authorities="p">${filter}</provider>`, `<activity android:name=".Set" android:exported="false">${filter}</activity>`, '<activity android:name=".NoFilter" />');
  const r = reportOf(android(text));
  assert.deepEqual(only(r, 'missing-exported'), ['.Link', '.S', '.R', '.A'].map((n, i) => `<${['activity', 'service', 'receiver', 'activity-alias'][i]} android:name="${n}"> has an <intent-filter> and no android:exported: the app cannot be installed on Android 12 and higher, and on older systems the component is exported`));
  assert.equal(findingsOf(r, 'missing-exported')[0].level, 'error');
  assert.equal(findingsOf(r, 'missing-exported')[1].line, lineOf(text, '.S"'));
});

test('provider-broad-paths: root-path and whole directories in the paths, and narrow paths that are not reported', () => {
  const paths = '<paths>\n<files-path name="ok" path="images/" />\n<cache-path name="c" path="." />\n<external-path name="e" path="/" />\n<external-files-path name="n" />\n<root-path name="r" path="sub/" />\n<unknown-path name="u" path="." />\n</paths>\n';
  const provider = '<provider android:name="androidx.core.content.FileProvider" android:authorities="f" android:exported="false" android:grantUriPermissions="true"><meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" /></provider>';
  const r = reportOf(android(appManifest('', provider), { file_paths: paths }));
  assert.deepEqual(only(r, 'provider-broad-paths'), [
    '<cache-path name="c" path="."> shares the cache directory of the app, not one subdirectory of it, through <provider android:name="androidx.core.content.FileProvider">',
    '<external-path name="e" path="/"> shares the whole external storage, not one subdirectory of it, through <provider android:name="androidx.core.content.FileProvider">',
    '<external-files-path name="n"> shares the external files directory of the app, not one subdirectory of it, through <provider android:name="androidx.core.content.FileProvider">',
    '<root-path name="r" path="sub/"> shares the root of the device file system through <provider android:name="androidx.core.content.FileProvider">'
  ]);
  assert.deepEqual(findingsOf(r, 'provider-broad-paths').map((f) => [f.file, f.line]), [['app/res/xml/file_paths.xml', 3], ['app/res/xml/file_paths.xml', 4], ['app/res/xml/file_paths.xml', 5], ['app/res/xml/file_paths.xml', 6]]);
});

test('provider-broad-paths: grantUriPermissions with no paths resource, and grant-uri-permission elements that cover every path', () => {
  const text = appManifest('',
    '<provider android:name=".All" android:authorities="a" android:exported="false" android:grantUriPermissions="true" />',
    '<provider android:name=".G" android:authorities="g" android:exported="false"><grant-uri-permission android:path="/" /><grant-uri-permission android:pathPrefix="" /><grant-uri-permission android:pathPattern=".*" /><grant-uri-permission android:pathPattern="/.*" /><grant-uri-permission android:pathPrefix="/shared/" /></provider>',
    '<provider android:name=".None" android:authorities="n" android:exported="false" android:grantUriPermissions="false" />');
  const r = reportOf(android(text));
  assert.deepEqual(only(r, 'provider-broad-paths'), [
    '<provider android:name=".All"> sets android:grantUriPermissions="true" and names no paths resource: a grant can reach any of its data',
    '<grant-uri-permission android:path="/"> of <provider android:name=".G"> covers every path of the provider',
    '<grant-uri-permission android:pathPrefix=""> of <provider android:name=".G"> covers every path of the provider',
    '<grant-uri-permission android:pathPattern=".*"> of <provider android:name=".G"> covers every path of the provider',
    '<grant-uri-permission android:pathPattern="/.*"> of <provider android:name=".G"> covers every path of the provider'
  ]);
});

test('missing-resource: a resource that is not next to the manifest, and a name that is not plain, are warnings', () => {
  const text = appManifest('android:networkSecurityConfig="@xml/nsc"', '<provider android:name=".F" android:authorities="f" android:exported="false" android:grantUriPermissions="true"><meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/../../secret" /></provider>');
  const r = reportOf(android(text));
  assert.deepEqual(only(r, 'missing-resource'), [
    'android:networkSecurityConfig names @xml/nsc, but res/xml/nsc.xml is not next to this manifest; its settings were not checked',
    'the android.support.FILE_PROVIDER_PATHS meta-data of .F names @xml/../../secret, which is not a plain resource name, so it was not read; its settings were not checked'
  ]);
  assert.deepEqual(rulesIn(android(appManifest('android:networkSecurityConfig="@raw/nsc"'))), [], 'only @xml/ references are read');
});

test('resources: a resource with the wrong root is refused, and a resource that cannot be parsed is an error of its own file', () => {
  const ref = appManifest('android:networkSecurityConfig="@xml/nsc"');
  const wrong = reportOf(android(ref, { nsc: '<paths><root-path name="r" /></paths>' }));
  assert.deepEqual(rulesOf(wrong), ['unparsable-file']);
  assert.equal(wrong.findings[0].file, 'app/res/xml/nsc.xml');
  assert.match(wrong.findings[0].found, /the root element is <paths>, but android:networkSecurityConfig names this file as a network security config; nothing in it is checked/);
  const broken = reportOf(android(ref, { nsc: '<network-security-config>' }));
  assert.deepEqual(rulesOf(broken), ['unparsable-file']);
  assert.match(broken.findings[0].found, /^line 1, column 1: the element <network-security-config> is not closed; nothing in the file is checked$/);
  const other = reportOf(android(ref, { nsc: '<resources />' }));
  assert.match(other.findings[0].found, /the root element is <resources>, not <network-security-config> or <paths>/);
});

test('manifest: the model of a manifest, its references, and a root that is not a manifest', () => {
  const m = readManifest(parseXml(`<manifest ${ANDROID} package="p"><uses-sdk android:targetSdkVersion="33" /><uses-sdk android:targetSdkVersion="20" /><permission android:name="x.P" android:protectionLevel="signature" /><application android:networkSecurityConfig="@xml/n"><provider android:name=".F"><meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/f" /></provider></application><application android:debuggable="true" /></manifest>`));
  assert.equal(m.package, 'p');
  assert.equal(m.targetSdk.value, 33, 'the first uses-sdk');
  assert.equal(m.declared.get('x.P'), 'signature');
  assert.equal(m.application.attrs.debuggable, null, 'the first application');
  assert.deepEqual(referencesOf(m).map((r) => [r.use, r.name]), [['network', 'n'], ['paths', 'f']]);
  assert.throws(() => readManifest(parseXml('<resources />')), (e) => e instanceof XmlError && /not <manifest>/.test(e.reason));
  assert.deepEqual(readResource(parseXml('<paths><files-path name="a" path="b" /><x /></paths>')).entries.map((e) => e.tag), ['files-path']);
  assert.deepEqual(checkManifest('a', readManifest(parseXml(`<manifest ${ANDROID}/>`)), () => null), []);
});

test('manifest: settings inside comments and CDATA are not read', () => {
  const text = appManifest('', '<!-- <activity android:name=".Old" android:exported="true" /> -->', '<![CDATA[<uses-permission android:name="android.permission.CAMERA" />]]>');
  assert.deepEqual(rulesIn(android(text)), []);
});
