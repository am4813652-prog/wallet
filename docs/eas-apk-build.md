# Build and download Wallet as an APK from Expo

Every Android build profile in `eas.json`—`development`, `preview`, and `production`—explicitly sets `android.buildType` to `apk`. Therefore, selecting `production` or allowing EAS CLI to default to that profile will still produce an APK from the current repository. The `preview` profile is recommended for direct testing.[1]

> This repository intentionally does not create an AAB in its current Android profiles. If Google Play submission is needed later, add a separate store profile configured with `android.buildType: "app-bundle"` and validate it independently. The existing `production` profile is currently an APK build profile.

## Build from the Expo website using GitHub

1. Sign in to the Expo account that owns the Wallet EAS project. The project ID is already set in `app.json`.
2. In Expo account settings, connect the GitHub account and install/authorize the Expo GitHub App for `am4813652-prog/wallet`.
3. Open the Wallet project in the Expo dashboard and go to **Project settings → GitHub**. Connect `am4813652-prog/wallet` and leave the base directory at `/`, because the Expo project is at the repository root.
4. Open the project's **Builds** page and choose **Build from GitHub**. Select the latest `main` commit (make sure it includes the APK-profile update), platform **Android**, and either **preview** (recommended) or another profile. All three current Android profiles produce APKs.
5. After the build succeeds, open its build details and download the `.apk` artifact from Expo to the Android device.

Expo currently documents a successful initial EAS build from a local machine as a prerequisite for triggering builds from a GitHub repository. If Expo does not show or allow **Build from GitHub**, complete the one-time build below first, then return to the dashboard.[2]

## One-time initial build, if Expo requires it

On a computer with Node.js 22 or later, clone this repository, open a terminal in the project root, and run:

```bash
npx --yes eas-cli@latest login --device
npm run build:apk
```

The first command starts Expo's device-login flow; complete it in a browser using the displayed code. The second command starts an Android build with the `preview` APK profile. Do not share an Expo password, personal access token, wallet recovery phrase, or private key in chat or commit them to this repository.

## Android profiles

| Profile | Android output | Intended use |
|---|---|---|
| `development` | APK (`android.buildType: apk`) | Development/testing; includes the development client |
| `preview` | APK (`android.buildType: apk`) | Direct installation and testing; recommended for this build |
| `production` | APK (`android.buildType: apk`) | APK output; not an AAB/store profile in this repository |

Expo's default Android output is AAB unless a build profile requests APK. Each current profile sets `android.buildType` to `apk`, and each selects the `latest` Android build image for Expo GitHub builds.[1]

## Troubleshooting

If the build details offer an AAB, verify the build uses a GitHub commit that includes the updated `eas.json` and that no custom remote config overrides it. All current Android profiles in this repository set `buildType` to `apk`. If **Build from GitHub** is missing, verify that the Expo GitHub App is installed and authorized, that the repository is linked to this Wallet EAS project, and that the first-build prerequisite is met. If a build fails, open its logs and address the first reported error before retrying.

This is a test build of a non-audited wallet. Do not use it to store or transfer meaningful funds. A successful build does not constitute a security audit or production approval.

## References

[1]: https://docs.expo.dev/build-reference/apk/ "Build APKs for Android Emulators and devices — Expo"
[2]: https://docs.expo.dev/build/building-from-github/ "Trigger builds from the Expo GitHub App — Expo"
[3]: https://docs.expo.dev/eas/cli/ "EAS CLI reference — Expo"
