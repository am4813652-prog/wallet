# Wallet

A dark-theme Expo/React Native wallet foundation. The Android display name and Expo project slug are both **Wallet**.

## Implemented in this first build

- English dark UI with wallet create/import flows.
- Generate a 24-word BIP-39 recovery phrase and import a recovery phrase or private key locally.
- Optional BIP-39 passphrase during wallet creation/import.
- Six-digit PIN setup and unlock; optional fingerprint unlock at app entry (the user chooses either PIN or fingerprint). PIN plus fingerprint are required for sensitive key export and wallet deletion.
- Fingerprint-gated private-key export as both a QR code and readable text. The private key is shown only after PIN verification and a biometric prompt. QR export is highly sensitive: anyone who scans it can control the wallet.
- Live QR scanning for import and recipient entry, public-address QR display, and copy action.
- Wallet selector, editable wallet name, selectable crypto-symbol avatar, and local deletion flow.
- Protected recovery-phrase re-display after PIN and fingerprint verification.
- A native-balance read attempt for the selected EVM network using public RPC endpoints. The interface reports unavailable data rather than inventing balances.
- Network selector listing the requested networks.

## Important limitations — not for real-fund use

This is **not yet a complete or audited wallet**. The Send tab is deliberately disabled: it does not sign or broadcast transactions. ERC-20 token contract addresses and token balance reads are not configured; gas estimates, live USD prices, transaction history/explorer links, verified recovery-phrase quiz, randomized seed confirmation, PIN throttling/lockout, and security audit are also not implemented. Asset amounts and USD values are therefore not represented as live data. Do not deposit funds or use this build to manage valuable assets.

The interface is fingerprint-only and does not offer face unlock as an app option. However, Expo's biometric API invokes the operating system biometric prompt, and Android decides which enrolled strong biometric modality may satisfy that prompt. Expo's API does not let this app force fingerprint as the sole accepted modality on every Android model. Test the actual prompt on the intended phone before relying on the setting. Face ID is not enabled in the iOS plugin configuration; the target deliverable here is Android.

Secrets are kept in Expo SecureStore, and sensitive screens request screenshot protection. These are defense-in-depth measures, not a substitute for a professional wallet security review. A six-digit PIN is not the recovery phrase, and uninstalling the app may erase local secrets. Back up the recovery phrase offline.

## Run with Expo

```bash
npm install
npx expo start
```

Open the project in Expo Go to preview supported UI and camera flows. Biometric behavior and native secure-storage settings should be tested in an Android development build on a physical device.

## Build an Android APK

Install/authenticate the Expo EAS CLI, then run:

```bash
npx eas-cli login
npm run build:apk
```

The `preview` EAS profile is configured for an installable APK. Creating a cloud APK requires access to an Expo/EAS account and a successful remote build.

## Credentials

No Infura key or other RPC key is committed. The current prototype uses public RPC URLs for read-only native balances. Before production, configure reviewed provider endpoints and use environment/build secrets; never put provider credentials, recovery phrases, or private keys in a Git commit or support message.

## Project checks

```bash
npm run typecheck
npx expo-doctor
npm audit
```

Review dependency advisories and perform a full security audit before enabling any transaction-signing or broadcasting code.

## References

- [Expo Go limitations](https://docs.expo.dev/faq/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Expo Camera / QR scanning](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Build APKs with EAS](https://docs.expo.dev/build-reference/apk/)
