# Method

This document says exactly what the tool reads, how it reads each kind of file, what each rule looks at and cannot
see, and how the report is built. The names used here are the defaults; docs/inputs.md says how the configuration
changes them.

## What is read

The input is one or more paths and, if given, a configuration file. A file named on the command line is read whatever
its folder, as long as it is of a kind the tool reads. A folder is walked: its files and subfolders in the order of
their names (compared by code unit, so the order does not depend on the locale), `.git`, `node_modules`, `.gradle`,
`.idea` and `.dart_tool` left out, symbolic links skipped and counted in a note, and the files whose path relative to
the folder matches a pattern of `files` and none of `exclude` are read. By default `files` matches
`AndroidManifest.xml`, `Info.plist` and names that end in `-Info.plist`, and `exclude` leaves out every `build` folder
(which holds the merged copies of the manifests that the build writes), `Pods`, `Carthage`, `DerivedData` and Xcode
archives.

The XML resources a manifest names are read through the manifest, not through the patterns: the network security
config of `android:networkSecurityConfig` and the paths of a FileProvider, named by the meta-data
`android.support.FILE_PROVIDER_PATHS`. A reference `@xml/<name>` is looked for at `res/xml/<name>.xml` in the folder
of the manifest, which is where an Android project keeps the resources of the source set of that manifest. A name with
anything but letters, digits and underscores is not used to build a path. The folders `res` and `res/xml` on the way
must be real folders: a symbolic link there is not followed, and the resource becomes an `unreadable-file` finding.

Each file is read as UTF-8, with or without a byte order mark, with LF, CR LF or CR line ends.

## The kinds of files

| Kind | Name | Read as |
| --- | --- | --- |
| `android-manifest` | `AndroidManifest.xml` | an Android manifest |
| `ios-plist` | `Info.plist`, or a name that ends in `-Info.plist` | an iOS information property list in XML |
| `android-resource` | `res/xml/<name>.xml` next to a manifest that names it | a network security config or FileProvider paths |

The names are compared with their case, as the platforms write them.

## Input problems

A path named on the command line that is missing, a symbolic link, a device or a pipe, a folder with no file that
matches, a file of no kind the tool reads, a configuration with a problem, and input past the limit of a run (256 MB,
20,000 files) stop the run with exit code `2` and no result.

A file of the input that cannot be read is an error finding of the rule `unreadable-file`: a binary property list
(the bytes `bplist` at the start), a file that is binary (a null byte in its first 8,000 bytes), UTF-16, not valid
UTF-8, over 4 MB, a symbolic link, or a resource in a folder that is a symbolic link. A file that the XML reader
refuses, or whose root element is not the one its kind needs, is an error finding of the rule `unparsable-file`, with
the line and column of the problem. Neither rule can be set lower or off, so a run that fails on errors (the default)
never passes because part of the input was passed over. Nothing in such a file is checked.

## The XML reader

All three kinds of files are read by one small XML reader, once, left to right
([decision 2](decisions/0002-read-xml-with-a-small-reader-that-expands-no-entity.md)). It reads elements, attributes in
single or double quotes, text, CDATA sections, comments and processing instructions, and keeps the offset of every
element and attribute, so a finding points at the line and column of the attribute or element it is about. A setting
written inside a comment or a CDATA section is never read.

It never loads, fetches or expands anything:

- a document type declaration is accepted only in its plain form, a name with a `PUBLIC` or `SYSTEM` identifier and no
  internal subset, because every Info.plist that Xcode writes starts with one; the identifier is only text;
- a document type with an internal subset (`[ ... ]`), any other declaration (`<!ENTITY`, `<!ELEMENT`, `<!ATTLIST`),
  and a second document type are refused;
