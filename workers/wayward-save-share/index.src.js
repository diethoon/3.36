import * as opaque from "@serenity-kit/opaque";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SHARE_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_SAVE_BYTES = 20 * 1024 * 1024;

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "X-Share-Title, X-Cloud-Save-Title",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    ...extra,
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    }),
  });
}

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

function normalizeTitle(value) {
  const title = Array.from((value || "").trim()).slice(0, 80).join("");
  return title || "Wayward Save";
}

async function readBodyLimited(body, maxBytes) {
  const reader = body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try { await reader.cancel(); } catch { /* best effort */ }
        throw new Error("SAVE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* best effort */ }
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return payload;
}

function errorMessageForClient(code, message) {
  return jsonResponse({ ok: false, error: code, message }, 400);
}

async function health(env) {
  if (!env.DB || !env.SAVE_OBJECTS) {
    return jsonResponse({
      ok: false,
      error: "binding_missing",
      message: "DB 또는 SAVE_OBJECTS 바인딩이 없습니다.",
    }, 500);
  }

  // Verify the application table too; SELECT 1 alone does not prove
  // that the schema has been created in the bound production database.
  await env.DB.prepare("SELECT COUNT(*) AS count FROM save_shares").first();
  let accountSchemaReady = true;
  try {
    await env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_accounts").first();
    await env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_sessions").first();
    await env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_saves").first();
    await env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_auth_limits").first();
    await env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_opaque_credentials").first();
    await env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_opaque_flows").first();
  } catch { accountSchemaReady = false; }
  return jsonResponse({
    ok: true,
    service: "wayward-save-share",
    storage: "D1+R2",
    schema: "ready",
    accountSchema: accountSchemaReady ? "ready" : "migration_required",
    opaqueAuth: !accountSchemaReady ? "migration_required" :
      (env.OPAQUE_SERVER_SETUP ? "ready" : "setup_required"),
  });
}

async function createShare(request, env, ctx, url) {
  if (!env.DB || !env.SAVE_OBJECTS) {
    return jsonResponse({ ok: false, error: "binding_missing" }, 500);
  }
  if (!request.body) {
    return errorMessageForClient("empty_save", "공유할 세이브 데이터가 없습니다.");
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const declaredLength = Number(contentLengthHeader);
    if (!Number.isFinite(declaredLength) || declaredLength < 0) {
      return errorMessageForClient("invalid_length", "세이브 데이터 크기를 확인할 수 없습니다.");
    }
    if (declaredLength > MAX_SAVE_BYTES) {
      return jsonResponse({
        ok: false,
        error: "save_too_large",
        message: "세이브 파일은 20MB 이하여야 합니다.",
      }, 413);
    }
    if (declaredLength === 0) {
      return errorMessageForClient("empty_save", "공유할 세이브 데이터가 없습니다.");
    }
  }

  const title = normalizeTitle(url.searchParams.get("title"));
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SHARE_TTL_SECONDS;
  const objectKey = `shares/${crypto.randomUUID()}.json`;
  const contentType = request.headers.get("content-type") || "application/json; charset=utf-8";
  let phase = "read_body";

  try {
    // R2 requires a known-length stream. Buffer at most 20 MiB and pass a
    // Uint8Array to R2 so the upload length is known and bounded.
    const payload = await readBodyLimited(request.body, MAX_SAVE_BYTES);
    if (payload.byteLength === 0) {
      return errorMessageForClient("empty_save", "공유할 세이브 데이터가 없습니다.");
    }

    phase = "r2_put";
    await env.SAVE_OBJECTS.put(objectKey, payload, {
      httpMetadata: { contentType },
      customMetadata: {
        title,
        createdAt: String(now),
        expiresAt: String(expiresAt),
      },
    });

    phase = "d1_insert";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = makeCode();
      const inserted = await env.DB.prepare(
        `INSERT INTO save_shares (code, object_key, title, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(code) DO NOTHING
         RETURNING code`,
      ).bind(code, objectKey, title, now, expiresAt).first();

      if (inserted) {
        return jsonResponse({
          ok: true,
          code,
          title,
          createdAt: now,
          expiresAt,
          expiresInSeconds: SHARE_TTL_SECONDS,
        }, 201);
      }
    }

    ctx.waitUntil(env.SAVE_OBJECTS.delete(objectKey).catch(() => {}));
    return jsonResponse({
      ok: false,
      error: "code_generation_failed",
      message: "공유 코드를 만들지 못했습니다. 다시 시도해 주세요.",
    }, 503);
  } catch (error) {
    ctx.waitUntil(env.SAVE_OBJECTS.delete(objectKey).catch(() => {}));
    const reason = String(error?.message || error);
    if (reason.includes("SAVE_TOO_LARGE")) {
      return jsonResponse({
        ok: false,
        error: "save_too_large",
        message: "세이브 파일은 20MB 이하여야 합니다.",
      }, 413);
    }

    console.error("share creation failed", { phase, error: reason });
    return jsonResponse({
      ok: false,
      error: phase === "r2_put" ? "r2_store_failed" :
        phase === "d1_insert" ? "d1_register_failed" : "share_creation_failed",
      stage: phase,
      message: "공유 코드를 만드는 중 서버 오류가 발생했습니다. stage 값을 통해 원인을 확인할 수 있습니다.",
    }, 500);
  }
}

