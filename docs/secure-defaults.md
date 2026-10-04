# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which files you give it, where the output goes, and who may
change the configuration.

## How the tool behaves by default

- **Reads, never follows.** The tool reads the files and folders it is given, the resources next to a manifest that
  names them, and the configuration named with `--config`. It follows no symbolic link, fetches no web address,
  refuses an argument that looks like an address, evaluates nothing, starts no program and writes nothing to disk.
- **No entity, no DTD.** The XML reader expands no declared entity and loads no document type; a file that declares
  an entity is refused, so a billion laughs or an external entity cannot reach memory, the disk or the network.
- **Every rule on from the first run.** The settings that ship a broken or open app are errors (a debuggable build,
  cleartext for the whole app, a missing `android:exported`, a usage description that is missing, empty or a
  placeholder, App Transport Security switched off), the settings that loosen a protection are warnings, and the
  inventory of permissions, usage descriptions and shared files is info.
- **Fail closed on what it cannot read.** A file that cannot be read, or that the XML reader refuses, is an error
  finding that fails the run at the default `failOn` of `error`; the two rules of input problems have no key and cannot
  be lowered or set off. A path that cannot be used stops the run with exit code `2` and no result.
- **Unknown keys are errors.** A key in the configuration that the tool does not know stops the run, with its line and
  a suggestion, so a typo such as `exlude` cannot leave a default in place. A key named twice stops the run.
- **No regular expression from the input.** No pattern is built from the files or the configuration; file patterns
  are matched by hand, and the XML reader reads each character once.
- **No prototype tricks.** Objects are built with own properties, dictionaries of a property list are lists of
  entries, and names are kept in arrays and `Map`, so `__proto__` is only a name.
- **Clean output.** Text from the input, file names included, has control characters, line separators and direction
  controls removed and its length capped before it reaches a report or an error message. The GitHub format escapes
  `%`, CR and LF in a message and also `:` and `,` in a property, so a text cannot end a workflow command early or
  start another one.
- **The same input gives the same output.** No clock, no zone, no locale and no random number; folders are walked in
  the order of their names by code unit, and case is changed for the letters A to Z only
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`"failOn": "warning"`.** Every setting that loosens a protection fails the run: backups, exported components,
  restricted permissions, cleartext for some domains, user certificates and ATS exceptions. Pair it with a baseline:
  lower the rules the team has not started on to `info`, and raise them one by one.
- **`"rules": { "allowBackup": "error", "exportedComponent": "error" }`.** Backups and exported components fail the
  run on their own, for an app that holds sensitive data.
- **`"placeholders": { "add": ["..."] }`.** The texts your team writes while a feature is in progress, so they cannot
  ship as usage descriptions.
- **Check the merged manifest too.** Name the merged manifest of the release build
  (`app/build/intermediates/merged_manifests/release/AndroidManifest.xml` in a typical project) on the command line
  after the build, so the permissions and components of the libraries are checked as well.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: Mobile manifest check
    run: npx --yes github:INNERLUXES/mobile-manifest-check . --format github
```

- Run it on the root of the project, so every manifest, its resources and every Info.plist meet in one report.
- Give the job read access to the contents and nothing more. The tool needs no secret.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Do not hide the exit code with a trailing `|| true`. To list the findings without failing, keep `failOn` at `error`
  and keep the JSON report as an artifact of the job.

## Protecting the configuration

The configuration decides which files are read, which rules report and what fails the run. Keep it in the repository,
put its path in `CODEOWNERS` with the people who own the release, and require their review in branch protection.
Review a change that adds a pattern to `exclude`, narrows `files`, sets a rule to off or lower, removes a placeholder or
raises `failOn` like a change to code: each of them can let a risky setting ship.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
