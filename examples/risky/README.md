# A risky app

Tidepool, a made-up tide diary, the way it looked before its release. The Android app requests dangerous, special and
restricted permissions, is debuggable, leaves backups on by default, allows cleartext traffic in the manifest and in
its network security config, trusts certificate authorities the user installed, exports an activity with no
permission and a service behind a permission any app can hold, has a deep link activity with no `android:exported`, a
provider that grants on every path, a FileProvider that shares the external storage and the root of the device, and a
second FileProvider whose paths resource is not there. The iOS app has a usage description that is a placeholder, one
that is empty, one that is a placeholder only under `examples/config.json`, a background mode and a device capability
with no usage description, App Transport Security switched off with a narrower key beside it, an exception domain
with plain HTTP and TLS 1.0, file sharing on and no encryption declaration. Its widget declares an entity in its
document type, which the reader refuses.

It also holds what must not be reported: the launcher activity, a receiver guarded by a system permission, a domain
with cleartext off, a user certificate under `debug-overrides`, an exception domain that keeps TLS 1.2, a key set to
false, settings inside comments, a merged manifest under `build` and the Info.plist of a library under `Pods`, which the
default exclude patterns leave out.
