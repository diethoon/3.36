'use strict';

const {
  classifyOrigin,
  getOAuthConfig,
  createSignedState,
  buildAuthorizationUrl,
  renderPopupMessage,
  renderStaticError,
  setSecurityHeaders,
} = require('../_oauth');

module.exports = (req, res) => {
  setSecurityHeaders(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  const url = new URL(req.url, 'https://wayward-cloud-auth.vercel.app');
  const origin = String(url.searchParams.get('origin') || '');
  const nonce = String(url.searchParams.get('nonce') || '');
  if (classifyOrigin(origin) === 'invalid' || !/^[a-f0-9]{48}$/.test(nonce)) {
    renderStaticError(res, '게임 출처 또는 연결 난수가 올바르지 않습니다. 게임에서 로그인 버튼을 다시 눌러 주세요.', 400);
    return;
  }
  try {
    const config = getOAuthConfig();
    const state = createSignedState(origin, nonce, config.stateSecret);
    res.statusCode = 302;
    res.setHeader('Location', buildAuthorizationUrl(config, state));
    res.end();
  } catch (error) {
    renderPopupMessage(res, {
      origin,
      nonce,
      type: 'wayward-cloud-auth-error',
      message: error && error.message || 'Google 로그인 서비스 설정이 완료되지 않았습니다.',
      statusCode: 503,
    });
  }
};
