# mobile-manifest-check

Checks the settings of a mobile app before a release. Give it the folder of the project, or single files, and it reads
every Android `AndroidManifest.xml` with the network security config and FileProvider paths it names, and every iOS
`Info.plist`, and reports the settings that should not ship: dangerous and restricted permissions,
`android:debuggable="true"`, `android:allowBackup`, cleartext traffic in the manifest and in the network security
config, trusted user certificates, exported components without a permission, intent filters without
`android:exported`, providers that share too much, usage descriptions that are missing, empty or placeholders, and
App Transport Security exceptions such as `NSAllowsArbitraryLoads`. Every rule names the OWASP MASVS control it
supports, and the run exits with a code a pipeline can act on.

Most of these settings are one attribute or one key, written once and never looked at again until a store review, a
penetration test or an incident finds them. Android documents the risk of each one (a debuggable flag, an exported
component, cleartext traffic, broad FileProvider paths) and Apple lists what a purpose string needs and what App
Transport Security exceptions cost; the OWASP Mobile Application Security Verification Standard
(https://mas.owasp.org/MASVS/) groups them under storage, network, platform interaction, resilience and privacy. This
tool reads them from the files on every pull request, without building the app.

- **Android.** Dangerous, special and Google Play restricted permissions (background location, SMS, call log,
  `QUERY_ALL_PACKAGES`), a debuggable build, backups on by default, cleartext traffic for the whole app or for some
  domains, user certificate authorities in the trust anchors, exported activities, services, receivers and providers
  with no permission or one any app can hold, a missing `android:exported` on a component with an intent filter, and
  FileProvider paths or grants that share a whole directory or the root of the device.
- **iOS.** Every usage description listed with its text, the ones that are empty, a placeholder or too long, the ones
  a background mode or required device capability needs and the Info.plist does not hold, `NSAllowsArbitraryLoads`,
  insecure HTTP and old TLS for an exception domain, file sharing and a missing `ITSAppUsesNonExemptEncryption`.
- **OWASP MASVS.** Every finding names the MASVS controls it supports, and the report counts the findings per control
  group.
- **Safe XML.** A small XML reader that never fetches a document type, refuses every declared entity, and so cannot be
  turned against the machine that runs it by an external entity or a billion laughs.
- **Honest about input.** A file it cannot read or parse is an error finding with its line, never passed over; a
  resource it cannot find is a finding of its own. [docs/limits.md](docs/limits.md) says what it cannot see.
- Reports as text, JSON and GitHub workflow annotations, with an exit code for a pipeline: `0` no finding at or above
  the `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no build run and no network.

```
npm test
```

```
tests 188
pass 184
fail 0
skipped 4
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link, a device or file permissions (a manifest named through a symbolic link, links inside a folder and in
the path of a resource, `/dev/zero` named as an input, and a file and a folder with no read access); they are guarded
with `process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same
tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/mobile-manifest-check.git
cd mobile-manifest-check
node bin/mobile-manifest-check.js examples/risky --config examples/config.json
```

Or without a clone, on your own app:

```
npx --yes github:INNERLUXES/mobile-manifest-check .
```

`examples/` holds two made-up apps: `examples/risky`, a tide diary with one risky setting of every kind on Android and
iOS and a widget whose Info.plist declares an entity, and `examples/clean`, a notes app that is ready to ship. The
risky app also holds what must not be reported: the launcher activity, a receiver guarded by a system permission, a
user certificate under `debug-overrides`, an exception domain that keeps TLS 1.2, settings inside comments, and a
merged manifest under `build` and a library under `Pods` that the default patterns leave out.
`examples/config.json` adds a placeholder text and fails the run on warnings.

## Usage

```
mobile-manifest-check <file-or-folder>... [--config <file>] [options]
```

```
--config <file>           settings in strict JSON: files, exclude, rules, placeholders, minSeverity and failOn
                          (--print-defaults shows them)
--format <name>           text, json or github (default: text); github writes workflow commands that GitHub
                          shows as annotations
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: info, warning, error (default: minSeverity of
                          the configuration, else info)
--fail-on <level>         the lowest level of a finding that fails the run: info, warning, error (default: failOn of
                          the configuration, else error)
--explain                 show the rule, the public sources and the tool's own choice behind each finding
--print-defaults          print the built-in configuration and exit
--help                    show the usage
--version                 show the version
```

A file named on the command line is read whatever its folder, if it is of a kind the tool reads. A folder is walked,
and every `AndroidManifest.xml`, `Info.plist` and file whose name ends in `-Info.plist` in it is read, in the order of
their paths; `build` folders, `Pods`, `Carthage`, `DerivedData` and Xcode archives are left out, `.git`,
`node_modules`, `.gradle`, `.idea` and `.dart_tool` are not entered, and a symbolic link is skipped, not followed. The
network security config and the FileProvider paths a manifest names are read at `res/xml/<name>.xml` next to it. The
path in the report is relative to the folder you run the command in, with forward slashes on every system, followed by
the line.

The report of the risky example starts with what was read, the configuration, the rules and the counts, then the
findings, errors first, each with what to change and its MASVS controls, then a summary of every manifest and
Info.plist and the MASVS groups of the findings:

```
mobile-manifest-check: examples/risky
input: examples/risky (5 files: 1 Android manifest, 2 XML resources, 2 Info.plist files)
config: examples/config.json (Tidepool): 3 file patterns, 5 exclude patterns, 18 placeholders; minimum severity info; fail on warning
rules: dangerous-permission (info); restricted-permission (warning); debuggable (error); allow-backup (warning); cleartext-traffic (error); cleartext-domain (warning); user-certificates (warning); exported-component (warning); missing-exported (error); provider-broad-paths (warning); missing-resource (warning); usage-description (info); empty-usage-description (error); missing-usage-description (error); ats-arbitrary-loads (error); ats-exception (warning); file-sharing (info); encryption-declaration (info); unreadable-file (error); unparsable-file (error)
findings: 37 (11 error, 16 warning, 10 info)

Findings (37)

  ERROR    debuggable                 examples/risky/android/app/src/main/AndroidManifest.xml:25
           android:debuggable="true" on <application>: the build can be debugged on any device, and app stores do not accept a debuggable app
           fix: remove android:debuggable from the manifest; the build tools set it for debug builds only
           masvs: MASVS-RESILIENCE-4

  ERROR    cleartext-traffic          examples/risky/android/app/src/main/AndroidManifest.xml:26
           android:usesCleartextTraffic="true": every connection of the app may use cleartext HTTP; on Android 7.0 and higher the network security config @xml/network_security_config decides instead
           fix: set android:usesCleartextTraffic="false" and cleartextTrafficPermitted="false" in the base-config, and use HTTPS; allow cleartext only to a named domain that needs it
           masvs: MASVS-NETWORK-1

  ERROR    missing-exported           examples/risky/android/app/src/main/AndroidManifest.xml:45
           <activity android:name=".DeepLinkActivity"> has an <intent-filter> and no android:exported: the app cannot be installed on Android 12 and higher, and on older systems the component is exported
           fix: set android:exported explicitly: true only when other apps must start the component, false otherwise
           masvs: MASVS-PLATFORM-1

  ERROR    cleartext-traffic          examples/risky/android/app/src/main/res/xml/network_security_config.xml:3
           <base-config cleartextTrafficPermitted="true">: cleartext traffic is permitted to every domain that no domain-config names
           fix: set android:usesCleartextTraffic="false" and cleartextTrafficPermitted="false" in the base-config, and use HTTPS; allow cleartext only to a named domain that needs it
           masvs: MASVS-NETWORK-1

  ERROR    empty-usage-description    examples/risky/ios/Tidepool/Info.plist:11
           NSMicrophoneUsageDescription (microphone) holds the placeholder "TODO": the system shows no useful reason when it asks the user, and App Review rejects an app whose purpose string is not valid
           fix: write one specific sentence that tells the user why the app needs the resource
           masvs: MASVS-PRIVACY-3

  ERROR    empty-usage-description    examples/risky/ios/Tidepool/Info.plist:13
           NSContactsUsageDescription (contacts) is empty: the system shows no useful reason when it asks the user, and App Review rejects an app whose purpose string is not valid
           fix: write one specific sentence that tells the user why the app needs the resource
           masvs: MASVS-PRIVACY-3

  ERROR    empty-usage-description    examples/risky/ios/Tidepool/Info.plist:15
           NSPhotoLibraryUsageDescription (photo library) holds the placeholder "Coming soon.": the system shows no useful reason when it asks the user, and App Review rejects an app whose purpose string is not valid
           fix: write one specific sentence that tells the user why the app needs the resource
           masvs: MASVS-PRIVACY-3

  ERROR    missing-usage-description  examples/risky/ios/Tidepool/Info.plist:21
           UIBackgroundModes holds location, but NSLocationWhenInUseUsageDescription (location while in use) is missing: the app cannot ask for that access, and an attempt to use it fails and may end the app
           fix: add the usage description the capability needs, or remove the capability if the app does not use it
           masvs: MASVS-PRIVACY-3

  ERROR    missing-usage-description  examples/risky/ios/Tidepool/Info.plist:27
           UIRequiredDeviceCapabilities requires bluetooth-le, but NSBluetoothAlwaysUsageDescription (Bluetooth) is missing: the app cannot ask for that access, and an attempt to use it fails and may end the app
           fix: add the usage description the capability needs, or remove the capability if the app does not use it
           masvs: MASVS-PRIVACY-3

  ERROR    ats-arbitrary-loads        examples/risky/ios/Tidepool/Info.plist:31
           NSAllowsArbitraryLoads is true: App Transport Security is off for every domain not named in NSExceptionDomains, so plain HTTP and weak TLS are allowed; iOS 10 and later ignore it because NSAllowsArbitraryLoadsInWebContent is also set, older systems do not
           fix: remove NSAllowsArbitraryLoads and move the servers to HTTPS, or name the one domain that needs an exception in NSExceptionDomains
           masvs: MASVS-NETWORK-1

  ERROR    unparsable-file            examples/risky/ios/TidepoolWidget/Info.plist:2
           line 2, column 1: a document type declaration with an internal subset, where entities are declared; the reader refuses it; nothing in the file is checked
           fix: correct the file at the line and column named; write the text of a declared entity out in full instead

  WARNING  restricted-permission      examples/risky/android/app/src/main/AndroidManifest.xml:11
           android.permission.ACCESS_BACKGROUND_LOCATION is requested: Google Play reviews location in the background and asks for a declaration of the feature that needs it
           fix: remove the permission, or prepare the declaration the store asks for; for package visibility, name the apps in a <queries> element instead
           masvs: MASVS-PRIVACY-1

  WARNING  restricted-permission      examples/risky/android/app/src/main/AndroidManifest.xml:12
           android.permission.READ_SMS is requested: Google Play allows the SMS group only to a default SMS handler, or for an approved exception
           fix: remove the permission, or prepare the declaration the store asks for; for package visibility, name the apps in a <queries> element instead
           masvs: MASVS-PRIVACY-1

  WARNING  restricted-permission      examples/risky/android/app/src/main/AndroidManifest.xml:18
           android.permission.QUERY_ALL_PACKAGES is requested: Google Play allows the visibility of every installed app only for an approved use, declared in the Play Console
           fix: remove the permission, or prepare the declaration the store asks for; for package visibility, name the apps in a <queries> element instead
           masvs: MASVS-PRIVACY-1

  WARNING  allow-backup               examples/risky/android/app/src/main/AndroidManifest.xml:23
           android:allowBackup is not set, and it is true by default: the app data goes into cloud backups and device-to-device transfers; backup rules are named in android:fullBackupContent (@xml/backup_rules), which the tool does not read
           fix: set android:allowBackup="false", or keep backups and leave every sensitive file out with android:dataExtractionRules and android:fullBackupContent
           masvs: MASVS-STORAGE-2

  WARNING  exported-component         examples/risky/android/app/src/main/AndroidManifest.xml:37
           <activity android:name=".ShareTideActivity"> is exported with no permission: any app can start it
           fix: set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature
           masvs: MASVS-PLATFORM-1

  WARNING  exported-component         examples/risky/android/app/src/main/AndroidManifest.xml:57
           <service android:name=".SyncService"> is exported with the permission example.tidepool.permission.SYNC, which this manifest declares with protection level normal, so any app can hold it: any app can start or bind to it
           fix: set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature
           masvs: MASVS-PLATFORM-1

  WARNING  missing-resource           examples/risky/android/app/src/main/AndroidManifest.xml:80
           the android.support.FILE_PROVIDER_PATHS meta-data of .PhotoProvider names @xml/photo_paths, but res/xml/photo_paths.xml is not next to this manifest; its settings were not checked
           fix: name the manifest of the source set that holds res/xml, or check the merged resource by hand
           masvs: MASVS-NETWORK-1 and MASVS-PLATFORM-1

  WARNING  exported-component         examples/risky/android/app/src/main/AndroidManifest.xml:88
           <provider android:name=".TideLogProvider"> is exported with a permission for only one of reading and writing: any app can query or change its data
           fix: set android:exported="false" unless other apps must reach the component; if they must, require a permission of protection level signature
           masvs: MASVS-PLATFORM-1

  WARNING  provider-broad-paths       examples/risky/android/app/src/main/AndroidManifest.xml:90
           <grant-uri-permission android:pathPrefix="/"> of <provider android:name=".TideLogProvider"> covers every path of the provider
           fix: share only the subdirectories that hold the files to share, never root-path, and name narrow grant-uri-permission paths
           masvs: MASVS-PLATFORM-1 and MASVS-STORAGE-2

  WARNING  user-certificates          examples/risky/android/app/src/main/res/xml/network_security_config.xml:6
           <certificates src="user"/> in the base-config: certificate authorities the user installed are trusted for every domain, so a proxy with such a certificate can read the traffic
           fix: trust the system certificate authorities only, and put certificates for testing under <debug-overrides>
           masvs: MASVS-NETWORK-1

  WARNING  cleartext-domain           examples/risky/android/app/src/main/res/xml/network_security_config.xml:9
           <domain-config cleartextTrafficPermitted="true"> permits cleartext traffic to tiles.tidepool.test and its subdomains
           fix: move the domains to HTTPS and remove the domain-config, or keep it to the one host that cannot move
           masvs: MASVS-NETWORK-1

  WARNING  provider-broad-paths       examples/risky/android/app/src/main/res/xml/file_paths.xml:4
           <external-path name="everything" path="."> shares the whole external storage, not one subdirectory of it, through <provider android:name="androidx.core.content.FileProvider">
           fix: share only the subdirectories that hold the files to share, never root-path, and name narrow grant-uri-permission paths
           masvs: MASVS-PLATFORM-1 and MASVS-STORAGE-2

  WARNING  provider-broad-paths       examples/risky/android/app/src/main/res/xml/file_paths.xml:5
           <root-path name="root" path=""> shares the root of the device file system through <provider android:name="androidx.core.content.FileProvider">
           fix: share only the subdirectories that hold the files to share, never root-path, and name narrow grant-uri-permission paths
           masvs: MASVS-PLATFORM-1 and MASVS-STORAGE-2

  WARNING  ats-exception              examples/risky/ios/Tidepool/Info.plist:33
           NSAllowsArbitraryLoadsInWebContent is true: web views may load pages over plain HTTP
           fix: move the domain to HTTPS with TLS 1.2 or higher and remove the exception
           masvs: MASVS-NETWORK-1

  WARNING  ats-exception              examples/risky/ios/Tidepool/Info.plist:41
           NSExceptionAllowsInsecureHTTPLoads is true for legacy.tidepool.test and its subdomains: plain HTTP is allowed to it
           fix: move the domain to HTTPS with TLS 1.2 or higher and remove the exception
           masvs: MASVS-NETWORK-1

  WARNING  ats-exception              examples/risky/ios/Tidepool/Info.plist:43
           NSExceptionMinimumTLSVersion is TLSv1.0 for legacy.tidepool.test and its subdomains: TLS versions below 1.2 are allowed to it
           fix: move the domain to HTTPS with TLS 1.2 or higher and remove the exception
           masvs: MASVS-NETWORK-1

  INFO     dangerous-permission       examples/risky/android/app/src/main/AndroidManifest.xml:9
           android.permission.CAMERA is requested: a dangerous permission (camera) that the user grants at run time
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     dangerous-permission       examples/risky/android/app/src/main/AndroidManifest.xml:10
           android.permission.ACCESS_FINE_LOCATION is requested: a dangerous permission (precise location) that the user grants at run time
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     dangerous-permission       examples/risky/android/app/src/main/AndroidManifest.xml:13
           android.permission.READ_CONTACTS is requested: a dangerous permission (contacts) that the user grants at run time
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     dangerous-permission       examples/risky/android/app/src/main/AndroidManifest.xml:14
           android.permission.WRITE_EXTERNAL_STORAGE is requested: a dangerous permission (shared storage) that the user grants at run time; requested up to API level 28 only
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     dangerous-permission       examples/risky/android/app/src/main/AndroidManifest.xml:17
           android.permission.SYSTEM_ALERT_WINDOW is requested: a special permission (drawing over other apps)
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     dangerous-permission       examples/risky/android/app/src/main/AndroidManifest.xml:19
           android.permission.RECORD_AUDIO is requested: a dangerous permission (microphone) that the user grants at run time
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     encryption-declaration     examples/risky/ios/Tidepool/Info.plist:4
           ITSAppUsesNonExemptEncryption is not set: App Store Connect asks the export compliance questions at every upload
           fix: add ITSAppUsesNonExemptEncryption with the answer that fits the app
           masvs: MASVS-CRYPTO-1

  INFO     usage-description          examples/risky/ios/Tidepool/Info.plist:9
           NSCameraUsageDescription (camera): "Take a photo of the shore to add it to a tide entry."
           fix: check that each text says, in one specific sentence, why the app needs the resource
           masvs: MASVS-PRIVACY-3

  INFO     usage-description          examples/risky/ios/Tidepool/Info.plist:17
           NSLocationAlwaysAndWhenInUseUsageDescription (location at all times): "Tidepool logs the tide at your beach while the app is closed."
           fix: check that each text says, in one specific sentence, why the app needs the resource
           masvs: MASVS-PRIVACY-3

  INFO     file-sharing               examples/risky/ios/Tidepool/Info.plist:53
           UIFileSharingEnabled is true: the files of the Documents folder of the app are shared with the user
           fix: keep sensitive files out of the Documents folder, or turn the key off
           masvs: MASVS-STORAGE-2

Android manifests

  file                                                     package           target  permissions  sensitive  exported  backup         cleartext  debuggable
  examples/risky/android/app/src/main/AndroidManifest.xml  example.tidepool  27      10           9          6 of 9    on by default  app-wide   yes

  @xml/network_security_config (network security config) of examples/risky/android/app/src/main/AndroidManifest.xml: examples/risky/android/app/src/main/res/xml/network_security_config.xml
  @xml/file_paths (FileProvider paths) of examples/risky/android/app/src/main/AndroidManifest.xml: examples/risky/android/app/src/main/res/xml/file_paths.xml
  @xml/photo_paths (FileProvider paths) of examples/risky/android/app/src/main/AndroidManifest.xml: examples/risky/android/app/src/main/res/xml/photo_paths.xml not found

iOS property lists

  file                                    bundle id                     usage descriptions  arbitrary loads  exception domains  background modes
  examples/risky/ios/Tidepool/Info.plist  $(PRODUCT_BUNDLE_IDENTIFIER)  5                   yes              2                  location, fetch

OWASP MASVS groups of the findings

  MASVS-STORAGE (Storage): 5 findings
    MASVS-STORAGE-2, the app keeps sensitive data from leaking: 5
  MASVS-CRYPTO (Cryptography): 1 finding
    MASVS-CRYPTO-1, the app uses current strong cryptography in the way the industry advises: 1
  MASVS-NETWORK (Network Communication): 9 findings
    MASVS-NETWORK-1, the app secures all of its network traffic with current good practice: 9
  MASVS-PLATFORM (Platform Interaction): 8 findings
    MASVS-PLATFORM-1, the app uses the mechanisms of communication between processes safely: 8
  MASVS-RESILIENCE (Resilience Against Reverse Engineering and Tampering): 1 finding
    MASVS-RESILIENCE-4, the app makes analysis while it runs, such as debugging, harder: 1
  MASVS-PRIVACY (Privacy): 16 findings
    MASVS-PRIVACY-1, the app reaches as little sensitive data and as few resources as it can: 9
    MASVS-PRIVACY-3, the app is open about the data it collects and how it uses it: 7

This check reads the manifests, the XML resources they name and the property lists it was given, as they are written. It does not read the merged manifest of a build, Gradle or Xcode build settings, manifest placeholders, resource values, localized strings or the code of the app, so a setting made there is not seen (docs/limits.md).

RESULT: FAIL - 27 findings at or above warning (11 error, 16 warning, 10 info)
```

With `--explain`, each finding also shows the rule, the points of the public pages it rests on and the tool's own
choice:

```
  WARNING  cleartext-domain           examples/risky/android/app/src/main/res/xml/network_security_config.xml:9
           <domain-config cleartextTrafficPermitted="true"> permits cleartext traffic to tiles.tidepool.test and its subdomains
           fix: move the domains to HTTPS and remove the domain-config, or keep it to the one host that cannot move
           masvs: MASVS-NETWORK-1
           rule: <domain-config cleartextTrafficPermitted="true"> in the network security config
           basis: a network security config sets cleartextTrafficPermitted and the trusted certificate authorities for the whole app in base-config and per domain in domain-config, and debug-overrides apply only to debuggable builds (Network security configuration (Android Developers), https://developer.android.com/privacy-and-security/security-config)
           basis: cleartext traffic can be read and changed by anyone on the network path, so data should go over encrypted channels, with cleartext opted out in the network security config (Cleartext communications (Android Developers, security risks), https://developer.android.com/privacy-and-security/risks/cleartext-communications)
           the tool's own choice: a domain-config with cleartextTrafficPermitted="true" is a warning, not an error, because its scope is the domains it names
```

The clean example passes:

```
mobile-manifest-check: examples/clean
input: examples/clean (4 files: 1 Android manifest, 2 XML resources, 1 Info.plist)
config: built-in defaults: 3 file patterns, 5 exclude patterns, 17 placeholders; minimum severity info; fail on error
rules: dangerous-permission (info); restricted-permission (warning); debuggable (error); allow-backup (warning); cleartext-traffic (error); cleartext-domain (warning); user-certificates (warning); exported-component (warning); missing-exported (error); provider-broad-paths (warning); missing-resource (warning); usage-description (info); empty-usage-description (error); missing-usage-description (error); ats-arbitrary-loads (error); ats-exception (warning); file-sharing (info); encryption-declaration (info); unreadable-file (error); unparsable-file (error)
findings: 2 (2 info)

Findings (2)

  INFO     dangerous-permission       examples/clean/android/app/src/main/AndroidManifest.xml:7
           android.permission.CAMERA is requested: a dangerous permission (camera) that the user grants at run time
           fix: keep the permission only if a feature needs it, and ask for it when the user starts that feature
           masvs: MASVS-PRIVACY-1

  INFO     usage-description          examples/clean/ios/Driftwood/Info.plist:9
           NSCameraUsageDescription (camera): "Scan a page from a paper notebook into a note."
           fix: check that each text says, in one specific sentence, why the app needs the resource
           masvs: MASVS-PRIVACY-3

Android manifests

  file                                                     package            target   permissions  sensitive  exported  backup  cleartext      debuggable
  examples/clean/android/app/src/main/AndroidManifest.xml  example.driftwood  not set  2            1          1 of 3    off     not permitted  no

  @xml/network_security_config (network security config) of examples/clean/android/app/src/main/AndroidManifest.xml: examples/clean/android/app/src/main/res/xml/network_security_config.xml
  @xml/file_paths (FileProvider paths) of examples/clean/android/app/src/main/AndroidManifest.xml: examples/clean/android/app/src/main/res/xml/file_paths.xml

iOS property lists

  file                                     bundle id          usage descriptions  arbitrary loads  exception domains  background modes
  examples/clean/ios/Driftwood/Info.plist  example.driftwood  1                   no               0                  none

OWASP MASVS groups of the findings

  MASVS-PRIVACY (Privacy): 2 findings
    MASVS-PRIVACY-1, the app reaches as little sensitive data and as few resources as it can: 1
    MASVS-PRIVACY-3, the app is open about the data it collects and how it uses it: 1

This check reads the manifests, the XML resources they name and the property lists it was given, as they are written. It does not read the merged manifest of a build, Gradle or Xcode build settings, manifest placeholders, resource values, localized strings or the code of the app, so a setting made there is not seen (docs/limits.md).

RESULT: PASS - no finding at or above error (2 info)
```

## What it reports

| Rule | Key | Default level | Finds |
| --- | --- | --- | --- |
| `dangerous-permission` | `rules.dangerousPermission` | info | a permission of protection level dangerous, or a special permission such as `SYSTEM_ALERT_WINDOW` |
| `restricted-permission` | `rules.restrictedPermission` | warning | `ACCESS_BACKGROUND_LOCATION`, the SMS and Call Log groups, `QUERY_ALL_PACKAGES` |
| `debuggable` | `rules.debuggable` | error | `android:debuggable="true"` on the application |
| `allow-backup` | `rules.allowBackup` | warning | `android:allowBackup="true"`, or no `android:allowBackup`, since true is the default |
| `cleartext-traffic` | `rules.cleartextTraffic` | error | `android:usesCleartextTraffic="true"`, a base-config that permits cleartext, or a target API level below 28 that permits it by default |
| `cleartext-domain` | `rules.cleartextDomain` | warning | a domain-config that permits cleartext |
| `user-certificates` | `rules.userCertificates` | warning | `<certificates src="user"/>` outside `debug-overrides` |
| `exported-component` | `rules.exportedComponent` | warning | `android:exported="true"` with no permission, half a provider permission, or a permission of level normal |
| `missing-exported` | `rules.missingExported` | error | an activity, service or receiver with an intent filter and no `android:exported` |
| `provider-broad-paths` | `rules.providerBroadPaths` | warning | `root-path`, a path of `.` or `/`, a grant on every path, or `grantUriPermissions` with no paths |
| `missing-resource` | `rules.missingResource` | warning | a network security config or paths resource the manifest names that is not next to it |
| `usage-description` | `rules.usageDescription` | info | every key ending in `UsageDescription`, with its text |
| `empty-usage-description` | `rules.emptyUsageDescription` | error | a usage description that is empty, a placeholder, punctuation only, 4,000 bytes or more, or not a string |
| `missing-usage-description` | `rules.missingUsageDescription` | error | a background mode, device capability or location key whose usage description is missing |
| `ats-arbitrary-loads` | `rules.atsArbitraryLoads` | error | `NSAllowsArbitraryLoads` true |
| `ats-exception` | `rules.atsException` | warning | arbitrary loads for web content or media, insecure HTTP or TLS below 1.2 for an exception domain |
| `file-sharing` | `rules.fileSharing` | info | `UIFileSharingEnabled` or `LSSupportsOpeningDocumentsInPlace` true |
| `encryption-declaration` | `rules.encryptionDeclaration` | info | no `ITSAppUsesNonExemptEncryption` |
| `unreadable-file` | none | error | a file that cannot be read as UTF-8 text, a binary property list included |
| `unparsable-file` | none | error | a file the XML reader refuses, a declared entity included, or one whose root is not that of its kind |

The two rules of input problems are always errors. [docs/method.md](docs/method.md) says exactly what each rule looks
at and what it cannot see, and [docs/rules-and-sources.md](docs/rules-and-sources.md) gives the points of the public
pages each rule rests on.

## OWASP MASVS

Every rule names the MASVS controls it supports. The mapping is data, in `src/masvs.js` and `src/rules.js`, and is
listed with the groups in [docs/rules-and-sources.md](docs/rules-and-sources.md):

| MASVS group | Controls | Rules |
| --- | --- | --- |
| MASVS-STORAGE | MASVS-STORAGE-2 | `allow-backup`, `provider-broad-paths`, `file-sharing` |
| MASVS-CRYPTO | MASVS-CRYPTO-1 | `encryption-declaration` |
| MASVS-NETWORK | MASVS-NETWORK-1 | `cleartext-traffic`, `cleartext-domain`, `user-certificates`, `missing-resource`, `ats-arbitrary-loads`, `ats-exception` |
| MASVS-PLATFORM | MASVS-PLATFORM-1 | `exported-component`, `missing-exported`, `provider-broad-paths`, `missing-resource` |
| MASVS-RESILIENCE | MASVS-RESILIENCE-4 | `debuggable` |
| MASVS-PRIVACY | MASVS-PRIVACY-1, MASVS-PRIVACY-3 | `dangerous-permission`, `restricted-permission`, `usage-description`, `empty-usage-description`, `missing-usage-description` |

A finding points at a setting that works against a control; neither a finding nor a clean run says that an app meets
one. The MASVS is verified on the app itself, with the tests of the MASTG.

## What is not checked

The tool checks what is written and never guesses. It does not check:

- the merged manifest of a build, unless it is named on the command line, and so the permissions and components that
  libraries add;
- values set outside the files: a target API level in Gradle, a manifest placeholder, a resource value such as
  `@bool/debug`, an Xcode build setting or an `INFOPLIST_KEY_` setting;
- the backup rules that `android:dataExtractionRules` names, localized usage descriptions in `InfoPlist.strings`, a
  privacy manifest or entitlements;
- what the code of the app does: whether it uses the camera, checks the caller of an exported component or pins its
  certificates;
- a binary property list, which must be converted to XML first.

So a clean run means the files hold none of the settings the rules look for, and every report says so.

## The configuration file

```json
{
  "name": "Tidepool",
  "placeholders": { "add": ["coming soon"] },
  "failOn": "warning"
}
```

Every key is optional, and without `--config` the defaults apply. `files` and `exclude` are the file patterns of a
folder walk, with `*`, `?` and `**`; `rules` sets the level of each rule (`info`, `warning`, `error` or `off`),
`placeholders` the texts that count as a placeholder in a usage description, `minSeverity` the lowest level shown and
`failOn` the lowest level that fails the run. A list is a JSON array that replaces the built-in list, or an object with
`replace`, `add` and `remove`. A key the tool does not know is an error with its line and a suggestion, and a key named
twice is refused. [docs/inputs.md](docs/inputs.md) describes every key, and `--print-defaults` writes the whole default
configuration out.

## Formats

- `text`: for a terminal: what was read, the configuration, the rules, the counts, the findings with the file and line,
  what to change and the MASVS controls, a summary of every manifest and Info.plist, the MASVS groups of the findings,
  the notes, the notice and the result. With `--explain` also the rule, the points of the public pages and the tool's
  own choice behind each finding.
- `json` (or `--json`): the whole report: the input with the kind of every file, the configuration, every finding with
  its file, line, column, platform, MASVS controls and what to change, the summary of every file and of the MASVS
  groups, the totals, the result, the notes and the notice.
- `github`: one workflow command per finding, `::error`, `::warning` or `::notice` (for info) with the file, line and
  column, which GitHub shows as an annotation in the pull request, then a summary line. The characters a command gives
  a meaning to are escaped. Two findings of the risky example:

```
::error file=examples/risky/android/app/src/main/AndroidManifest.xml,line=45,col=9,title=mobile-manifest-check missing-exported::<activity android:name=".DeepLinkActivity"> has an <intent-filter> and no android:exported: the app cannot be installed on Android 12 and higher, and on older systems the component is exported; fix: set android:exported explicitly: true only when other apps must start the component, false otherwise; MASVS-PLATFORM-1
::error file=examples/risky/ios/Tidepool/Info.plist,line=31,col=3,title=mobile-manifest-check ats-arbitrary-loads::NSAllowsArbitraryLoads is true: App Transport Security is off for every domain not named in NSExceptionDomains, so plain HTTP and weak TLS are allowed; iOS 10 and later ignore it because NSAllowsArbitraryLoadsInWebContent is also set, older systems do not; fix: remove NSAllowsArbitraryLoads and move the servers to HTTPS, or name the one domain that needs an exception in NSExceptionDomains; MASVS-NETWORK-1
```

## Exit codes

`0`: no finding at or above the fail-on level (`error` by default). `1`: at least one finding at or above it; with the
default, a debuggable build, cleartext for the whole app, a missing `android:exported`, a usage description that is
missing, empty or a placeholder, App Transport Security switched off, or a file the tool could not read or parse; with
`--fail-on warning`, any risky setting too. `2`: a usage or input error: no path, an unknown option, an option given
twice, `--explain` with the github format, a URL in place of a path, a path that cannot be read, a symbolic link named
on the command line, a folder with no file to read, a file of no kind the tool reads, input past the limit of a run, or
a configuration with an unknown key, a key named twice or a value of the wrong kind. With exit code `2` the tool gives
no result and prints the problems on standard error.

## Limits

The tool reads files; it does not build the app, merge its manifests, resolve its resources or build settings, or read
its code. A run reports what the files hold in the forms of docs/method.md. The XML reader refuses a file that declares
an entity, even a harmless one. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 4 MB
for a file, 256 MB and 20,000 files for a run, 500 findings listed per rule.
[docs/threat-model.md](docs/threat-model.md) lists the risks of reading the files of a pull request and their
controls, and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the configuration, the files and the resources the manifests name, and builds the report of the run |
| `src/files.js`, `src/glob.js`, `src/kinds.js` | the bounded reading of files and folders with no link followed, the file patterns, and the kind of each file |
| `src/xml.js`, `src/plist.js` | the XML reader that expands no entity, and the values of a property list |
| `src/android.js`, `src/permissions.js` | the manifest, network security config and FileProvider paths, the Android rules, and the permissions they know |
| `src/ios.js` | the iOS rules of an Info.plist |
| `src/analyse.js` | the findings with their lines and the summary of every file |
| `src/config.js`, `src/defaults.js`, `src/json.js` | the configuration file over the defaults, and its strict JSON reader |
| `src/rules.js`, `src/masvs.js` | the rules, their levels and the result, and the OWASP MASVS groups and controls they support |
| `src/report.js`, `src/text.js`, `src/size.js`, `src/words.js` | the text, JSON and GitHub output, the cleaning of text from the input, number formats and compared words |
| `src/data.js` | the public pages and the points the rules rest on, in this project's own words |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

| Fact | Source |
| --- | --- |
| The control groups and the controls of the MASVS | OWASP, https://mas.owasp.org/MASVS/ and the page of each group and control |
| Runtime (dangerous) and special permissions | Android Developers, https://developer.android.com/guide/topics/permissions/overview |
| The protection level of every system permission | Android API reference, https://developer.android.com/reference/android/Manifest.permission |
| `uses-permission` and `maxSdkVersion` | Android Developers, https://developer.android.com/guide/topics/manifest/uses-permission-element |
| SMS and call log permissions only for default handlers | Android Developers, https://developer.android.com/guide/topics/permissions/default-handlers |
| Package visibility and `QUERY_ALL_PACKAGES` | Android Developers, https://developer.android.com/training/package-visibility |
| The Google Play policies for SMS and Call Log, background location and `QUERY_ALL_PACKAGES` | Play Console Help, https://support.google.com/googleplay/android-developer/answer/10208820, https://support.google.com/googleplay/android-developer/answer/9799150 and https://support.google.com/googleplay/android-developer/answer/10158779 |
| `android:debuggable`, `android:allowBackup`, `android:usesCleartextTraffic` and `android:permission` | Android Developers, https://developer.android.com/guide/topics/manifest/application-element |
| The risk of a debuggable app | Android Developers, https://developer.android.com/privacy-and-security/risks/android-debuggable |
| Auto Backup and backups without sensitive data | Android Developers, https://developer.android.com/identity/data/autobackup and https://developer.android.com/privacy-and-security/risks/backup-best-practices |
| The network security config and cleartext traffic | Android Developers, https://developer.android.com/privacy-and-security/security-config and https://developer.android.com/privacy-and-security/risks/cleartext-communications |
| `android:exported`, its risk and the Android 12 rule for intent filters | Android Developers, https://developer.android.com/guide/topics/manifest/activity-element, https://developer.android.com/privacy-and-security/risks/android-exported and https://developer.android.com/about/versions/12/behavior-changes-12 |
| Providers, grants and FileProvider paths | Android Developers, https://developer.android.com/guide/topics/manifest/provider-element, https://developer.android.com/reference/androidx/core/content/FileProvider and https://developer.android.com/privacy-and-security/risks/file-providers |
| The Info.plist and its keys | Apple Developer Documentation, https://developer.apple.com/documentation/bundleresources/information-property-list |
| Purpose strings of protected resources | Apple Developer Documentation, https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources |
| App Transport Security and its exceptions | Apple Developer Documentation, https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity |
| The five entities of XML | W3C, https://www.w3.org/TR/xml/ |
| Refusing document types and entities | OWASP, https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html |
| Annotations from workflow commands | GitHub Docs, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands |
| Repeated names in a JSON object | RFC 8259, https://www.rfc-editor.org/rfc/rfc8259 |

[research/sources.md](research/sources.md) has a note on each page, in this project's own words, among them the pages
of the usage keys and ATS keys this table leaves out.

## Background

A mobile release is checked by people under time pressure, and the settings in this report are the ones that slip
through: a debuggable flag left from a test build, cleartext allowed for one old server and then for all of them, an
activity exported for a deep link, a usage description that still says TODO. Each is one line in a file, and each is
cheap to fix before the store or an attacker finds it. A check that reads the files on every pull request keeps them
out of the release. How mobile apps are planned, built and reviewed is described on the page
[Mobile App Consulting Services](https://innerluxes.dev/application/mobile/consulting).

## License

MIT
