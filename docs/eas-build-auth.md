# EAS APK build and authentication notes

The `preview` profile in `eas.json` is configured for a directly installable Android APK. The `production` profile is configured for an Android App Bundle (AAB), so select `preview` whenever the goal is an APK.

The project already contains an EAS project ID in `app.json` and the source repository is rooted at `/`. To build from the Expo dashboard, connect the Expo GitHub App, link this repository to the Wallet project, and use **Build from GitHub** with platform **Android** and profile **preview**. See [`eas-apk-build.md`](eas-apk-build.md) for the complete steps.

Expo currently documents a successful initial local EAS build for a platform as a prerequisite for triggering builds from GitHub. If required, authenticate with Expo's device login on a computer and run the repository's `npm run build:apk` script. The script calls EAS CLI through `npx`, so a global EAS CLI installation is not required. Do not put an Expo personal access token, password, wallet seed, or private key in source control, logs, or chat.

The earlier sandbox EAS CLI check reported that no Expo account was logged in; therefore no EAS cloud build was started from that environment. The repository's separate GitHub Actions APK workflow remains available, but produces a debug-key-signed test build. Neither route makes this non-audited wallet production-ready.

## Sources

- [Expo EAS CLI reference](https://docs.expo.dev/eas/cli/) — device login and `npx` usage.
- [Expo APK build reference](https://docs.expo.dev/build-reference/apk/) — profile configuration and APK output.
- [Expo GitHub build integration](https://docs.expo.dev/build/building-from-github/) — linking repositories and triggering GitHub builds.
