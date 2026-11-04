import { getAddress } from 'ethers';

export type TokenConfig = { symbol: 'USDC' | 'USDT'; address: string };
export type EvmNetwork = {
  name: string;
  chainId: number;
  native: string;
  rpc: string;
  explorer: string;
  testnet: boolean;
  rpcVerified: boolean;
  transferEnabled: boolean;
  tokens: readonly TokenConfig[];
};

const token = (symbol: TokenConfig['symbol'], address: string): TokenConfig => ({ symbol, address: getAddress(address.toLowerCase()) });
const noTokens: readonly TokenConfig[] = [];

/**
 * EVM network endpoints are read/write JSON-RPC endpoints. Signing is always
 * local; only the signed transaction is sent to the selected endpoint.
 * Token contracts are deliberately limited to Circle-issued USDC and Tether
 * addresses documented by their issuers. Unverified/bridged variants are omitted.
 */
export const networks: readonly EvmNetwork[] = [
  { name: 'Ethereum Mainnet', chainId: 1, native: 'ETH', rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io', testnet: false, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), token('USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7')] },
  { name: 'Arbitrum One', chainId: 42161, native: 'ETH', rpc: 'https://arbitrum-one-rpc.publicnode.com', explorer: 'https://arbiscan.io', testnet: false, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831')] },
  { name: 'Avalanche C-Chain', chainId: 43114, native: 'AVAX', rpc: 'https://avalanche-c-chain-rpc.publicnode.com', explorer: 'https://snowtrace.io', testnet: false, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'), token('USDT', '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7')] },
  { name: 'Base', chainId: 8453, native: 'ETH', rpc: 'https://base-rpc.publicnode.com', explorer: 'https://basescan.org', testnet: false, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')] },
  { name: 'BNB Smart Chain', chainId: 56, native: 'BNB', rpc: 'https://bsc-rpc.publicnode.com', explorer: 'https://bscscan.com', testnet: false, rpcVerified: true, transferEnabled: true, tokens: noTokens },
  { name: 'Blast', chainId: 81457, native: 'ETH', rpc: 'https://blast-rpc.publicnode.com', explorer: 'https://blastscan.io', testnet: false, rpcVerified: false, transferEnabled: false, tokens: noTokens },
  { name: 'Celo', chainId: 42220, native: 'CELO', rpc: 'https://celo-rpc.publicnode.com', explorer: 'https://celoscan.io', testnet: false, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0xcebA9300f2b948710d2653dD7B07f33A8B32118C'), token('USDT', '0x48065fbbE25f71C9282ddf5e1cD6D6A887483D5e')] },
  { name: 'Linea', chainId: 59144, native: 'ETH', rpc: 'https://linea-rpc.publicnode.com', explorer: 'https://lineascan.build', testnet: false, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0x176211869cA2b568f2A7D4EE941E073a821EE1ff')] },
  { name: 'opBNB', chainId: 204, native: 'BNB', rpc: 'https://opbnb-rpc.publicnode.com', explorer: 'https://opbnbscan.com', testnet: false, rpcVerified: true, transferEnabled: false, tokens: noTokens },
  { name: 'Optimism', chainId: 10, native: 'ETH', rpc: 'https://optimism-rpc.publicnode.com', explorer: 'https://optimistic.etherscan.io', testnet: false, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85')] },
  { name: 'Palm', chainId: 11297108109, native: 'PALM', rpc: 'https://palm-mainnet.public.blastapi.io', explorer: 'https://palm.io/explorer', testnet: false, rpcVerified: false, transferEnabled: false, tokens: noTokens },
  { name: 'Polygon PoS', chainId: 137, native: 'POL', rpc: 'https://polygon-bor-rpc.publicnode.com', explorer: 'https://polygonscan.com', testnet: false, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359')] },
  { name: 'Scroll', chainId: 534352, native: 'ETH', rpc: 'https://scroll-rpc.publicnode.com', explorer: 'https://scrollscan.com', testnet: false, rpcVerified: true, transferEnabled: false, tokens: noTokens },
  { name: 'Sei', chainId: 1329, native: 'SEI', rpc: 'https://sei-evm-rpc.publicnode.com', explorer: 'https://seiscan.io', testnet: false, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392')] },
  { name: 'Ethereum Sepolia (Testnet)', chainId: 11155111, native: 'ETH', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.etherscan.io', testnet: true, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')] },
  { name: 'Arbitrum Sepolia (Testnet)', chainId: 421614, native: 'ETH', rpc: 'https://arbitrum-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.arbiscan.io', testnet: true, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d')] },
  { name: 'Base Sepolia (Testnet)', chainId: 84532, native: 'ETH', rpc: 'https://base-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.basescan.org', testnet: true, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0x036CbD53842c5426634e7929541eC2318f3dCF7e')] },
  { name: 'Optimism Sepolia (Testnet)', chainId: 11155420, native: 'ETH', rpc: 'https://optimism-sepolia-rpc.publicnode.com', explorer: 'https://sepolia-optimism.etherscan.io', testnet: true, rpcVerified: true, transferEnabled: false, tokens: [token('USDC', '0x5fd84259d66Cd46123540766Be93DFE6D43130D7')] },
  { name: 'Polygon Amoy (Testnet)', chainId: 80002, native: 'POL', rpc: 'https://polygon-amoy-bor-rpc.publicnode.com', explorer: 'https://amoy.polygonscan.com', testnet: true, rpcVerified: true, transferEnabled: true, tokens: [token('USDC', '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582')] },
];

export function getNetwork(name: string): EvmNetwork {
  const network = networks.find((item) => item.name === name);
  if (!network) throw new Error('Selected network is not supported.');
  return network;
}
