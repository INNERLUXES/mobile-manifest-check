# Rules and sources

Every rule rests on points of public pages, written in this project's own words; this document lists them, with the
OWASP MASVS controls each rule supports, the choices that are the tool's own and what to change. The same points are in
src/data.js and the controls in src/masvs.js, and both are shown by `--explain`; research/sources.md has a longer note
on each page.

## The OWASP MASVS mapping

A rule supports a control: a finding points at a setting that works against it. No finding, and no clean run, shows
that an app meets a control; the MASVS is verified with the MASTG tests, on the app itself.

| Rule | Default level | MASVS controls | MASVS group |
| --- | --- | --- | --- |
| `dangerous-permission` | info | MASVS-PRIVACY-1 | MASVS-PRIVACY |
| `restricted-permission` | warning | MASVS-PRIVACY-1 | MASVS-PRIVACY |
| `debuggable` | error | MASVS-RESILIENCE-4 | MASVS-RESILIENCE |
| `allow-backup` | warning | MASVS-STORAGE-2 | MASVS-STORAGE |
| `cleartext-traffic` | error | MASVS-NETWORK-1 | MASVS-NETWORK |
| `cleartext-domain` | warning | MASVS-NETWORK-1 | MASVS-NETWORK |
| `user-certificates` | warning | MASVS-NETWORK-1 | MASVS-NETWORK |
| `exported-component` | warning | MASVS-PLATFORM-1 | MASVS-PLATFORM |
| `missing-exported` | error | MASVS-PLATFORM-1 | MASVS-PLATFORM |
| `provider-broad-paths` | warning | MASVS-PLATFORM-1, MASVS-STORAGE-2 | MASVS-PLATFORM, MASVS-STORAGE |
| `missing-resource` | warning | MASVS-NETWORK-1, MASVS-PLATFORM-1 | MASVS-NETWORK, MASVS-PLATFORM |
| `usage-description` | info | MASVS-PRIVACY-3 | MASVS-PRIVACY |
| `empty-usage-description` | error | MASVS-PRIVACY-3 | MASVS-PRIVACY |
| `missing-usage-description` | error | MASVS-PRIVACY-3 | MASVS-PRIVACY |
| `ats-arbitrary-loads` | error | MASVS-NETWORK-1 | MASVS-NETWORK |
| `ats-exception` | warning | MASVS-NETWORK-1 | MASVS-NETWORK |
| `file-sharing` | info | MASVS-STORAGE-2 | MASVS-STORAGE |
| `encryption-declaration` | info | MASVS-CRYPTO-1 | MASVS-CRYPTO |
| `unreadable-file` | error | none: a problem of the input, not of the app | - |
| `unparsable-file` | error | none: a problem of the input, not of the app | - |

The controls, in this project's own words:

