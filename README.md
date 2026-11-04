# Wallet

Wallet is an Expo / React Native Android wallet foundation. Its Android app title and Expo slug are **Wallet**.

## What is implemented

- Local EVM wallet creation and import from a 24-word BIP-39 phrase or private key, plus an optional BIP-39 passphrase.
- Recovery phrase display, public receive address QR, QR scanner, and private-key QR export after PIN and device biometric confirmation.
- Six-digit PIN with persistent progressive delays after incorrect attempts. Fingerprint is the only biometric option exposed by the app. Android controls its system biometric prompt and may accept another enrolled strong modality on some devices; Expo does not provide a cross-device guarantee that only a fingerprint can satisfy the OS prompt.
- Local asset reads, recipient validation, network identity check, token contract/symbol/decimal verification, simulation, balance checks, gas estimate, transaction review and confirmation.
- Local transaction signing with ethers. The private key is not sent to an RPC provider; only the signed transaction bytes are broadcast.
- PIN and biometric gate for transaction signing, recovery phrase display, private-key export and wallet deletion.
- Recent submitted transaction history saved locally, with links to the appropriate block explorer.

## Sending support

This is a limited, non-audited EVM implementation. Sending is enabled only for networks whose chain ID, live fee data and configured token metadata passed current RPC checks. It supports native-asset transfers on Ethereum, Avalanche C-Chain, BNB Smart Chain, Celo, Polygon PoS, Sei, Ethereum Sepolia and Polygon Amoy. The following tokens are configured only at the issuer-listed contract addresses: USDC on Ethereum, Avalanche C-Chain, Celo, Polygon PoS, Sei, Sepolia and Amoy; USDT on Ethereum, Avalanche C-Chain and Celo.

The UI lists additional networks, but sending is disabled on Arbitrum, Base, Blast, Linea, opBNB, Optimism, Palm and Scroll until their RPC/fee support is separately verified. Rollup L1 data fees are not approximated as ordinary EVM gas. Blast and Palm provider URLs did not return the pinned chain ID during validation and remain disabled. The app does not support bridged-token variants, arbitrary custom tokens or cross-chain transfers.

Before local signing, Wallet displays the network/chain ID, full recipient, asset, amount, balance, and maximum estimated fee. It simulates the transaction and revalidates fees after PIN/biometric authorization; if the maximum fee increases, Wallet cancels and asks the user to review again. Transfers are irreversible. Public RPC providers can observe wallet addresses and network requests. A public endpoint is not a production uptime or privacy guarantee.

Testnet ETH/POL/USDC has no monetary value. Sepolia and Amoy transfers are intended for testing only. The automated transaction suite signs and verifies transactions against a mock RPC only; it does not broadcast a real transaction. The live network check reads chain IDs, fee data, bytecode and token metadata, but does not transfer funds.

## Important security limitations

**Do not treat this APK/source as an audited production wallet or use it to store meaningful funds before an independent security review.** Testing and code-level checks do not prove wallet security. The current production dependency audit reports five moderate advisories in Expo's `glob`/`minimatch` dependency tree; `npm audit fix --force` would downgrade/break the Expo SDK and was not applied. Re-check and update Expo to a patched compatible release before public release. The implementation has not completed an external audit, a device lab review, a fuzz/property testing campaign, or end-to-end testnet transfers with a funded test wallet. Device biometric behavior and secure-storage behavior must be validated on intended Android devices. Do not distribute private keys or recovery phrases in screenshots, support messages or test logs. Back up the recovery phrase offline before using a wallet. A six-digit PIN is not a recovery mechanism.

USD price feeds and fiat portfolio totals are not connected; the app does not invent USD valuations. Transaction receipts are not independently polled in the UI after broadcast; open the linked chain explorer to check inclusion and confirmations. The recovery backup flow currently asks the user to record the phrase but does not yet require a randomized word-confirmation quiz.

## Run with Expo

```bash
npm install
npx expo start
```

Expo Go is useful for previewing parts of the UI, but Android biometrics and the release/native configuration must be tested in a built Android app on a physical device.

## Build an Android APK

The `preview` EAS profile is configured for a directly installable Android APK. EAS Build requires an Expo/EAS account and successful authentication:

```bash
npx eas-cli login
npm run build:apk
```

An alternative workflow, `.github/workflows/build-wallet-apk.yml`, builds this Expo project through GitHub Actions without an Expo access token. Run it manually from the repository's **Actions** tab using **Build Wallet Android APK → Run workflow**. The APK is attached as the `wallet-android-apk` artifact for 14 days. This is a debug-key-signed release variant for testing and sideloading only, not a production signing key or store-ready release. See `docs/apk-github-actions.md` for the pinned action sources and limitations.

Never send an Expo password/access token, recovery phrase or private key in chat. The EAS project ID is configured; the EAS route still needs an authenticated account.

## Checks

```bash
npm run typecheck
npm run lint
npm run test:wallet
npm run test:transactions
npm run verify:networks
npx expo-doctor
npm audit --omit=dev
```

`npm run verify:networks` is a read-only check of the currently enabled RPCs, expected chain IDs, gas-fee availability, and configured token symbols/decimals. The transaction smoke test uses local mock providers and must never be described as a live send test. At last check, `npm audit --omit=dev` reported five moderate Expo transitive dependency advisories; the audit command recommended a breaking downgrade, so no forced dependency change was made.

## Network and build references

- [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses.md)
- [Tether supported protocols](https://tether.to/en/supported-protocols/)
- [Chainlist chain IDs](https://chainid.network/chains.json)
- [ethers v6 provider API](https://docs.ethers.org/v6/api/providers/)
- [Expo EAS build configuration](https://docs.expo.dev/build/eas-json/)
- [Expo internal APK distribution](https://docs.expo.dev/build/internal-distribution/)
- [Expo local authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