async function importShare(request, env, ctx) {
  if (!env.DB || !env.SAVE_OBJECTS) {
    return jsonResponse({ ok: false, error: "binding_missing" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorMessageForClient("invalid_json", "공유 코드 요청 형식이 올바르지 않습니다.");
  }

  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9]{6}$/.test(code)) {
    return errorMessageForClient("invalid_code_format", "공유 코드는 영문자와 숫자 6자리입니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  const record = await env.DB.prepare(
    "SELECT object_key, title, expires_at FROM save_shares WHERE code = ? LIMIT 1",
  ).bind(code).first();

  if (!record) {
    return jsonResponse({
      ok: false,
      error: "code_unavailable",
      message: "코드가 없거나 이미 사용되었거나 만료되었습니다.",
    }, 404);
  }

  if (Number(record.expires_at) <= now) {
    const expired = await env.DB.prepare(
      "DELETE FROM save_shares WHERE code = ? AND expires_at <= ? RETURNING object_key",
    ).bind(code, now).first();
    if (expired?.object_key) {
      ctx.waitUntil(env.SAVE_OBJECTS.delete(expired.object_key).catch(() => {}));
    }
    return jsonResponse({
      ok: false,
      error: "code_expired",
      message: "공유 코드가 만료되었습니다. 새 코드를 발급해 주세요.",
    }, 410);
  }

  const object = await env.SAVE_OBJECTS.get(record.object_key);
  if (!object) {
    await env.DB.prepare(
      "DELETE FROM save_shares WHERE code = ? AND object_key = ?",
    ).bind(code, record.object_key).run();
    return jsonResponse({
      ok: false,
      error: "save_missing",
      message: "공유 데이터가 없어 코드를 사용할 수 없습니다.",
    }, 410);
  }

  // Deleting the D1 row with a conditional RETURNING makes code consumption
  // atomic: only one concurrent request can successfully claim this code.
  const claimed = await env.DB.prepare(
    `DELETE FROM save_shares
     WHERE code = ? AND object_key = ? AND expires_at > ?
     RETURNING object_key, title`,
  ).bind(code, record.object_key, now).first();

  if (!claimed) {
    try { await object.body?.cancel(); } catch { /* best effort */ }
    return jsonResponse({
      ok: false,
      error: "code_unavailable",
      message: "코드가 이미 사용되었거나 만료되었습니다.",
    }, 410);
  }

  // R2 lifecycle rules are the backstop if asynchronous deletion fails.
  ctx.waitUntil(env.SAVE_OBJECTS.delete(claimed.object_key).catch(() => {}));

  return new Response(object.body, {
    status: 200,
    headers: corsHeaders({
      "Content-Type": object.httpMetadata?.contentType || "application/json; charset=utf-8",
      "X-Share-Title": encodeURIComponent(claimed.title || "Wayward Save"),
    }),
  });
}


const ACCOUNT_SAVE_SLOTS = 5;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const AUTH_WINDOW_SECONDS = 15 * 60;
const OPAQUE_SERVER_ID = "wayward-save-share.trpgengine.workers.dev";
const OPAQUE_FLOW_TTL_SECONDS = 120;
const textEncoder = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(size) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(String(value)));
  return bytesToHex(new Uint8Array(digest));
}

