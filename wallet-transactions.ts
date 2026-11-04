import {
  Interface,
  JsonRpcProvider,
  Transaction,
  Wallet,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type FeeData,
  type TransactionRequest,
} from 'ethers';
import type { EvmNetwork } from './wallet-networks';

export type TransferAsset = { symbol: string; address?: string; decimals: number };
export type ProviderLike = {
  send(method: 'eth_chainId', params: []): Promise<string>;
  getFeeData(): Promise<FeeData>;
  getBalance(address: string): Promise<bigint>;
  getCode(address: string): Promise<string>;
  call(tx: TransactionRequest): Promise<string>;
  estimateGas(tx: TransactionRequest): Promise<bigint>;
  getTransactionCount(address: string, blockTag: 'pending'): Promise<number>;
  broadcastTransaction(raw: string): Promise<{ hash: string }>;
};
export type TransferQuote = {
  chainId: number;
  networkName: string;
  nativeSymbol: string;
  sender: string;
  recipient: string;
  assetSymbol: string;
  assetAddress: string | null;
  assetDecimals: number;
  amount: string;
  amountRaw: string;
  data: string;
  gasLimit: string;
  feeMode: 'eip1559' | 'legacy';
  gasPrice: string | null;
  maxFeePerGas: string | null;
  maxPriorityFeePerGas: string | null;
  estimatedFeeRaw: string;
  estimatedFee: string;
  nativeBalance: string;
  assetBalance: string;
  createdAt: number;
};

const erc20 = new Interface([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)',
]);

function fail(message: string): never { throw new Error(message); }
function normalizedTokenSymbol(value: string) { return value.replace(/₮/g, 'T').toUpperCase(); }

export function getTransferAsset(network: EvmNetwork, symbol: string): TransferAsset {
  if (symbol === network.native) return { symbol, decimals: 18 };
  const configured = network.tokens.find((item) => item.symbol === symbol);
  if (!configured) return fail(`${symbol} is not supported on ${network.name}.`);
  return { symbol: configured.symbol, address: getAddress(configured.address), decimals: 6 };
}

export function parseTransferAmount(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^(?:\d+)(?:\.\d+)?$/.test(normalized)) return fail('Enter a valid positive amount without commas or exponent notation.');
  try {
    const amount = parseUnits(normalized, decimals);
    if (amount <= 0n) return fail('Amount must be greater than zero.');
    return amount;
  } catch {
    return fail(`Amount has more than ${decimals} decimal places or is invalid.`);
  }
}

export function normalizeRecipient(value: string): string {
  const candidate = value.trim();
  if (!isAddress(candidate)) return fail('Recipient must be a valid EVM address.');
  try { return getAddress(candidate); } catch { return fail('Recipient checksum is invalid.'); }
}

