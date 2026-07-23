const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const { db, DATA_DIR } = require('./db');
const auth = require('./auth');
const { suggestIcons, ICONS } = require('./icons');
const { processPhoto, removePhoto } = require('./photos');
const { generateOgImage } = require('./ogimage');
const view = require('./render');

const PORT = process.env.PORT || 3002;
const RP_ID = process.env.RP_ID || 'brambekkers.nl';
const ORIGIN = process.env.ORIGIN || `https://${RP_ID}`;
process.env.ORIGIN = ORIGIN;
// Toegestane origins voor mutaties; EXTRA_ORIGIN maakt tijdelijke
// toegang via bijv. http://<vps-ip> mogelijk zolang DNS nog niet staat.
process.env.ORIGINS = [ORIGIN, process.env.EXTRA_ORIGIN].filter(Boolean).join(',');

const app = express();
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

// Minimale cookie-parser (alleen key=value nodig).
app.use((req, res, next) => {
  req.cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) req.cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  res.cookie = (name, value, opts = {}) => {
    let c = `${name}=${encodeURIComponent(value)}; Path=${opts.path || '/'}`;
    if (opts.maxAge) c += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
    if (opts.httpOnly) c += '; HttpOnly';
    if (opts.secure) c += '; Secure';
    if (opts.sameSite) c += `; SameSite=${opts.sameSite}`;
    res.append('Set-Cookie', c);
    return res;
  };
  res.clearCookie = (name, opts = {}) => res.cookie(name, '', { ...opts, maxAge: 1000 });
  next();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── statisch ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
app.use('/foto', express.static(path.join(DATA_DIR, 'photos'), { maxAge: '365d', immutable: true }));
app.use('/og', express.static(path.join(DATA_DIR, 'og'), { maxAge: '1d' }));

// ── helpers ───────────────────────────────────────────────────────────────
function slugify(name) {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recept';
  let slug = base, n = 2;
  while (db.prepare('SELECT 1 FROM recipes WHERE slug = ?').get(slug)) slug = `${base}-${n++}`;
  return slug;
}
const getRecipe = (slug) => db.prepare('SELECT * FROM recipes WHERE slug = ?').get(slug);
const hasPasskey = () => !!db.prepare('SELECT 1 FROM credentials LIMIT 1').get();

// ── pagina's ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const latest = db.prepare("SELECT * FROM recipes WHERE status = 'published' ORDER BY created_at DESC LIMIT 3").all();
  res.send(view.homePage({ latest, loggedIn: auth.isLoggedIn(req) }));
});

app.get('/recepten', (req, res) => {
  const q = (req.query.q || '').toString().slice(0, 100).trim();
  const tag = view.TAGS.includes(req.query.tag) || req.query.tag === 'snel' ? req.query.tag : '';
  let sql = "SELECT * FROM recipes WHERE status = 'published'";
  const params = [];
  if (q) { sql += ' AND (name LIKE ? OR ingredients LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (tag === 'snel') sql += ' AND time_min <= 30';
  else if (tag) { sql += " AND tags LIKE ?"; params.push(`%"${tag}"%`); }
  sql += ' ORDER BY created_at DESC';
  const recipes = db.prepare(sql).all(...params);
  const loggedIn = auth.isLoggedIn(req);
  const drafts = loggedIn ? db.prepare("SELECT * FROM recipes WHERE status = 'draft' ORDER BY updated_at DESC").all() : [];
  res.send(view.receptenPage({ recipes, q, tag, loggedIn, drafts }));
});

app.get('/recept/:slug', (req, res) => {
  const r = getRecipe(req.params.slug);
  const loggedIn = auth.isLoggedIn(req);
  if (!r || (r.status === 'draft' && !loggedIn)) return res.status(404).send(view.layout({
    title: 'Niet gevonden', description: '', path: req.path, loggedIn,
    body: '<h1>Recept niet gevonden</h1><p><a href="/recepten">Terug naar alle recepten</a></p>'
  }));
  res.send(view.receptPage({ r, loggedIn }));
});

app.get('/login', (req, res) => {
  if (auth.isLoggedIn(req)) return res.redirect('/nieuw');
  res.send(view.loginPage({ error: null }));
});

app.get('/nieuw', auth.requireAuth, (req, res) => {
  const r = req.query.bewerk ? getRecipe(req.query.bewerk) : null;
  res.send(view.nieuwPage({ r, loggedIn: true, hasPasskey: hasPasskey() }));
});

// ── auth: wachtwoord ──────────────────────────────────────────────────────
app.post('/api/login', auth.checkOrigin, auth.loginRateLimit, async (req, res) => {
  const ok = await auth.verifyPassword(req.body.password || '');
  if (!ok) {
    auth.registerFailedAttempt(req);
    auth.logAuthFail(req, 'wachtwoord');
    return res.status(401).send(view.loginPage({ error: 'Onjuist wachtwoord.' }));
  }
  auth.createSession(req, res);
  res.redirect('/nieuw');
});

app.post('/api/logout', (req, res) => {
  auth.destroySession(req, res);
  res.redirect('/');
});

// ── auth: passkey (WebAuthn) ──────────────────────────────────────────────
const challenges = new Map(); // korte-termijn per type
app.get('/api/webauthn/register-options', auth.requireAuth, async (req, res) => {
  const options = await generateRegistrationOptions({
    rpName: 'brambekkers.nl', rpID: RP_ID,
    userName: 'bram', userDisplayName: 'Bram Bekkers',
    attestationType: 'none',
    excludeCredentials: db.prepare('SELECT id FROM credentials').all().map((c) => ({ id: c.id })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
  });
  challenges.set('register', options.challenge);
  res.json(options);
});

app.post('/api/webauthn/register', auth.requireAuth, auth.checkOrigin, async (req, res) => {
  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenges.get('register'),
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID
    });
    if (!verification.verified) throw new Error('niet geverifieerd');
    const { credential } = verification.registrationInfo;
    db.prepare('INSERT INTO credentials (id, public_key, counter, transports, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(credential.id, Buffer.from(credential.publicKey).toString('base64url'),
           credential.counter, JSON.stringify(credential.transports || []), new Date().toISOString());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Registratie mislukt: ' + e.message });
  }
});

