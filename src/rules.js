// The rules and the result. Each rule belongs to a platform (android, ios) or to the input (always error), names the
// OWASP MASVS controls it supports (src/masvs.js), the points of the public pages it rests on (src/data.js), says where
// it is the tool's own choice, and what to change. docs/method.md says exactly what each rule looks at and what it
// cannot see. The checks themselves are in src/android.js and src/ios.js.

import { LEVELS } from './data.js';
import { grouped, plural } from './size.js';

export const RULES = [
  {
    id: 'dangerous-permission',
    key: 'dangerousPermission',
    platform: 'android',
    title: 'a dangerous or special permission is requested',
    masvs: ['MASVS-PRIVACY-1'],
    basis: ['runtimePermissions', 'specialPermissions', 'protectionLevels', 'maxSdkVersion'],
    own: 'one finding per permission name, at its first uses-permission or uses-permission-sdk-23 element; the dangerous ones are the system permissions of protection level dangerous, and the special ones a short list of powerful permissions (docs/method.md); a permission Google Play restricts is reported by restricted-permission instead',
    rule: () => 'a uses-permission element that names a system permission of protection level dangerous, or a special permission',
    fix: 'keep the permission only if a feature needs it, and ask for it when the user starts that feature'
  },
  {
    id: 'restricted-permission',
    key: 'restrictedPermission',
    platform: 'android',
    title: 'a permission Google Play restricts is requested',
    masvs: ['MASVS-PRIVACY-1'],
    basis: ['defaultHandlers', 'playSms', 'playBackgroundLocation', 'packageVisibility', 'playQueryAllPackages'],
    own: 'ACCESS_BACKGROUND_LOCATION, the SMS group (SEND_SMS, RECEIVE_SMS, READ_SMS, RECEIVE_WAP_PUSH, RECEIVE_MMS), the Call Log group (READ_CALL_LOG, WRITE_CALL_LOG, PROCESS_OUTGOING_CALLS) and QUERY_ALL_PACKAGES; a warning, because the store asks for a declaration or refuses the app, whatever the code does',
    rule: () => 'a uses-permission element that names a permission of the SMS or Call Log groups, location in the background, or QUERY_ALL_PACKAGES',
    fix: 'remove the permission, or prepare the declaration the store asks for; for package visibility, name the apps in a <queries> element instead'
  },
  {
    id: 'debuggable',
    key: 'debuggable',
    platform: 'android',
    title: 'the application is debuggable',
    masvs: ['MASVS-RESILIENCE-4'],
    basis: ['debuggableAttribute', 'debuggableRisk'],
    own: 'only the literal value true counts; a resource reference such as @bool/debug or a manifest placeholder is not resolved',
    rule: () => 'android:debuggable="true" on the application element',
    fix: 'remove android:debuggable from the manifest; the build tools set it for debug builds only'
  },
  {
    id: 'allow-backup',
    key: 'allowBackup',
    platform: 'android',
    title: 'the app data goes into backups',
    masvs: ['MASVS-STORAGE-2'],
    basis: ['allowBackupAttribute', 'autoBackup', 'backupRisks'],
    own: 'android:allowBackup="true", or no android:allowBackup at all, since true is the default; a backup rules resource that is named is mentioned but not read',
    rule: () => 'an application element with android:allowBackup="true" or without android:allowBackup',
    fix: 'set android:allowBackup="false", or keep backups and leave every sensitive file out with android:dataExtractionRules and android:fullBackupContent'
  },
  {
    id: 'cleartext-traffic',
    key: 'cleartextTraffic',
    platform: 'android',
    title: 'cleartext traffic is permitted for the whole app',
    masvs: ['MASVS-NETWORK-1'],
    basis: ['cleartextAttribute', 'networkConfig', 'cleartextRisk'],
    own: 'android:usesCleartextTraffic="true", a base-config with cleartextTrafficPermitted="true", or a targetSdkVersion below 28 written in the manifest with neither of the two set to false; a target API level set only in the Gradle build is not seen',
    rule: () => 'android:usesCleartextTraffic="true", <base-config cleartextTrafficPermitted="true">, or a uses-sdk targetSdkVersion below 28 that leaves cleartext on by default',
    fix: 'set android:usesCleartextTraffic="false" and cleartextTrafficPermitted="false" in the base-config, and use HTTPS; allow cleartext only to a named domain that needs it'
  },
  {
    id: 'cleartext-domain',
    key: 'cleartextDomain',
    platform: 'android',
    title: 'cleartext traffic is permitted for some domains',
    masvs: ['MASVS-NETWORK-1'],
    basis: ['networkConfig', 'cleartextRisk'],
    own: 'a domain-config with cleartextTrafficPermitted="true" is a warning, not an error, because its scope is the domains it names',
    rule: () => '<domain-config cleartextTrafficPermitted="true"> in the network security config',
    fix: 'move the domains to HTTPS and remove the domain-config, or keep it to the one host that cannot move'
  },
  {
    id: 'user-certificates',
    key: 'userCertificates',
    platform: 'android',
    title: 'certificate authorities the user installed are trusted',
    masvs: ['MASVS-NETWORK-1'],
    basis: ['userCertificates', 'networkConfig'],
    own: 'certificates src="user" in the trust anchors of a base-config or domain-config; inside debug-overrides it applies to debuggable builds only and is not reported',
    rule: () => '<certificates src="user"/> in a base-config or domain-config of the network security config',
    fix: 'trust the system certificate authorities only, and put certificates for testing under <debug-overrides>'
  },
  {
    id: 'exported-component',
    key: 'exportedComponent',
    platform: 'android',
    title: 'a component is exported without a permission',
    masvs: ['MASVS-PLATFORM-1'],
    basis: ['exportedAttribute', 'exportedRisk', 'applicationPermission'],
    own: 'an activity, activity-alias, service, receiver or provider with android:exported="true" and no android:permission of its own or of the application (for a provider, also no read and write permissions); an activity with the MAIN action and the LAUNCHER category is not reported, since it must be exported; a permission this manifest declares with protection level normal counts as none',
    rule: () => 'an app component with android:exported="true" and no permission that other apps must hold',
    fix: 'set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature'
  },
  {
    id: 'missing-exported',
    key: 'missingExported',
    platform: 'android',
    title: 'a component with an intent filter does not set android:exported',
    masvs: ['MASVS-PLATFORM-1'],
    basis: ['exportedRequired', 'exportedRisk'],
    own: 'an activity, activity-alias, service or receiver with an intent-filter and no android:exported; an error, because the app cannot be installed on Android 12 and higher',
    rule: () => 'an activity, activity-alias, service or receiver with an <intent-filter> child and no android:exported attribute',
    fix: 'set android:exported explicitly: true only when other apps must start the component, false otherwise'
  },
  {
    id: 'provider-broad-paths',
    key: 'providerBroadPaths',
    platform: 'android',
    title: 'a provider can grant access to more than it should',
    masvs: ['MASVS-PLATFORM-1', 'MASVS-STORAGE-2'],
    basis: ['providerGrants', 'fileProviderPaths', 'fileProviderRisks'],
    own: 'a FileProvider paths resource with root-path, or with a path element whose path is missing, empty, . or /; a grant-uri-permission whose path or pathPrefix is / or empty or whose pathPattern is .* or /.*; and a provider with grantUriPermissions="true" and no paths resource, whose grants reach all of its data',
    rule: () => 'a provider with grantUriPermissions="true" whose paths share a whole directory or the root, or a grant-uri-permission that covers every path',
    fix: 'share only the subdirectories that hold the files to share, never root-path, and name narrow grant-uri-permission paths'
  },
  {
    id: 'missing-resource',
    key: 'missingResource',
    platform: 'android',
    title: 'an XML resource the manifest names is not there',
    masvs: ['MASVS-NETWORK-1', 'MASVS-PLATFORM-1'],
    basis: ['networkConfig', 'fileProviderPaths'],
    own: 'the network security config and the FileProvider paths are looked for at res/xml/<name>.xml next to the manifest; a resource of another source set, flavor or library is not found, so its settings are not checked',
    rule: () => 'android:networkSecurityConfig or the FILE_PROVIDER_PATHS meta-data names @xml/<name>, and res/xml/<name>.xml is not next to the manifest',
    fix: 'name the manifest of the source set that holds res/xml, or check the merged resource by hand'
  },
  {
    id: 'usage-description',
    key: 'usageDescription',
    platform: 'ios',
    title: 'a usage description is declared',
    masvs: ['MASVS-PRIVACY-3'],
    basis: ['purposeStrings', 'infoPlist'],
    own: 'every key at the top of the Info.plist whose name ends in UsageDescription, with its text, so the list of protected resources the app asks for can be read in one place',
    rule: () => 'a key ending in UsageDescription at the top of the Info.plist, with a text that is not empty and not a placeholder',
    fix: 'check that each text says, in one specific sentence, why the app needs the resource'
  },
  {
    id: 'empty-usage-description',
    key: 'emptyUsageDescription',
    platform: 'ios',
    title: 'a usage description is empty, a placeholder or not a string',
    masvs: ['MASVS-PRIVACY-3'],
    basis: ['purposeStrings'],
    own: 'empty or white space only, a placeholder of the list of the configuration (docs/inputs.md), text that starts with TODO, FIXME, TBD, lorem ipsum or placeholder, punctuation only, the name of the key itself, 4,000 bytes or more, or a value that is not a string',
    rule: (config) => `a key ending in UsageDescription whose value is not a string, is empty, is 4,000 bytes or more, or is a placeholder (${plural(config.placeholders.length, 'listed text')} and the forms of docs/method.md)`,
    fix: 'write one specific sentence that tells the user why the app needs the resource'
  },
  {
    id: 'missing-usage-description',
    key: 'missingUsageDescription',
    platform: 'ios',
    title: 'a capability the Info.plist declares has no usage description',
    masvs: ['MASVS-PRIVACY-3'],
    basis: ['purposeStrings', 'backgroundModes', 'deviceCapabilities', 'locationAlways', 'locationWhenInUse', 'bluetoothAlways'],
    own: 'only what the Info.plist itself hints at: location, bluetooth-central or bluetooth-peripheral in UIBackgroundModes, a camera, microphone, location, Bluetooth, HealthKit or NFC capability in UIRequiredDeviceCapabilities, and the always-and-when-in-use location key without the when-in-use key; the code of the app is not read',
    rule: () => 'a background mode, required device capability or location key that needs a usage description the Info.plist does not hold',
    fix: 'add the usage description the capability needs, or remove the capability if the app does not use it'
  },
  {
    id: 'ats-arbitrary-loads',
    key: 'atsArbitraryLoads',
    platform: 'ios',
    title: 'App Transport Security is off for every domain',
    masvs: ['MASVS-NETWORK-1'],
    basis: ['ats', 'arbitraryLoads'],
    own: 'NSAllowsArbitraryLoads true in NSAppTransportSecurity; reported even when a web content, media or local networking key makes iOS 10 and later ignore it, because older systems and other platforms do not',
    rule: () => 'NSAppTransportSecurity with NSAllowsArbitraryLoads true',
    fix: 'remove NSAllowsArbitraryLoads and move the servers to HTTPS, or name the one domain that needs an exception in NSExceptionDomains'
  },
  {
    id: 'ats-exception',
    key: 'atsException',
    platform: 'ios',
    title: 'App Transport Security is loosened for some loads or domains',
    masvs: ['MASVS-NETWORK-1'],
    basis: ['ats', 'exceptionDomains', 'insecureHttp', 'minimumTls', 'arbitraryLoads'],
    own: 'NSAllowsArbitraryLoadsInWebContent or NSAllowsArbitraryLoadsForMedia true, and an exception domain with NSExceptionAllowsInsecureHTTPLoads or NSThirdPartyExceptionAllowsInsecureHTTPLoads true, or a minimum TLS version below TLSv1.2',
    rule: () => 'an ATS key that allows plain HTTP for web content, media or a named domain, or a minimum TLS version below 1.2',
    fix: 'move the domain to HTTPS with TLS 1.2 or higher and remove the exception'
  },
  {
    id: 'file-sharing',
    key: 'fileSharing',
    platform: 'ios',
    title: 'the Documents folder is shared, or documents are opened in place',
    masvs: ['MASVS-STORAGE-2'],
    basis: ['fileSharing', 'openInPlace'],
    own: 'listed as info so the files the app shows to the user are a known choice; UIFileSharingEnabled and LSSupportsOpeningDocumentsInPlace each give one finding when true',
    rule: () => 'UIFileSharingEnabled or LSSupportsOpeningDocumentsInPlace true',
    fix: 'keep sensitive files out of the Documents folder, or turn the key off'
  },
  {
    id: 'encryption-declaration',
    key: 'encryptionDeclaration',
    platform: 'ios',
    title: 'the use of encryption is not declared',
    masvs: ['MASVS-CRYPTO-1'],
    basis: ['encryptionKey'],
    own: 'ITSAppUsesNonExemptEncryption missing from the Info.plist; listed as info, a reminder about the export compliance answers, and MASVS-CRYPTO-1 is the closest control, not one the key proves',
    rule: () => 'an Info.plist without ITSAppUsesNonExemptEncryption',
    fix: 'add ITSAppUsesNonExemptEncryption with the answer that fits the app'
  },
  {
    id: 'unreadable-file',
    key: null,
    platform: 'input',
    title: 'a file that cannot be read',
    masvs: [],
    basis: ['infoPlist'],
    own: 'a file that is over its size limit, binary (a binary property list included), UTF-16, not valid UTF-8, a symbolic link or not there to open is an error and nothing in it is checked; this rule cannot be set lower or off',
    rule: () => 'a file of the input that the tool could not read as UTF-8 text',
    fix: 'give the file as UTF-8 XML; convert a binary property list with plutil -convert xml1'
  },
  {
    id: 'unparsable-file',
    key: null,
    platform: 'input',
    title: 'a file that is not XML the reader accepts, or not the document it should be',
    masvs: [],
    basis: ['xmlEntities', 'xxePrevention', 'infoPlist'],
    own: 'a tag, comment or value that is not closed, an end tag that does not match, a declared entity or an internal document type subset, or a root element of the wrong kind stops the reading of the file, and nothing in it is checked; this rule cannot be set lower or off',
    rule: () => 'a manifest, XML resource or property list that the XML reader refuses or that is not a manifest, a network security config, a paths resource or a property list',
    fix: 'correct the file at the line and column named; write the text of a declared entity out in full instead'
  }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

// True when a level is at or above another.
export const atOrAbove = (level, min) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

// The result: the run fails when a finding is at or above the level failOn. { pass, failOn, failing, byLevel, text }.
export function decide(findings, failOn) {
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of findings) byLevel[f.level] += 1;
  const failing = findings.filter((f) => atOrAbove(f.level, failOn)).length;
  const counts = ['error', 'warning', 'info'].filter((l) => byLevel[l]).map((l) => `${grouped(byLevel[l])} ${l}`);
  const text = failing
    ? `FAIL - ${plural(failing, 'finding')} at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`
    : `PASS - no finding at or above ${failOn}${counts.length ? ` (${counts.join(', ')})` : ''}`;
  return { pass: failing === 0, failOn, failing, byLevel, text };
}
