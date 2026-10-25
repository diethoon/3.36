'use strict';

const {
  getOAuthConfig,
  verifySignedState,
  renderPopupMessage,
  renderStaticError,
  setSecurityHeaders,
  DRIVE_SCOPE,
} = require('../_oauth');

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  const url = new URL(req.url, 'https://wayward-cloud-auth.vercel.app');
  const code = String(url.searchParams.get('code') || '');
  const state = String(url.searchParams.get('state') || '');
  const oauthError = String(url.searchParams.get('error') || '');

  let config;
  let statePayload;
  try {
    config = getOAuthConfig();
    statePayload = verifySignedState(state, config.stateSecret);
  } catch (error) {
    renderStaticError(res, error && error.message || '로그인 요청을 검증하지 못했습니다.', 400);
    return;
  }

  if (oauthError) {
    const message = oauthError === 'access_denied'
      ? 'Google 로그인이 취소되었습니다.'
      : 'Google에서 인증을 완료하지 못했습니다. 다시 시도해 주세요.';
    renderPopupMessage(res, {
      origin: statePayload.origin,
      nonce: statePayload.nonce,
      type: 'wayward-cloud-auth-error',
      message,
    });
    return;
  }
  if (!code || code.length > 4096) {
    renderPopupMessage(res, {
      origin: statePayload.origin,
      nonce: statePayload.nonce,
      type: 'wayward-cloud-auth-error',
      message: 'Google 인증 코드가 없습니다. 게임에서 다시 연결해 주세요.',
    });
    return;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token) {
      throw new Error('Google에서 액세스 토큰을 발급하지 못했습니다. OAuth 클라이언트의 리디렉션 URI 설정을 확인해 주세요.');
    }
    const scopes = String(result.scope || '').split(/\s+/);
    if (result.scope && !scopes.includes(DRIVE_SCOPE)) {
      throw new Error('Google Drive 앱 데이터 접근 권한이 승인되지 않았습니다. 다시 연결해 주세요.');
    }
    renderPopupMessage(res, {
      origin: statePayload.origin,
      nonce: statePayload.nonce,
      type: 'wayward-cloud-auth-success',
      accessToken: String(result.access_token),
      expiresIn: Number(result.expires_in) || 3600,
    });
  } catch (error) {
    renderPopupMessage(res, {
      origin: statePayload.origin,
      nonce: statePayload.nonce,
      type: 'wayward-cloud-auth-error',
      message: error && error.name === 'TimeoutError'
        ? 'Google 인증 서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.'
        : error && error.message || 'Google 인증을 완료하지 못했습니다.',
      statusCode: 502,
    });
  }
};