- MASVS-STORAGE-2: The app keeps sensitive data from leaking. (https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-2/)
- MASVS-CRYPTO-1: The app uses current strong cryptography in the way the industry advises. (https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-1/)
- MASVS-NETWORK-1: The app secures all of its network traffic with current good practice. (https://mas.owasp.org/MASVS/controls/MASVS-NETWORK-1/)
- MASVS-PLATFORM-1: The app uses the mechanisms of communication between processes safely. (https://mas.owasp.org/MASVS/controls/MASVS-PLATFORM-1/)
- MASVS-RESILIENCE-4: The app makes analysis while it runs, such as debugging, harder. (https://mas.owasp.org/MASVS/controls/MASVS-RESILIENCE-4/)
- MASVS-PRIVACY-1: The app reaches as little sensitive data and as few resources as it can. (https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/)
- MASVS-PRIVACY-3: The app is open about the data it collects and how it uses it. (https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-3/)

The groups:

- MASVS-STORAGE (Storage): Sensitive data kept on the device, at rest. (https://mas.owasp.org/MASVS/05-MASVS-STORAGE/)
- MASVS-CRYPTO (Cryptography): The cryptography the app uses and how it handles keys. (https://mas.owasp.org/MASVS/06-MASVS-CRYPTO/)
- MASVS-NETWORK (Network Communication): Data in transit and the identity of the servers. (https://mas.owasp.org/MASVS/08-MASVS-NETWORK/)
- MASVS-PLATFORM (Platform Interaction): How the app talks to the platform and to other apps. (https://mas.owasp.org/MASVS/09-MASVS-PLATFORM/)
- MASVS-RESILIENCE (Resilience Against Reverse Engineering and Tampering): How hard the app is to analyse and change. (https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/)
- MASVS-PRIVACY (Privacy): How little personal data the app takes and how open it is about it. (https://mas.owasp.org/MASVS/12-MASVS-PRIVACY/)

## Rules

### `dangerous-permission`

Platform: android; key `rules.dangerousPermission`, default info; MASVS: MASVS-PRIVACY-1.

- Runtime permissions, also called dangerous permissions, reach restricted data or actions with more effect on the user, and the app must ask for them while it runs. ([Permissions on Android (Android Developers)](https://developer.android.com/guide/topics/permissions/overview))
- Special permissions guard powerful operations, such as drawing over other apps, and the user turns them on in the special app access page of the settings. ([Permissions on Android (Android Developers)](https://developer.android.com/guide/topics/permissions/overview))
- The reference gives the protection level of every system permission, and the ones of level dangerous are the runtime permissions. ([Manifest.permission (Android API reference)](https://developer.android.com/reference/android/Manifest.permission))
- A uses-permission element names one permission, and maxSdkVersion sets the highest API level at which the app is given it. ([<uses-permission> (Android Developers)](https://developer.android.com/guide/topics/manifest/uses-permission-element))
- The tool's own choice: one finding per permission name, at its first uses-permission or uses-permission-sdk-23 element; the dangerous ones are the system permissions of protection level dangerous, and the special ones a short list of powerful permissions (docs/method.md); a permission Google Play restricts is reported by restricted-permission instead.
- What to change: keep the permission only if a feature needs it, and ask for it when the user starts that feature.

### `restricted-permission`

Platform: android; key `rules.restrictedPermission`, default warning; MASVS: MASVS-PRIVACY-1.

- Google Play lets an app use the call log and SMS permission groups only when it is the default handler for that function, or meets an exception of the Play Console Help Center. ([Permissions used only in default handlers (Android Developers)](https://developer.android.com/guide/topics/permissions/default-handlers))
- The policy limits the SMS and Call Log permission groups to the default handler of the function and a short list of exceptions, declared in the Play Console. ([Use of SMS or Call Log permission groups (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/10208820))
- An app that targets API level 29 or higher and holds ACCESS_BACKGROUND_LOCATION has to describe the feature that uses location in the background before it is published. ([Understanding location in the background permissions (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/9799150))
- From Android 11 an app sees only some other apps by default; QUERY_ALL_PACKAGES sees all of them, and on Google Play its use needs approval. ([Package visibility filtering on Android (Android Developers)](https://developer.android.com/training/package-visibility))
- Google Play counts the list of installed apps as personal and sensitive data and allows QUERY_ALL_PACKAGES only for uses its policy accepts, declared in a form. ([Use of the broad package (App) visibility (QUERY_ALL_PACKAGES) permission (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/10158779))
- The tool's own choice: ACCESS_BACKGROUND_LOCATION, the SMS group (SEND_SMS, RECEIVE_SMS, READ_SMS, RECEIVE_WAP_PUSH, RECEIVE_MMS), the Call Log group (READ_CALL_LOG, WRITE_CALL_LOG, PROCESS_OUTGOING_CALLS) and QUERY_ALL_PACKAGES; a warning, because the store asks for a declaration or refuses the app, whatever the code does.
- What to change: remove the permission, or prepare the declaration the store asks for; for package visibility, name the apps in a <queries> element instead.

### `debuggable`

Platform: android; key `rules.debuggable`, default error; MASVS: MASVS-RESILIENCE-4.

- Android:debuggable says whether the app can be debugged even on a device in user mode, and it is false by default. ([<application> (Android Developers)](https://developer.android.com/guide/topics/manifest/application-element))
- A debuggable app lets an attacker debug it and reach parts of it that should stay closed, so the flag must be false in the build that ships. ([android:debuggable (Android Developers, security risks)](https://developer.android.com/privacy-and-security/risks/android-debuggable))
- The tool's own choice: only the literal value true counts; a resource reference such as @bool/debug or a manifest placeholder is not resolved.
- What to change: remove android:debuggable from the manifest; the build tools set it for debug builds only.

### `allow-backup`

Platform: android; key `rules.allowBackup`, default warning; MASVS: MASVS-STORAGE-2.

- Android:allowBackup decides whether the app takes part in backup and restore, it is true by default, and dataExtractionRules can leave sensitive files out. ([<application> (Android Developers)](https://developer.android.com/guide/topics/manifest/application-element))
- Auto Backup is on unless allowBackup is false, the page advises setting the attribute explicitly, and on Android 12 some devices still move data from device to device. ([Back up user data with Auto Backup (Android Developers)](https://developer.android.com/identity/data/autobackup))
- Backups should hold no sensitive data: leave it out of the backup, or require end-to-end encryption where it cannot be left out. ([Security recommendations for backups (Android Developers)](https://developer.android.com/privacy-and-security/risks/backup-best-practices))
- The tool's own choice: android:allowBackup="true", or no android:allowBackup at all, since true is the default; a backup rules resource that is named is mentioned but not read.
- What to change: set android:allowBackup="false", or keep backups and leave every sensitive file out with android:dataExtractionRules and android:fullBackupContent.

### `cleartext-traffic`

Platform: android; key `rules.cleartextTraffic`, default error; MASVS: MASVS-NETWORK-1.

- Android:usesCleartextTraffic is true by default up to target API level 27 and false from 28, and a network security config decides instead on API level 24 and higher. ([<application> (Android Developers)](https://developer.android.com/guide/topics/manifest/application-element))
- A network security config sets cleartextTrafficPermitted and the trusted certificate authorities for the whole app in base-config and per domain in domain-config, and debug-overrides apply only to debuggable builds. ([Network security configuration (Android Developers)](https://developer.android.com/privacy-and-security/security-config))
- Cleartext traffic can be read and changed by anyone on the network path, so data should go over encrypted channels, with cleartext opted out in the network security config. ([Cleartext communications (Android Developers, security risks)](https://developer.android.com/privacy-and-security/risks/cleartext-communications))
- The tool's own choice: android:usesCleartextTraffic="true", a base-config with cleartextTrafficPermitted="true", or a targetSdkVersion below 28 written in the manifest with neither of the two set to false; a target API level set only in the Gradle build is not seen.
- What to change: set android:usesCleartextTraffic="false" and cleartextTrafficPermitted="false" in the base-config, and use HTTPS; allow cleartext only to a named domain that needs it.

### `cleartext-domain`

Platform: android; key `rules.cleartextDomain`, default warning; MASVS: MASVS-NETWORK-1.

- A network security config sets cleartextTrafficPermitted and the trusted certificate authorities for the whole app in base-config and per domain in domain-config, and debug-overrides apply only to debuggable builds. ([Network security configuration (Android Developers)](https://developer.android.com/privacy-and-security/security-config))
- Cleartext traffic can be read and changed by anyone on the network path, so data should go over encrypted channels, with cleartext opted out in the network security config. ([Cleartext communications (Android Developers, security risks)](https://developer.android.com/privacy-and-security/risks/cleartext-communications))
- The tool's own choice: a domain-config with cleartextTrafficPermitted="true" is a warning, not an error, because its scope is the domains it names.
- What to change: move the domains to HTTPS and remove the domain-config, or keep it to the one host that cannot move.

### `user-certificates`

Platform: android; key `rules.userCertificates`, default warning; MASVS: MASVS-NETWORK-1.

- Apps that target API level 24 and higher trust only the system certificate authorities by default; certificates src="user" adds the ones the user installed. ([Network security configuration (Android Developers)](https://developer.android.com/privacy-and-security/security-config))
- A network security config sets cleartextTrafficPermitted and the trusted certificate authorities for the whole app in base-config and per domain in domain-config, and debug-overrides apply only to debuggable builds. ([Network security configuration (Android Developers)](https://developer.android.com/privacy-and-security/security-config))
- The tool's own choice: certificates src="user" in the trust anchors of a base-config or domain-config; inside debug-overrides it applies to debuggable builds only and is not reported.
- What to change: trust the system certificate authorities only, and put certificates for testing under <debug-overrides>.

### `exported-component`

Platform: android; key `rules.exportedComponent`, default warning; MASVS: MASVS-PLATFORM-1.

- An exported activity can be started by any app by its class name, false is the default when it has no intent filter, and a launcher activity must be exported. ([<activity> (Android Developers)](https://developer.android.com/guide/topics/manifest/activity-element))
- The default of android:exported differed between versions and kinds of component, so it should always be set, or internal components may be exposed to other apps. ([android:exported (Android Developers, security risks)](https://developer.android.com/privacy-and-security/risks/android-exported))
- Android:permission on the application sets a permission that applies to all of its components. ([<application> (Android Developers)](https://developer.android.com/guide/topics/manifest/application-element))
- The tool's own choice: an activity, activity-alias, service, receiver or provider with android:exported="true" and no android:permission of its own or of the application (for a provider, also no read and write permissions); an activity with the MAIN action and the LAUNCHER category is not reported, since it must be exported; a permission this manifest declares with protection level normal counts as none.
- What to change: set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature.

### `missing-exported`

Platform: android; key `rules.missingExported`, default error; MASVS: MASVS-PLATFORM-1.

- An activity, service or broadcast receiver with an intent filter and no explicit android:exported cannot be installed on Android 12 or higher. ([Behavior changes: Apps targeting Android 12 (Android Developers)](https://developer.android.com/about/versions/12/behavior-changes-12))
- The default of android:exported differed between versions and kinds of component, so it should always be set, or internal components may be exposed to other apps. ([android:exported (Android Developers, security risks)](https://developer.android.com/privacy-and-security/risks/android-exported))
- The tool's own choice: an activity, activity-alias, service or receiver with an intent-filter and no android:exported; an error, because the app cannot be installed on Android 12 and higher.
- What to change: set android:exported explicitly: true only when other apps must start the component, false otherwise.

### `provider-broad-paths`

Platform: android; key `rules.providerBroadPaths`, default warning; MASVS: MASVS-PLATFORM-1, MASVS-STORAGE-2.

- With grantUriPermissions true, access can be granted to any of the data of a provider; with false, only to the subsets its grant-uri-permission elements name. ([<provider> (Android Developers)](https://developer.android.com/guide/topics/manifest/provider-element))
- A FileProvider makes content URIs only for the directories its paths resource names, linked through the meta-data android.support.FILE_PROVIDER_PATHS, and it should not be exported. ([FileProvider (AndroidX API reference)](https://developer.android.com/reference/androidx/core/content/FileProvider))
- Root-path exposes the root of the device, a path of . or / shares a whole directory, and external-path should not share sensitive data. ([Improperly Exposed Directories to FileProvider (Android Developers, security risks)](https://developer.android.com/privacy-and-security/risks/file-providers))
- The tool's own choice: a FileProvider paths resource with root-path, or with a path element whose path is missing, empty, . or /; a grant-uri-permission whose path or pathPrefix is / or empty or whose pathPattern is .* or /.*; and a provider with grantUriPermissions="true" and no paths resource, whose grants reach all of its data.
- What to change: share only the subdirectories that hold the files to share, never root-path, and name narrow grant-uri-permission paths.

### `missing-resource`

Platform: android; key `rules.missingResource`, default warning; MASVS: MASVS-NETWORK-1, MASVS-PLATFORM-1.

- A network security config sets cleartextTrafficPermitted and the trusted certificate authorities for the whole app in base-config and per domain in domain-config, and debug-overrides apply only to debuggable builds. ([Network security configuration (Android Developers)](https://developer.android.com/privacy-and-security/security-config))
- A FileProvider makes content URIs only for the directories its paths resource names, linked through the meta-data android.support.FILE_PROVIDER_PATHS, and it should not be exported. ([FileProvider (AndroidX API reference)](https://developer.android.com/reference/androidx/core/content/FileProvider))
- The tool's own choice: the network security config and the FileProvider paths are looked for at res/xml/<name>.xml next to the manifest; a resource of another source set, flavor or library is not found, so its settings are not checked.
- What to change: name the manifest of the source set that holds res/xml, or check the merged resource by hand.

### `usage-description`

Platform: ios; key `rules.usageDescription`, default info; MASVS: MASVS-PRIVACY-3.

- A protected resource needs a purpose string that is not blank, under 4,000 bytes, of the right type and specific about the reason; App Review rejects an app without one. ([Requesting access to protected resources (Apple Developer Documentation)](https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources))
- An Info.plist is a property list of keys and values that tells the system how to treat the bundle, and the file name is Info.plist. ([Information Property List (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list))
- The tool's own choice: every key at the top of the Info.plist whose name ends in UsageDescription, with its text, so the list of protected resources the app asks for can be read in one place.
- What to change: check that each text says, in one specific sentence, why the app needs the resource.

### `empty-usage-description`

Platform: ios; key `rules.emptyUsageDescription`, default error; MASVS: MASVS-PRIVACY-3.

- A protected resource needs a purpose string that is not blank, under 4,000 bytes, of the right type and specific about the reason; App Review rejects an app without one. ([Requesting access to protected resources (Apple Developer Documentation)](https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources))
- The tool's own choice: empty or white space only, a placeholder of the list of the configuration (docs/inputs.md), text that starts with TODO, FIXME, TBD, lorem ipsum or placeholder, punctuation only, the name of the key itself, 4,000 bytes or more, or a value that is not a string.
- What to change: write one specific sentence that tells the user why the app needs the resource.

### `missing-usage-description`

Platform: ios; key `rules.missingUsageDescription`, default error; MASVS: MASVS-PRIVACY-3.

- A protected resource needs a purpose string that is not blank, under 4,000 bytes, of the right type and specific about the reason; App Review rejects an app without one. ([Requesting access to protected resources (Apple Developer Documentation)](https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources))
- UIBackgroundModes lists the services that need the app to run in the background, such as location, audio and the Bluetooth roles. ([UIBackgroundModes (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/uibackgroundmodes))
- UIRequiredDeviceCapabilities names the features an app needs, such as a camera, the microphone, location services or NFC, as an array or as a dictionary of Booleans. ([UIRequiredDeviceCapabilities (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/uirequireddevicecapabilities))
- NSLocationAlwaysAndWhenInUseUsageDescription is required when an iOS app reads the location at all times, also in the background. ([NSLocationAlwaysAndWhenInUseUsageDescription (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationalwaysandwheninuseusagedescription))
- NSLocationWhenInUseUsageDescription is required when an iOS app reads the location while it is in use. ([NSLocationWhenInUseUsageDescription (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationwheninuseusagedescription))
- NSBluetoothAlwaysUsageDescription is required when the app uses the Bluetooth interface of the device. ([NSBluetoothAlwaysUsageDescription (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsbluetoothalwaysusagedescription))
- The tool's own choice: only what the Info.plist itself hints at: location, bluetooth-central or bluetooth-peripheral in UIBackgroundModes, a camera, microphone, location, Bluetooth, HealthKit or NFC capability in UIRequiredDeviceCapabilities, and the always-and-when-in-use location key without the when-in-use key; the code of the app is not read.
- What to change: add the usage description the capability needs, or remove the capability if the app does not use it.

### `ats-arbitrary-loads`

Platform: ios; key `rules.atsArbitraryLoads`, default error; MASVS: MASVS-NETWORK-1.

- App Transport Security makes connections use HTTPS with extra checks, and the NSAppTransportSecurity dictionary loosens it; each loosening lowers the security of the app. ([NSAppTransportSecurity (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity))
- NSAllowsArbitraryLoads set to YES turns ATS off for every domain not named in NSExceptionDomains, needs a justification in App Review, and from iOS 10 is ignored when the web content, media or local networking key is present. ([NSAllowsArbitraryLoads (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloads))
- The tool's own choice: NSAllowsArbitraryLoads true in NSAppTransportSecurity; reported even when a web content, media or local networking key makes iOS 10 and later ignore it, because older systems and other platforms do not.
- What to change: remove NSAllowsArbitraryLoads and move the servers to HTTPS, or name the one domain that needs an exception in NSExceptionDomains.

### `ats-exception`

Platform: ios; key `rules.atsException`, default warning; MASVS: MASVS-NETWORK-1.

- App Transport Security makes connections use HTTPS with extra checks, and the NSAppTransportSecurity dictionary loosens it; each loosening lowers the security of the app. ([NSAppTransportSecurity (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity))
- NSExceptionDomains holds one dictionary of exceptions per domain, and a domain named there ignores the global ATS keys. ([NSExceptionDomains (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsexceptiondomains))
- NSExceptionAllowsInsecureHTTPLoads set to YES allows plain HTTP to the domain, and App Review asks for a justification. ([NSExceptionAllowsInsecureHTTPLoads (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionallowsinsecurehttploads))
- NSExceptionMinimumTLSVersion defaults to TLSv1.2, and a lower version needs a justification in App Review. ([NSExceptionMinimumTLSVersion (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionminimumtlsversion))
- NSAllowsArbitraryLoads set to YES turns ATS off for every domain not named in NSExceptionDomains, needs a justification in App Review, and from iOS 10 is ignored when the web content, media or local networking key is present. ([NSAllowsArbitraryLoads (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloads))
- The tool's own choice: NSAllowsArbitraryLoadsInWebContent or NSAllowsArbitraryLoadsForMedia true, and an exception domain with NSExceptionAllowsInsecureHTTPLoads or NSThirdPartyExceptionAllowsInsecureHTTPLoads true, or a minimum TLS version below TLSv1.2.
- What to change: move the domain to HTTPS with TLS 1.2 or higher and remove the exception.

### `file-sharing`

Platform: ios; key `rules.fileSharing`, default info; MASVS: MASVS-STORAGE-2.

- UIFileSharingEnabled set to YES shares the files of the Documents folder of the app with the user; the default is NO. ([UIFileSharingEnabled (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/uifilesharingenabled))
- LSSupportsOpeningDocumentsInPlace says whether the app may open the original document of a file provider instead of a copy. ([LSSupportsOpeningDocumentsInPlace (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/lssupportsopeningdocumentsinplace))
- The tool's own choice: listed as info so the files the app shows to the user are a known choice; UIFileSharingEnabled and LSSupportsOpeningDocumentsInPlace each give one finding when true.
- What to change: keep sensitive files out of the Documents folder, or turn the key off.

### `encryption-declaration`

Platform: ios; key `rules.encryptionDeclaration`, default info; MASVS: MASVS-CRYPTO-1.

- ITSAppUsesNonExemptEncryption says whether the app uses encryption that is not exempt; without the key, App Store Connect asks the export compliance questions at every upload. ([ITSAppUsesNonExemptEncryption (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption))
- The tool's own choice: ITSAppUsesNonExemptEncryption missing from the Info.plist; listed as info, a reminder about the export compliance answers, and MASVS-CRYPTO-1 is the closest control, not one the key proves.
- What to change: add ITSAppUsesNonExemptEncryption with the answer that fits the app.

### `unreadable-file`

Platform: input; always error, no key; MASVS: none.

- An Info.plist is a property list of keys and values that tells the system how to treat the bundle, and the file name is Info.plist. ([Information Property List (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list))
- The tool's own choice: a file that is over its size limit, binary (a binary property list included), UTF-16, not valid UTF-8, a symbolic link or not there to open is an error and nothing in it is checked; this rule cannot be set lower or off.
- What to change: give the file as UTF-8 XML; convert a binary property list with plutil -convert xml1.

### `unparsable-file`

Platform: input; always error, no key; MASVS: none.

- XML predefines five entities (lt, gt, amp, apos, quot) and character references; any other entity must be declared in a document type declaration. ([Extensible Markup Language (XML) 1.0 (W3C)](https://www.w3.org/TR/xml/))
- The safest XML reader refuses document type declarations; one that needs them must not load external entities or external DTDs and must limit entity expansion. ([XML External Entity Prevention Cheat Sheet (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html))
- An Info.plist is a property list of keys and values that tells the system how to treat the bundle, and the file name is Info.plist. ([Information Property List (Apple Developer Documentation)](https://developer.apple.com/documentation/bundleresources/information-property-list))
- The tool's own choice: a tag, comment or value that is not closed, an end tag that does not match, a declared entity or an internal document type subset, or a root element of the wrong kind stops the reading of the file, and nothing in it is checked; this rule cannot be set lower or off.
- What to change: correct the file at the line and column named; write the text of a declared entity out in full instead.

## The output and the configuration

- The MASVS sorts the security requirements of a mobile app into control groups for storage, cryptography, authentication, network, platform interaction, code, resilience and privacy. ([OWASP MASVS (OWASP Mobile Application Security)](https://mas.owasp.org/MASVS/))
- A line of output such as ::warning file=...,line=...::message becomes an annotation on that file and line in the run. ([Workflow commands for GitHub Actions (GitHub Docs)](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands))
- When an object repeats a name the behaviour of the software that reads it cannot be predicted, so the reader of this tool refuses a repeated name. ([RFC 8259, The JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259))

## Every page

- OWASP MASVS (OWASP Mobile Application Security): https://mas.owasp.org/MASVS/
- Permissions on Android (Android Developers): https://developer.android.com/guide/topics/permissions/overview
- Manifest.permission (Android API reference): https://developer.android.com/reference/android/Manifest.permission
- <uses-permission> (Android Developers): https://developer.android.com/guide/topics/manifest/uses-permission-element
- Permissions used only in default handlers (Android Developers): https://developer.android.com/guide/topics/permissions/default-handlers
- Package visibility filtering on Android (Android Developers): https://developer.android.com/training/package-visibility
- Use of SMS or Call Log permission groups (Play Console Help): https://support.google.com/googleplay/android-developer/answer/10208820
- Understanding location in the background permissions (Play Console Help): https://support.google.com/googleplay/android-developer/answer/9799150
- Use of the broad package (App) visibility (QUERY_ALL_PACKAGES) permission (Play Console Help): https://support.google.com/googleplay/android-developer/answer/10158779
- <application> (Android Developers): https://developer.android.com/guide/topics/manifest/application-element
- android:debuggable (Android Developers, security risks): https://developer.android.com/privacy-and-security/risks/android-debuggable
- Back up user data with Auto Backup (Android Developers): https://developer.android.com/identity/data/autobackup
- Security recommendations for backups (Android Developers): https://developer.android.com/privacy-and-security/risks/backup-best-practices
- Network security configuration (Android Developers): https://developer.android.com/privacy-and-security/security-config
- Cleartext communications (Android Developers, security risks): https://developer.android.com/privacy-and-security/risks/cleartext-communications
- <activity> (Android Developers): https://developer.android.com/guide/topics/manifest/activity-element
- android:exported (Android Developers, security risks): https://developer.android.com/privacy-and-security/risks/android-exported
- Behavior changes: Apps targeting Android 12 (Android Developers): https://developer.android.com/about/versions/12/behavior-changes-12
- <provider> (Android Developers): https://developer.android.com/guide/topics/manifest/provider-element
- FileProvider (AndroidX API reference): https://developer.android.com/reference/androidx/core/content/FileProvider
- Improperly Exposed Directories to FileProvider (Android Developers, security risks): https://developer.android.com/privacy-and-security/risks/file-providers
- Information Property List (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list
- Requesting access to protected resources (Apple Developer Documentation): https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources
- NSLocationWhenInUseUsageDescription (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationwheninuseusagedescription
- NSLocationAlwaysAndWhenInUseUsageDescription (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationalwaysandwheninuseusagedescription
- NSBluetoothAlwaysUsageDescription (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nsbluetoothalwaysusagedescription
- UIBackgroundModes (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/uibackgroundmodes
- UIRequiredDeviceCapabilities (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/uirequireddevicecapabilities
- NSAppTransportSecurity (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity
- NSAllowsArbitraryLoads (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloads
- NSExceptionDomains (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsexceptiondomains
- NSExceptionAllowsInsecureHTTPLoads (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionallowsinsecurehttploads
- NSExceptionMinimumTLSVersion (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionminimumtlsversion
- UIFileSharingEnabled (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/uifilesharingenabled
- LSSupportsOpeningDocumentsInPlace (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/lssupportsopeningdocumentsinplace
- ITSAppUsesNonExemptEncryption (Apple Developer Documentation): https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption
- Extensible Markup Language (XML) 1.0 (W3C): https://www.w3.org/TR/xml/
- XML External Entity Prevention Cheat Sheet (OWASP): https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
- Workflow commands for GitHub Actions (GitHub Docs): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- RFC 8259, The JSON Data Interchange Format: https://www.rfc-editor.org/rfc/rfc8259
- MASVS-STORAGE: Storage (OWASP MASVS): https://mas.owasp.org/MASVS/05-MASVS-STORAGE/
- MASVS-CRYPTO: Cryptography (OWASP MASVS): https://mas.owasp.org/MASVS/06-MASVS-CRYPTO/
- MASVS-NETWORK: Network Communication (OWASP MASVS): https://mas.owasp.org/MASVS/08-MASVS-NETWORK/
- MASVS-PLATFORM: Platform Interaction (OWASP MASVS): https://mas.owasp.org/MASVS/09-MASVS-PLATFORM/
- MASVS-RESILIENCE: Resilience Against Reverse Engineering and Tampering (OWASP MASVS): https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/
- MASVS-PRIVACY: Privacy (OWASP MASVS): https://mas.owasp.org/MASVS/12-MASVS-PRIVACY/
- MASVS-STORAGE-2 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-2/
- MASVS-CRYPTO-1 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-1/
- MASVS-NETWORK-1 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-NETWORK-1/
- MASVS-PLATFORM-1 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-PLATFORM-1/
- MASVS-RESILIENCE-4 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-RESILIENCE-4/
- MASVS-PRIVACY-1 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/
- MASVS-PRIVACY-3 (OWASP MASVS): https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-3/
