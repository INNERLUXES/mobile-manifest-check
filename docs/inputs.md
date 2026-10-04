# Inputs

## The app

```
mobile-manifest-check <file-or-folder>... [--config <file>] [options]
```

One or more paths, up to 100: folders, or single `AndroidManifest.xml` and `Info.plist` files, or both. A folder is
walked and the files that match `files` and not `exclude` are read; a file named directly is read whatever its folder,
as long as it is of a kind the tool reads. Each path may be named once. The XML resources a manifest names are read
next to it (docs/method.md), so name the folder that holds the manifest and its `res` folder together.

```
mobile-manifest-check .
mobile-manifest-check android/app/src/main ios/App --config release-check.json
mobile-manifest-check ios/App/Info.plist
```

## Options

| Option | Value |
| --- | --- |
| `--config <file>` | the configuration file below; without it the defaults apply |
| `--format <name>` | `text` (the default), `json` or `github` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | `info`, `warning` or `error`: the lowest level of a finding that is shown; it wins over `minSeverity` of the configuration |
| `--fail-on <level>` | `info`, `warning` or `error`: the lowest level of a finding that fails the run; it wins over `failOn` of the configuration |
| `--explain` | each finding also shows its rule, the points of the public pages it rests on and the tool's own choice; with `--format github` it is a usage error |
| `--print-defaults` | prints the built-in configuration as a configuration file and exits |
| `--help`, `--version` | the usage, the version |

A path that looks like a web address, an option given twice, `-` for standard input and an unknown option are usage
errors with exit code `2`.

## The configuration file

The configuration is one JSON object, read strictly as RFC 8259 writes JSON: no comments, no trailing comma, and no
name given twice in one object. Every key is optional. A key the tool does not know is an error with its line and, when
it is close to a known key, a suggestion; a run never goes on with a typo left in place.

```json
{
  "name": "Tidepool",
  "exclude": { "add": ["**/samples/**"] },
  "rules": { "allowBackup": "error", "dangerousPermission": "off" },
  "placeholders": { "add": ["coming soon"] },
  "minSeverity": "info",
  "failOn": "warning"
}
```

A list is either a JSON array, which replaces the built-in list, or an object with `replace`, `add` and `remove`,
applied in that order. Removing an entry that is not on the list, adding one that is, and naming one twice are errors.

### `name`

A name for the configuration, 1 to 120 characters, shown in the report next to the file.

### `files`

The file patterns of a folder walk. A pattern is a relative path with forward slashes in which `*` matches any run of
characters inside one name, `?` one character, and `**` as a whole part any number of folders; a pattern with no slash
matches the file name in any folder. Character classes, braces, a backslash, `..`, an empty part and a leading slash
are refused. The default:

```
**/AndroidManifest.xml, **/Info.plist, **/*-Info.plist
```

A pattern that matches a file of no kind the tool reads makes that file an input error, so a pattern cannot pass a
file over in silence. `files` must keep at least one pattern.

### `exclude`

The file patterns a walk leaves out, in the same form. The default:

```
**/build/**, **/Pods/**, **/Carthage/**, **/DerivedData/**, **/*.xcarchive/**
```

It leaves out build output, which holds the merged manifests a build writes, and the copies of libraries that
CocoaPods, Carthage and Xcode keep in the project. A file named directly on the command line is read even when it
matches `exclude`. The folders `.git`, `node_modules`, `.gradle`, `.idea` and `.dart_tool` are never entered.

### `rules`

The level of each rule: `info`, `warning`, `error` or `off`. A rule set to `off` is not reported and is named in a note
of the report. The two rules of input problems, `unreadable-file` and `unparsable-file`, are always errors and have no
key.

| Key | Rule | Default |
| --- | --- | --- |
| `rules.dangerousPermission` | `dangerous-permission` | info |
| `rules.restrictedPermission` | `restricted-permission` | warning |
| `rules.debuggable` | `debuggable` | error |
| `rules.allowBackup` | `allow-backup` | warning |
| `rules.cleartextTraffic` | `cleartext-traffic` | error |
| `rules.cleartextDomain` | `cleartext-domain` | warning |
| `rules.userCertificates` | `user-certificates` | warning |
| `rules.exportedComponent` | `exported-component` | warning |
| `rules.missingExported` | `missing-exported` | error |
| `rules.providerBroadPaths` | `provider-broad-paths` | warning |
| `rules.missingResource` | `missing-resource` | warning |
| `rules.usageDescription` | `usage-description` | info |
| `rules.emptyUsageDescription` | `empty-usage-description` | error |
| `rules.missingUsageDescription` | `missing-usage-description` | error |
| `rules.atsArbitraryLoads` | `ats-arbitrary-loads` | error |
| `rules.atsException` | `ats-exception` | warning |
| `rules.fileSharing` | `file-sharing` | info |
| `rules.encryptionDeclaration` | `encryption-declaration` | info |

### `placeholders`

The texts that count as a placeholder in a usage description, compared after white space is trimmed and joined, the
letters A to Z lowered and one final period or exclamation mark taken off; each entry is stored in that form and must
hold a letter or a digit. The default:

```
todo, tbd, fixme, placeholder, lorem ipsum, test, xxx, description, usage description, purpose string,
add a description, description goes here, your description here, enter a description, n/a, none, string
```

A text that starts with `todo`, `fixme`, `tbd`, `lorem ipsum` or `placeholder`, a text of punctuation only and the
name of the key are placeholders whatever the list holds (docs/method.md).

### `minSeverity`

The lowest level of a finding that is shown: `info` (the default), `warning` or `error`. `--min-severity` wins over
it. A finding below it is counted in a note and does not count for the result.

### `failOn`

The lowest level of a finding that fails the run with exit code `1`: `info`, `warning` or `error` (the default).
`--fail-on` wins over it. With `error`, a debuggable build, cleartext for the whole app, a missing `android:exported`,
a usage description that is missing, empty or a placeholder, App Transport Security switched off and a file the tool
could not read fail the run; with `warning`, every risky setting does.

## Limits of the input

| What | Limit |
| --- | --- |
| a file | 4 MB; a larger file is an `unreadable-file` finding |
| all the files of a run | 256 MB, the resources included |
| files read in a run | 20,000, not counting the resources the manifests name |
| files and folders looked at in a walk | 200,000 |
| folders nested in a walk | 32 deep |
| paths on the command line | 100 |
| configuration file | 1 MB; 500 entries in a list; 200 characters for a file pattern or a placeholder |

docs/limits.md lists the limits of the reader and of the report.
