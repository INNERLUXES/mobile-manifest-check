# Limits

The tool reads the files of a mobile app as they are written: Android manifests, the XML resources they name, and iOS
Info.plist files. It does not build the app, run it, read its code or ask a store anything. A finding points at a
setting in a file; a run without findings says only that the files it read hold none of the settings of
docs/method.md. Every report ends with a sentence that says so.

## What it cannot see

- **The merged manifest.** An Android build merges the manifest of the app with the manifests of its libraries and of
  each build type and flavor. A library can add a permission, an exported component or a provider that the manifest of
  the app never names, and `tools:node="remove"` can take one away. The tool reads the manifests it is given; the
  merged manifest of a build (under `build/intermediates`) is left out by default, and can be named on the command line
  to check what ships.
- **Gradle and Xcode build settings.** The target API level, the debuggable flag of a build type, manifest placeholders
  (`${name}`) and the values Xcode writes from a build setting (`$(NAME)`, or an `INFOPLIST_KEY_` setting with no
  Info.plist file at all) are set outside the files. A `targetSdkVersion` set only in Gradle is not seen, so the
  default of cleartext traffic for an old target is reported only when the manifest writes the target. A value that is
  a placeholder or a build setting is taken as written and never expanded.
- **Resource values.** A value such as `@bool/allow_backup` is not resolved, so an attribute set through a resource is
  neither reported nor taken as false.
- **Resources outside `res/xml` next to the manifest.** A network security config or FileProvider paths of another
  source set, a flavor or a library is reported as missing, not checked.
- **Backup rules.** The files of `android:dataExtractionRules` and `android:fullBackupContent` are named in the
  finding of `allow-backup`, not read; the tool cannot tell whether they leave the sensitive files out.
- **Permissions declared elsewhere.** The protection level of a permission declared in another app or a library is
  not known, so `exported-component` takes such a permission as a guard.
- **Who can reach a component.** An exported activity with an intent filter is often meant for other apps; the tool
  reports it with no permission all the same, and only the launcher activity is left out. Whether the component
  checks the caller in its code is not seen.
- **Localized strings.** `InfoPlist.strings` and string catalogs (`InfoPlist.xcstrings`) can replace a usage
  description in each language; they are not read, and the text of the Info.plist is the one checked.
- **Whether a text is a good reason.** A usage description that is not empty and not a placeholder is listed as info.
  The tool cannot tell whether it is specific and true; App Review decides that.
- **Capabilities used only in code.** `missing-usage-description` reads only what the Info.plist declares. An app that
  calls the camera in code with no capability in its Info.plist and no `NSCameraUsageDescription` is not reported.
- **Other keys and platforms.** Only the keys at the top of the Info.plist are checked, the iOS forms of the location
  keys are read and the macOS forms are not, and a privacy manifest (`PrivacyInfo.xcprivacy`) and entitlements are not
  read.
- **Binary property lists.** A binary property list is an `unreadable-file` finding with a note on how to convert it
  (`plutil -convert xml1`). Xcode keeps Info.plist as XML in the project, so this matters for a plist taken out of a
  built app.
- **Store policy.** `restricted-permission` names the policies of Google Play. The tool does not know where the app is
  published or whether a declaration was approved.

## The XML reader

The reader accepts the XML that manifests, resources and Info.plist files use, and refuses what it will not read:

- a `DOCTYPE` is accepted only in its plain form, with a `PUBLIC` or `SYSTEM` identifier and no internal subset, and
  the identifier is never fetched; a document type with an internal subset, any other declaration, and an entity
  reference other than the five of XML and character references are refused, so a file that declares an entity is an
  `unparsable-file` finding even when the entity is harmless;
- a namespace prefix is followed to its URI, but a default namespace (`xmlns="..."`) is not used to place an
  attribute without a prefix, since the attributes the tool reads always have one or have none by design;
- the encoding in the XML declaration is not read: every file is read as UTF-8.

## Size limits

Past a limit, the input is refused with exit code `2` and no result, the file is an error finding, or, where the limit
is on the work and not the input, the report says so in a note.

| What | Limit |
| --- | --- |
| a file | 4 MB; a larger file is an `unreadable-file` finding |
| all the files of a run | 256 MB, the resources included |
| files read in a run | 20,000, not counting the resources the manifests name |
| files and folders looked at in a walk | 200,000 |
| folders nested in a walk | 32 deep |
| paths on the command line | 100 |
| XML | elements nested 256 deep, 1,000,000 elements, 256 attributes in a tag |
| property list values | nested 128 deep |
| configuration file | 1 MB; nesting 32 deep; 500 entries in a list; 200 characters for a file pattern or a placeholder |
| findings of one rule | 500 listed; the rest are counted in a note and still count for the result |
| problems of the input | 20 listed; the rest are counted |

The tests read a thousand manifests of fifty permissions each, a manifest of a hundred thousand components, a property
list of a hundred thousand keys, network security configs of a hundred thousand domains or nested two hundred and fifty
deep, runs of hundreds of thousands of brackets, ampersands, quotes and comment openers, and a billion laughs, an
external entity and a parameter entity, each with a time check.
