// The Android permissions the checks name, taken from the reference of Manifest.permission (the protection level of
// each constant), the page on permissions, and the Google Play pages on the permissions it restricts. research/sources.md
// lists the pages. A permission outside these lists (a normal permission, a signature permission, one of another app)
// is not reported.

// The permissions of protection level dangerous, which the user grants at run time, with the kind of data or action
// each guards.
export const DANGEROUS_PERMISSIONS = {
  ACCEPT_HANDOVER: 'phone calls',
  ACCESS_BACKGROUND_LOCATION: 'location in the background',
  ACCESS_COARSE_LOCATION: 'approximate location',
  ACCESS_FINE_LOCATION: 'precise location',
  ACCESS_LOCAL_NETWORK: 'devices on the local network',
  ACCESS_MEDIA_LOCATION: 'the location in photos and videos',
  ACTIVITY_RECOGNITION: 'physical activity',
  ADD_VOICEMAIL: 'voicemail',
  ANSWER_PHONE_CALLS: 'phone calls',
  BLUETOOTH_ADVERTISE: 'nearby devices',
  BLUETOOTH_CONNECT: 'nearby devices',
  BLUETOOTH_SCAN: 'nearby devices',
  BODY_SENSORS: 'body sensors',
  BODY_SENSORS_BACKGROUND: 'body sensors in the background',
  CALL_PHONE: 'phone calls',
  CAMERA: 'camera',
  GET_ACCOUNTS: 'accounts on the device',
  NEARBY_WIFI_DEVICES: 'nearby devices',
  POST_NOTIFICATIONS: 'notifications',
  PROCESS_OUTGOING_CALLS: 'call log',
  RANGING: 'nearby devices',
  READ_CALENDAR: 'calendar',
  READ_CALL_LOG: 'call log',
  READ_CONTACTS: 'contacts',
  READ_EXTERNAL_STORAGE: 'shared storage',
  READ_MEDIA_AUDIO: 'audio files',
  READ_MEDIA_IMAGES: 'photos',
  READ_MEDIA_VIDEO: 'videos',
  READ_MEDIA_VISUAL_USER_SELECTED: 'photos and videos the user picks',
  READ_PHONE_NUMBERS: 'phone numbers',
  READ_PHONE_STATE: 'phone state',
  READ_SMS: 'SMS',
  RECEIVE_MMS: 'SMS',
  RECEIVE_SMS: 'SMS',
  RECEIVE_WAP_PUSH: 'SMS',
  RECORD_AUDIO: 'microphone',
  SEND_SMS: 'SMS',
  USE_SIP: 'phone calls',
  UWB_RANGING: 'nearby devices',
  WRITE_CALENDAR: 'calendar',
  WRITE_CALL_LOG: 'call log',
  WRITE_CONTACTS: 'contacts',
  WRITE_EXTERNAL_STORAGE: 'shared storage'
};

// Permissions that are not dangerous but give powerful access: special permissions the user turns on in the system
// settings, and the permission that sees every installed app.
export const SPECIAL_PERMISSIONS = {
  MANAGE_EXTERNAL_STORAGE: 'access to all files',
  PACKAGE_USAGE_STATS: 'the usage statistics of other apps',
  QUERY_ALL_PACKAGES: 'the list of every installed app',
  REQUEST_INSTALL_PACKAGES: 'installing other apps',
  SYSTEM_ALERT_WINDOW: 'drawing over other apps',
  WRITE_SETTINGS: 'changing system settings'
};

// The permissions Google Play restricts beyond the system: the SMS and Call Log groups (default handlers or an approved
// exception only), location in the background (reviewed with a declaration), and the visibility of every installed
// app (an approved use only). Each says why.
export const RESTRICTED_PERMISSIONS = {
  ACCESS_BACKGROUND_LOCATION: 'Google Play reviews location in the background and asks for a declaration of the feature that needs it',
  PROCESS_OUTGOING_CALLS: 'Google Play allows the Call Log group only to an app that is the default handler of calls, or for an approved exception',
  QUERY_ALL_PACKAGES: 'Google Play allows the visibility of every installed app only for an approved use, declared in the Play Console',
  READ_CALL_LOG: 'Google Play allows the Call Log group only to an app that is the default handler of calls, or for an approved exception',
  READ_SMS: 'Google Play allows the SMS group only to a default SMS handler, or for an approved exception',
  RECEIVE_MMS: 'Google Play allows the SMS group only to a default SMS handler, or for an approved exception',
  RECEIVE_SMS: 'Google Play allows the SMS group only to a default SMS handler, or for an approved exception',
  RECEIVE_WAP_PUSH: 'Google Play allows the SMS group only to a default SMS handler, or for an approved exception',
  SEND_SMS: 'Google Play allows the SMS group only to a default SMS handler, or for an approved exception',
  WRITE_CALL_LOG: 'Google Play allows the Call Log group only to an app that is the default handler of calls, or for an approved exception'
};

const PREFIX = 'android.permission.';

// What the checks know of a permission name: { short, kind: 'dangerous' | 'special', what, restricted } or null.
export function permissionInfo(name) {
  if (typeof name !== 'string' || !name.startsWith(PREFIX)) return null;
  const short = name.slice(PREFIX.length);
  const restricted = Object.hasOwn(RESTRICTED_PERMISSIONS, short) ? RESTRICTED_PERMISSIONS[short] : null;
  if (Object.hasOwn(DANGEROUS_PERMISSIONS, short)) return { short, kind: 'dangerous', what: DANGEROUS_PERMISSIONS[short], restricted };
  if (Object.hasOwn(SPECIAL_PERMISSIONS, short)) return { short, kind: 'special', what: SPECIAL_PERMISSIONS[short], restricted };
  return null;
}
