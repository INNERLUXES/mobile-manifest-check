// The built-in configuration: the files read in a folder, the files left out, the level of every rule, the texts that
// count as a placeholder in a usage description, the lowest level shown and the level that fails the run.
// docs/inputs.md describes every key, and --print-defaults writes all of this out.

// The files read in a folder named on the command line: Android manifests and iOS information property lists. The XML
// resources a manifest names are read through the manifest, not through these patterns.
export const DEFAULT_FILES = ['**/AndroidManifest.xml', '**/Info.plist', '**/*-Info.plist'];

// What a walk leaves out by default: build output, which holds the merged copies of the manifests the build writes,
// and the copies of third-party code that CocoaPods, Carthage and Xcode keep in the project.
export const DEFAULT_EXCLUDE = ['**/build/**', '**/Pods/**', '**/Carthage/**', '**/DerivedData/**', '**/*.xcarchive/**'];

// Folders a walk never enters.
export const SKIPPED_FOLDERS = ['.git', 'node_modules', '.gradle', '.idea', '.dart_tool'];

// The level of every rule that the configuration can set. The two rules of input problems are always errors.
export const DEFAULT_RULES = {
  dangerousPermission: 'info',
  restrictedPermission: 'warning',
  debuggable: 'error',
  allowBackup: 'warning',
  cleartextTraffic: 'error',
  cleartextDomain: 'warning',
  userCertificates: 'warning',
  exportedComponent: 'warning',
  missingExported: 'error',
  providerBroadPaths: 'warning',
  missingResource: 'warning',
  usageDescription: 'info',
  emptyUsageDescription: 'error',
  missingUsageDescription: 'error',
  atsArbitraryLoads: 'error',
  atsException: 'warning',
  fileSharing: 'info',
  encryptionDeclaration: 'info'
};

// Texts that count as a placeholder in a usage description, compared after white space is trimmed and joined, the
// letters A to Z lowered and a final period or exclamation mark taken off.
export const DEFAULT_PLACEHOLDERS = ['todo', 'tbd', 'fixme', 'placeholder', 'lorem ipsum', 'test', 'xxx', 'description', 'usage description', 'purpose string', 'add a description', 'description goes here', 'your description here', 'enter a description', 'n/a', 'none', 'string'];

// The lowest level of a finding that is shown.
export const DEFAULT_MIN_SEVERITY = 'info';

// The lowest level of a finding that fails the run.
export const DEFAULT_FAIL_ON = 'error';