function accountUsername(value) {
  return typeof value === "string" ? value.trim() : "";
}

function accountUsernameValid(value) {
  return /^[A-Za-z0-9_]{3,24}$/.test(value);
}

async function authRateLimit(request, env, category, limit) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await sha256Hex(category + ":" + ip);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / AUTH_WINDOW_SECONDS) * AUTH_WINDOW_SECONDS;
  const row = await env.DB.prepare(
    "INSERT INTO cloud_auth_limits (key, window_start, count) VALUES (?, ?, 1) " +
    "ON CONFLICT(key) DO UPDATE SET " +
    "count = CASE WHEN cloud_auth_limits.window_start < excluded.window_start THEN 1 ELSE cloud_auth_limits.count + 1 END, " +
    "window_start = CASE WHEN cloud_auth_limits.window_start < excluded.window_start THEN excluded.window_start ELSE cloud_auth_limits.window_start END " +
    "RETURNING count",
  ).bind(key, windowStart).first();
  if (Number(row?.count || 0) > limit) {
    const retryAfter = Math.max(1, windowStart + AUTH_WINDOW_SECONDS - now);
    return jsonResponse({
      ok: false,
      error: "rate_limited",
      message: "시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      retryAfterSeconds: retryAfter,
    }, 429, { "Retry-After": String(retryAfter) });
  }
  return null;
}

async function createAccountSession(env, account) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;
  await env.DB.prepare(
    "INSERT INTO cloud_sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).bind(tokenHash, account.id, now, expiresAt).run();
  return jsonResponse({
    ok: true,
    token,
    username: account.username,
    expiresAt,
    expiresInSeconds: SESSION_TTL_SECONDS,
  });
}


function normalizeOpaqueUsername(value) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function validOpaqueMessage(value, max = 16384) {
  return typeof value === "string" && value.length > 0 && value.length <= max && !value.includes("__proto__");
}
function opaqueIdentifiers(usernameNorm) { return { client: usernameNorm, server: OPAQUE_SERVER_ID }; }
function opaqueUnavailable(env) {
  if (!env.DB) return jsonResponse({ ok: false, error: "binding_missing" }, 500);
  if (!env.OPAQUE_SERVER_SETUP) return jsonResponse({
    ok: false, error: "opaque_setup_required", message: "인증 서버 설정이 완료되지 않았습니다.",
  }, 503);
  return null;
}

async function opaqueRegisterStart(request, env) {
  const unavailable = opaqueUnavailable(env); if (unavailable) return unavailable;
  const limited = await authRateLimit(request, env, "opaque-register", 8); if (limited) return limited;
  let body; try { body = await request.json(); }
  catch { return errorMessageForClient("invalid_json", "가입 요청 형식이 올바르지 않습니다."); }
  const username = accountUsername(body?.username), usernameNorm = normalizeOpaqueUsername(username);
  if (!accountUsernameValid(username)) return errorMessageForClient("invalid_username", "아이디는 영문자·숫자·밑줄로 된 3~24자여야 합니다.");
  if (!validOpaqueMessage(body?.registrationRequest)) return errorMessageForClient("invalid_registration_request", "가입 인증 요청이 올바르지 않습니다.");
  const existing = await env.DB.prepare("SELECT id FROM cloud_accounts WHERE username_norm = ? LIMIT 1").bind(usernameNorm).first();
  if (existing) return jsonResponse({ ok:false, error:"username_unavailable", message:"이 아이디는 사용할 수 없습니다. 다른 아이디를 선택하거나 로그인해 주세요." }, 409);
  try {
    await opaque.ready;
    const { registrationResponse } = opaque.server.createRegistrationResponse({
      serverSetup: env.OPAQUE_SERVER_SETUP, userIdentifier: usernameNorm, registrationRequest: body.registrationRequest,
    });
    return jsonResponse({ ok:true, registrationResponse });
  } catch (error) {
    console.error("OPAQUE registration start failed", String(error?.message || error));
    return errorMessageForClient("invalid_registration_request", "가입 인증을 시작할 수 없습니다.");
  }
}

