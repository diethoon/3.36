import test from 'node:test';
import assert from 'node:assert/strict';

import '../Wayward_MOD_v4.0_WML_검수완료/wml/mods/cloud-save/crypto.js';

const driveCrypto = globalThis.WMLGoogleDriveCrypto;

const sampleSnapshot = {
  schema: 'wayward-cloud-save',
  version: 1,
  game: '2026-10-04',
  gameVersion: '2026-10-04',
  nativeFormat: 1,
  savedAt: 1760000000000,
  title: 'Day 12',
  state: { day: 12, mods: { sample: { flag: true } } },
  modData: { sample: { flag: true } }
};

test('AES-GCM round trip restores the full snapshot', async () => {
  assert.ok(driveCrypto, 'crypto module should expose WMLGoogleDriveCrypto');
  const envelope = await driveCrypto.encryptSnapshot(sampleSnapshot, 'test-only-passphrase-123');
  assert.equal(envelope.format, 'wayward-google-drive-save');
  assert.equal(envelope.cipher, 'AES-256-GCM');
  const restored = await driveCrypto.decryptSnapshot(envelope, 'test-only-passphrase-123');
  assert.deepEqual(restored, sampleSnapshot);
});

test('wrong passphrase is rejected', async () => {
  const envelope = await driveCrypto.encryptSnapshot(sampleSnapshot, 'test-only-passphrase-123');
  await assert.rejects(
    () => driveCrypto.decryptSnapshot(envelope, 'incorrect-passphrase'),
    /복호화에 실패/
  );
});

test('tampered ciphertext is rejected', async () => {
  const envelope = await driveCrypto.encryptSnapshot(sampleSnapshot, 'test-only-passphrase-123');
  const raw = atob(envelope.ciphertext);
  const index = Math.max(0, raw.length - 2);
  const changed = raw.slice(0, index) + String.fromCharCode(raw.charCodeAt(index) ^ 1) + raw.slice(index + 1);
  envelope.ciphertext = btoa(changed);
  await assert.rejects(
    () => driveCrypto.decryptSnapshot(envelope, 'test-only-passphrase-123'),
    /복호화에 실패/
  );
});

test('unknown envelope format is rejected before decrypting', async () => {
  await assert.rejects(
    () => driveCrypto.decryptSnapshot({ format: 'other', version: 1 }, 'test-only-passphrase-123'),
    /지원하지 않는 Google Drive 세이브 파일/
  );
});
