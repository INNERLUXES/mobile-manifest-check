# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux,
Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure
development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`,
with `!` for a breaking change.

## Changing a rule

1. Describe the change in docs/method.md first: what the rule looks at and what it can and cannot see, and add what it
   cannot see to docs/limits.md. Where the tool makes its own choice, say so in `own` in src/rules.js and say why.
2. Keep the rules to what is written. A finding must point at something a reader can check in the file: an attribute,
   an element, a key on a line. Never add a rule that guesses what the build, a library or the code of the app does.
3. A rule says what to change, in `fix` in src/rules.js, and names the OWASP MASVS controls it supports in `masvs`; a
   new control goes into src/masvs.js with its page.
4. A run must never pass because something could not be read: a file that cannot be read or that the XML reader
   refuses is an error finding, and the two rules of input problems keep no key in the configuration.
5. Add a test with the files written inline (`manifest()`, `appManifest()`, `android()`, `plist()`, `ios()` and
   `reportOf()` in test/helpers.js), small enough that the result can be worked out by hand, with a near miss on each
   side: the form that is reported and the form next to it that is not.
6. A rule id, once released, keeps its meaning: pipelines and other tools read it from the JSON output and the GitHub
   annotations.

## Changing the XML reader

1. The reader expands no declared entity, loads no document type and refuses every internal subset and every
   declaration but a plain document type
   ([decision 2](docs/decisions/0002-read-xml-with-a-small-reader-that-expands-no-entity.md)). Keep it that way; a
   change that loosens it needs a new decision.
2. A new form gets a test of the form itself and of the same form left open, which must give an `unparsable-file`
   finding with its line and column.
3. Keep the work bounded: one pass over each file, the limits of docs/limits.md, and a hostile test with a large input
   and a time check.

## Changing the configuration file

1. A new key is added to `KEYS` in src/config.js, documented in docs/inputs.md and tested with a good value and a bad
   one. Every key the tool does not know stays an error, and a key named twice stays refused.
2. A list of the configuration keeps the array form and `replace`, `add` and `remove`; removing an entry that is not
   there stays an error.
3. Never add a key that takes a regular expression. File patterns are matched by hand in src/glob.js.

## Changing a source

1. Every point the reports show is in src/data.js, written in this project's own words, with the page it comes from. A
   short phrase of a page may be named; a long quotation may not.
2. research/sources.md lists every page with a note on what it says, and docs/rules-and-sources.md lists every rule
   with its points, its MASVS controls and what to change. A test checks all three against each other.

## Changing a reader of files

1. The tool reads; it never follows. A symbolic link named on the command line is refused, a link inside a folder is
   skipped, a resource folder that is a link is not entered, and nothing but the files named, the files a walk
   matches, the resources next to a manifest and the configuration is opened.
2. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only
   when coverage is on, and allow four times the time. Never read the flags of the process for this, because they hold
   the coverage flags of the runner in every run. Run `npm run test:coverage` before you open the pull request.
3. A file written with LF, CRLF or CR line ends, with or without a byte order mark, must give the same output. The
   example files are stored as written (`.gitattributes`), and a test reads them with CRLF line ends.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device, file permissions, a character that a file name
cannot hold on every system) is guarded with `process.platform`, says why in its `t.skip`, and asserts no line of its
own: a line is asserted only in a test that runs on every system, and is worked out there with `lineOf()` of
test/helpers.js or from the text itself, never written by hand. `test/repo.test.js` fails when a guarded test asserts a
line. Every other test builds its paths with `resolve()` from names with forward slashes.

A test never reads the clock, the time zone of the machine or the locale.

## Rules for the code

- No runtime dependencies and no development dependencies. Node 22 or newer and nothing else; the tests use `node:test`.
- The tool reads the files and the configuration it is given and writes only to standard output and standard error. It
  opens no network connection, runs no program and evaluates nothing it reads.
- Text from the input, file names included, goes through `safeText` before it reaches the output or an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- Never commit a real secret, even as a fixture. `npm run check` fails on anything that looks like a credential.
- No prose file carries a date, and no file holds a number that reads like a year. Version numbers and API levels
  (Android 12, API level 28, iOS 10, TLS 1.2, Node 22, 1.0.0) are fine.
- Examples and tests use made-up apps, packages, bundle ids and domains (`example.` packages and `.test` domains),
  never the files of a real product.
- Plain words in the documents: `npm run check` fails on a short list of words that say little.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
