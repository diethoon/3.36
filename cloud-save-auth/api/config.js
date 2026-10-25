'use strict';

const { getOAuthConfig, setSecurityHeaders } = require('./_oauth');

module.exports = (req, res) => {
  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ ready: false, error: 'Method Not Allowed' }));
    return;
  }
  try {
    getOAuthConfig();
    res.statusCode = 200;
    res.end(JSON.stringify({ ready: true, clientId: getOAuthConfig().clientId }));
  } catch (_) {
    res.statusCode = 503;
    res.end(JSON.stringify({ ready: false, error: 'Google 로그인 서비스 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.' }));
  }
};