- only the five entities of XML (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&apos;`) and character references are decoded;
  any other entity reference, and a `&` that starts no reference, is refused.

A tag, comment, CDATA section or value that is not closed, an end tag that does not match, an attribute without
quotes, without a value or named twice, a `<` inside an attribute value, text outside the root element and a second
root element are refused too.

### Namespaces

An attribute of the android namespace is found by the namespace URI its prefix is bound to
(`http://schemas.android.com/apk/res/android`), on the element or an ancestor, so a manifest that binds the namespace
to another prefix is read the same, and an attribute such as `exported="true"` without a prefix, or with a prefix bound
to another URI, is not an Android attribute. The attributes of the network security config and of the paths of a
FileProvider have no prefix and are read by name.

### Values

Only literal values count. A Boolean attribute is true when its value is `true` and false when it is `false`, after
white space is trimmed; a resource reference such as `@bool/debug` and a manifest placeholder such as `${debuggable}`
are neither, and no rule reports them. In an Info.plist, a Boolean key is true for `<true/>`, an `<integer>` other
than zero, and the strings `YES`, `true` or `1` in any case of the letters.

## Android manifests

The manifest must have a `manifest` root. The tool reads, as children of the root: `uses-permission` and
`uses-permission-sdk-23` with `android:name` and `android:maxSdkVersion`, `permission` with `android:name` and
`android:protectionLevel` (normal when it is missing), the first `uses-sdk` with a numeric `android:targetSdkVersion`,
and the first `application`. On the application it reads `android:debuggable`, `android:allowBackup`,
`android:usesCleartextTraffic`, `android:networkSecurityConfig`, `android:fullBackupContent`,
`android:dataExtractionRules` and `android:permission`, and every `activity`, `activity-alias`, `service`, `receiver`
and `provider` with its `android:exported`, permissions, `android:grantUriPermissions`, intent filters (their actions
and categories), `meta-data` and `grant-uri-permission` children.

## Network security configs

The root must be `network-security-config`. The tool reads the first `base-config` and every `domain-config`, nested
ones included, in the order of the file, with `cleartextTrafficPermitted`, the `domain` children with
`includeSubdomains`, and the `certificates` of the `trust-anchors` directly inside each config. `debug-overrides` is
not read: it applies to debuggable builds only.

## FileProvider paths

The root must be `paths`. The tool reads `root-path`, `files-path`, `cache-path`, `external-path`,
`external-files-path`, `external-cache-path` and `external-media-path` with their `name` and `path`. A resource named
by `android:networkSecurityConfig` whose root is `paths`, or the other way round, is an `unparsable-file` finding.

## Info.plist files

The root must be `plist` with exactly one value, a dictionary. Every value type of a property list is read (`dict`,
`array`, `string`, `integer`, `real`, `true`, `false`, `date`, `data`); a dictionary must alternate `key` and value, and
a key named twice in one dictionary is refused. Only the keys at the top of the dictionary are checked, as the system
reads them; a key inside another dictionary means something else.

## The rules

### `dangerous-permission`

Info. A `uses-permission` or `uses-permission-sdk-23` element that names a system permission (`android.permission.`
followed by the name) of protection level dangerous in the Android reference, or one of the special permissions
`SYSTEM_ALERT_WINDOW`, `REQUEST_INSTALL_PACKAGES`, `MANAGE_EXTERNAL_STORAGE`, `PACKAGE_USAGE_STATS` and
`WRITE_SETTINGS`. One finding per permission name, at its first element, with the kind of data it guards and
`maxSdkVersion` when it is set. A permission of the next rule is reported by that rule only. A normal permission such
as `INTERNET`, a signature permission and a permission of another app are not reported.

### `restricted-permission`

Warning. `ACCESS_BACKGROUND_LOCATION`, the SMS group (`SEND_SMS`, `RECEIVE_SMS`, `READ_SMS`, `RECEIVE_WAP_PUSH`,
`RECEIVE_MMS`), the Call Log group (`READ_CALL_LOG`, `WRITE_CALL_LOG`, `PROCESS_OUTGOING_CALLS`) and
`QUERY_ALL_PACKAGES`, which Google Play restricts beyond the system: the message says what the store asks for. The
tool does not know whether the app is published on Google Play.

### `debuggable`

Error. `android:debuggable="true"` on the application element. The attribute on any other element, `false`, a
resource reference and a placeholder are not reported. The build tools set the flag for debug builds, so a manifest
that sets it ships it in release builds too.

### `allow-backup`

Warning. `android:allowBackup="true"` on the application, or no `android:allowBackup` at all, since true is the
default; the finding is at the attribute, or at the application element when it is missing. When
`android:dataExtractionRules` or `android:fullBackupContent` names backup rules, the message names them; the tool does
not read them, so it cannot say whether they leave the sensitive files out. A manifest with no application element is
not reported.

### `cleartext-traffic`

Error. Cleartext permitted for the whole app, in one of three forms:

- `android:usesCleartextTraffic="true"` on the application; when the manifest also names a network security config, the
  message says that the config decides instead on Android 7.0 and higher;
- `<base-config cleartextTrafficPermitted="true">` in the network security config, reported in that file;
- a `uses-sdk` `android:targetSdkVersion` below 28 written in the manifest, with no `android:usesCleartextTraffic` and
  no base-config that sets `cleartextTrafficPermitted="false"`, since cleartext is on by default for such a target.
  A target API level set only in the Gradle build is not seen.

### `cleartext-domain`

Warning. A `domain-config` with `cleartextTrafficPermitted="true"`, with the domains it names. Its scope is those
domains, so it is a warning and not an error. A nested domain-config that does not set the attribute inherits it from
its parent and is not reported again.

### `user-certificates`

Warning. `<certificates src="user"/>` in the trust anchors of the base-config or of a domain-config: certificate
authorities the user installed are trusted, so a proxy whose certificate is installed on the device can read the
traffic. Inside `debug-overrides` the same element applies to debuggable builds only and is not reported.

### `exported-component`

Warning. An `activity`, `activity-alias`, `service`, `receiver` or `provider` with `android:exported="true"` that other
apps can reach without a permission:

- no `android:permission` of its own and none on the application; for a provider, also not both of
  `android:readPermission` and `android:writePermission`, and a provider with only one of the two is reported;
- or a permission that this manifest declares with protection level normal (or none), which any app can request.

An activity or activity-alias with an intent filter that holds the `android.intent.action.MAIN` action and the
`android.intent.category.LAUNCHER` category is the launcher activity, which must be exported, and is not reported. A
permission declared in another app or in the system is taken as a guard; its protection level is not known here.

### `missing-exported`

Error. An `activity`, `activity-alias`, `service` or `receiver` with an `intent-filter` child and no
`android:exported` attribute. Such an app cannot be installed on Android 12 and higher, and on older systems the
component is exported. A provider is not reported: the Android 12 change names activities, services and receivers.

### `provider-broad-paths`

Warning. A provider that can grant access to more than it should:

- in the FileProvider paths resource, a `root-path` element (the root of the device file system), or any path element
  whose `path` is missing, empty, `.`, `./` or `/`, which shares the whole directory and not one subdirectory of it;
  the finding is in the paths file;
- a `grant-uri-permission` whose `android:path` or `android:pathPrefix` is `/` or empty, or whose `android:pathPattern`
  is `.*` or `/.*`;
- a provider with `android:grantUriPermissions="true"` and no `FILE_PROVIDER_PATHS` meta-data, whose grants can reach
  any of its data.

### `missing-resource`

Warning. `android:networkSecurityConfig` or the `FILE_PROVIDER_PATHS` meta-data names `@xml/<name>`, and
`res/xml/<name>.xml` is not next to the manifest, or the name is not a plain resource name; the settings of the
resource were not checked. A resource of another source set, a flavor or a library is not found this way; name the
manifest of the source set that holds it.

### `usage-description`

Info. Every key at the top of the Info.plist whose name ends in `UsageDescription` (`NFCReaderUsageDescription`
included), with a value that is a valid purpose string, listed with its text and the resource it guards, so the list
of protected resources the app asks for can be read in one place.

### `empty-usage-description`

Error. A key at the top of the Info.plist whose name ends in `UsageDescription` and whose value:

- is not a string;
- is empty or white space only;
- is 4,000 bytes of UTF-8 or more;
- is a placeholder: after white space is trimmed and joined, the letters A to Z lowered and one final period or
  exclamation mark taken off, it is one of the texts of `placeholders` (docs/inputs.md), or it is or starts with
  `todo`, `fixme`, `tbd`, `lorem ipsum` or `placeholder` followed by a space or a colon;
- holds no letter or digit at all (only punctuation);
- is the name of the key itself.

A text that holds a build setting such as `$(PRODUCT_NAME)` is taken as written; the tool does not expand it.

### `missing-usage-description`

Error. A capability the Info.plist itself declares, with no key for the usage description it needs:

| Declared | Needs |
| --- | --- |
| `location` in `UIBackgroundModes` | `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription` |
| `bluetooth-central` or `bluetooth-peripheral` in `UIBackgroundModes` | `NSBluetoothAlwaysUsageDescription` |
| `still-camera`, `auto-focus-camera`, `front-facing-camera`, `camera-flash` or `video-camera` in `UIRequiredDeviceCapabilities` | `NSCameraUsageDescription` |
| `microphone` in `UIRequiredDeviceCapabilities` | `NSMicrophoneUsageDescription` |
| `location-services` or `gps` in `UIRequiredDeviceCapabilities` | `NSLocationWhenInUseUsageDescription` |
| `bluetooth-le` in `UIRequiredDeviceCapabilities` | `NSBluetoothAlwaysUsageDescription` |
| `healthkit` in `UIRequiredDeviceCapabilities` | `NSHealthShareUsageDescription` |
| `nfc` in `UIRequiredDeviceCapabilities` | `NFCReaderUsageDescription` |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | `NSLocationWhenInUseUsageDescription` |

`UIRequiredDeviceCapabilities` is read as an array of strings or as a dictionary of Booleans, where only the keys set
to true count. Each missing key is reported once, at the first value that needs it. A key that is there but empty is
reported by `empty-usage-description`, not here. The code of the app, which is where a resource is really used, is not
read.

### `ats-arbitrary-loads`

Error. `NSAllowsArbitraryLoads` true in the `NSAppTransportSecurity` dictionary. When
`NSAllowsArbitraryLoadsInWebContent`, `NSAllowsArbitraryLoadsForMedia` or `NSAllowsLocalNetworking` is also present,
the message says that iOS 10 and later ignore the key; it is still an error, because older systems do not.

### `ats-exception`

Warning. In the `NSAppTransportSecurity` dictionary: `NSAllowsArbitraryLoadsInWebContent` or
`NSAllowsArbitraryLoadsForMedia` true; and in each domain of `NSExceptionDomains`,
`NSExceptionAllowsInsecureHTTPLoads` or `NSThirdPartyExceptionAllowsInsecureHTTPLoads` true, or
`NSExceptionMinimumTLSVersion` or `NSThirdPartyExceptionMinimumTLSVersion` set to `TLSv1.0` or `TLSv1.1`. The message
names the domain, and its subdomains when `NSIncludesSubdomains` is true. `NSAllowsLocalNetworking` is not reported.

### `file-sharing`

Info. `UIFileSharingEnabled` true (the Documents folder of the app is shared with the user), and
`LSSupportsOpeningDocumentsInPlace` true (the app opens the original documents of file providers), one finding each.

### `encryption-declaration`

Info. No `ITSAppUsesNonExemptEncryption` key in the Info.plist, at the line of its top dictionary.

### `unreadable-file`

Error, always. A file the tool could not read as UTF-8 text; see "Input problems" above.

### `unparsable-file`

Error, always. A file the XML reader refuses, or whose root or structure is not that of its kind; see "The XML reader"
above. The finding has the line and column of the problem.

## The output

Findings are listed errors first, then warnings, then info, each level in the order of the files (each manifest
followed by the resources it names) and then of the lines and columns. Each rule lists at most 500 findings; the rest
are counted in a note and still count for the result. The result counts the findings at or above `--min-severity` and
fails when one of them is at or above `--fail-on`.

The text report then shows a summary of every manifest (package, target API level, permissions, dangerous and
restricted permissions, exported components, backup, cleartext and debuggable, and the resources it names with where
they were found) and of every Info.plist (bundle id, usage descriptions, arbitrary loads, exception domains and
background modes), and the OWASP MASVS groups and controls of the findings shown, with a count for each. A finding
that supports two controls counts in both.
