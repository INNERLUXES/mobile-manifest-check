// Words compared as the tool compares them: the letters A to Z lowered whatever the locale. Used for the suggestions of
// the configuration, the names of files and the placeholders of usage descriptions.

// Lowercase for the letters A to Z only, so the result does not depend on the locale.
export const asciiLower = (text) => String(text).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

// The last part of a path with forward slashes: "a/b/Info.plist" is "Info.plist".
export const baseName = (path) => String(path).slice(String(path).lastIndexOf('/') + 1);

// The folder of a path with forward slashes, with its final slash: "a/b/AndroidManifest.xml" is "a/b/", and a name
// with no folder gives "".
export const folderOf = (path) => String(path).slice(0, String(path).lastIndexOf('/') + 1);

// The form a text is compared in when it is checked as a placeholder: white space trimmed and runs of it joined into one
// space, the letters A to Z lowered, and one final period or exclamation mark taken off.
export const placeholderForm = (text) => asciiLower(String(text).replace(/\s+/g, ' ').trim()).replace(/[.!]$/, '').trim();
