import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { HDNodeWallet, Mnemonic, Wallet } from 'ethers';

const entropy = randomBytes(32);
const phrase = Mnemonic.fromEntropy(entropy).phrase;
assert.equal(phrase.split(' ').length, 24, 'generated recovery phrase must have 24 words');
const original = HDNodeWallet.fromPhrase(phrase);
const restored = HDNodeWallet.fromPhrase(Mnemonic.fromPhrase(phrase).phrase);
assert.equal(restored.address, original.address, 'restored phrase must derive the same address');
const importedKey = new Wallet(original.privateKey);
assert.equal(importedKey.address, original.address, 'private-key import must derive the same address');
const withPassphrase = HDNodeWallet.fromPhrase(phrase, 'sample optional passphrase');
assert.notEqual(withPassphrase.address, original.address, 'BIP-39 passphrase must derive a distinct wallet');
console.log('Wallet crypto smoke tests passed (no seed or private key printed).');
