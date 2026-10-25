'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyOrigin,
  createSignedState,
  verifySignedState,
  buildAuthorizationUrl,
  DRIVE_SCOPE,
} = require('../cloud-save-auth/api/_oauth');

const secret = 'test-only-state-secret-that-is-long-enough-0123456789';
const nonce = '0123456789abcdef0123456789abcdef0123456789abcdef';

test('classifies supported and rejected game origins', () => {
  assert.equal(classifyOrigin('null'), 'file');
  assert.equal(classifyOrigin('http://localhost:8080'), 'local');
  assert.equal(classifyOrigin('http://192.168.1.20:8081'), 'local');
  assert.equal(classifyOrigin('https://wayward.vercel.app'), 'known');
  assert.equal(classifyOrigin('https://custom-game.example'), 'custom-https');
  assert.equal(classifyOrigin('http://custom-game.example'), 'invalid');
  assert.equal(classifyOrigin('https://custom-game.example/path'), 'invalid');
  assert.equal(classifyOrigin('https://user:pw@custom-game.example'), 'invalid');
});

test('signs state, preserves the game origin and nonce, and rejects tampering', () => {
  const state = createSignedState('null', nonce, secret, 1800000000000);
  const parsed = verifySignedState(state, secret, 1800000000001);
  assert.equal(parsed.origin, 'null');
  assert.equal(parsed.nonce, nonce);
  assert.equal(parsed.v, 1);
  assert.throws(() => verifySignedState(state + 'x', secret, 1800000000001), /서명/);
});

test('rejects stale, malformed and unsigned state', () => {
  const now = 1800000000000;
  const stale = createSignedState('https://wayward.vercel.app', nonce, secret, now - 11 * 60 * 1000);
  assert.throws(() => verifySignedState(stale, secret, now), /만료/);
  assert.throws(() => createSignedState('http://public.example', nonce, secret, now), /출처/);
  assert.throws(() => verifySignedState('bad.state', secret, now), /서명|형식/);
});

test('builds a redirect-based OAuth code request with only the Drive app-data scope', () => {
  const config = {
    clientId: 'test.apps.googleusercontent.com',
    redirectUri: 'https://wayward-cloud-auth.vercel.app/api/oauth/callback',
  };
  const url = new URL(buildAuthorizationUrl(config, 'signed-state'));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.pathname, '/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('redirect_uri'), config.redirectUri);
  assert.equal(url.searchParams.get('scope'), DRIVE_SCOPE);
  assert.equal(url.searchParams.get('state'), 'signed-state');
});

function mockResponse() {
  return {
    headers: {}, statusCode: 200, body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = '') { this.body += value; },
  };
}

function setTestEnvironment() {
  const names = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_STATE_SECRET', 'AUTH_BRIDGE_ORIGIN'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret-that-is-long-enough';
  process.env.OAUTH_STATE_SECRET = secret;
  process.env.AUTH_BRIDGE_ORIGIN = 'https://wayward-cloud-auth.vercel.app';
  return () => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  };
}

test('OAuth start endpoint redirects the existing popup and signs the return origin', async () => {
  const restore = setTestEnvironment();
  try {
    const start = require('../cloud-save-auth/api/oauth/start');
    const res = mockResponse();
    await start({
      method: 'GET',
      url: '/api/oauth/start?origin=' + encodeURIComponent('null') + '&nonce=' + nonce,
    }, res);
    assert.equal(res.statusCode, 302);
    const destination = new URL(res.headers.location);
    assert.equal(destination.origin, 'https://accounts.google.com');
    assert.equal(destination.searchParams.get('response_type'), 'code');
    const payload = verifySignedState(destination.searchParams.get('state'), secret);
    assert.equal(payload.origin, 'null');
    assert.equal(payload.nonce, nonce);
    assert.equal(destination.searchParams.get('redirect_uri'), 'https://wayward-cloud-auth.vercel.app/api/oauth/callback');
  } finally { restore(); }
});

test('OAuth callback exchanges code server-side and returns token only to opener script', async () => {
  const restore = setTestEnvironment();
  const oldFetch = global.fetch;
  try {
    const callback = require('../cloud-save-auth/api/oauth/callback');
    const state = createSignedState('https://wayward.vercel.app', nonce, secret);
    let requestBody;
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://oauth2.googleapis.com/token');
      requestBody = new URLSearchParams(options.body);
      return {
        ok: true, status: 200,
        async json() { return { access_token: 'test-access-token', expires_in: 3600, scope: DRIVE_SCOPE }; },
      };
    };
    const res = mockResponse();
    await callback({
      method: 'GET',
      url: '/api/oauth/callback?code=one-time-code&state=' + encodeURIComponent(state),
    }, res);
    assert.equal(requestBody.get('code'), 'one-time-code');
    assert.equal(requestBody.get('client_secret'), process.env.GOOGLE_CLIENT_SECRET);
    assert.equal(requestBody.get('redirect_uri'), 'https://wayward-cloud-auth.vercel.app/api/oauth/callback');
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /test-access-token/);
    assert.match(res.body, /window\.opener\.postMessage/);
    assert.match(res.body, /https:\/\/wayward\.vercel\.app/);
    assert.doesNotMatch(res.body, /<script src=/i);
  } finally {
    global.fetch = oldFetch;
    restore();
  }
});
