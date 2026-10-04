// The Android side: what an AndroidManifest.xml, its network security config and the paths of its FileProvider say,
// read from the tree of src/xml.js, and the findings of the Android rules. The attributes of the android namespace are
// found by the namespace URI their prefix is bound to, so a manifest that binds the namespace to another prefix is
// read the same. Only literal values count: a resource reference such as @bool/x and a manifest placeholder such as
// ${x} are not resolved (docs/limits.md). docs/method.md says what each rule looks at.

import { permissionInfo } from './permissions.js';
import { attributeIn, namespacesOf, plainAttribute, textOf, XmlError } from './xml.js';

export const ANDROID_NS = 'http://schemas.android.com/apk/res/android';

// The app components of an application element, and the ones that need android:exported when they have an intent
// filter (Android 12 and higher).
export const COMPONENTS = ['activity', 'activity-alias', 'service', 'receiver', 'provider'];
export const NEED_EXPORTED = ['activity', 'activity-alias', 'service', 'receiver'];

// The meta-data name that links a FileProvider to its paths resource.
export const FILE_PROVIDER_PATHS = 'android.support.FILE_PROVIDER_PATHS';

// The directories of the path elements of a FileProvider paths resource.
export const PATH_ELEMENTS = {
  'root-path': 'the root of the device file system',
  'files-path': 'the files directory of the app',
  'cache-path': 'the cache directory of the app',
  'external-path': 'the whole external storage',
  'external-files-path': 'the external files directory of the app',
  'external-cache-path': 'the external cache directory of the app',
  'external-media-path': 'the external media directory of the app'
};

// The value of a Boolean attribute: true, false, or null when it is missing or not a literal true or false.
export const boolOf = (attr) => (attr && attr.value.trim() === 'true' ? true : attr && attr.value.trim() === 'false' ? false : null);

// The name of an @xml/ resource reference, or null for any other value. A name with anything but letters, digits and
// underscores is kept as written and marked, so it is never used to build a path.
export function xmlResource(value) {
  const v = String(value ?? '').trim();
  if (!v.startsWith('@xml/')) return null;
  const name = v.slice(5);
  return { name, plain: /^[A-Za-z0-9_]{1,100}$/.test(name) };
}

// The manifest model of a parsed document. Throws XmlError when the root is not <manifest>.
export function readManifest(root) {
  if (root.name !== 'manifest') throw new XmlError(`the root element is <${root.name.slice(0, 60)}>, not <manifest>`, root.offset);
  const scopes = namespacesOf(root);
  const a = (element, local) => attributeIn(element, scopes.get(element), ANDROID_NS, local);
  const model = { package: plainAttribute(root, 'package')?.value ?? null, targetSdk: null, permissions: [], declared: new Map(), application: null, components: [] };
  for (const child of root.children) {
    if (child.name === 'uses-permission' || child.name === 'uses-permission-sdk-23') {
      const name = a(child, 'name');
      if (name) model.permissions.push({ name: name.value.trim(), maxSdk: a(child, 'maxSdkVersion')?.value.trim() ?? null, offset: child.offset, tag: child.name });
    } else if (child.name === 'permission') {
      const name = a(child, 'name');
      if (name && !model.declared.has(name.value.trim())) model.declared.set(name.value.trim(), a(child, 'protectionLevel')?.value.trim() ?? 'normal');
    } else if (child.name === 'uses-sdk' && !model.targetSdk) {
      const target = a(child, 'targetSdkVersion');
      if (target && /^[0-9]{1,4}$/.test(target.value.trim())) model.targetSdk = { value: Number(target.value.trim()), offset: child.offset };
    } else if (child.name === 'application' && !model.application) {
      const attrs = {};
      for (const k of ['debuggable', 'allowBackup', 'usesCleartextTraffic', 'networkSecurityConfig', 'fullBackupContent', 'dataExtractionRules', 'permission']) attrs[k] = a(child, k);
      model.application = { offset: child.offset, attrs };
      for (const c of child.children) {
        if (!COMPONENTS.includes(c.name)) continue;
        const filters = c.children.filter((x) => x.name === 'intent-filter').map((f) => ({
          offset: f.offset,
          actions: f.children.filter((x) => x.name === 'action').map((x) => a(x, 'name')?.value.trim()).filter(Boolean),
          categories: f.children.filter((x) => x.name === 'category').map((x) => a(x, 'name')?.value.trim()).filter(Boolean)
        }));
        model.components.push({
          tag: c.name,
          name: a(c, 'name')?.value.trim() ?? null,
          offset: c.offset,
          exported: a(c, 'exported'),
          permission: a(c, 'permission'),
          readPermission: a(c, 'readPermission'),
          writePermission: a(c, 'writePermission'),
          grantUriPermissions: a(c, 'grantUriPermissions'),
          filters,
          metaData: c.children.filter((x) => x.name === 'meta-data').map((m) => ({ name: a(m, 'name')?.value.trim() ?? null, resource: a(m, 'resource'), offset: m.offset })),
          grants: c.children.filter((x) => x.name === 'grant-uri-permission').map((g) => ({ offset: g.offset, path: a(g, 'path'), pathPrefix: a(g, 'pathPrefix'), pathPattern: a(g, 'pathPattern') }))
        });
      }
    }
  }
  return model;
}

