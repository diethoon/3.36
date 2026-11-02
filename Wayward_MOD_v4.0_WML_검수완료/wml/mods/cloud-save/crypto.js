(function (root) {
  "use strict";
  const encoder = new TextEncoder();
  const KEY_SALT = encoder.encode("Wayward cloud save key v1");

  function encodeBase64Url(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeBase64Url(text) {
    if (typeof text !== "string" || !/^[A-Za-z0-9_-]+$/.test(text)) {
      throw new Error("암호화 데이터 형식이 올바르지 않습니다.");
    }
    const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, ch => ch.charCodeAt(0));
  }

  async function deriveKey(exportKey, username) {
    if (typeof exportKey !== "string" || !exportKey) {
      throw new Error("세이브 암호화 키가 없습니다. 다시 로그인해 주세요.");
    }
    const material = await crypto.subtle.importKey(
      "raw", decodeBase64Url(exportKey), "HKDF", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey({
      name: "HKDF",
      hash: "SHA-256",
      salt: KEY_SALT,
      info: encoder.encode("account:" + String(username).toLowerCase()),
    }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  function additionalData(username) {
    return encoder.encode("wayward-cloud-save:v1:" + String(username).toLowerCase());
  }

  async function encryptSnapshot(snapshot, exportKey, username) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(exportKey, username);
    const plaintext = encoder.encode(JSON.stringify(snapshot));
    const ciphertext = await crypto.subtle.encrypt({
      name: "AES-GCM",
      iv,
      additionalData: additionalData(username),
      tagLength: 128,
    }, key, plaintext);

    return {
      schema: "wayward-cloud-save-encrypted",
      version: 1,
      algorithm: "AES-GCM-256",
      iv: encodeBase64Url(iv),
      ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
    };
  }

  async function decryptSnapshot(envelope, exportKey, username) {
    if (!envelope || envelope.schema !== "wayward-cloud-save-encrypted" ||
        envelope.version !== 1 || envelope.algorithm !== "AES-GCM-256") {
      throw new Error("지원하지 않는 암호화 세이브입니다.");
    }
    const iv = decodeBase64Url(envelope.iv);
    const ciphertext = decodeBase64Url(envelope.ciphertext);
    if (iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > 20 * 1024 * 1024) {
      throw new Error("암호화 세이브 크기 또는 형식이 올바르지 않습니다.");
    }

    const key = await deriveKey(exportKey, username);
    let plaintext;
    try {
      plaintext = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv,
        additionalData: additionalData(username),
        tagLength: 128,
      }, key, ciphertext);
    } catch (_) {
      throw new Error("세이브 복호화에 실패했습니다. 비밀번호 또는 저장 데이터가 올바른지 확인해 주세요.");
    }
    let snapshot;
    try {
      snapshot = JSON.parse(new TextDecoder().decode(plaintext));
    } catch (_) {
      throw new Error("복호화한 세이브 데이터가 올바른 JSON이 아닙니다.");
    }
    if (!snapshot || snapshot.schema !== "wayward-cloud-save" ||
        snapshot.version !== 1 || !snapshot.state ||
        typeof snapshot.state !== "object" || Array.isArray(snapshot.state)) {
      throw new Error("복호화한 세이브 형식이 올바르지 않습니다.");
    }
    return snapshot;
  }

  root.WMLCloudSaveCrypto = Object.freeze({ encryptSnapshot, decryptSnapshot });
})(globalThis);
