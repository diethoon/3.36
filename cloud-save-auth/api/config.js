module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!/^[^@\s]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    res.status(503).json({ error: '로그인 서비스 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.' });
    return;
  }
  // A Google OAuth web client ID is public client configuration, not a secret.
  // Never place a Google Client Secret in this endpoint or the browser app.
  res.status(200).json({ clientId });
};