export async function createTransferQuote(
  network: EvmNetwork,
  senderInput: string,
  recipientInput: string,
  assetSymbol: string,
  amountInput: string,
  injectedProvider?: ProviderLike,
): Promise<TransferQuote> {
  if (!network.rpcVerified) return fail(`Sending is disabled on ${network.name} until its RPC endpoint is verified.`);
  if (!network.transferEnabled) return fail(`Sending is not enabled on ${network.name} until its fee model is specifically reviewed.`);
  const sender = normalizeRecipient(senderInput);
  const recipient = normalizeRecipient(recipientInput);
  const asset = getTransferAsset(network, assetSymbol);
  const amount = parseTransferAmount(amountInput, asset.decimals);
  const rpc: ProviderLike = injectedProvider ?? new JsonRpcProvider(network.rpc, { name: network.name, chainId: network.chainId });

  const actualChainId = BigInt(await rpc.send('eth_chainId', []));
  if (actualChainId !== BigInt(network.chainId)) return fail(`RPC chain mismatch: expected ${network.chainId}, received ${actualChainId}.`);
  const feeData = await rpc.getFeeData();
  const feeMode = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null ? 'eip1559' : 'legacy';
  const feeCap = feeMode === 'eip1559' ? feeData.maxFeePerGas : feeData.gasPrice;
  if (feeCap === null) return fail('The network did not return usable gas-fee data. Try again later.');

  let data = '0x';
  let target = recipient;
  let value = amount;
  let assetBalance = 0n;
  if (asset.address) {
    target = asset.address;
    value = 0n;
    const code = await rpc.getCode(asset.address);
    if (!code || code === '0x') return fail('Configured token address has no contract code on this network.');
    const symbolData = await rpc.call({ to: asset.address, data: erc20.encodeFunctionData('symbol') });
    const tokenSymbol = String(erc20.decodeFunctionResult('symbol', symbolData)[0]);
    const decimalsData = await rpc.call({ to: asset.address, data: erc20.encodeFunctionData('decimals') });
    const tokenDecimals = Number(erc20.decodeFunctionResult('decimals', decimalsData)[0]);
    if (normalizedTokenSymbol(tokenSymbol) !== normalizedTokenSymbol(asset.symbol) || tokenDecimals !== asset.decimals) return fail('Token symbol or decimals did not match the verified asset configuration.');
    const balanceData = await rpc.call({ to: asset.address, data: erc20.encodeFunctionData('balanceOf', [sender]) });
    assetBalance = BigInt(erc20.decodeFunctionResult('balanceOf', balanceData)[0]);
    if (assetBalance < amount) return fail(`Insufficient ${asset.symbol} balance.`);
    data = erc20.encodeFunctionData('transfer', [recipient, amount]);
  }

  const request: TransactionRequest = { to: target, from: sender, value, data, chainId: network.chainId };
  // A successful eth_call is required before a transaction is offered for signing.
  const simulation = await rpc.call(request);
  if (asset.address && simulation !== '0x') {
    const [transferSucceeded] = erc20.decodeFunctionResult('transfer', simulation);
    if (transferSucceeded === false) return fail('The token contract simulated a failed transfer; no transaction was signed.');
  }
  const estimatedGas = await rpc.estimateGas(request);
  const gasLimit = (estimatedGas * 120n + 99n) / 100n;
  const estimatedFeeRaw = gasLimit * feeCap;
  const nativeBalance = await rpc.getBalance(sender);
  if (!asset.address) assetBalance = nativeBalance;
  const requiredNative = asset.address ? estimatedFeeRaw : amount + estimatedFeeRaw;
  if (nativeBalance < requiredNative) return fail(`Insufficient ${network.native} for the amount and maximum estimated network fee.`);

  return {
    chainId: network.chainId,
    networkName: network.name,
    nativeSymbol: network.native,
    sender,
    recipient,
    assetSymbol: asset.symbol,
    assetAddress: asset.address ?? null,
    assetDecimals: asset.decimals,
    amount: amountInput.trim(),
    amountRaw: amount.toString(),
    data,
    gasLimit: gasLimit.toString(),
    feeMode,
    gasPrice: feeMode === 'legacy' ? feeData.gasPrice?.toString() ?? null : null,
    maxFeePerGas: feeMode === 'eip1559' ? feeData.maxFeePerGas?.toString() ?? null : null,
    maxPriorityFeePerGas: feeMode === 'eip1559' ? feeData.maxPriorityFeePerGas?.toString() ?? null : null,
    estimatedFeeRaw: estimatedFeeRaw.toString(),
    estimatedFee: formatUnits(estimatedFeeRaw, 18),
    nativeBalance: formatUnits(nativeBalance, 18),
    assetBalance: formatUnits(assetBalance, asset.decimals),
    createdAt: Date.now(),
  };
}

export async function readWalletBalances(network: EvmNetwork, ownerInput: string, injectedProvider?: ProviderLike) {
  if (!network.rpcVerified) return fail(`Balance reads are disabled on ${network.name} until its RPC endpoint is verified.`);
  const owner = normalizeRecipient(ownerInput);
  const rpc: ProviderLike = injectedProvider ?? new JsonRpcProvider(network.rpc, { name: network.name, chainId: network.chainId });
  const actualChainId = BigInt(await rpc.send('eth_chainId', []));
  if (actualChainId !== BigInt(network.chainId)) return fail(`RPC chain mismatch; expected ${network.chainId}, received ${actualChainId}; balance values were not loaded.`);
  const native = await rpc.getBalance(owner);
  const balances: Record<string, string> = { [network.native]: formatUnits(native, 18) };
  for (const token of network.tokens) {
    const address = getAddress(token.address);
    const code = await rpc.getCode(address);
    if (!code || code === '0x') return fail(`Verified token contract has no code on ${network.name}.`);
    const symbolData = await rpc.call({ to: address, data: erc20.encodeFunctionData('symbol') });
    const symbol = String(erc20.decodeFunctionResult('symbol', symbolData)[0]);
    const decimalsData = await rpc.call({ to: address, data: erc20.encodeFunctionData('decimals') });
    const decimals = Number(erc20.decodeFunctionResult('decimals', decimalsData)[0]);
    if (normalizedTokenSymbol(symbol) !== normalizedTokenSymbol(token.symbol) || decimals !== 6) return fail(`Token metadata does not match the verified ${token.symbol} configuration on ${network.name}.`);
    const balanceData = await rpc.call({ to: address, data: erc20.encodeFunctionData('balanceOf', [owner]) });
    balances[token.symbol] = formatUnits(BigInt(erc20.decodeFunctionResult('balanceOf', balanceData)[0]), decimals);
  }
  return balances;
}

