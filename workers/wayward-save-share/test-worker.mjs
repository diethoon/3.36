import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import * as opaque from "@serenity-kit/opaque";
import worker from "./index.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
await opaque.ready;
await import("../../Wayward_MOD_v4.0_WML_검수완료/wml/mods/cloud-save/crypto.js");

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
sqlite.exec(schema);
const d1 = {
  prepare(sql) {
    let values = [];
    const query = {
      bind(...params) { values = params; return query; },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() {
        const result = sqlite.prepare(sql).run(...values);
        return { meta: { changes: Number(result.changes || 0) } };
      },
    };
    return query;
  },
};
const objects = new Map();
const r2 = {
  async put(key, value, options = {}) {
    const bytes = value instanceof Uint8Array ? value.slice() : new Uint8Array(value);
    objects.set(key, { bytes, httpMetadata: options.httpMetadata || {}, customMetadata: options.customMetadata || {} });
  },
  async get(key) {
    const value = objects.get(key);
    if (!value) return null;
    const bytes = value.bytes.slice();
    return {
      body: new ReadableStream({
        start(controller) { controller.enqueue(bytes); controller.close(); },
      }),
      httpMetadata: value.httpMetadata,
      customMetadata: value.customMetadata,
    };
  },
  async delete(key) { objects.delete(key); },
};
const serverSetup = opaque.server.createSetup();
const serverPublicKey = opaque.server.getPublicKey(serverSetup);
const env = { DB: d1, SAVE_OBJECTS: r2, OPAQUE_SERVER_SETUP: serverSetup };
const pending = [];
const ctx = {
  waitUntil(promise) { pending.push(Promise.resolve(promise)); },
  async flush() { await Promise.allSettled(pending.splice(0)); },
};
const base = "https://worker.test";
async function call(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("CF-Connecting-IP", options.ip || "203.0.113.19");
  if (options.token) headers.set("Authorization", "Bearer " + options.token);
  let body;
  if (options.body !== undefined) {
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return worker.fetch(new Request(base + path, {
    method: options.method || "GET", headers, ...(body === undefined ? {} : { body }),
  }), env, ctx);
}

sqlite.prepare(
  "INSERT INTO save_shares (code, object_key, title, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
).run("LgcY17", "shares/legacy-preservation-test.json", "legacy save", 1, 4102444800);
const health = await (await call("/api/health")).json();
assert.equal(health.ok, true);
assert.equal(health.accountSchema, "ready");
assert.equal(health.opaqueAuth, "ready");

const username = "cloud_test_2026";
const usernameNorm = username.toLowerCase();
const password = "Sufficiently-Strong-Test-Password-26";
const serverId = "wayward-save-share.trpgengine.workers.dev";

async function opaqueRegister(user, pass) {
  const { clientRegistrationState, registrationRequest } = opaque.client.startRegistration({ password: pass });
  const startResponse = await call("/api/opaque/register/start", {
    method: "POST", body: { username: user, registrationRequest },
  });
  assert.equal(startResponse.status, 200, "OPAQUE registration starts");
  const started = await startResponse.json();
  const registration = opaque.client.finishRegistration({
    clientRegistrationState, registrationResponse: started.registrationResponse, password: pass,
    keyStretching: "memory-constrained",
    identifiers: { client: user.toLowerCase(), server: serverId },
  });
  assert.equal(registration.serverStaticPublicKey, serverPublicKey);
  const finishResponse = await call("/api/opaque/register/finish", {
    method: "POST", body: { username: user, registrationRecord: registration.registrationRecord },
  });
  assert.equal(finishResponse.status, 200, "registration finishes without password transmission");
  const session = await finishResponse.json();
  assert.match(session.token, /^[a-f0-9]{64}$/);
  return { ...session, exportKey: registration.exportKey };
}
async function opaqueLogin(user, pass) {
  const { clientLoginState, startLoginRequest } = opaque.client.startLogin({ password: pass });
  const startResponse = await call("/api/opaque/login/start", {
    method: "POST", body: { username: user, startLoginRequest },
  });
  assert.equal(startResponse.status, 200, "OPAQUE login challenge is issued");
  const started = await startResponse.json();
  const result = opaque.client.finishLogin({
    clientLoginState, loginResponse: started.loginResponse, password: pass,
    keyStretching: "memory-constrained",
    identifiers: { client: user.toLowerCase(), server: serverId },
  });
  if (!result) return null;
  assert.equal(result.serverStaticPublicKey, serverPublicKey);
  const finishResponse = await call("/api/opaque/login/finish", {
    method: "POST", body: { flowId: started.flowId, finishLoginRequest: result.finishLoginRequest },
  });
  if (!finishResponse.ok) return null;
  return { ...(await finishResponse.json()), exportKey: result.exportKey };
}

assert.equal((await call("/api/account/login", {
  method: "POST", body: { username, password },
})).status, 410, "legacy password-forwarding login is disabled");
assert.equal((await call("/api/account/register", {
  method: "POST", body: { username, password },
})).status, 410, "legacy password-forwarding registration is disabled");

const registered = await opaqueRegister(username, password);
const accountRow = sqlite.prepare(
  "SELECT password_salt, password_hash FROM cloud_accounts WHERE username_norm = ?",
).get(usernameNorm);
assert.ok(accountRow.password_salt.startsWith("opaque-unused:"));
assert.ok(accountRow.password_hash.startsWith("opaque-unused:"));
assert.notEqual(accountRow.password_hash, password);
const credential = sqlite.prepare(
  "SELECT registration_record FROM cloud_opaque_credentials WHERE account_id = (SELECT id FROM cloud_accounts WHERE username_norm = ?)",
).get(usernameNorm);
assert.ok(credential.registration_record);
assert.equal(credential.registration_record.includes(password), false);

const login = await opaqueLogin(username, password);
assert.ok(login, "correct password completes OPAQUE login");
assert.equal(login.username, username);
assert.equal(login.exportKey, registered.exportKey, "client exportKey is stable across registration/login");
assert.equal(await opaqueLogin(username, "Incorrect-password-for-test"), null, "wrong password fails");

// Login completion gets the same per-IP window as login start: 15 requests
// are allowed in one 15-minute window, and the 16th must receive HTTP 429.
const rateLimitTestIp = "198.51.100.88";
for (let attempt = 1; attempt <= 15; attempt += 1) {
  const response = await call("/api/opaque/login/finish", {
    method: "POST", ip: rateLimitTestIp,
    body: { flowId: "bad", finishLoginRequest: "bad" },
  });
  assert.equal(response.status, 401, `login finish request ${attempt} should be processed before the limit`);
}
const rateLimitedFinish = await call("/api/opaque/login/finish", {
  method: "POST", ip: rateLimitTestIp,
  body: { flowId: "bad", finishLoginRequest: "bad" },
});
assert.equal(rateLimitedFinish.status, 429, "16th login-finish request is rate-limited");
assert.ok(Number(rateLimitedFinish.headers.get("Retry-After")) > 0, "rate-limit response supplies Retry-After");

assert.equal((await call("/api/account/saves")).status, 401, "save API requires authentication");

const sourceSnapshot = {
  schema: "wayward-cloud-save", version: 1, game: "2026-10-04", gameVersion: "2026-10-04",
  nativeFormat: 1, savedAt: Date.now(), title: "Day 1",
  state: { day: 1, economy: { gold: 100 } }, modData: {},
};
const encrypted = await globalThis.WMLCloudSaveCrypto.encryptSnapshot(sourceSnapshot, login.exportKey, usernameNorm);
assert.equal(encrypted.schema, "wayward-cloud-save-encrypted");
assert.equal(JSON.stringify(encrypted).includes('"gold":100'), false, "envelope has no plaintext game state");
assert.deepEqual(
  await globalThis.WMLCloudSaveCrypto.decryptSnapshot(encrypted, registered.exportKey, usernameNorm),
  sourceSnapshot,
  "encryption and decryption round-trip",
);
const altered = (encrypted.ciphertext[0] === "A" ? "B" : "A") + encrypted.ciphertext.slice(1);
await assert.rejects(
  () => globalThis.WMLCloudSaveCrypto.decryptSnapshot({ ...encrypted, ciphertext: altered }, login.exportKey, usernameNorm),
  /복호화에 실패/,
  "AES-GCM rejects tampering",
);

const encryptedSlots = [];
for (let slot = 1; slot <= 5; slot += 1) {
  const payload = await globalThis.WMLCloudSaveCrypto.encryptSnapshot({
    ...sourceSnapshot, savedAt: Date.now(), title: "Day " + slot,
    state: { day: slot, economy: { gold: slot * 100 } },
  }, registered.exportKey, usernameNorm);
  encryptedSlots.push(payload);
  assert.equal((await call("/api/account/saves/" + slot + "?title=encrypted-save", {
    method: "PUT", token: registered.token, body: payload,
  })).status, 200);
}
assert.equal((await call("/api/account/saves/6", {
  method: "PUT", token: registered.token, body: encryptedSlots[0],
})).status, 404, "slot six is rejected");
const listing = await (await call("/api/account/saves", { token: login.token })).json();
assert.equal(listing.maxSlots, 5);
assert.equal(listing.slots.length, 5);
const loaded = await call("/api/account/saves/3", { token: login.token });
assert.equal(loaded.status, 200);
const storedEnvelope = await loaded.json();
assert.deepEqual(storedEnvelope, encryptedSlots[2], "Worker returns only encrypted envelope");
const decrypted = await globalThis.WMLCloudSaveCrypto.decryptSnapshot(storedEnvelope, login.exportKey, usernameNorm);
assert.equal(decrypted.state.economy.gold, 300);
assert.equal((await call("/api/account/saves/3", { method: "DELETE", token: login.token })).status, 200);
assert.equal((await call("/api/account/saves/3", { token: login.token })).status, 404);

const sharePayload = { ...sourceSnapshot, state: { day: 1, economy: { gold: 100 } } };
const share = await call("/api/share?title=one-time-test", { method: "POST", body: sharePayload });
assert.equal(share.status, 201);
const issued = await share.json();
assert.match(issued.code, /^[A-Za-z0-9]{6}$/);
assert.equal(issued.expiresInSeconds, 7 * 24 * 60 * 60);
assert.deepEqual(await (await call("/api/import", {
  method: "POST", body: { code: issued.code },
})).json(), sharePayload);
await ctx.flush();
assert.equal((await call("/api/import", { method: "POST", body: { code: issued.code } })).status, 404);
assert.equal(
  sqlite.prepare("SELECT COUNT(*) AS count FROM save_shares WHERE code = ?").get("LgcY17").count,
  1,
  "legacy share records are preserved",
);

sqlite.close();
console.log("PASS: OPAQUE registration/login, client-only exportKey, AES-GCM ciphertext/tamper detection, five-slot limit, and legacy one-time code behavior.");
