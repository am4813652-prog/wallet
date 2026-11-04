# EAS APK build and authentication notes

The APK profile in `eas.json` uses `distribution: internal` and `android.buildType: apk`, which is intended for a directly installable Android build.

At the time of validation, the official Expo EAS CLI documentation lists `eas login --device` as an option and `eas whoami` as the authentication check. Expo also supports a personal access token through `EXPO_TOKEN`, but tokens have account-level authority and must be treated like passwords. Do not put an access token in source control, app config, logs, or chat. Use Expo's supported device/browser login flow instead of soliciting a password or token in conversation.

EAS Build requires an Expo account; Expo documentation says the Free plan is eligible to build. This project already declares an EAS project ID in `app.json`. The EAS CLI in this environment reported `Not logged in`, so a cloud APK cannot start until the owner session is securely authenticated. After authentication, run `npm run build:apk`, monitor the EAS job, download its APK artifact, and attach that artifact to the user.

Sources:

- [Expo EAS CLI reference](https://docs.expo.dev/eas/cli/): device authentication flags, `eas whoami`, and build command.
- [Expo Programmatic access](https://docs.expo.dev/accounts/programmatic-access/): scope and handling of access tokens and `EXPO_TOKEN`.
- [Expo first build guide](https://docs.expo.dev/build/setup/): account requirement, free-plan eligibility, and build setup.
- [Expo eas.json reference](https://docs.expo.dev/build/eas-json/): build profiles and APK configuration.
- [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/): installable APK distribution behavior.