// The domains of a domain-config, with includeSubdomains.
const domainsOf = (element) => element.children.filter((d) => d.name === 'domain').map((d) => ({ name: textOf(d), sub: plainAttribute(d, 'includeSubdomains')?.value.trim() === 'true' }));

// The user certificate authorities of the trust anchors directly inside a config element: the offsets of
// <certificates src="user"/>.
const userCertsOf = (element) => element.children.filter((t) => t.name === 'trust-anchors').flatMap((t) => t.children.filter((c) => c.name === 'certificates' && plainAttribute(c, 'src')?.value.trim() === 'user').map((c) => c.offset));

// The model of an XML resource a manifest names: a network security config or the paths of a FileProvider. Throws
// XmlError for any other root element.
export function readResource(root) {
  if (root.name === 'network-security-config') {
    const model = { kind: 'network', offset: root.offset, base: null, domains: [] };
    const todo = [];
    for (const child of root.children) {
      if (child.name === 'base-config' && !model.base) model.base = { offset: child.offset, cleartext: plainAttribute(child, 'cleartextTrafficPermitted'), userCerts: userCertsOf(child) };
      else if (child.name === 'domain-config') todo.push(child);
    }
    // Domain configs nest; they are listed in the order of the file, walked without recursion.
    todo.reverse();
    while (todo.length) {
      const d = todo.pop();
      model.domains.push({ offset: d.offset, cleartext: plainAttribute(d, 'cleartextTrafficPermitted'), domains: domainsOf(d), userCerts: userCertsOf(d) });
      const inner = d.children.filter((x) => x.name === 'domain-config');
      for (let k = inner.length - 1; k >= 0; k -= 1) todo.push(inner[k]);
    }
    return model;
  }
  if (root.name === 'paths') {
    return { kind: 'paths', offset: root.offset, entries: root.children.filter((c) => Object.hasOwn(PATH_ELEMENTS, c.name)).map((c) => ({ tag: c.name, name: plainAttribute(c, 'name')?.value ?? null, path: plainAttribute(c, 'path'), offset: c.offset })) };
  }
  throw new XmlError(`the root element is <${root.name.slice(0, 60)}>, not <network-security-config> or <paths>`, root.offset);
}

// The resources a manifest names: [{ use, name, plain, attr }], where use is network or paths and attr is the attribute
// or meta-data element that names it.
export function referencesOf(model) {
  const out = [];
  const nsc = model.application?.attrs.networkSecurityConfig;
  const ref = nsc ? xmlResource(nsc.value) : null;
  if (ref) out.push({ use: 'network', ...ref, offset: nsc.offset, by: 'android:networkSecurityConfig' });
  for (const c of model.components) {
    for (const m of c.metaData) {
      const r = m.name === FILE_PROVIDER_PATHS && m.resource ? xmlResource(m.resource.value) : null;
      if (r) out.push({ use: 'paths', ...r, offset: m.offset, by: `the ${FILE_PROVIDER_PATHS} meta-data of ${c.name ?? `a <${c.tag}>`}`, component: c });
    }
  }
  return out;
}

