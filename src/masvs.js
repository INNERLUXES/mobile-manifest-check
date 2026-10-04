// The OWASP MASVS control groups and controls the rules support, in this project's own words, with the page of each.
// Every rule of src/rules.js names the controls it supports in its masvs field; the group of a control is the part of
// its id before the last dash. docs/rules-and-sources.md lists the mapping, and test/data.test.js checks that every
// rule names controls that are here and that every page is in research/sources.md. A finding helps with a control; it
// never shows that an app meets one.

const BASE = 'https://mas.owasp.org/MASVS';

export const MASVS_GROUPS = [
  { id: 'MASVS-STORAGE', title: 'Storage', url: `${BASE}/05-MASVS-STORAGE/`, about: 'sensitive data kept on the device, at rest' },
  { id: 'MASVS-CRYPTO', title: 'Cryptography', url: `${BASE}/06-MASVS-CRYPTO/`, about: 'the cryptography the app uses and how it handles keys' },
  { id: 'MASVS-NETWORK', title: 'Network Communication', url: `${BASE}/08-MASVS-NETWORK/`, about: 'data in transit and the identity of the servers' },
  { id: 'MASVS-PLATFORM', title: 'Platform Interaction', url: `${BASE}/09-MASVS-PLATFORM/`, about: 'how the app talks to the platform and to other apps' },
  { id: 'MASVS-RESILIENCE', title: 'Resilience Against Reverse Engineering and Tampering', url: `${BASE}/11-MASVS-RESILIENCE/`, about: 'how hard the app is to analyse and change' },
  { id: 'MASVS-PRIVACY', title: 'Privacy', url: `${BASE}/12-MASVS-PRIVACY/`, about: 'how little personal data the app takes and how open it is about it' }
];

export const MASVS_CONTROLS = [
  { id: 'MASVS-STORAGE-2', url: `${BASE}/controls/MASVS-STORAGE-2/`, text: 'the app keeps sensitive data from leaking' },
  { id: 'MASVS-CRYPTO-1', url: `${BASE}/controls/MASVS-CRYPTO-1/`, text: 'the app uses current strong cryptography in the way the industry advises' },
  { id: 'MASVS-NETWORK-1', url: `${BASE}/controls/MASVS-NETWORK-1/`, text: 'the app secures all of its network traffic with current good practice' },
  { id: 'MASVS-PLATFORM-1', url: `${BASE}/controls/MASVS-PLATFORM-1/`, text: 'the app uses the mechanisms of communication between processes safely' },
  { id: 'MASVS-RESILIENCE-4', url: `${BASE}/controls/MASVS-RESILIENCE-4/`, text: 'the app makes analysis while it runs, such as debugging, harder' },
  { id: 'MASVS-PRIVACY-1', url: `${BASE}/controls/MASVS-PRIVACY-1/`, text: 'the app reaches as little sensitive data and as few resources as it can' },
  { id: 'MASVS-PRIVACY-3', url: `${BASE}/controls/MASVS-PRIVACY-3/`, text: 'the app is open about the data it collects and how it uses it' }
];

// The group of a control id: "MASVS-STORAGE-2" is "MASVS-STORAGE".
export const groupOf = (control) => control.slice(0, control.lastIndexOf('-'));

export const masvsGroup = (id) => MASVS_GROUPS.find((g) => g.id === id) ?? null;
export const masvsControl = (id) => MASVS_CONTROLS.find((c) => c.id === id) ?? null;
