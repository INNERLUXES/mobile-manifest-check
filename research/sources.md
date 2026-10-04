# Sources

The public pages the checks of this tool are based on, each with a short note in this project's own words on what the
page says and which parts of the tool lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. src/data.js holds the pages and the points the reports show, src/masvs.js the OWASP MASVS groups and controls,
and test/data.test.js checks that every page there is listed here. Each page was fetched and read before it was listed.

The pages of developer.apple.com are built in the browser: the address of a page loads its text from a JSON file of
the same path under `https://developer.apple.com/tutorials/data/documentation/`, with `.json` at the end, and that file
is what was read for each of them. The address listed is the one a reader opens. The control pages of the MASVS were
read on mas.owasp.org and checked against the Markdown files of the controls in the repository the site is built from.

## OWASP MASVS

### OWASP MASVS (OWASP Mobile Application Security)

https://mas.owasp.org/MASVS/

The overview of the Mobile Application Security Verification Standard. It sorts the security requirements of a mobile
app into eight control groups: storage, cryptography, authentication and authorization, network communication,
platform interaction, code quality, resilience against reverse engineering and tampering, and privacy. Each group holds
a few numbered controls, and the testing guide (MASTG) and the weakness list (MASWE) hang off them. Every rule of the
tool names the controls it supports, and the reports count the findings per group.

### MASVS-STORAGE: Storage

https://mas.owasp.org/MASVS/05-MASVS-STORAGE/

The group on sensitive data kept on the device. Among the weaknesses it lists are sensitive data that is not left out
of backups and data that leaks through shared places. The tool maps `allow-backup`, `file-sharing` and, with
MASVS-PLATFORM, `provider-broad-paths` to its second control.

https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-2/

The control that the app prevents sensitive data from leaking.

### MASVS-CRYPTO: Cryptography

https://mas.owasp.org/MASVS/06-MASVS-CRYPTO/

The group on the cryptography an app uses and how it manages keys. The tool maps only `encryption-declaration` to it,
and says that the link is loose: the key declares an answer for export compliance and proves nothing about the
cryptography itself.

https://mas.owasp.org/MASVS/controls/MASVS-CRYPTO-1/

The control that the app uses current strong cryptography in the way the industry advises.

### MASVS-NETWORK: Network Communication

https://mas.owasp.org/MASVS/08-MASVS-NETWORK/

The group on data in transit. Its weaknesses include traffic that is not encrypted and certificate validation that is
not strict; its tests look for cleartext HTTP, weak TLS settings and trust in certificates an attacker could add. The
tool maps `cleartext-traffic`, `cleartext-domain`, `user-certificates`, `ats-arbitrary-loads`, `ats-exception` and,
with MASVS-PLATFORM, `missing-resource` to its first control.

https://mas.owasp.org/MASVS/controls/MASVS-NETWORK-1/

The control that the app secures all of its network traffic according to current good practice.

### MASVS-PLATFORM: Platform Interaction

https://mas.owasp.org/MASVS/09-MASVS-PLATFORM/

The group on how the app talks to the platform and to other apps. Its material on communication between processes
names exported and unprotected activities, services and receivers, insecure intents and deep links. The tool maps
`exported-component`, `missing-exported`, `provider-broad-paths` and `missing-resource` to its first control.

https://mas.owasp.org/MASVS/controls/MASVS-PLATFORM-1/

The control that the app uses the mechanisms of communication between processes securely.

### MASVS-RESILIENCE: Resilience Against Reverse Engineering and Tampering

https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/

The group on how hard an app is to analyse and change. Its best practices include a debuggable flag that is off in the
manifest, and its tests include whether the app is debuggable. The tool maps `debuggable` to its fourth control. The
Android page on android:debuggable files the same risk under MASVS-PLATFORM; the tool follows the MASVS testing guide.

https://mas.owasp.org/MASVS/controls/MASVS-RESILIENCE-4/

The control that the app makes analysis while it runs harder.

### MASVS-PRIVACY: Privacy

https://mas.owasp.org/MASVS/12-MASVS-PRIVACY/

The group on personal data. Its weaknesses include permissions that are more than the app needs and data collection
that is not disclosed to the user. The tool maps `dangerous-permission` and `restricted-permission` to the first
control, and the three rules of usage descriptions to the third.

