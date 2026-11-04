# Reproducible APK build workflow

This repository builds the Expo project into an Android APK through a manual GitHub Actions workflow; this avoids needing the user's Expo access token. The workflow installs Node 22, Android SDK platform/build-tools 36, NDK `27.1.12297006`, runs type/lint/wallet transaction tests, regenerates Android native files from Expo config, runs Gradle `:app:assembleRelease`, and uploads an artifact for 14 days. Expo's official `expo-build-properties` plugin pins `compileSdkVersion` and `buildToolsVersion` to the stable API 36 toolchain.

The generated build is a **debug-key-signed release variant for testing/installation only**, not a production/distribution signing key and not appropriate for public store release. The signing configuration comes from Expo prebuild's debug config. For production, create/securely manage a user-owned release keystore and perform an independent security audit.

GitHub Actions permissions are limited to `contents: read`; only `workflow_dispatch` triggers the job; no EAS credentials, personal tokens, private keys, wallet seeds, or signing secrets are configured. Action references are pinned to reviewed commit SHAs:

- `android-actions/setup-android` v4.0.4 — `be39fa834029ff78f1a44aa3bb0819b8fc2bd8fd`.
- `actions/checkout` v7.0.1 — `3d3c42e5aac5ba805825da76410c181273ba90b1`.
- `actions/setup-node` v7.1.0 — `949feb2413d6458794dcd2491c4babbbce0c15c1`.
- `actions/upload-artifact` v7.0.2 — `cf430e030ddbb5b0abf93d22962f4752f3646cd9`.

The Expo config explicitly selects compile SDK 36 and build-tools 36.0.0; the Expo SDK's default NDK version remains `27.1.12297006`.

Sources:

- [Android SDK command-line tools](https://developer.android.com/studio#command-line-tools-only)
- [Android sdkmanager](https://developer.android.com/tools/sdkmanager)
- [Expo local build reference and prerequisites](https://docs.expo.dev/build-reference/local-builds/)
- [android-actions/setup-android](https://github.com/android-actions/setup-android)
- [actions/checkout](https://github.com/actions/checkout)
- [actions/setup-node](https://github.com/actions/setup-node)
- [actions/upload-artifact](https://github.com/actions/upload-artifact)
