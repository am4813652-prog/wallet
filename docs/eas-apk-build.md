# Build and download Wallet as an APK from Expo

The repository is configured with an EAS `preview` profile that produces a directly installable Android APK. The `production` profile is intentionally configured to produce an Android App Bundle (AAB) for Google Play. When starting the test build, select **Android** and **preview**; selecting `production` will not produce the directly downloadable APK expected here.[1]

## Build from the Expo website using GitHub

1. Sign in to the Expo account that owns the Wallet EAS project. The project ID is already set in `app.json`.
2. In Expo account settings, connect the GitHub account and install/authorize the Expo GitHub App for the repository `am4813652-prog/wallet`.
3. Open the Wallet project in the Expo dashboard and go to **Project settings → GitHub**. Connect `am4813652-prog/wallet` and leave the base directory at `/`, because the Expo project is at the repository root.
4. Open the project's **Builds** page and choose **Build from GitHub**. Select the `main` branch (or the intended commit), platform **Android**, and build profile **preview**. Start the build.
5. After the build succeeds, open its build details and download the `.apk` artifact from Expo to the Android device.

Expo currently documents a successful initial EAS build from a local machine as a prerequisite for triggering builds from a GitHub repository. If Expo does not show or allow **Build from GitHub**, complete the one-time build below first, then return to the dashboard.[2]

## One-time initial build, if Expo requires it

On a computer with Node.js 22 or later, clone this repository, open a terminal in the project root, and run:

```bash
npx --yes eas-cli@latest login --device
npm run build:apk
```

The first command starts Expo's device-login flow; complete it in a browser using the displayed code. The second command starts an Android build with the `preview` profile. Do not share an Expo password, personal access token, wallet recovery phrase, or private key in chat or commit them to this repository.

## Why the profile matters

| Profile | Android output | Intended use |
|---|---|---|
| `preview` | APK (`android.buildType: apk`) | Direct installation and testing |
| `production` | AAB (`android.buildType: app-bundle`) | Google Play release pipeline |

Expo's default Android build output is AAB. The `preview` profile overrides that to APK, which is the format needed for direct installation.[1]

## Troubleshooting

If the Expo build details offer only an AAB, verify that the build was started with profile `preview`, not `production`. If `Build from GitHub` is missing, verify that the Expo GitHub App is installed and authorized, that the repository is linked to this Wallet EAS project, and that the first-build prerequisite is met. If a build fails, open that build's logs and address the first reported error before retrying.

This is a test build of a non-audited wallet. Do not use it to store or transfer meaningful funds. A successful build does not constitute a security audit or production approval.

## References

[1]: https://docs.expo.dev/build-reference/apk/ "Build APKs for Android Emulators and devices — Expo"
[2]: https://docs.expo.dev/build/building-from-github/ "Trigger builds from the Expo GitHub App — Expo"
[3]: https://docs.expo.dev/eas/cli/ "EAS CLI reference — Expo"
