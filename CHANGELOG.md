# Changes

## 1.0.0

First release.

- Checks the settings of a mobile app before a release, from one folder, several folders or single files: Android
  `AndroidManifest.xml` files, the network security config and FileProvider paths they name, read at
  `res/xml/<name>.xml` next to the manifest, and iOS `Info.plist` files in XML.
- Eighteen rules in three levels, each mapped to the OWASP MASVS controls it supports: dangerous and special
  permissions (`dangerous-permission`), permissions Google Play restricts (`restricted-permission`), a debuggable
  build (`debuggable`), backups (`allow-backup`), cleartext traffic for the whole app or for some domains
  (`cleartext-traffic`, `cleartext-domain`), trusted user certificates (`user-certificates`), exported components
  without a permission (`exported-component`), intent filters without `android:exported` (`missing-exported`),
  providers that can grant too much (`provider-broad-paths`), resources that are not there (`missing-resource`),
  usage descriptions that are listed, empty or placeholders, or missing for a declared capability
  (`usage-description`, `empty-usage-description`, `missing-usage-description`), App Transport Security switched off
  or loosened (`ats-arbitrary-loads`, `ats-exception`), file sharing (`file-sharing`) and the encryption declaration
  (`encryption-declaration`); and two rules of input problems that cannot be lowered (`unreadable-file`,
  `unparsable-file`).
- A small XML reader that accepts only a plain document type, never fetches it, refuses every entity declaration and
  internal subset, and decodes only the five entities of XML and character references; android attributes found by
  their namespace URI; property lists read with dictionaries kept as lists of entries.
- A configuration file in strict JSON over documented defaults: the file patterns of a folder, the files left out, the
  level of every rule, the placeholder texts of usage descriptions, the minimum severity and the level that fails the
  run; a key the tool does not know is an error with its line and a suggestion, and a key named twice is refused.
- Reports as text, JSON and GitHub workflow commands (`--format github`) that show each finding as an annotation, with
  a summary of every manifest and Info.plist and the MASVS groups of the findings; `--min-severity`, `--fail-on`,
  `--explain` with the rule and the sources of each finding, and `--print-defaults`. Exit code `0` when no finding is at
  or above the fail-on level, `1` when one is, `2` for a usage or input error, with no result.
- Follows no symbolic link, fetches nothing, runs nothing, writes nothing to disk, and reports binary property lists,
  binary, UTF-16 and invalid UTF-8 input as errors; every input has a size limit.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
