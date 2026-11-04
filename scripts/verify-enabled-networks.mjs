import { Contract, JsonRpcProvider } from 'ethers';
import { networks } from '../wallet-networks.ts';

const abi = ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'];
const normalizeSymbol = (symbol) => symbol.replace(/₮/g, 'T').toUpperCase();
for (const network of networks.filter((item) => item.transferEnabled)) {
  const provider = new JsonRpcProvider(network.rpc, { name: network.name, chainId: network.chainId }, { staticNetwork: true, batchMaxCount: 1 });
  try {
    const actualChainId = BigInt(await provider.send('eth_chainId', []));
    if (actualChainId !== BigInt(network.chainId)) throw new Error(`chain ID ${actualChainId} != ${network.chainId}`);
    const fees = await provider.getFeeData();
    if (fees.maxFeePerGas === null && fees.gasPrice === null) throw new Error('no usable fee data');
    for (const token of network.tokens) {
      const contract = new Contract(token.address, abi, provider);
      const [symbol, decimals] = await Promise.all([contract.symbol(), contract.decimals()]);
      if (normalizeSymbol(symbol) !== normalizeSymbol(token.symbol) || Number(decimals) !== 6) throw new Error(`token mismatch ${symbol}/${decimals} at ${token.address}`);
    }
    console.log(`OK\t${network.name}\tchain=${actualChainId}\tfee=${fees.maxFeePerGas !== null ? 'eip1559' : 'legacy'}\ttokens=${network.tokens.length}`);
  } catch (error) {
    console.error(`FAIL\t${network.name}\t${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    provider.destroy();
  }
}
