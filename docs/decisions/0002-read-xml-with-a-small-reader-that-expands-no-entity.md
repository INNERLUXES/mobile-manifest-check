# 2. Read XML with a small reader that expands no entity

## Status

Accepted

## Context

Everything the tool checks is XML: AndroidManifest.xml, the network security config and the FileProvider paths it
names, and the Info.plist of an iOS app. A full XML library would read all of it, but it is a dependency, and most
libraries resolve document types and expand entities by default. In a pipeline that checks every pull request, the
files are written by whoever opened the pull request, and an XML file is a classic way in: an external entity that
reads a local file into the output, a DTD that the reader fetches from a server, a parameter entity, or entities that
expand into each other until the memory runs out.

The OWASP advice is to refuse document type declarations, or, where they are needed, to load no external entity or DTD
and to limit expansion. The files the tool reads need almost nothing of a document type. An Android manifest has
none. An Info.plist that Xcode writes always starts with the same plain declaration, a public identifier of the Apple
property list DTD, which a reader can skip without loading; no Info.plist needs an entity of its own.

## Decision

1. Manifests, resources and property lists are read by one small XML reader in src/xml.js, written here, that reads
   each character once and keeps the offset of every element and attribute.
2. A document type declaration is accepted only in its plain form: a name and a `PUBLIC` or `SYSTEM` identifier, no
   internal subset. The identifier is text; it is never fetched or opened. A `DOCTYPE` with an internal subset, any
   other declaration (`<!ENTITY`, `<!ELEMENT`, `<!ATTLIST`, `<!NOTATION`) and a second document type are refused.
3. Only the five entities of XML and character references are decoded. Any other entity reference, and a `&` that
   starts no reference, is refused; nothing is ever expanded.
4. A file the reader refuses is an error finding with its line and column
   ([decision 3](0003-report-only-what-the-files-say-and-make-unreadable-input-an-error.md)). The rest of the files are
   still read.
5. The reader has limits on depth, elements and attributes, and walks nested elements without recursion where the
   checks need it.

## Consequences

- The tool needs no dependency and no network, and an external entity, a remote DTD or a billion laughs cannot reach the
  disk, the network or the memory: each is refused at its declaration, in one pass.
- A file that declares an entity for a harmless reason is refused too, and must be written out in full to be checked.
  docs/limits.md says so.
- The reader does not validate a file against its DTD or schema; the checks read the elements and attributes they need
  and nothing more.
