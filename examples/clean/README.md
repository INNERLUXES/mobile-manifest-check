# A clean app

Driftwood, a made-up notes app, ready for its release. The Android app asks for the camera as its one dangerous
permission, turns backups off, turns cleartext traffic off in its network security config with a user certificate for
debug builds only, exports only its launcher activity, and shares one subdirectory of its cache through a FileProvider
that is not exported. The iOS app has one specific usage description and declares its use of encryption. The check
lists the camera permission and the camera usage description as info, and nothing else.