app.get('/api/webauthn/login-options', async (req, res) => {
  if (!hasPasskey()) return res.status(404).json({ error: 'Geen passkey geregistreerd' });
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: db.prepare('SELECT id, transports FROM credentials').all()
      .map((c) => ({ id: c.id, transports: JSON.parse(c.transports) })),
    userVerification: 'preferred'
  });
  challenges.set('login', options.challenge);
  res.json(options);
});

app.post('/api/webauthn/login', auth.checkOrigin, auth.loginRateLimit, async (req, res) => {
  try {
    const cred = db.prepare('SELECT * FROM credentials WHERE id = ?').get(req.body.id);
    if (!cred) throw new Error('onbekende passkey');
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenges.get('login'),
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: cred.id,
        publicKey: Buffer.from(cred.public_key, 'base64url'),
        counter: cred.counter,
        transports: JSON.parse(cred.transports)
      }
    });
    if (!verification.verified) throw new Error('niet geverifieerd');
    db.prepare('UPDATE credentials SET counter = ? WHERE id = ?')
      .run(verification.authenticationInfo.newCounter, cred.id);
    auth.createSession(req, res);
    res.json({ ok: true });
  } catch (e) {
    auth.registerFailedAttempt(req);
    auth.logAuthFail(req, 'passkey');
    res.status(401).json({ error: 'Inloggen mislukt: ' + e.message });
  }
});

// ── recepten opslaan ──────────────────────────────────────────────────────
app.post('/api/recepten', auth.requireAuth, auth.checkOrigin, upload.single('photo'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: 'Naam is verplicht.' });
    const time_min = Math.min(1440, Math.max(0, parseInt(req.body.time_min, 10) || 0)) || null;
    const servings = (req.body.servings || '').trim().slice(0, 40);
    const ingredients = (req.body.ingredients || '').trim().slice(0, 5000);
    const steps = (req.body.steps || '').trim().slice(0, 10000);
    const status = req.body.status === 'draft' ? 'draft' : 'published';
    const tags = [].concat(req.body.tags || []).filter((t) => view.TAGS.includes(t));
    let icons = [].concat(req.body.icons || []).filter((k) => ICONS[k]).slice(0, 3);
    if (!icons.length) icons = suggestIcons(ingredients);

    const existing = req.body.bewerk ? db.prepare('SELECT * FROM recipes WHERE slug = ?').get(req.body.bewerk) : null;
    const slug = existing ? existing.slug : slugify(name);
    const now = new Date().toISOString();

    let has_photo = existing ? existing.has_photo : 0;
    if (req.body.remove_photo === '1') { removePhoto(slug); has_photo = 0; }
    if (req.file) { await processPhoto(req.file.buffer, slug); has_photo = 1; }
    const alt_text = (req.body.alt_text || '').trim().slice(0, 200) || (has_photo ? name : '');

    if (existing) {
      db.prepare(`UPDATE recipes SET name=?, time_min=?, servings=?, tags=?, ingredients=?, steps=?, icons=?, has_photo=?, alt_text=?, status=?, updated_at=? WHERE slug=?`)
        .run(name, time_min, servings, JSON.stringify(tags), ingredients, steps, JSON.stringify(icons), has_photo, alt_text, status, now, slug);
    } else {
      db.prepare(`INSERT INTO recipes (slug, name, time_min, servings, tags, ingredients, steps, icons, has_photo, alt_text, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, name, time_min, servings, JSON.stringify(tags), ingredients, steps, JSON.stringify(icons), has_photo, alt_text, status, now, now);
    }
    await generateOgImage(slug, name, icons);
    res.json({ ok: true, slug });
  } catch (e) {
    console.error('Opslaan mislukt:', e);
    res.status(500).json({ error: 'Opslaan mislukt: ' + e.message });
  }
});

// ── SEO ───────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const rows = db.prepare("SELECT slug, updated_at, has_photo FROM recipes WHERE status = 'published'").all();
  const urls = [
    `<url><loc>${ORIGIN}/</loc></url>`,
    `<url><loc>${ORIGIN}/recepten</loc></url>`,
    ...rows.map((r) => `<url><loc>${ORIGIN}/recept/${r.slug}</loc><lastmod>${r.updated_at.slice(0, 10)}</lastmod>${r.has_photo ? `<image:image><image:loc>${ORIGIN}/foto/${r.slug}/crop-4x3.jpg</image:loc></image:image>` : ''}</url>`)
  ].join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /nieuw\nDisallow: /login\nSitemap: ${ORIGIN}/sitemap.xml\n`);
});

// Site-brede og-image (homepagina) eenmalig genereren.
const sitePng = path.join(DATA_DIR, 'og', 'site.png');
if (!fs.existsSync(sitePng)) {
  generateOgImage('site', 'Recepten van Bram', ['pasta', 'tomaat', 'kruiden']).catch((e) => console.error(e));
}

app.listen(PORT, '127.0.0.1', () => console.log(`brambekkers.nl draait op 127.0.0.1:${PORT}`));
