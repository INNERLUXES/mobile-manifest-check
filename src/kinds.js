// The kind of a file, from its path: what the tool reads it as. The path is the one the report shows, with forward
// slashes. A file of no kind is not read: named on the command line, or matched by a pattern of the configuration, it
// stops the run, so a file is never passed over in silence. An XML resource (the network security config, the paths of
// a FileProvider) is not named: the tool reads it through the manifest that names it, with the kind android-resource.

import { baseName } from './words.js';

// The kinds, in the order the report counts them.
export const KINDS = ['android-manifest', 'android-resource', 'ios-plist'];

// The kind of a path named or matched, or null. The names are compared with their case, as the platforms write them:
// AndroidManifest.xml, and Info.plist or a name that ends in -Info.plist, as older Xcode projects call it.
export function fileKind(path) {
  const name = baseName(path);
  if (name === 'AndroidManifest.xml') return 'android-manifest';
  if (name === 'Info.plist' || name.endsWith('-Info.plist')) return 'ios-plist';
  return null;
}
