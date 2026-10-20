import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const workerSource = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const tempDir = mkdtempSync(join(tmpdir(), "wayward-cloud-save-test-"));

try {
  const workerModulePath = join(tempDir, "index.mjs");
  writeFileSync(workerModulePath, workerSource, "utf8");
  const { default: worker } = await import(pathToFileURL(workerModulePath).href);

  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);

  const d1 = {
    prepare(sql) {
      let values = [];
      const query = {
        bind(...params) {
          values = params;
          return query;
        },
        async first() {
          return sqlite.prepare(sql).get(...values) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...values) };
        },
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
      const bytes = value instanceof Uint8Array
        ? value.slice()
        : new Uint8Array(value);
      objects.set(key, {
        bytes,
        httpMetadata: options.httpMetadata || {},
        customMetadata: options.customMetadata || {},
      });
    },
    async get(key) {
      const stored = objects.get(key);
      if (!stored) return null;
      const bytes = stored.bytes.slice();
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        httpMetadata: stored.httpMetadata,
        customMetadata: stored.customMetadata,
      };
    },
    async delete(key) {
      objects.delete(key);
    },
  };

  const env = { DB: d1, SAVE_OBJECTS: r2 };
  const pending = [];
  const ctx = {
    waitUntil(promise) {
      pending.push(Promise.resolve(promise));
    },
    async flush() {
      await Promise.allSettled(pending.splice(0));
    },
  };
  const base = "https://worker.test";
  async function call(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("CF-Connecting-IP", "203.0.113.19");
    if (options.token) headers.set("Authorization", "Bearer " + options.token);
    let body;
    if (options.body !== undefined) {
      body = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
    }
    const request = new Request(base + path, {
      method: options.method || "GET",
      headers,
      ...(body === undefined ? {} : { body }),
    });
    return worker.fetch(request, env, ctx);
  }

  // A legacy share record represents user data that must survive the account migration.
  const oldKey = "shares/legacy-preservation-test.json";
  sqlite.prepare(
    "INSERT INTO save_shares (code, object_key, title, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
  ).run("LgcY17", oldKey, "legacy save", 1, 4102444800);

  const health = await (await call("/api/health")).json();
  assert.equal(health.ok, true);
  assert.equal(health.accountSchema, "ready");

  const username = "cloud_test_2026";
  const password = "Sufficiently-Strong-Test-Password-26";
  const registration = await call("/api/account/register", {
    method: "POST",
    body: { username, password },
  });
  assert.equal(registration.status, 200, "registration creates an account and session");
  const registered = await registration.json();
  assert.match(registered.token, /^[a-f0-9]{64}$/);

  const login = await call("/api/account/login", {
    method: "POST",
    body: { username, password },
  });
  assert.equal(login.status, 200, "login authenticates the created account");
  const session = await login.json();
  assert.equal(session.username, username);

  const unauthorized = await call("/api/account/saves");
  assert.equal(unauthorized.status, 401, "account data requires authentication");

  const snapshots = [];
  for (let slot = 1; slot <= 5; slot += 1) {
    const snapshot = {
      schema: "wayward-cloud-save",
      version: 1,
      game: "2026-10-04",
      gameVersion: "2026-10-04",
      nativeFormat: 1,
      savedAt: Date.now(),
      title: "Day " + slot,
      state: { day: slot, economy: { gold: slot * 100 } },
      modData: {},
    };
    snapshots.push(snapshot);
    const saved = await call("/api/account/saves/" + slot + "?title=Day%20" + slot, {
      method: "PUT",
      token: session.token,
      body: snapshot,
    });
    assert.equal(saved.status, 200, "slot " + slot + " saves successfully");
  }

  const sixthSlot = await call("/api/account/saves/6", {
    method: "PUT",
    token: session.token,
    body: snapshots[0],
  });
  assert.equal(sixthSlot.status, 404, "the API rejects slot 6");

  const listing = await (await call("/api/account/saves", { token: session.token })).json();
  assert.equal(listing.maxSlots, 5);
  assert.equal(listing.slots.length, 5, "an account can list exactly five occupied slots");

  const loaded = await call("/api/account/saves/3", { token: session.token });
  assert.equal(loaded.status, 200);
  assert.deepEqual(await loaded.json(), snapshots[2], "saved slot round-trips without altering the JSON snapshot");

  const deleted = await call("/api/account/saves/3", {
    method: "DELETE",
    token: session.token,
  });
  assert.equal(deleted.status, 200);
  assert.equal((await call("/api/account/saves/3", { token: session.token })).status, 404);

  const share = await call("/api/share?title=one-time-test", {
    method: "POST",
    body: snapshots[0],
  });
  assert.equal(share.status, 201);
  const issued = await share.json();
  assert.match(issued.code, /^[A-Za-z0-9]{6}$/);
  assert.equal(issued.expiresInSeconds, 7 * 24 * 60 * 60);

  const imported = await call("/api/import", {
    method: "POST",
    body: { code: issued.code },
  });
  assert.equal(imported.status, 200);
  assert.deepEqual(await imported.json(), snapshots[0], "one-time code restores the original snapshot");
  await ctx.flush();

  const consumedAgain = await call("/api/import", {
    method: "POST",
    body: { code: issued.code },
  });
  assert.equal(consumedAgain.status, 404, "the same one-time code cannot be loaded twice");
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM save_shares WHERE code = ?").get("LgcY17").count,
    1,
    "the account migration and one-time flow preserve pre-existing share records",
  );

  sqlite.close();
  console.log("Worker integration checks passed: registration/login, authenticated five-slot CRUD, legacy-row preservation, and seven-day one-time-code consumption.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
