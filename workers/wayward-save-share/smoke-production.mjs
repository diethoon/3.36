import assert from "node:assert/strict";
import { randomBytes, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as opaque from "@serenity-kit/opaque";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const endpoint = "https://wayward-save-share.trpgengine.workers.dev";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const apiRoot = "https://api.cloudflare.com/client/v4";

for (const [name, value] of Object.entries({
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_D1_DATABASE_ID: databaseId,
  CLOUDFLARE_API_TOKEN: apiToken,
})) {
  if (!value) throw new Error(`Missing required environment secret: ${name}`);
}

const modPath = resolve(repoRoot, "Wayward_MOD_v4.0_WML_검수완료/wml/mods/cloud-save/mod.js");
const cryptoPath = resolve(repoRoot, "Wayward_MOD_v4.0_WML_검수완료/wml/mods/cloud-save/crypto.js");
const modSource = await readFile(modPath, "utf8");
const pin = modSource.match(/const OPAQUE_SERVER_PUBLIC_KEY = '([^']*)';/)?.[1];
assert.ok(pin && !pin.startsWith("SET_AFTER_"), "OPAQUE public key pin is not configured");
await import(pathToFileURL(cryptoPath).href);
const saveCrypto = globalThis.WMLCloudSaveCrypto;
assert.ok(saveCrypto, "Cloud-save crypto module did not initialize");
await opaque.ready;

async function requestJson(path, body, token = "", method = "POST") {
  const response = await fetch(endpoint + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await response.json(); } catch { /* generic status below */ }
  if (!response.ok || data.ok !== true) {
    throw new Error(`${path} failed with HTTP ${response.status} (${data.error || "request_failed"})`);
  }
  return data;
}

async function runD1(sql, params) {
  const response = await fetch(
    `${apiRoot}/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );
  let data = {};
  try { data = await response.json(); } catch { /* generic status below */ }
  if (!response.ok || data.success !== true || (data.errors || []).length) {
    throw new Error("D1 cleanup query failed; verify the D1 Write permission on CLOUDFLARE_API_TOKEN");
  }
}

const username = "probe_" + randomBytes(8).toString("hex");
const password = randomBytes(24).toString("base64url") + "Aa1!";
const identifiers = { client: username.toLowerCase(), server: "wayward-save-share.trpgengine.workers.dev" };
let sessionToken = "";
let failure = null;

try {
  const registrationStart = opaque.client.startRegistration({
    password,
    keyStretching: "memory-constrained",
  });
  const started = await requestJson("/api/opaque/register/start", {
    username,
    registrationRequest: registrationStart.registrationRequest,
  });
  const registration = opaque.client.finishRegistration({
    clientRegistrationState: registrationStart.clientRegistrationState,
    registrationResponse: started.registrationResponse,
    password,
    keyStretching: "memory-constrained",
    identifiers,
  });
  assert.equal(registration.serverStaticPublicKey, pin, "server public key does not match the pinned client key");

  const registered = await requestJson("/api/opaque/register/finish", {
    username,
    registrationRecord: registration.registrationRecord,
  });
  sessionToken = registered.token;
  assert.ok(sessionToken, "registration did not produce a session");

  const loginStart = opaque.client.startLogin({ password, keyStretching: "memory-constrained" });
  const loginServer = await requestJson("/api/opaque/login/start", {
    username,
    startLoginRequest: loginStart.startLoginRequest,
  });
  const login = opaque.client.finishLogin({
    clientLoginState: loginStart.clientLoginState,
    loginResponse: loginServer.loginResponse,
    password,
    keyStretching: "memory-constrained",
    identifiers,
  });
  assert.ok(login, "client rejected the server login proof");
  assert.equal(login.serverStaticPublicKey, pin, "login server key does not match the pinned client key");

  const loggedIn = await requestJson("/api/opaque/login/finish", {
    flowId: loginServer.flowId,
    finishLoginRequest: login.finishLoginRequest,
  });
  sessionToken = loggedIn.token;
  assert.ok(sessionToken, "login did not produce a session");

  const snapshot = {
    schema: "wayward-cloud-save",
    version: 1,
    game: "cloud-save-production-smoke",
    gameVersion: "cloud-save-production-smoke",
    savedAt: Date.now(),
    state: { probe: true, random: randomBytes(6).toString("hex") },
    modData: { "cloud-save": { encryptedRoundTrip: true } },
  };
  const encrypted = await saveCrypto.encryptSnapshot(snapshot, login.exportKey, username.toLowerCase());
  await requestJson("/api/account/saves/1?title=Automated%20smoke%20test", encrypted, sessionToken, "PUT");

  const loadResponse = await fetch(endpoint + "/api/account/saves/1", {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  assert.equal(loadResponse.status, 200, "encrypted slot load failed");
  const envelope = await loadResponse.json();
  const restored = await saveCrypto.decryptSnapshot(envelope, login.exportKey, username.toLowerCase());
  assert.deepEqual(restored, snapshot, "saved snapshot did not round-trip unchanged");

} catch (error) {
  failure = error;
} finally {
  // The account is random and exists only for this probe. Remove its test slot,
  // invalidate its session(s), and delete the account/OPAQUE record from D1.
  if (sessionToken) {
    try {
      await fetch(endpoint + "/api/account/saves/1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      await fetch(endpoint + "/api/account/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    } catch { /* D1 cleanup below is the fallback */ }
  }
  try {
    await runD1("DELETE FROM cloud_opaque_flows WHERE username_norm = ?", [username]);
    await runD1("DELETE FROM cloud_accounts WHERE username_norm = ?", [username]);
  } catch (cleanupError) {
    failure ||= cleanupError;
  }
}

if (failure) {
  console.error("Production cloud-save smoke test failed:", failure.message);
  process.exitCode = 1;
} else {
  console.log("Production smoke test passed: OPAQUE signup/login and encrypted save/load round-trip; probe account cleaned.");
}