https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-1/

The control that the app minimizes its access to sensitive data and resources.

https://mas.owasp.org/MASVS/controls/MASVS-PRIVACY-3/

The control that the app is transparent about the data it collects and how it uses it.

## Android

### Permissions on Android (Android Developers)

https://developer.android.com/guide/topics/permissions/overview

The overview of the permission model. It sorts permissions into install-time, runtime and special permissions: runtime
permissions, also called dangerous permissions, reach restricted data or actions with more effect on the user and are
asked for while the app runs; special permissions guard powerful operations, such as drawing over other apps, and are
turned on in the special app access settings. `dangerous-permission` uses these two kinds.

### Manifest.permission (Android API reference)

https://developer.android.com/reference/android/Manifest.permission

The reference of every system permission constant with its protection level. The list of dangerous permissions in
src/permissions.js is the set of constants whose protection level is dangerous on this page; the special permissions
are ones whose level includes appop or signature and that the overview counts as special, plus QUERY_ALL_PACKAGES, a
normal permission with a store policy of its own.

### uses-permission (Android Developers)

https://developer.android.com/guide/topics/manifest/uses-permission-element

The page of the uses-permission element: one permission per element, and maxSdkVersion for the highest API level at
which the app is given it. The tool reads uses-permission and uses-permission-sdk-23 and shows maxSdkVersion in the
finding.

### Permissions used only in default handlers (Android Developers)

https://developer.android.com/guide/topics/permissions/default-handlers

The page that says Google Play limits the call log and SMS permission groups: an app distributed there may use them
only as the default handler of the function, such as the default SMS app, unless it meets an exception the Play
Console Help Center lists. `restricted-permission` rests on it.

### Package visibility filtering on Android (Android Developers)

https://developer.android.com/training/package-visibility

The page on which other apps an app can see. An app that targets Android 11 or higher sees only some apps by default,
can name the ones it needs in a queries element, and QUERY_ALL_PACKAGES sees all of them; on Google Play the use of
that permission needs approval. `restricted-permission` rests on it.

### Use of SMS or Call Log permission groups (Play Console Help)

https://support.google.com/googleplay/android-developer/answer/10208820

The Google Play policy for the SMS and Call Log groups: only the default handler of the function, and a short list of
exceptions declared in the Play Console, may request them. `restricted-permission` names the policy in its message.

### Understanding location in the background permissions (Play Console Help)

https://support.google.com/googleplay/android-developer/answer/9799150

The Google Play policy for ACCESS_BACKGROUND_LOCATION. An app that targets API level 29 or higher and holds the
permission must describe the feature that uses location in the background before it is published. `restricted-permission`
reports the permission as a warning for this reason.

### Use of the broad package (App) visibility (QUERY_ALL_PACKAGES) permission (Play Console Help)

https://support.google.com/googleplay/android-developer/answer/10158779

The Google Play policy for QUERY_ALL_PACKAGES. The list of installed apps is treated as personal and sensitive data,
and the permission is allowed only for uses the policy accepts, declared in a form. `restricted-permission` rests on it.

### application (Android Developers)

https://developer.android.com/guide/topics/manifest/application-element

The page of the application element. It describes android:allowBackup (true by default, with dataExtractionRules to
leave sensitive files out), android:debuggable (false by default, debuggable even in user mode when true),
android:usesCleartextTraffic (true by default up to target API level 27, false from 28, and replaced by a network
security config from API level 24), android:networkSecurityConfig, android:fullBackupContent and android:permission,
which applies to all components. `allow-backup`, `debuggable`, `cleartext-traffic` and `exported-component` read these
attributes.

### android:debuggable (Android Developers, security risks)

https://developer.android.com/privacy-and-security/risks/android-debuggable

The security risk page of the debuggable flag. A debuggable app lets an attacker debug it and reach parts of it that
should stay closed, so the flag must be false in the build that ships. The page files the risk under MASVS-PLATFORM.
`debuggable` rests on it.

### Back up user data with Auto Backup (Android Developers)

https://developer.android.com/identity/data/autobackup