const componentName = (c) => `<${c.tag}${c.name ? ` android:name="${c.name}"` : ''}>`;
const isLauncher = (c) => (c.tag === 'activity' || c.tag === 'activity-alias') && c.filters.some((f) => f.actions.includes('android.intent.action.MAIN') && f.categories.includes('android.intent.category.LAUNCHER'));
const REACH = { activity: 'any app can start it', 'activity-alias': 'any app can start it', service: 'any app can start or bind to it', receiver: 'any app can send it broadcasts', provider: 'any app can query or change its data' };
const isBroadPath = (v) => v === null || ['', '.', '/', './'].includes(v.value.trim());

// The findings of a manifest: [{ rule, file, offset, found }]. resources maps a reference to the resource it names:
// resourceOf(ref) gives { file, model } when the resource was read, { file, model: null } when it is there but could
// not be read (its own file has the error), or null when it is not there.
export function checkManifest(file, model, resourceOf) {
  const out = [];
  const add = (rule, offset, found, at = file) => out.push({ rule, file: at, offset, found });
  const seen = new Set();
  for (const p of model.permissions) {
    if (seen.has(p.name)) continue;
    seen.add(p.name);
    const info = permissionInfo(p.name);
    if (!info) continue;
    const upTo = p.maxSdk ? `; requested up to API level ${p.maxSdk} only` : '';
    const what = info.kind === 'dangerous' ? `a dangerous permission (${info.what}) that the user grants at run time` : `a special permission (${info.what})`;
    if (info.restricted) add('restricted-permission', p.offset, `${p.name} is requested: ${info.restricted}${upTo}`);
    else add('dangerous-permission', p.offset, `${p.name} is requested: ${what}${upTo}`);
  }
  const app = model.application;
  const refs = referencesOf(model);
  const network = refs.find((r) => r.use === 'network');
  const netResource = network && network.plain ? resourceOf(network) : null;
  const netModel = netResource?.model?.kind === 'network' ? netResource.model : null;
  if (app) {
    const at = app.attrs;
    if (boolOf(at.debuggable) === true) add('debuggable', at.debuggable.offset, 'android:debuggable="true" on <application>: the build can be debugged on any device, and app stores do not accept a debuggable app');
    const backup = boolOf(at.allowBackup);
    if (backup === true || at.allowBackup === null) {
      const rules = ['dataExtractionRules', 'fullBackupContent'].filter((k) => at[k]).map((k) => `android:${k} (${at[k].value.trim()})`);
      const named = rules.length ? `; backup rules are named in ${rules.join(' and ')}, which the tool does not read` : '';
      if (backup === true) add('allow-backup', at.allowBackup.offset, `android:allowBackup="true": the app data goes into cloud backups and device-to-device transfers${named}`);
      else add('allow-backup', app.offset, `android:allowBackup is not set, and it is true by default: the app data goes into cloud backups and device-to-device transfers${named}`);
    }
    if (boolOf(at.usesCleartextTraffic) === true) {
      const instead = network ? `; on Android 7.0 and higher the network security config @xml/${network.name} decides instead` : '';
      add('cleartext-traffic', at.usesCleartextTraffic.offset, `android:usesCleartextTraffic="true": every connection of the app may use cleartext HTTP${instead}`);
    }
    if (model.targetSdk && model.targetSdk.value < 28 && at.usesCleartextTraffic === null && !(netModel && netModel.base && boolOf(netModel.base.cleartext) === false)) {
      add('cleartext-traffic', model.targetSdk.offset, `android:targetSdkVersion ${model.targetSdk.value} is below 28, so cleartext traffic is permitted by default, and neither android:usesCleartextTraffic nor a base-config turns it off`);
    }
  }
  for (const r of refs) {
    const res = r.plain ? resourceOf(r) : null;
    if (!r.plain) {
      add('missing-resource', r.offset, `${r.by} names @xml/${r.name}, which is not a plain resource name, so it was not read; its settings were not checked`);
      continue;
    }
    if (res === null) {
      add('missing-resource', r.offset, `${r.by} names @xml/${r.name}, but res/xml/${r.name}.xml is not next to this manifest; its settings were not checked`);
      continue;
    }
    if (!res.model) continue;
    if (res.model.kind !== r.use) {
      add('unparsable-file', res.model.offset, `the root element is <${res.model.kind === 'network' ? 'network-security-config' : 'paths'}>, but ${r.by} names this file as ${r.use === 'network' ? 'a network security config' : 'the paths of a FileProvider'}; nothing in it is checked`, res.file);
      continue;
    }
    if (r.use === 'network') checkNetwork(res.file, res.model, add);
    else checkPaths(res.file, res.model, r.component, add);
  }
  for (const c of model.components) {
    const exported = boolOf(c.exported);
    if (c.exported === null && c.filters.length && NEED_EXPORTED.includes(c.tag)) {
      add('missing-exported', c.offset, `${componentName(c)} has an <intent-filter> and no android:exported: the app cannot be installed on Android 12 and higher, and on older systems the component is exported`);
    }
    if (exported === true && !isLauncher(c)) {
      const own = c.permission ?? app?.attrs.permission ?? null;
      const guards = c.tag === 'provider' && !own ? [c.readPermission, c.writePermission].filter(Boolean) : own ? [own] : [];
      const full = c.tag === 'provider' && !own ? guards.length === 2 : guards.length === 1;
      const weak = guards.filter((g) => model.declared.has(g.value.trim()) && /^normal$/.test(model.declared.get(g.value.trim()).trim()));
      if (!full) add('exported-component', c.exported.offset, `${componentName(c)} is exported with ${guards.length ? 'a permission for only one of reading and writing' : 'no permission'}: ${REACH[c.tag]}`);
      else if (weak.length) add('exported-component', c.exported.offset, `${componentName(c)} is exported with the permission ${weak[0].value.trim()}, which this manifest declares with protection level normal, so any app can hold it: ${REACH[c.tag]}`);
    }
    if (c.tag === 'provider') {
      const grantAll = boolOf(c.grantUriPermissions) === true;
      const hasPaths = c.metaData.some((m) => m.name === FILE_PROVIDER_PATHS);
      if (grantAll && !hasPaths) add('provider-broad-paths', c.grantUriPermissions.offset, `${componentName(c)} sets android:grantUriPermissions="true" and names no paths resource: a grant can reach any of its data`);
      for (const g of c.grants) {
        const wide = [['path', g.path, ['/', '']], ['pathPrefix', g.pathPrefix, ['/', '']], ['pathPattern', g.pathPattern, ['.*', '/.*']]].find(([, attr, values]) => attr && values.includes(attr.value.trim()));
        if (wide) add('provider-broad-paths', g.offset, `<grant-uri-permission android:${wide[0]}="${wide[1].value.trim()}"> of ${componentName(c)} covers every path of the provider`);
      }
    }
  }
  return out;
}

