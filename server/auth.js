const crypto = require('crypto');
const argon2 = require('argon2');
const { db } = require('./db');

const SESSION_DAYS = 90;
const COOKIE = 'bb_sessie';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSession(res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token_hash, expires) VALUES (?, ?)').run(hashToken(token), expires);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 864e5,
    path: '/'
  });
}

function destroySession(req, res) {
  const token = req.cookies[COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  res.clearCookie(COOKIE, { path: '/' });
}

function isLoggedIn(req) {
  const token = req.cookies[COOKIE];
  if (!token) return false;
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  return !!db.prepare('SELECT 1 FROM sessions WHERE token_hash = ?').get(hashToken(token));
}

function requireAuth(req, res, next) {
  if (isLoggedIn(req)) return next();
  if (req.method === 'GET') return res.redirect('/login');
  res.status(401).json({ error: 'Niet ingelogd' });
}

// Zelfde-origin-check voor alle mutaties (naast SameSite=Strict).
function checkOrigin(req, res, next) {
  const origin = req.headers.origin || '';
  const expected = process.env.ORIGIN || '';
  if (origin && expected && origin !== expected) {
    return res.status(403).json({ error: 'Ongeldige origin' });
  }
  next();
}

// Rate-limiting op login: max 5 pogingen per 15 min per IP; mislukkingen naar
// het auth-log zodat fail2ban herhaalde gokkers op IP-niveau blokkeert.
const attempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  if (list.length >= 5) {
    logAuthFail(req, 'rate-limited');
    return res.status(429).json({ error: 'Te veel pogingen, probeer het over een kwartier opnieuw.' });
  }
  attempts.set(ip, list);
  next();
}
function registerFailedAttempt(req) {
  const list = attempts.get(req.ip) || [];
  list.push(Date.now());
  attempts.set(req.ip, list);
}

function logAuthFail(req, reason) {
  // fail2ban-parseerbaar, naar stdout (journald) — zie deploy voor de jail.
  console.log(`brambekkers-auth FAIL ${reason} ip=${req.ip}`);
}

async function verifyPassword(password) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'password_hash'").get();
  if (!row) return false;
  try {
    return await argon2.verify(row.value, password);
  } catch {
    return false;
  }
}

async function setPassword(password) {
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  db.prepare("INSERT INTO settings (key, value) VALUES ('password_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(hash);
}

module.exports = {
  createSession, destroySession, isLoggedIn, requireAuth, checkOrigin,
  loginRateLimit, registerFailedAttempt, logAuthFail, verifyPassword, setPassword
};