The guide to Auto Backup. Backup is on unless allowBackup is false, the guide advises setting the attribute
explicitly, and on Android 12 and higher some devices still move the data from device to device when it is false.
`allow-backup` reports the attribute when it is true or missing.

### Security recommendations for backups (Android Developers)

https://developer.android.com/privacy-and-security/risks/backup-best-practices

The security risk page on backups: a backup should hold no sensitive data, so leave such data out, or require end-to-end
encryption where it cannot be left out. The page files the risk under MASVS-CODE; the tool maps `allow-backup` to
MASVS-STORAGE-2, where the MASVS lists data not left out of backups.

### Network security configuration (Android Developers)

https://developer.android.com/privacy-and-security/security-config

The guide to the network security config: base-config for the whole app, domain-config per domain (nested configs
inherit), cleartextTrafficPermitted, trust anchors with system, user or bundled certificates, and debug-overrides that
apply only when the app is debuggable. It also gives the defaults: cleartext is off from API level 28, and user
certificate authorities are trusted by default only up to API level 23. `cleartext-traffic`, `cleartext-domain`,
`user-certificates` and `missing-resource` read the config this way.

### Cleartext communications (Android Developers, security risks)

https://developer.android.com/privacy-and-security/risks/cleartext-communications

The security risk page on cleartext traffic: anyone on the network path can read and change it, so data should go over
encrypted channels, and the network security config can opt the app out of cleartext. The page files the risk under
MASVS-NETWORK. The cleartext rules rest on it.

### activity (Android Developers)

https://developer.android.com/guide/topics/manifest/activity-element

The page of the activity element. An exported activity can be started by any app by its class name, false is the
default when it has no intent filter, and the main activity with the LAUNCHER category must be exported. The tool
skips the launcher activity in `exported-component` for this reason.

### android:exported (Android Developers, security risks)

https://developer.android.com/privacy-and-security/risks/android-exported

The security risk page of android:exported. The default of the attribute changed between Android versions and kinds of
component, so leaving it out can expose internal components; the page advises setting it explicitly and files the risk
under MASVS-PLATFORM. `exported-component` and `missing-exported` rest on it.

### Behavior changes: Apps targeting Android 12 (Android Developers)

https://developer.android.com/about/versions/12/behavior-changes-12

The list of behavior changes for apps that target Android 12. An activity, service or broadcast receiver that has an
intent filter and no explicit android:exported cannot be installed on Android 12 or higher. `missing-exported` reports
exactly these components, and not providers, which the page does not name.

### provider (Android Developers)

https://developer.android.com/guide/topics/manifest/provider-element

The page of the provider element: exported, permission, readPermission and writePermission, and grantUriPermissions.
With grantUriPermissions true, access can be granted to any of the data of the provider; with false, only to the subsets
its grant-uri-permission elements name. `exported-component` reads the permissions of a provider, and
`provider-broad-paths` the grants.

### FileProvider (AndroidX API reference)

https://developer.android.com/reference/androidx/core/content/FileProvider

The reference of FileProvider. It makes content URIs only for the directories a paths resource names, with one child
element per kind of storage (files-path, cache-path, external-path and the others), linked through the meta-data
android.support.FILE_PROVIDER_PATHS; it should not be exported and uses grantUriPermissions for temporary access.
`provider-broad-paths` and `missing-resource` read the paths resource this way.

### Improperly Exposed Directories to FileProvider (Android Developers, security risks)

https://developer.android.com/privacy-and-security/risks/file-providers

The security risk page on FileProvider paths: root-path exposes the root of the device, a path of . or / shares a whole
directory, and external-path should not share sensitive data. The page files the risk under MASVS-STORAGE.
`provider-broad-paths` reports exactly these forms.

## Apple

### Information Property List (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list

The page of the Info.plist: a property list of keys and values that tells the system how to treat a bundle, in a file
whose name is Info.plist with a capital I. The tool reads Info.plist files and names that end in -Info.plist, as older
Xcode projects call them.

### Requesting access to protected resources (Apple Developer Documentation)

https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources

The guide to purpose strings. A protected resource needs a purpose string that is not blank, is under 4,000 bytes, has
the type the key needs and says specifically why the app needs access; App Review rejects an app that uses a resource
without one, and access fails without it. The three rules of usage descriptions rest on it.

### NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription and NSBluetoothAlwaysUsageDescription (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationwheninuseusagedescription

https://developer.apple.com/documentation/bundleresources/information-property-list/nslocationalwaysandwheninuseusagedescription

https://developer.apple.com/documentation/bundleresources/information-property-list/nsbluetoothalwaysusagedescription

The pages of the location and Bluetooth usage keys. Each key is required when the app uses the matching access: the
location while in use, the location at all times, also in the background, and the Bluetooth interface.
`missing-usage-description` names these keys when the Info.plist declares the capability without them.

### UIBackgroundModes (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/uibackgroundmodes

The page of the background modes, such as location, audio, bluetooth-central and bluetooth-peripheral.
`missing-usage-description` reads location and the two Bluetooth modes.

### UIRequiredDeviceCapabilities (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/uirequireddevicecapabilities

The page of the required device capabilities, given as an array or as a dictionary of Booleans. It lists the cameras,
the microphone, location services and GPS, Bluetooth LE, HealthKit and NFC among the values.
`missing-usage-description` reads both forms.

### NSAppTransportSecurity (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity

The page of App Transport Security. ATS makes connections use HTTPS with extended checks, and the dictionary loosens
it globally or per domain; the page warns that each loosening reduces the security of the app. The two ATS rules rest
on it.

### NSAllowsArbitraryLoads (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloads

The page of the global switch. YES turns ATS off for every domain not named in NSExceptionDomains, needs a justification
in App Review, and from iOS 10 is ignored when the web content, media or local networking key is present.
`ats-arbitrary-loads` reports it and notes the narrower keys.

### NSExceptionDomains (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsexceptiondomains

The page of the exception domains: one dictionary of exceptions per domain, and a domain named there ignores the
global keys. `ats-exception` reads each domain.

### NSExceptionAllowsInsecureHTTPLoads (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionallowsinsecurehttploads

The page of the per-domain key that allows plain HTTP; it defaults to NO and needs a justification in App Review.
`ats-exception` reports it, and its third-party form.

### NSExceptionMinimumTLSVersion (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/nsexceptionminimumtlsversion

The page of the per-domain minimum TLS version, TLSv1.2 by default; a lower version needs a justification.
`ats-exception` reports TLSv1.0 and TLSv1.1.

### UIFileSharingEnabled (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/uifilesharingenabled

The page of the key that shares the Documents folder of the app with the user; the default is NO. `file-sharing` lists
it.

### LSSupportsOpeningDocumentsInPlace (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/lssupportsopeningdocumentsinplace

The page of the key that lets the app open the original document of a file provider instead of a copy. `file-sharing`
lists it.

### ITSAppUsesNonExemptEncryption (Apple Developer Documentation)

https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption

The page of the key that declares whether the app uses encryption that is not exempt from export compliance; without
it, App Store Connect asks the export compliance questions at every upload. `encryption-declaration` lists a missing
key.

## XML, output and configuration

### Extensible Markup Language (XML) 1.0 (W3C)

https://www.w3.org/TR/xml/

The XML standard. It predefines five entities (lt, gt, amp, apos and quot) and character references; every other
entity must be declared in a document type declaration. The reader of the tool decodes the five and character
references only, and refuses a declared entity and any internal subset where one could be declared.

### XML External Entity Prevention Cheat Sheet (OWASP)

https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html

The OWASP advice on XML readers: the safest reader refuses document type declarations, and one that needs them must not
load external entities or external DTDs and must limit entity expansion. The reader of the tool accepts only the plain
document type that every Info.plist carries, never loads what it names, and refuses every entity declaration
(docs/decisions/0002).

### Workflow commands for GitHub Actions (GitHub Docs)

https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

The page that describes the `::notice`, `::warning` and `::error` commands with their `file`, `line`, `col` and
`title` properties, which turn a line of output into an annotation on a file. `--format github` writes one such
command per finding, info as a notice.

### RFC 8259, The JSON Data Interchange Format

https://www.rfc-editor.org/rfc/rfc8259

The JSON standard. Its section on objects notes that when the names in an object are not unique, programs that read
it behave in different ways. The reader of the configuration refuses a repeated name instead of keeping one of the
values, so a setting never depends on which value a library would keep.