// The findings of a network security config.
function checkNetwork(file, model, add) {
  if (model.base && boolOf(model.base.cleartext) === true) add('cleartext-traffic', model.base.cleartext.offset, '<base-config cleartextTrafficPermitted="true">: cleartext traffic is permitted to every domain that no domain-config names', file);
  for (const o of model.base?.userCerts ?? []) add('user-certificates', o, '<certificates src="user"/> in the base-config: certificate authorities the user installed are trusted for every domain, so a proxy with such a certificate can read the traffic', file);
  for (const d of model.domains) {
    const names = d.domains.length ? d.domains.map((x) => `${x.name}${x.sub ? ' and its subdomains' : ''}`).join(', ') : 'no domain it names';
    if (boolOf(d.cleartext) === true) add('cleartext-domain', d.cleartext.offset, `<domain-config cleartextTrafficPermitted="true"> permits cleartext traffic to ${names}`, file);
    for (const o of d.userCerts) add('user-certificates', o, `<certificates src="user"/> in the domain-config of ${names}: certificate authorities the user installed are trusted for it`, file);
  }
}

// The findings of the paths of a FileProvider.
function checkPaths(file, model, component, add) {
  for (const e of model.entries) {
    const tag = `<${e.tag}${e.name ? ` name="${e.name}"` : ''}${e.path ? ` path="${e.path.value}"` : ''}>`;
    if (e.tag === 'root-path') add('provider-broad-paths', e.offset, `${tag} shares ${PATH_ELEMENTS[e.tag]} through ${componentName(component)}`, file);
    else if (isBroadPath(e.path)) add('provider-broad-paths', e.offset, `${tag} shares ${PATH_ELEMENTS[e.tag]}, not one subdirectory of it, through ${componentName(component)}`, file);
  }
}
