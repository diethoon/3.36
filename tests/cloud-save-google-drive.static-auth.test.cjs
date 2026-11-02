'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const mod = fs.readFileSync('Wayward_MOD_v4.0_WML_검수완료/wml/mods/cloud-save/mod.js', 'utf8');
const helper = fs.readFileSync('cloud-save-auth-static/index.html', 'utf8');
const config = fs.readFileSync('cloud-save-auth-static/config.js', 'utf8');

test('Drive mod targets the deployed static HTTPS bridge', () => {
  assert.match(mod, /const AUTH_BRIDGE_URL = 'https:\/\/diethoon\.github\.io\/3\.36\/cloud-save-auth-static\/'/);
  assert.doesNotMatch(mod, /wayward-cloud-auth\.vercel\.app|GOOGLE_CLIENT_SECRET|OAUTH_STATE_SECRET/);
});

test('game page and static bridge share origin, nonce, source, and message contracts', () => {
  assert.match(mod, /bridgeUrl\.searchParams\.set\('origin', targetOrigin\)/);
  assert.match(mod, /bridgeUrl\.searchParams\.set\('nonce', nonce\)/);
  assert.match(mod, /event\.origin !== bridgeOrigin \|\| event\.source !== bridge \|\| !event\.data \|\| event\.data\.nonce !== nonce/);
  assert.match(mod, /wayward-cloud-auth-success/);
  assert.match(mod, /wayward-cloud-auth-error/);
  assert.match(helper, /new URLSearchParams\(location\.search\)/);
  assert.match(helper, /type:'wayward-cloud-auth-success'/);
  assert.match(helper, /type:'wayward-cloud-auth-error'/);
  assert.match(helper, /nonce,/);
  assert.match(helper, /fileMode \? '\*' : targetOrigin/);
  assert.match(helper, /https:\/\/www\.googleapis\.com\/auth\/drive\.appdata/);
  assert.match(helper, /file:\/\//);
  assert.match(helper, /confirm/);
});

test('static helper inline JavaScript parses', () => {
  const scriptStart = helper.lastIndexOf('<script>');
  const scriptEnd = helper.indexOf('</script>', scriptStart);
  assert.ok(scriptStart >= 0 && scriptEnd > scriptStart, 'expected an inline script in the static OAuth helper');
  const inline = helper.slice(scriptStart + '<script>'.length, scriptEnd);
  assert.doesNotThrow(() => new vm.Script(inline, { filename: 'cloud-save-auth-static/index.html' }));
});

test('the static OAuth config contains only the public web client ID', () => {
  assert.match(config, /\.apps\.googleusercontent\.com/);
  assert.match(config, /WAYWARD_GOOGLE_CLIENT_ID/);
  assert.doesNotMatch(config, /CLIENT_SECRET|OAUTH_STATE_SECRET|client_secret/i);
});
