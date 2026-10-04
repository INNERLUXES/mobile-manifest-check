// The public pages the checks rest on, and what each says, written in this project's own words. research/sources.md
// lists every page with a longer note on each, and test/data.test.js checks that every page here is listed there and
// that every rule names points that exist. The code in src/ uses these constants and never writes a reason of its own
// in a report. The OWASP MASVS groups and controls each rule supports are in src/masvs.js.

const AD = 'https://developer.android.com';
const APPLE = 'https://developer.apple.com/documentation';
const PLIST = `${APPLE}/bundleresources/information-property-list`;

export const SOURCES = [
  { id: 'masvs', title: 'OWASP MASVS (OWASP Mobile Application Security)', url: 'https://mas.owasp.org/MASVS/' },
  { id: 'androidPermissions', title: 'Permissions on Android (Android Developers)', url: `${AD}/guide/topics/permissions/overview` },
  { id: 'androidManifestPermission', title: 'Manifest.permission (Android API reference)', url: `${AD}/reference/android/Manifest.permission` },
  { id: 'androidUsesPermission', title: '<uses-permission> (Android Developers)', url: `${AD}/guide/topics/manifest/uses-permission-element` },
  { id: 'androidDefaultHandlers', title: 'Permissions used only in default handlers (Android Developers)', url: `${AD}/guide/topics/permissions/default-handlers` },
  { id: 'androidPackageVisibility', title: 'Package visibility filtering on Android (Android Developers)', url: `${AD}/training/package-visibility` },
  { id: 'playSmsCallLog', title: 'Use of SMS or Call Log permission groups (Play Console Help)', url: 'https://support.google.com/googleplay/android-developer/answer/10208820' },
  { id: 'playBackgroundLocation', title: 'Understanding location in the background permissions (Play Console Help)', url: 'https://support.google.com/googleplay/android-developer/answer/9799150' },
  { id: 'playQueryAllPackages', title: 'Use of the broad package (App) visibility (QUERY_ALL_PACKAGES) permission (Play Console Help)', url: 'https://support.google.com/googleplay/android-developer/answer/10158779' },
  { id: 'androidApplication', title: '<application> (Android Developers)', url: `${AD}/guide/topics/manifest/application-element` },
  { id: 'androidDebuggable', title: 'android:debuggable (Android Developers, security risks)', url: `${AD}/privacy-and-security/risks/android-debuggable` },
  { id: 'androidAutoBackup', title: 'Back up user data with Auto Backup (Android Developers)', url: `${AD}/identity/data/autobackup` },
  { id: 'androidBackupRisks', title: 'Security recommendations for backups (Android Developers)', url: `${AD}/privacy-and-security/risks/backup-best-practices` },
  { id: 'androidSecurityConfig', title: 'Network security configuration (Android Developers)', url: `${AD}/privacy-and-security/security-config` },
  { id: 'androidCleartext', title: 'Cleartext communications (Android Developers, security risks)', url: `${AD}/privacy-and-security/risks/cleartext-communications` },
  { id: 'androidActivity', title: '<activity> (Android Developers)', url: `${AD}/guide/topics/manifest/activity-element` },
  { id: 'androidExported', title: 'android:exported (Android Developers, security risks)', url: `${AD}/privacy-and-security/risks/android-exported` },
  { id: 'android12', title: 'Behavior changes: Apps targeting Android 12 (Android Developers)', url: `${AD}/about/versions/12/behavior-changes-12` },
  { id: 'androidProvider', title: '<provider> (Android Developers)', url: `${AD}/guide/topics/manifest/provider-element` },
  { id: 'androidFileProvider', title: 'FileProvider (AndroidX API reference)', url: `${AD}/reference/androidx/core/content/FileProvider` },
  { id: 'androidFileProviderRisks', title: 'Improperly Exposed Directories to FileProvider (Android Developers, security risks)', url: `${AD}/privacy-and-security/risks/file-providers` },
  { id: 'appleInfoPlist', title: 'Information Property List (Apple Developer Documentation)', url: PLIST },
  { id: 'appleProtectedResources', title: 'Requesting access to protected resources (Apple Developer Documentation)', url: `${APPLE}/uikit/requesting-access-to-protected-resources` },
  { id: 'appleLocationWhenInUse', title: 'NSLocationWhenInUseUsageDescription (Apple Developer Documentation)', url: `${PLIST}/nslocationwheninuseusagedescription` },
  { id: 'appleLocationAlways', title: 'NSLocationAlwaysAndWhenInUseUsageDescription (Apple Developer Documentation)', url: `${PLIST}/nslocationalwaysandwheninuseusagedescription` },
  { id: 'appleBluetooth', title: 'NSBluetoothAlwaysUsageDescription (Apple Developer Documentation)', url: `${PLIST}/nsbluetoothalwaysusagedescription` },
  { id: 'appleBackgroundModes', title: 'UIBackgroundModes (Apple Developer Documentation)', url: `${PLIST}/uibackgroundmodes` },
  { id: 'appleDeviceCapabilities', title: 'UIRequiredDeviceCapabilities (Apple Developer Documentation)', url: `${PLIST}/uirequireddevicecapabilities` },
  { id: 'appleAts', title: 'NSAppTransportSecurity (Apple Developer Documentation)', url: `${PLIST}/nsapptransportsecurity` },
  { id: 'appleArbitraryLoads', title: 'NSAllowsArbitraryLoads (Apple Developer Documentation)', url: `${PLIST}/nsapptransportsecurity/nsallowsarbitraryloads` },
  { id: 'appleExceptionDomains', title: 'NSExceptionDomains (Apple Developer Documentation)', url: `${PLIST}/nsapptransportsecurity/nsexceptiondomains` },
  { id: 'appleInsecureHttp', title: 'NSExceptionAllowsInsecureHTTPLoads (Apple Developer Documentation)', url: `${PLIST}/nsexceptionallowsinsecurehttploads` },
  { id: 'appleMinimumTls', title: 'NSExceptionMinimumTLSVersion (Apple Developer Documentation)', url: `${PLIST}/nsexceptionminimumtlsversion` },
  { id: 'appleFileSharing', title: 'UIFileSharingEnabled (Apple Developer Documentation)', url: `${PLIST}/uifilesharingenabled` },
  { id: 'appleOpenInPlace', title: 'LSSupportsOpeningDocumentsInPlace (Apple Developer Documentation)', url: `${PLIST}/lssupportsopeningdocumentsinplace` },
  { id: 'appleEncryption', title: 'ITSAppUsesNonExemptEncryption (Apple Developer Documentation)', url: `${PLIST}/itsappusesnonexemptencryption` },
  { id: 'xmlSpec', title: 'Extensible Markup Language (XML) 1.0 (W3C)', url: 'https://www.w3.org/TR/xml/' },
  { id: 'owaspXxe', title: 'XML External Entity Prevention Cheat Sheet (OWASP)', url: 'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html' },
  { id: 'githubCommands', title: 'Workflow commands for GitHub Actions (GitHub Docs)', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands' },
  { id: 'rfc8259', title: 'RFC 8259, The JSON Data Interchange Format', url: 'https://www.rfc-editor.org/rfc/rfc8259' }
];

export const source = (id) => SOURCES.find((s) => s.id === id);

// What a page says, in this project's own words. Each point names its page.
export const POINTS = {
  masvsGroups: { source: 'masvs', text: 'the MASVS sorts the security requirements of a mobile app into control groups for storage, cryptography, authentication, network, platform interaction, code, resilience and privacy' },
  runtimePermissions: { source: 'androidPermissions', text: 'runtime permissions, also called dangerous permissions, reach restricted data or actions with more effect on the user, and the app must ask for them while it runs' },
  specialPermissions: { source: 'androidPermissions', text: 'special permissions guard powerful operations, such as drawing over other apps, and the user turns them on in the special app access page of the settings' },
  protectionLevels: { source: 'androidManifestPermission', text: 'the reference gives the protection level of every system permission, and the ones of level dangerous are the runtime permissions' },
  maxSdkVersion: { source: 'androidUsesPermission', text: 'a uses-permission element names one permission, and maxSdkVersion sets the highest API level at which the app is given it' },
  defaultHandlers: { source: 'androidDefaultHandlers', text: 'Google Play lets an app use the call log and SMS permission groups only when it is the default handler for that function, or meets an exception of the Play Console Help Center' },
  playSms: { source: 'playSmsCallLog', text: 'the policy limits the SMS and Call Log permission groups to the default handler of the function and a short list of exceptions, declared in the Play Console' },
  playBackgroundLocation: { source: 'playBackgroundLocation', text: 'an app that targets API level 29 or higher and holds ACCESS_BACKGROUND_LOCATION has to describe the feature that uses location in the background before it is published' },
  packageVisibility: { source: 'androidPackageVisibility', text: 'from Android 11 an app sees only some other apps by default; QUERY_ALL_PACKAGES sees all of them, and on Google Play its use needs approval' },
  playQueryAllPackages: { source: 'playQueryAllPackages', text: 'Google Play counts the list of installed apps as personal and sensitive data and allows QUERY_ALL_PACKAGES only for uses its policy accepts, declared in a form' },
  debuggableAttribute: { source: 'androidApplication', text: 'android:debuggable says whether the app can be debugged even on a device in user mode, and it is false by default' },
  debuggableRisk: { source: 'androidDebuggable', text: 'a debuggable app lets an attacker debug it and reach parts of it that should stay closed, so the flag must be false in the build that ships' },
  allowBackupAttribute: { source: 'androidApplication', text: 'android:allowBackup decides whether the app takes part in backup and restore, it is true by default, and dataExtractionRules can leave sensitive files out' },
  autoBackup: { source: 'androidAutoBackup', text: 'Auto Backup is on unless allowBackup is false, the page advises setting the attribute explicitly, and on Android 12 some devices still move data from device to device' },
  backupRisks: { source: 'androidBackupRisks', text: 'backups should hold no sensitive data: leave it out of the backup, or require end-to-end encryption where it cannot be left out' },
  cleartextAttribute: { source: 'androidApplication', text: 'android:usesCleartextTraffic is true by default up to target API level 27 and false from 28, and a network security config decides instead on API level 24 and higher' },
  networkConfig: { source: 'androidSecurityConfig', text: 'a network security config sets cleartextTrafficPermitted and the trusted certificate authorities for the whole app in base-config and per domain in domain-config, and debug-overrides apply only to debuggable builds' },
  userCertificates: { source: 'androidSecurityConfig', text: 'apps that target API level 24 and higher trust only the system certificate authorities by default; certificates src="user" adds the ones the user installed' },
  cleartextRisk: { source: 'androidCleartext', text: 'cleartext traffic can be read and changed by anyone on the network path, so data should go over encrypted channels, with cleartext opted out in the network security config' },
  exportedAttribute: { source: 'androidActivity', text: 'an exported activity can be started by any app by its class name, false is the default when it has no intent filter, and a launcher activity must be exported' },
  exportedRisk: { source: 'androidExported', text: 'the default of android:exported differed between versions and kinds of component, so it should always be set, or internal components may be exposed to other apps' },
  exportedRequired: { source: 'android12', text: 'an activity, service or broadcast receiver with an intent filter and no explicit android:exported cannot be installed on Android 12 or higher' },
  applicationPermission: { source: 'androidApplication', text: 'android:permission on the application sets a permission that applies to all of its components' },
  providerGrants: { source: 'androidProvider', text: 'with grantUriPermissions true, access can be granted to any of the data of a provider; with false, only to the subsets its grant-uri-permission elements name' },
  fileProviderPaths: { source: 'androidFileProvider', text: 'a FileProvider makes content URIs only for the directories its paths resource names, linked through the meta-data android.support.FILE_PROVIDER_PATHS, and it should not be exported' },
  fileProviderRisks: { source: 'androidFileProviderRisks', text: 'root-path exposes the root of the device, a path of . or / shares a whole directory, and external-path should not share sensitive data' },
  infoPlist: { source: 'appleInfoPlist', text: 'an Info.plist is a property list of keys and values that tells the system how to treat the bundle, and the file name is Info.plist' },
  purposeStrings: { source: 'appleProtectedResources', text: 'a protected resource needs a purpose string that is not blank, under 4,000 bytes, of the right type and specific about the reason; App Review rejects an app without one' },
  locationWhenInUse: { source: 'appleLocationWhenInUse', text: 'NSLocationWhenInUseUsageDescription is required when an iOS app reads the location while it is in use' },
  locationAlways: { source: 'appleLocationAlways', text: 'NSLocationAlwaysAndWhenInUseUsageDescription is required when an iOS app reads the location at all times, also in the background' },
  bluetoothAlways: { source: 'appleBluetooth', text: 'NSBluetoothAlwaysUsageDescription is required when the app uses the Bluetooth interface of the device' },
  backgroundModes: { source: 'appleBackgroundModes', text: 'UIBackgroundModes lists the services that need the app to run in the background, such as location, audio and the Bluetooth roles' },
  deviceCapabilities: { source: 'appleDeviceCapabilities', text: 'UIRequiredDeviceCapabilities names the features an app needs, such as a camera, the microphone, location services or NFC, as an array or as a dictionary of Booleans' },
  ats: { source: 'appleAts', text: 'App Transport Security makes connections use HTTPS with extra checks, and the NSAppTransportSecurity dictionary loosens it; each loosening lowers the security of the app' },
  arbitraryLoads: { source: 'appleArbitraryLoads', text: 'NSAllowsArbitraryLoads set to YES turns ATS off for every domain not named in NSExceptionDomains, needs a justification in App Review, and from iOS 10 is ignored when the web content, media or local networking key is present' },
  exceptionDomains: { source: 'appleExceptionDomains', text: 'NSExceptionDomains holds one dictionary of exceptions per domain, and a domain named there ignores the global ATS keys' },
  insecureHttp: { source: 'appleInsecureHttp', text: 'NSExceptionAllowsInsecureHTTPLoads set to YES allows plain HTTP to the domain, and App Review asks for a justification' },
  minimumTls: { source: 'appleMinimumTls', text: 'NSExceptionMinimumTLSVersion defaults to TLSv1.2, and a lower version needs a justification in App Review' },
  fileSharing: { source: 'appleFileSharing', text: 'UIFileSharingEnabled set to YES shares the files of the Documents folder of the app with the user; the default is NO' },
  openInPlace: { source: 'appleOpenInPlace', text: 'LSSupportsOpeningDocumentsInPlace says whether the app may open the original document of a file provider instead of a copy' },
  encryptionKey: { source: 'appleEncryption', text: 'ITSAppUsesNonExemptEncryption says whether the app uses encryption that is not exempt; without the key, App Store Connect asks the export compliance questions at every upload' },
  xmlEntities: { source: 'xmlSpec', text: 'XML predefines five entities (lt, gt, amp, apos, quot) and character references; any other entity must be declared in a document type declaration' },
  xxePrevention: { source: 'owaspXxe', text: 'the safest XML reader refuses document type declarations; one that needs them must not load external entities or external DTDs and must limit entity expansion' },
  githubAnnotations: { source: 'githubCommands', text: 'a line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run' },
  jsonRepeatedNames: { source: 'rfc8259', text: 'when an object repeats a name the behaviour of the software that reads it cannot be predicted, so the reader of this tool refuses a repeated name' }
};

// The page of a point.
export const pointPage = (key) => source(POINTS[key].source);

// The levels of a finding, from the lowest.
export const LEVELS = ['info', 'warning', 'error'];

// The sentence every report ends with, before the result.
export const NOTICE = 'This check reads the manifests, the XML resources they name and the property lists it was given, as they are written. It does not read the merged manifest of a build, Gradle or Xcode build settings, manifest placeholders, resource values, localized strings or the code of the app, so a setting made there is not seen (docs/limits.md).';
