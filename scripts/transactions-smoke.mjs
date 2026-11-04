import assert from 'node:assert/strict';
import { getAddress, Interface, Wallet, keccak256, toUtf8Bytes } from 'ethers';
import { networks } from '../wallet-networks.ts';
import { createTransferQuote, normalizeRecipient, parseTransferAmount, readWalletBalances, signAndBroadcastTransfer } from '../wallet-transactions.ts';

const mockTokenInterface = new Interface([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)',
]);

class MockProvider {
  constructor(chainId, symbol = 'USDC') { this.chainId = chainId; this.symbol = symbol; this.transferReturnsFalse = false; }
  async send(method, params) { assert.equal(method, 'eth_chainId'); assert.deepEqual(params, []); return `0x${this.chainId.toString(16)}`; }
  async getFeeData() { return { gasPrice: null, maxFeePerGas: 2_000_000_000n, maxPriorityFeePerGas: 100_000_000n }; }
  async getBalance() { return 10n ** 20n; }
  async getCode() { return '0x60006000'; }
  async call(tx) {
    const data = tx.data ?? '0x';
    const selector = String(data).slice(0, 10);
    if (selector === mockTokenInterface.getFunction('symbol')?.selector) return mockTokenInterface.encodeFunctionResult('symbol', [this.symbol]);
    if (selector === mockTokenInterface.getFunction('decimals')?.selector) return mockTokenInterface.encodeFunctionResult('decimals', [6]);
    if (selector === mockTokenInterface.getFunction('balanceOf')?.selector) return mockTokenInterface.encodeFunctionResult('balanceOf', [1_000_000_000n]);
    if (selector === mockTokenInterface.getFunction('transfer')?.selector) return mockTokenInterface.encodeFunctionResult('transfer', [!this.transferReturnsFalse]);
    return '0x';
  }
  async estimateGas(tx) { return tx.data === '0x' ? 21_000n : 65_000n; }
  async getTransactionCount() { return 7; }
  async broadcastTransaction(raw) { this.broadcastCount = (this.broadcastCount ?? 0) + 1; return { hash: keccak256(raw || toUtf8Bytes('test')) }; }
}

const sepolia = networks.find((n) => n.chainId === 11155111);
assert.equal(new Set(networks.map((network) => network.chainId)).size, networks.length, 'network chain IDs must be unique');
for (const network of networks) {
  for (const asset of network.tokens) assert.equal(getAddress(asset.address), asset.address, `token address checksum for ${network.name} ${asset.symbol}`);
}
assert.equal(networks.find((network) => network.name === 'Blast')?.rpcVerified, false);
assert.equal(networks.find((network) => network.name === 'Palm')?.rpcVerified, false);
const sender = '0x0000000000000000000000000000000000000001';
const recipient = '0x0000000000000000000000000000000000000002';
assert.equal(parseTransferAmount('1.234567', 6), 1_234_567n);
assert.throws(() => parseTransferAmount('1e3', 6));
assert.throws(() => parseTransferAmount('1.0000001', 6));
assert.equal(normalizeRecipient(recipient), '0x0000000000000000000000000000000000000002');
assert.throws(() => normalizeRecipient('not-an-address'));

const nativeQuote = await createTransferQuote(sepolia, sender, recipient, 'ETH', '0.01', new MockProvider(11155111));
assert.equal(nativeQuote.amountRaw, '10000000000000000');
assert.equal(nativeQuote.gasLimit, '25200');
assert.equal(nativeQuote.chainId, 11155111);

const balances = await readWalletBalances(sepolia, sender, new MockProvider(11155111));
assert.equal(balances.ETH, '100.0');
assert.equal(balances.USDC, '1000.0');
await assert.rejects(() => readWalletBalances(sepolia, sender, new MockProvider(1)), /chain mismatch/i);

const usdcQuote = await createTransferQuote(sepolia, sender, recipient, 'USDC', '1.25', new MockProvider(11155111));
assert.equal(usdcQuote.amountRaw, '1250000');
assert.equal(usdcQuote.assetAddress, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
assert.equal(usdcQuote.feeMode, 'eip1559');
const falseTransferProvider = new MockProvider(11155111);
falseTransferProvider.transferReturnsFalse = true;
await assert.rejects(() => createTransferQuote(sepolia, sender, recipient, 'USDC', '1', falseTransferProvider), /simulated a failed transfer/i);

const signer = Wallet.createRandom();
const sendProvider = new MockProvider(11155111);
const broadcastResult = await signAndBroadcastTransfer(signer.privateKey, sepolia, await createTransferQuote(sepolia, signer.address, recipient, 'ETH', '0.01', sendProvider), sendProvider);
assert.equal('needsReview' in broadcastResult, false);
assert.equal(sendProvider.broadcastCount, 1);
assert.equal(broadcastResult.quote.sender, signer.address);
const increasedFeeProvider = new MockProvider(11155111);
const staleQuote = { ...nativeQuote, sender: signer.address, estimatedFeeRaw: '1' };
const feeReview = await signAndBroadcastTransfer(signer.privateKey, sepolia, staleQuote, increasedFeeProvider);
assert.equal('needsReview' in feeReview, true);
assert.equal(increasedFeeProvider.broadcastCount ?? 0, 0, 'increased fees must not broadcast');

await assert.rejects(() => createTransferQuote(sepolia, sender, recipient, 'USDC', '1', new MockProvider(1)), /chain mismatch/i);
await assert.rejects(() => createTransferQuote(sepolia, sender, recipient, 'USDT', '1', new MockProvider(11155111)), /not supported/i);
const avalanche = networks.find((n) => n.chainId === 43114);
const tetherQuote = await createTransferQuote(avalanche, sender, recipient, 'USDT', '1', new MockProvider(43114, 'USDt'));
assert.equal(tetherQuote.assetSymbol, 'USDT');
console.log('Transfer smoke tests passed (mock provider only; no real network broadcast).');
