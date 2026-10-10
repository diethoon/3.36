const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SHARE_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_SAVE_BYTES = 20 * 1024 * 1024;

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Share-Title",
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

  await env.DB.prepare("SELECT 1 AS ok").first();
  return jsonResponse({
    ok: true,
    service: "wayward-save-share",
    storage: "D1+R2",
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
        endpoints: ["GET /api/health", "POST /api/share", "POST /api/import"],
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
