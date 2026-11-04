# Network and transfer support

This file records the initial EVM send scope. Network IDs are pinned in `wallet-networks.ts`; every provider is checked with `eth_chainId` before a quote is created. The app signs locally using the user's private key stored on that device and sends only the signed transaction bytes to the RPC endpoint. Provider URLs are public, unauthenticated endpoints and are not appropriate as an uptime guarantee for production.

## Send scope

Native transfers are supported on a network only when its configured JSON-RPC endpoint returns the pinned chain ID. Token transfers are restricted to the exact contracts listed in `wallet-networks.ts`. USDC addresses come from Circle's official address table; USDT addresses come from Tether's official supported-protocols page. The app omits unverified bridge representations and token variants. It reads each token's on-chain `symbol`, `decimals`, contract code, and sender balance before offering a quote.

Testnet network IDs probed successfully on 2026-11-04: Ethereum Sepolia (11155111), Arbitrum Sepolia (421614), Base Sepolia (84532), OP Sepolia (11155420), and Polygon Amoy (80002). Circle documents USDC test contracts on Sepolia, Arbitrum Sepolia, Base Sepolia, OP Sepolia, and Polygon Amoy. Testnet assets have no real financial value.

Blast (81457) and Palm (11297108109) public RPC endpoints did not return an `eth_chainId` response in the probe and have `rpcVerified: false`. The UI must disable send on these networks; do not turn this flag on until a configured provider returns the exact pinned chain ID and its endpoint is reviewed.

Several mainnet public RPC endpoints returned the expected IDs in the initial probe. That only proves endpoint identity at that moment; it does not prove availability, rate limits, privacy, or provider security. Before a public release, add an audited provider strategy and user-visible RPC/privacy disclosure.

## Transfer safety invariants

1. Validate and checksum both addresses and parse the amount exactly with token decimals; never convert transaction values through JavaScript floating-point numbers.
2. Verify the RPC chain ID equals the pinned network ID before querying, signing, or broadcasting.
3. Verify token contract bytecode, on-chain symbol, and decimals against the reviewed configuration. Reject unsupported or mismatched assets.
4. Check balances, simulate with `eth_call`, estimate gas, and show a review screen with exact network, asset, amount, recipient, and maximum estimated fee.
5. Revalidate the quote immediately before signing; require PIN plus device biometric for the signing action; locally sign with ethers; broadcast only the signed raw transaction.
6. Show the transaction hash and chain-specific explorer URL after broadcast, and do not claim final settlement before waiting for an on-chain receipt.
7. Never enable a catch-all token importer that labels arbitrary contracts as USDC or USDT. Adding custom-token support needs a separate explicit warning and exact-chain display.

## References

1. [Circle: USDC contract addresses (mainnet and testnet)](https://developers.circle.com/stablecoins/usdc-contract-addresses.md).
2. [Tether: Supported protocols and integration guidelines](https://tether.to/en/supported-protocols/).
3. [Chainlist: chain metadata and IDs](https://chainid.network/chains.json).
4. [ethers v6 providers API](https://docs.ethers.org/v6/api/providers/).
5. [Expo EAS Build setup](https://docs.expo.dev/build/setup/).
6. [Expo internal distribution for installable APKs](https://docs.expo.dev/build/internal-distribution/).
