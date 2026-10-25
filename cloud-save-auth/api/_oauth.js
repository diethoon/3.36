'use strict';

const crypto = require('node:crypto');

const DEFAULT_BRIDGE_ORIGIN = 'https://wayward-cloud-auth.vercel.app';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function classifyOrigin(value) {
  if (value === 'null') return 'file';
  let url;
  try { url = new URL(value); } catch (_) { return 'invalid'; }
  if (url.origin !== value || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'invalid';
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host === '[::1]' || host.endsWith('.localhost') || /^127(?:\.\d{1,3}){3}$/.test(host)) return 'local';
  const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip && ip.slice(1).every(part => Number(part) >= 0 && Number(part) <= 255)) {
    const a = Number(ip[1]);
    const b = Number(ip[2]);
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) return 'local';
  }
  if (['art.sintention.com', 'wayward.vercel.app', 'diethoon.github.io'].includes(host) && url.protocol === 'https:') return 'known';
  if (url.protocol === 'https:') return 'custom-https';
  if (url.protocol === 'http:' && (host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.localhost'))) return 'custom-local';
  return 'invalid';
}

function getOAuthConfig(env = process.env) {
  const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(env.GOOGLE_CLIENT_SECRET || '').trim();
  const stateSecret = String(env.OAUTH_STATE_SECRET || clientSecret).trim();
  const bridgeOrigin = String(env.AUTH_BRIDGE_ORIGIN || DEFAULT_BRIDGE_ORIGIN).replace(/\/+$/, '');
  let parsedBridge;
  try { parsedBridge = new URL(bridgeOrigin); } catch (_) { throw new Error('로그인 서비스 도메인 설정이 올바르지 않습니다.'); }
  if (parsedBridge.protocol !== 'https:' || parsedBridge.origin !== bridgeOrigin || parsedBridge.pathname !== '/' || parsedBridge.search || parsedBridge.hash) {
    throw new Error('로그인 서비스 도메인은 경로가 없는 HTTPS 출처여야 합니다.');
  }
  if (!/^[^@\s]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('GOOGLE_CLIENT_ID 설정이 없습니다.');
  if (clientSecret.length < 10) throw new Error('GOOGLE_CLIENT_SECRET 설정이 없습니다.');
  if (stateSecret.length < 32) throw new Error('OAUTH_STATE_SECRET 또는 32자 이상의 GOOGLE_CLIENT_SECRET 설정이 필요합니다.');
  return {
    clientId,
    clientSecret,
    stateSecret,
    bridgeOrigin,
    redirectUri: bridgeOrigin + '/api/oauth/callback',
  };
}

function createSignedState(origin, nonce, secret, now = Date.now()) {
  if (classifyOrigin(origin) === 'invalid') throw new Error('허용되지 않은 게임 출처입니다.');
  if (!/^[a-f0-9]{48}$/.test(String(nonce || ''))) throw new Error('로그인 요청 난수가 올바르지 않습니다.');
  if (String(secret || '').length < 32) throw new Error('OAuth state 서명 키가 너무 짧습니다.');
  const payload = {
    v: 1,
    origin,
    nonce,
    issuedAt: Number(now),
    jti: crypto.randomBytes(16).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return encoded + '.' + signature;
}

function verifySignedState(value, secret, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('OAuth state가 없거나 올바르지 않습니다.');
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('OAuth state 형식이 올바르지 않습니다.');
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest();
  let actual;
  try { actual = Buffer.from(parts[1], 'base64url'); } catch (_) { throw new Error('OAuth state 서명을 읽을 수 없습니다.'); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('OAuth state 서명이 일치하지 않습니다.');
  let payload;
  try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch (_) { throw new Error('OAuth state 내용을 읽을 수 없습니다.'); }
  if (!payload || payload.v !== 1 || !Number.isFinite(payload.issuedAt) || payload.issuedAt > now + 30000 || now - payload.issuedAt > STATE_MAX_AGE_MS) {
    throw new Error('로그인 요청이 만료되었습니다. 게임에서 다시 연결해 주세요.');
  }
  if (classifyOrigin(payload.origin) === 'invalid' || !/^[a-f0-9]{48}$/.test(String(payload.nonce || '')) || !/^[a-f0-9]{32}$/.test(String(payload.jti || ''))) {
    throw new Error('OAuth state의 출처 또는 난수가 올바르지 않습니다.');
  }
  return payload;
}

function buildAuthorizationUrl(config, state) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', DRIVE_SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}

function jsJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function renderPopupMessage(res, options) {
  const origin = options.origin;
  const nonce = options.nonce;
  const type = options.type;
  setSecurityHeaders(res);
  const scriptNonce = crypto.randomBytes(18).toString('base64');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'nonce-" + scriptNonce + "'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  res.statusCode = Number(options.statusCode) || 200;
  const fileMode = origin === 'null';
  const payload = type === 'wayward-cloud-auth-success'
    ? { type, nonce, accessToken: options.accessToken, expiresIn: Math.max(60, Number(options.expiresIn) || 3600) }
    : { type: 'wayward-cloud-auth-error', nonce, message: String(options.message || 'Google 인증에 실패했습니다.') };
  const targetOrigin = fileMode ? '*' : origin;
  const initialText = type === 'wayward-cloud-auth-success'
    ? '인증이 완료되었습니다. 게임 창으로 연결 중입니다…'
    : '인증에 실패했습니다. 게임 창으로 오류를 전달하고 있습니다…';
  const script = "(function(){'use strict';var payload=" + jsJson(payload) +
    ";var target=" + jsJson(targetOrigin) +
    ";var text=document.getElementById('status');try{if(window.opener&&!window.opener.closed){window.opener.postMessage(payload,target);text.textContent=" +
    jsJson(initialText) + ";window.close();return;}text.textContent='게임 창을 찾을 수 없습니다. 게임으로 돌아가 다시 연결해 주세요.';}catch(e){text.textContent='게임 창으로 결과를 전달하지 못했습니다. 이 창을 닫고 다시 시도해 주세요.';}})();";
  res.end('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Wayward Google 인증</title><style>body{font:16px system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:1.5rem;line-height:1.55}main{border:1px solid #8886;border-radius:14px;padding:1.25rem}p{overflow-wrap:anywhere}</style></head><body><main><h1>Wayward 클라우드세이브</h1><p id="status">' +
    initialText + '</p></main><script nonce="' + scriptNonce + '">' + script + '</script></body></html>');
}

function renderStaticError(res, message, statusCode = 400) {
  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  res.statusCode = statusCode;
  const safeMessage = String(message || '요청을 처리할 수 없습니다.').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  res.end('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wayward 인증 오류</title><style>body{font:16px system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:1.5rem;line-height:1.55}main{border:1px solid #8886;border-radius:14px;padding:1.25rem}</style></head><body><main><h1>Wayward 클라우드세이브</h1><p>' +
    safeMessage + '</p><p>이 창을 닫고 게임에서 다시 시도해 주세요.</p></main></body></html>');
}

module.exports = {
  DRIVE_SCOPE,
  DEFAULT_BRIDGE_ORIGIN,
  classifyOrigin,
  getOAuthConfig,
  createSignedState,
  verifySignedState,
  buildAuthorizationUrl,
  renderPopupMessage,
  renderStaticError,
  setSecurityHeaders,
};