async function opaqueRegisterFinish(request, env) {
  const unavailable = opaqueUnavailable(env); if (unavailable) return unavailable;
  const limited = await authRateLimit(request, env, "opaque-register-finish", 8); if (limited) return limited;
  let body; try { body = await request.json(); }
  catch { return errorMessageForClient("invalid_json", "가입 완료 요청 형식이 올바르지 않습니다."); }
  const username = accountUsername(body?.username), usernameNorm = normalizeOpaqueUsername(username);
  if (!accountUsernameValid(username) || !validOpaqueMessage(body?.registrationRecord))
    return errorMessageForClient("invalid_registration_record", "가입 인증 기록이 올바르지 않습니다.");
  const id = crypto.randomUUID(), now = Math.floor(Date.now()/1000);
  try {
    // Legacy columns remain only for compatibility with an unreleased draft. These values are random
    // placeholders unrelated to the password; OPAQUE authentication never reads them.
    await env.DB.prepare(
      "INSERT INTO cloud_accounts (id, username, username_norm, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, username, usernameNorm, "opaque-unused:"+randomHex(16), "opaque-unused:"+randomHex(32), now).run();
    await env.DB.prepare(
      "INSERT INTO cloud_opaque_credentials (account_id, registration_record, created_at) VALUES (?, ?, ?)"
    ).bind(id, body.registrationRecord, now).run();
  } catch (error) {
    await env.DB.prepare("DELETE FROM cloud_opaque_credentials WHERE account_id = ?").bind(id).run().catch(()=>{});
    await env.DB.prepare("DELETE FROM cloud_accounts WHERE id = ?").bind(id).run().catch(()=>{});
    const reason = String(error?.message || error).toLowerCase();
    if (reason.includes("unique") || reason.includes("constraint"))
      return jsonResponse({ok:false,error:"username_unavailable",message:"이 아이디는 사용할 수 없습니다. 다른 아이디를 선택하거나 로그인해 주세요."},409);
    throw error;
  }
  return createAccountSession(env, { id, username });
}

async function opaqueLoginStart(request, env) {
  const unavailable = opaqueUnavailable(env); if (unavailable) return unavailable;
  const limited = await authRateLimit(request, env, "opaque-login", 15); if (limited) return limited;
  let body; try { body = await request.json(); }
  catch { return errorMessageForClient("invalid_json", "로그인 요청 형식이 올바르지 않습니다."); }
  const username = accountUsername(body?.username), usernameNorm = normalizeOpaqueUsername(username);
  if (!accountUsernameValid(username) || !validOpaqueMessage(body?.startLoginRequest))
    return jsonResponse({ok:false,error:"invalid_credentials",message:"아이디 또는 비밀번호가 올바르지 않습니다."},401);
  const account = await env.DB.prepare(
    "SELECT a.id, a.username, a.username_norm, c.registration_record FROM cloud_accounts a LEFT JOIN cloud_opaque_credentials c ON c.account_id = a.id WHERE a.username_norm = ? LIMIT 1"
  ).bind(usernameNorm).first();
  try {
    await opaque.ready;
    const { loginResponse, serverLoginState } = opaque.server.startLogin({
      userIdentifier: usernameNorm, registrationRecord: account?.registration_record || null,
      serverSetup: env.OPAQUE_SERVER_SETUP, startLoginRequest: body.startLoginRequest,
      identifiers: opaqueIdentifiers(usernameNorm),
    });
    const now = Math.floor(Date.now()/1000);
    await env.DB.prepare("DELETE FROM cloud_opaque_flows WHERE expires_at <= ?").bind(now).run();
    const flowId = randomHex(24);
    await env.DB.prepare(
      "INSERT INTO cloud_opaque_flows (flow_id, account_id, username_norm, server_login_state, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(flowId, account?.id || null, usernameNorm, serverLoginState, now, now+OPAQUE_FLOW_TTL_SECONDS).run();
    return jsonResponse({ok:true,flowId,loginResponse});
  } catch (error) {
    console.error("OPAQUE login start failed", String(error?.message || error));
    return jsonResponse({ok:false,error:"invalid_credentials",message:"아이디 또는 비밀번호가 올바르지 않습니다."},401);
  }
}

async function opaqueLoginFinish(request, env) {
  const unavailable = opaqueUnavailable(env); if (unavailable) return unavailable;
  const limited = await authRateLimit(request, env, "opaque-login-finish", 15); if (limited) return limited;
  let body; try { body = await request.json(); }
  catch { return errorMessageForClient("invalid_json", "로그인 완료 요청 형식이 올바르지 않습니다."); }
  const flowId = typeof body?.flowId === "string" ? body.flowId : "";
  if (!/^[a-f0-9]{48}$/.test(flowId) || !validOpaqueMessage(body?.finishLoginRequest))
    return jsonResponse({ok:false,error:"invalid_credentials",message:"아이디 또는 비밀번호가 올바르지 않습니다."},401);
  const now = Math.floor(Date.now()/1000);
  const flow = await env.DB.prepare(
    "DELETE FROM cloud_opaque_flows WHERE flow_id = ? AND expires_at > ? RETURNING account_id, username_norm, server_login_state"
  ).bind(flowId, now).first();
  if (!flow || !flow.account_id)
    return jsonResponse({ok:false,error:"invalid_credentials",message:"아이디 또는 비밀번호가 올바르지 않습니다."},401);
  try {
    await opaque.ready;
    opaque.server.finishLogin({
      finishLoginRequest: body.finishLoginRequest, serverLoginState: flow.server_login_state,
      identifiers: opaqueIdentifiers(flow.username_norm),
    });
  } catch (_) {
    return jsonResponse({ok:false,error:"invalid_credentials",message:"아이디 또는 비밀번호가 올바르지 않습니다."},401);
  }
  const accountRow = await env.DB.prepare("SELECT id, username FROM cloud_accounts WHERE id = ? LIMIT 1").bind(flow.account_id).first();
  if (!accountRow) return jsonResponse({ok:false,error:"invalid_credentials",message:"아이디 또는 비밀번호가 올바르지 않습니다."},401);
  return createAccountSession(env, accountRow);
}

async function authenticatedAccount(request, env) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer ([a-f0-9]{64})$/i);
  if (!match) {
    return { response: jsonResponse({ ok: false, error: "unauthorized", message: "로그인이 필요합니다." }, 401) };
  }
  const tokenHash = await sha256Hex(match[1]);
  const now = Math.floor(Date.now() / 1000);
  const account = await env.DB.prepare(
    "SELECT a.id, a.username, s.token_hash, s.expires_at " +
    "FROM cloud_sessions s JOIN cloud_accounts a ON a.id = s.account_id " +
    "WHERE s.token_hash = ? LIMIT 1",
  ).bind(tokenHash).first();
  if (!account || Number(account.expires_at) <= now) {
    if (account) {
      await env.DB.prepare("DELETE FROM cloud_sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
    return { response: jsonResponse({ ok: false, error: "session_expired", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." }, 401) };
  }
  return { account: { id: account.id, username: account.username }, tokenHash };
}

async function logoutAccount(request, env) {
  const auth = await authenticatedAccount(request, env);
  if (auth.response) return auth.response;
  await env.DB.prepare("DELETE FROM cloud_sessions WHERE token_hash = ?").bind(auth.tokenHash).run();
  return jsonResponse({ ok: true });
}

async function listAccountSaves(request, env) {
  const auth = await authenticatedAccount(request, env);
  if (auth.response) return auth.response;
  const rows = await env.DB.prepare(
    "SELECT slot, title, saved_at, byte_length FROM cloud_saves WHERE account_id = ? ORDER BY slot",
  ).bind(auth.account.id).all();
  return jsonResponse({
    ok: true,
    username: auth.account.username,
    maxSlots: ACCOUNT_SAVE_SLOTS,
    slots: (rows.results || []).map(row => ({
      slot: Number(row.slot),
      title: row.title || "Wayward Save",
      savedAt: Number(row.saved_at),
      byteLength: Number(row.byte_length || 0),
    })),
  });
}

async function accountSave(request, env, ctx, url, slot) {
  if (!env.DB || !env.SAVE_OBJECTS) {
    return jsonResponse({ ok: false, error: "binding_missing" }, 500);
  }
  const auth = await authenticatedAccount(request, env);
  if (auth.response) return auth.response;
  const accountId = auth.account.id;

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT object_key, title, saved_at FROM cloud_saves WHERE account_id = ? AND slot = ? LIMIT 1",
    ).bind(accountId, slot).first();
    if (!row) {
      return jsonResponse({ ok: false, error: "slot_empty", message: "이 저장 슬롯은 비어 있습니다." }, 404);
    }
    const object = await env.SAVE_OBJECTS.get(row.object_key);
    if (!object) {
      await env.DB.prepare("DELETE FROM cloud_saves WHERE account_id = ? AND slot = ?").bind(accountId, slot).run();
      return jsonResponse({ ok: false, error: "save_missing", message: "저장 파일을 찾을 수 없습니다." }, 410);
    }
    return new Response(object.body, {
      status: 200,
      headers: corsHeaders({
        "Content-Type": object.httpMetadata?.contentType || "application/json; charset=utf-8",
        "X-Cloud-Save-Title": encodeURIComponent(row.title || "Wayward Save"),
      }),
    });
  }

  if (request.method === "DELETE") {
    const row = await env.DB.prepare(
      "DELETE FROM cloud_saves WHERE account_id = ? AND slot = ? RETURNING object_key",
    ).bind(accountId, slot).first();
    if (row?.object_key) ctx.waitUntil(env.SAVE_OBJECTS.delete(row.object_key).catch(() => {}));
    return jsonResponse({ ok: true, slot, deleted: !!row });
  }

  if (request.method === "PUT") {
    if (!request.body) return errorMessageForClient("empty_save", "저장할 세이브 데이터가 없습니다.");
    let bytes;
    try { bytes = await readBodyLimited(request.body, MAX_SAVE_BYTES); }
    catch (error) {
      if (String(error?.message || error).includes("SAVE_TOO_LARGE")) {
        return jsonResponse({ ok: false, error: "save_too_large", message: "세이브 파일은 20MB 이하여야 합니다." }, 413);
      }
      return errorMessageForClient("invalid_body", "세이브 데이터를 읽을 수 없습니다.");
    }
    if (!bytes.byteLength) return errorMessageForClient("empty_save", "저장할 세이브 데이터가 없습니다.");
    let snapshot;
    try { snapshot = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return errorMessageForClient("invalid_json", "세이브 데이터 형식이 올바르지 않습니다."); }
    if (!snapshot || snapshot.schema !== "wayward-cloud-save-encrypted" || snapshot.version !== 1 ||
        snapshot.algorithm !== "AES-GCM-256" || typeof snapshot.iv !== "string" ||
        !/^[A-Za-z0-9_-]+$/.test(snapshot.iv) || snapshot.iv.length !== 16 ||
        typeof snapshot.ciphertext !== "string" || !/^[A-Za-z0-9_-]+$/.test(snapshot.ciphertext) ||
        snapshot.ciphertext.length < 24 || snapshot.ciphertext.length > 28 * 1024 * 1024) {
      return errorMessageForClient("invalid_save", "지원하지 않는 암호화 세이브 형식입니다.");
    }

    const now = Math.floor(Date.now() / 1000);
    const title = normalizeTitle(url.searchParams.get("title") || snapshot.title);
    const objectKey = "accounts/" + accountId + "/slots/" + slot + "/" + crypto.randomUUID() + ".json";
    const previous = await env.DB.prepare(
      "SELECT object_key FROM cloud_saves WHERE account_id = ? AND slot = ? LIMIT 1",
    ).bind(accountId, slot).first();
    try {
      await env.SAVE_OBJECTS.put(objectKey, bytes, {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
        customMetadata: { title, accountId, slot: String(slot), savedAt: String(now) },
      });
      await env.DB.prepare(
        "INSERT INTO cloud_saves (account_id, slot, object_key, title, saved_at, byte_length) " +
        "VALUES (?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(account_id, slot) DO UPDATE SET " +
        "object_key = excluded.object_key, title = excluded.title, saved_at = excluded.saved_at, byte_length = excluded.byte_length",
      ).bind(accountId, slot, objectKey, title, now, bytes.byteLength).run();
    } catch (error) {
      ctx.waitUntil(env.SAVE_OBJECTS.delete(objectKey).catch(() => {}));
      throw error;
    }
    if (previous?.object_key && previous.object_key !== objectKey) {
      ctx.waitUntil(env.SAVE_OBJECTS.delete(previous.object_key).catch(() => {}));
    }
    return jsonResponse({ ok: true, slot, title, savedAt: now, byteLength: bytes.byteLength });
  }
  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/api/health")) {
        return await health(env);
      }

      if (request.method === "POST" && url.pathname === "/api/opaque/register/start") return await opaqueRegisterStart(request, env);
      if (request.method === "POST" && url.pathname === "/api/opaque/register/finish") return await opaqueRegisterFinish(request, env);
      if (request.method === "POST" && url.pathname === "/api/opaque/login/start") return await opaqueLoginStart(request, env);
      if (request.method === "POST" && url.pathname === "/api/opaque/login/finish") return await opaqueLoginFinish(request, env);
      if (request.method === "POST" && (url.pathname === "/api/account/register" || url.pathname === "/api/account/login")) {
        return jsonResponse({ ok:false, error:"legacy_password_auth_disabled",
          message:"비밀번호 비공개 인증 방식으로 변경되었습니다. 최신 WML 모드를 사용해 주세요." },410);
      }
      if (request.method === "POST" && url.pathname === "/api/account/logout") {
        return await logoutAccount(request, env);
      }
      if (url.pathname === "/api/account/saves" && request.method === "GET") {
        return await listAccountSaves(request, env);
      }
      const accountSlotMatch = url.pathname.match(/^\/api\/account\/saves\/([1-5])$/);
      if (accountSlotMatch && ["GET", "PUT", "DELETE"].includes(request.method)) {
        return await accountSave(request, env, ctx, url, Number(accountSlotMatch[1]));
      }

      if (request.method === "POST" && url.pathname === "/api/share") {
        return await createShare(request, env, ctx, url);
      }

      if (request.method === "POST" && url.pathname === "/api/import") {
        return await importShare(request, env, ctx);
      }

      return jsonResponse({
        ok: false,
        error: "not_found",
        message: "지원하지 않는 경로입니다.",
        endpoints: ["GET /api/health", "POST /api/opaque/register/start", "POST /api/opaque/register/finish", "POST /api/opaque/login/start", "POST /api/opaque/login/finish", "POST /api/account/logout", "GET /api/account/saves", "GET|PUT|DELETE /api/account/saves/:slot", "POST /api/share", "POST /api/import"],
      }, 404);
    } catch (error) {
      console.error("request failed", url.pathname, String(error?.message || error));
      return jsonResponse({
        ok: false,
        error: "internal_error",
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      }, 500);
    }
  },
};
