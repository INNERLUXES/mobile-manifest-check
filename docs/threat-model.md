# Threat model

## What the tool touches

- It reads the files and folders named on the command line, the XML resources at `res/xml/<name>.xml` next to a
  manifest that names them, and the configuration file named with `--config`. In a folder it opens only the files
  whose path matches the patterns of the configuration. Nothing else is opened.
- It writes the report to standard output and its errors to standard error. It writes nothing to disk.
- It opens no network connection, follows no symbolic link, fetches no document type, expands no declared entity,
  evaluates nothing it reads, starts no program and reads no clock.

## What the input may hold

The tool reads the files of an app, and in a pipeline that checks every pull request, the manifests, the resources, the
property lists and the configuration may all be written by whoever opened the pull request. Through them, a person can
try to:

- make the tool read another file: an XML external entity that names a local file, a `DOCTYPE` that names a remote or
  local DTD, a parameter entity, a resource reference such as `@xml/../../secret`, a file or a folder named through a
  symbolic link, a link inside a folder, a `res` or `res/xml` folder that is a link, a file swapped for a link between
  the walk and the read;
- make the tool fetch something: a path written as a web address, a `DOCTYPE` or entity with an `http` address;
- exhaust the memory or the time: entities that expand into each other (a billion laughs), thousands of files, a file
  of megabytes, long runs of brackets, ampersands, quotes or comment openers, markup very deep or very wide, a property
  list with a hundred thousand keys, network security configs nested very deep;
- hide a risky setting: a setting inside a comment that does not end where it seems to, an attribute in another
  namespace that looks like an android one, an entity that hides a value, a file the reader cannot place;
- move the result through the configuration: a key named twice, an unknown key that looks like a known one, a rule set
  to off, a pattern in `exclude` that leaves a folder out, a `failOn` raised to `error`, a placeholder removed;
- slip in something that is not text: a binary property list, a binary file named `Info.plist`, a file in UTF-16, bytes
  that are not UTF-8;
- rewrite the terminal or break the output: control characters, ANSI escapes, direction controls and line separators
  in a file name, a component name, a key or a value;
- start a second workflow command: a text that holds `::error`, `%`, a comma, a colon or a line break, which the
  GitHub format writes into a command;
- change how objects behave: a key, a permission, a resource or a component named `__proto__`, `constructor` or
  `toString`.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| An external entity, a DTD or a parameter entity makes the tool read or fetch a file | The XML reader accepts a `DOCTYPE` only without an internal subset, never loads the identifier, refuses every `<!ENTITY` and other declaration, and decodes only the five entities of XML and character references; any other reference is an `unparsable-file` finding. No module of the network is imported. A test feeds an external entity, a parameter entity and a remote DTD |
| Entities that expand into each other exhaust the memory | No entity is ever declared or expanded, so a billion laughs is refused at its internal subset in one pass. A test checks it with a time limit |
| A resource reference reads another file | A reference is used only when its name is letters, digits and underscores, and it is always looked for at `res/xml/<name>.xml` next to the manifest; any other name is a `missing-resource` finding and never part of a path. A test uses `@xml/../../secret` |
| A symbolic link makes the tool read another file | A path named on the command line is looked at without following a link, and a link is refused; inside a folder a link is skipped and counted; the `res` and `res/xml` folders of a resource must not be links; each file is opened with `O_NOFOLLOW` where the system has it and its type is taken from the open handle, so a file swapped for a link is refused. Tests put links in each of these places |
| The tool fetches or runs something | No module of the network or of child processes is imported, nothing is evaluated, and a path that looks like an address is refused. A test checks the imports of src |
| A risky setting is hidden | Comments and CDATA are skipped as the XML standard writes them, a form that is not closed is an error finding with its line, which fails the run at the default level and cannot be set off, and an android attribute is found by its namespace URI, not by its prefix. Tests cover each form, closed and left open |
| The configuration moves the result | The JSON reader refuses a repeated key; an unknown key stops the run with its line and a suggestion; the two rules of input problems have no key; a rule set to off is named in a note; the report lists every file read with its kind. Review a change to the configuration like a change to code (docs/secure-defaults.md) |
| The memory or the time is exhausted | Files have size limits checked on the open handle before they are read, and a run has limits on its files, its bytes and the entries it walks; the XML reader reads each character once and limits its depth, elements and attributes; nested configs are walked without recursion; findings are capped per rule. Tests check the time, with limits that widen under coverage only |
| A pattern from the input is slow | No regular expression is built from the input or the configuration; file patterns are matched by hand with work bounded by the product of their lengths; a test looks for `new RegExp` in src |
| A binary or UTF-16 file is read as text | A binary property list, a null byte, a UTF-16 byte order mark or bytes that are not valid UTF-8 make the file an error finding; nothing in it is read |
| Text from the input rewrites the terminal | Every text, file names included, goes through `safeText`, which removes control, line separator and direction characters and caps the length. A test puts ANSI escapes and direction controls in a file name, a component name and a usage description, in every format |
| A text starts a second workflow command | The GitHub format escapes `%`, CR and LF in a message and `:` and `,` in a property; a line break never reaches a command. A test writes `%0A::error::` and a character reference for a line break into component names and a comma and a colon into the file name |
| `__proto__` changes how objects behave | The JSON reader defines own properties; a dictionary of a property list is kept as a list of entries, and names are kept in arrays and `Map`. A test uses `__proto__`, `constructor` and `toString` as keys, permissions, resources and component names |
| A device or a pipe hangs the tool | A path that is not a regular file or a folder is refused before it is read, and a walk reads regular files only |
| The tool leaves files behind | Nothing is written to disk; there is no cache, no temporary file and no log. A test checks that a run leaves the folder as it was |

## Out of scope

Whether the app is secure in what its code does, the libraries it bundles and the manifests they merge in, the forms
docs/limits.md says the tool does not read, who may change the files or the configuration in your repository, and
where your pipeline keeps the output.