export type BroadcastResult = { hash: string; signedAt: number; quote: TransferQuote };

/** Revalidates the exact quote, signs locally, recovers and checks the signer, then broadcasts signed bytes only. */
export async function signAndBroadcastTransfer(privateKey: string, network: EvmNetwork, approvedQuote: TransferQuote, injectedProvider?: ProviderLike): Promise<BroadcastResult | { needsReview: true; quote: TransferQuote }> {
  if (!network.rpcVerified || !network.transferEnabled) return fail(`Sending is disabled on ${network.name}.`);
  const signer = new Wallet(privateKey);
  if (signer.address.toLowerCase() !== approvedQuote.sender.toLowerCase()) return fail('Wallet key does not match the approved sender address.');
  const rpc: ProviderLike = injectedProvider ?? new JsonRpcProvider(network.rpc, { name: network.name, chainId: network.chainId });
  const freshQuote = await createTransferQuote(network, signer.address, approvedQuote.recipient, approvedQuote.assetSymbol, approvedQuote.amount, rpc);
  if (freshQuote.chainId !== approvedQuote.chainId || freshQuote.assetAddress?.toLowerCase() !== approvedQuote.assetAddress?.toLowerCase() || freshQuote.amountRaw !== approvedQuote.amountRaw || freshQuote.recipient.toLowerCase() !== approvedQuote.recipient.toLowerCase()) return fail('Transfer details changed after confirmation. Review the transaction again.');
  if (BigInt(freshQuote.estimatedFeeRaw) > BigInt(approvedQuote.estimatedFeeRaw)) return { needsReview: true, quote: freshQuote };
  const actualChainId = BigInt(await rpc.send('eth_chainId', []));
  if (actualChainId !== BigInt(approvedQuote.chainId)) return fail(`RPC chain changed before signing (received ${actualChainId}); no transaction was sent.`);
  const tx: TransactionRequest = {
    to: freshQuote.assetAddress ?? freshQuote.recipient,
    from: signer.address,
    nonce: await rpc.getTransactionCount(signer.address, 'pending'),
    chainId: freshQuote.chainId,
    gasLimit: BigInt(freshQuote.gasLimit),
    value: freshQuote.assetAddress ? 0n : BigInt(freshQuote.amountRaw),
    data: freshQuote.data,
    ...quoteFeeOverrides(freshQuote),
  };
  const raw = await signer.signTransaction(tx);
  const parsed = Transaction.from(raw);
  if (parsed.from?.toLowerCase() !== signer.address.toLowerCase() || parsed.chainId !== BigInt(network.chainId) || parsed.to?.toLowerCase() !== String(tx.to).toLowerCase() || parsed.data !== freshQuote.data || parsed.value !== tx.value) return fail('Signed transaction integrity check failed; nothing was broadcast.');
  const response = await rpc.broadcastTransaction(raw);
  return { hash: response.hash, signedAt: Date.now(), quote: freshQuote };
}

export function quoteFeeOverrides(quote: TransferQuote) {
  if (quote.feeMode === 'legacy') {
    if (!quote.gasPrice) return fail('Missing legacy gas price in the transfer quote.');
    return { gasPrice: BigInt(quote.gasPrice) };
  }
  if (!quote.maxFeePerGas || !quote.maxPriorityFeePerGas) return fail('Missing EIP-1559 fee data in the transfer quote.');
  return { maxFeePerGas: BigInt(quote.maxFeePerGas), maxPriorityFeePerGas: BigInt(quote.maxPriorityFeePerGas) };
}
