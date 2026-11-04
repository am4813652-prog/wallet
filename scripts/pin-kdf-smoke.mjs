import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

const fixtures = [
  { salt: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', pin: '123456' },
  { salt: '00112233445566778899aabbccddeeff', pin: '000007' },
];
for (const { salt, pin } of fixtures) {
  const password = `${salt}:${pin}`;
  const legacyCompatible = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  const noble = bytesToHex(pbkdf2(sha256, utf8ToBytes(password), utf8ToBytes(salt), { c: 120000, dkLen: 32 }));
  assert.equal(noble, legacyCompatible, 'PIN digest must remain compatible with stored values');
}
console.log('PIN KDF smoke tests passed (legacy-compatible PBKDF2-SHA256, no real PIN values).');
