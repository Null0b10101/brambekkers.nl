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
const { paperShortLabel: mdShortLabel } = require('./markdown');
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
  const latestArticle = db.prepare("SELECT * FROM articles WHERE status = 'published' ORDER BY updated_at DESC LIMIT 1").get();
  res.send(view.homePage({ latest, latestArticle, loggedIn: auth.isLoggedIn(req) }));
});

app.get('/recepten', (req, res) => {
  const q = (req.query.q || '').toString().slice(0, 100).trim();
  const tag = view.TAGS.includes(req.query.tag) || req.query.tag === 'snel' ? req.query.tag : '';
  const seizoen = view.SEIZOENEN.includes(req.query.seizoen) ? req.query.seizoen : '';
  let sql = "SELECT * FROM recipes WHERE status = 'published'";
  const params = [];
  if (q) { sql += ' AND (name LIKE ? OR ingredients LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (tag === 'snel') sql += ' AND time_min <= 30';
  else if (tag) { sql += " AND tags LIKE ?"; params.push(`%"${tag}"%`); }
  if (seizoen) { sql += ' AND seasons LIKE ?'; params.push(`%"${seizoen}"%`); }
  sql += ' ORDER BY created_at DESC';
  const recipes = db.prepare(sql).all(...params);
  const loggedIn = auth.isLoggedIn(req);
  const drafts = loggedIn ? db.prepare("SELECT * FROM recipes WHERE status = 'draft' ORDER BY updated_at DESC").all() : [];
  res.send(view.receptenPage({ recipes, q, tag, seizoen, loggedIn, drafts }));
});

// Verras me: één willekeurig gepubliceerd recept (à la Smitten Kitchen).
app.get('/verras', (req, res) => {
  const r = db.prepare("SELECT slug FROM recipes WHERE status = 'published' ORDER BY RANDOM() LIMIT 1").get();
  res.redirect(r ? `/recept/${r.slug}` : '/recepten');
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

// ── Lezen: artikelen + leeslijst ──────────────────────────────────────────
const getArticle = (slug) => db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
const getPaper = (slug) => db.prepare('SELECT * FROM papers WHERE slug = ?').get(slug);
function slugifyIn(table, name, fallback) {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || fallback;
  let slug = base, n = 2;
  while (db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`).get(slug)) slug = `${base}-${n++}`;
  return slug;
}

app.get('/lezen', (req, res) => {
  const onderwerp = view.ONDERWERPEN.includes(req.query.onderwerp) ? req.query.onderwerp : '';
  const loggedIn = auth.isLoggedIn(req);
  const like = onderwerp ? `%"${onderwerp}"%` : null;
  const aSql = "SELECT * FROM articles WHERE status = 'published'" + (onderwerp ? ' AND topics LIKE ?' : '') + ' ORDER BY updated_at DESC';
  const pSql = 'SELECT * FROM papers' + (onderwerp ? ' WHERE topics LIKE ?' : '') + ' ORDER BY year DESC, created_at DESC';
  const articles = onderwerp ? db.prepare(aSql).all(like) : db.prepare(aSql).all();
  const papers = onderwerp ? db.prepare(pSql).all(like) : db.prepare(pSql).all();
  const drafts = loggedIn ? db.prepare("SELECT * FROM articles WHERE status = 'draft' ORDER BY updated_at DESC").all() : [];
  res.send(view.lezenPage({ articles, papers, onderwerp, loggedIn, drafts }));
});

app.get('/lezen/nieuw', auth.requireAuth, (req, res) => {
  const a = req.query.bewerk ? getArticle(req.query.bewerk) : null;
  res.send(view.artikelEditor({ a, loggedIn: true }));
});

app.get('/papers/nieuw', auth.requireAuth, (req, res) => {
  const p = req.query.bewerk ? getPaper(req.query.bewerk) : null;
  res.send(view.paperEditor({ p, loggedIn: true }));
});

app.get('/lezen/:slug', (req, res) => {
  const a = getArticle(req.params.slug);
  const loggedIn = auth.isLoggedIn(req);
  if (!a || (a.status === 'draft' && !loggedIn)) return res.status(404).send(view.layout({
    title: 'Niet gevonden', description: '', path: req.path, loggedIn,
    body: '<h1>Stuk niet gevonden</h1><p><a href="/lezen">Terug naar Lezen</a></p>'
  }));
  const papersList = db.prepare('SELECT * FROM papers').all();
  const papersBySlug = Object.fromEntries(papersList.map((p) => [p.slug, { shortLabel: mdShortLabel(p.authors, p.year) }]));
  res.send(view.artikelPage({ a, papersBySlug, papersList, loggedIn }));
});

app.post('/api/artikelen', auth.requireAuth, auth.checkOrigin, (req, res) => {
  try {
    const title = (req.body.title || '').trim().slice(0, 160);
    if (!title) return res.status(400).json({ error: 'Titel is verplicht.' });
    const body_md = (req.body.body_md || '').slice(0, 100000);
    const topics = [].concat(req.body.topics || []).filter((t) => view.ONDERWERPEN.includes(t));
    const status = req.body.status === 'draft' ? 'draft' : 'published';
    const now = new Date().toISOString();
    const existing = req.body.bewerk ? getArticle(req.body.bewerk) : null;
    const slug = existing ? existing.slug : slugifyIn('articles', title, 'artikel');
    if (existing) {
      db.prepare('UPDATE articles SET title=?, body_md=?, topics=?, status=?, updated_at=? WHERE slug=?')
        .run(title, body_md, JSON.stringify(topics), status, now, slug);
    } else {
      db.prepare('INSERT INTO articles (slug, title, body_md, topics, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(slug, title, body_md, JSON.stringify(topics), status, now, now);
    }
    res.json({ ok: true, slug });
  } catch (e) { console.error('Artikel opslaan mislukt:', e); res.status(500).json({ error: 'Opslaan mislukt, probeer het opnieuw.' }); }
});

app.post('/api/papers', auth.requireAuth, auth.checkOrigin, (req, res) => {
  try {
    const title = (req.body.title || '').trim().slice(0, 300);
    if (!title) return res.status(400).json({ error: 'Titel is verplicht.' });
    const authors = (req.body.authors || '').trim().slice(0, 300);
    const year = Math.min(2100, Math.max(1900, parseInt(req.body.year, 10) || 0)) || null;
    const source = (req.body.source || '').trim().slice(0, 200);
    const url = (req.body.url || '').trim().slice(0, 500);
    const note = (req.body.note || '').trim().slice(0, 1000);
    const topics = [].concat(req.body.topics || []).filter((t) => view.ONDERWERPEN.includes(t));
    const now = new Date().toISOString();
    const existing = req.body.bewerk ? getPaper(req.body.bewerk) : null;
    const slug = existing ? existing.slug : slugifyIn('papers', title, 'paper');
    if (existing) {
      db.prepare('UPDATE papers SET title=?, authors=?, year=?, source=?, url=?, note=?, topics=?, updated_at=? WHERE slug=?')
        .run(title, authors, year, source, url, note, JSON.stringify(topics), now, slug);
    } else {
      db.prepare('INSERT INTO papers (slug, title, authors, year, source, url, note, topics, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(slug, title, authors, year, source, url, note, JSON.stringify(topics), now, now);
    }
    res.json({ ok: true, slug });
  } catch (e) { console.error('Paper opslaan mislukt:', e); res.status(500).json({ error: 'Opslaan mislukt, probeer het opnieuw.' }); }
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
// Challenges zijn eenmalig en verlopen na 5 min (voorkomt replay).
const challenges = new Map();
const CHALLENGE_TTL = 5 * 60e3;
function setChallenge(type, value) { challenges.set(type, { value, expires: Date.now() + CHALLENGE_TTL }); }
function takeChallenge(type) {
  const c = challenges.get(type);
  challenges.delete(type);
  return c && c.expires > Date.now() ? c.value : undefined;
}
app.get('/api/webauthn/register-options', auth.requireAuth, async (req, res) => {
  const options = await generateRegistrationOptions({
    rpName: 'brambekkers.nl', rpID: RP_ID,
    userName: 'bram', userDisplayName: 'Bram Bekkers',
    attestationType: 'none',
    excludeCredentials: db.prepare('SELECT id FROM credentials').all().map((c) => ({ id: c.id })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
  });
  setChallenge('register', options.challenge);
  res.json(options);
});

app.post('/api/webauthn/register', auth.requireAuth, auth.checkOrigin, async (req, res) => {
  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: takeChallenge('register'),
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
  setChallenge('login', options.challenge);
  res.json(options);
});

app.post('/api/webauthn/login', auth.checkOrigin, auth.loginRateLimit, async (req, res) => {
  try {
    const cred = db.prepare('SELECT * FROM credentials WHERE id = ?').get(req.body.id);
    if (!cred) throw new Error('onbekende passkey');
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: takeChallenge('login'),
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
    const active_min = Math.min(1440, Math.max(0, parseInt(req.body.active_min, 10) || 0)) || null;
    if (active_min && time_min && active_min > time_min)
      return res.status(400).json({ error: 'Actieve tijd kan niet groter zijn dan de totale tijd.' });
    const servings = (req.body.servings || '').trim().slice(0, 40);
    const ingredients = (req.body.ingredients || '').trim().slice(0, 5000);
    const steps = (req.body.steps || '').trim().slice(0, 10000);
    const status = req.body.status === 'draft' ? 'draft' : 'published';
    const tags = [].concat(req.body.tags || []).filter((t) => view.TAGS.includes(t));
    const seasons = [].concat(req.body.seasons || []).filter((s) => view.SEIZOENEN.includes(s));
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
      db.prepare(`UPDATE recipes SET name=?, time_min=?, active_min=?, servings=?, tags=?, seasons=?, ingredients=?, steps=?, icons=?, has_photo=?, alt_text=?, status=?, updated_at=? WHERE slug=?`)
        .run(name, time_min, active_min, servings, JSON.stringify(tags), JSON.stringify(seasons), ingredients, steps, JSON.stringify(icons), has_photo, alt_text, status, now, slug);
    } else {
      db.prepare(`INSERT INTO recipes (slug, name, time_min, active_min, servings, tags, seasons, ingredients, steps, icons, has_photo, alt_text, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(slug, name, time_min, active_min, servings, JSON.stringify(tags), JSON.stringify(seasons), ingredients, steps, JSON.stringify(icons), has_photo, alt_text, status, now, now);
    }
    await generateOgImage(slug, name, icons);
    res.json({ ok: true, slug });
  } catch (e) {
    console.error('Opslaan mislukt:', e);
    res.status(500).json({ error: 'Opslaan mislukt, probeer het opnieuw.' });
  }
});

// ── SEO ───────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const rows = db.prepare("SELECT slug, updated_at, has_photo FROM recipes WHERE status = 'published'").all();
  const arts = db.prepare("SELECT slug, updated_at FROM articles WHERE status = 'published'").all();
  const urls = [
    `<url><loc>${ORIGIN}/</loc></url>`,
    `<url><loc>${ORIGIN}/recepten</loc></url>`,
    `<url><loc>${ORIGIN}/lezen</loc></url>`,
    ...rows.map((r) => `<url><loc>${ORIGIN}/recept/${r.slug}</loc><lastmod>${r.updated_at.slice(0, 10)}</lastmod>${r.has_photo ? `<image:image><image:loc>${ORIGIN}/foto/${r.slug}/crop-4x3.jpg</image:loc></image:image>` : ''}</url>`),
    ...arts.map((a) => `<url><loc>${ORIGIN}/lezen/${a.slug}</loc><lastmod>${a.updated_at.slice(0, 10)}</lastmod></url>`)
  ].join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /nieuw\nDisallow: /login\nDisallow: /verras\nDisallow: /lezen/nieuw\nDisallow: /papers/nieuw\nSitemap: ${ORIGIN}/sitemap.xml\n`);
});

// Site-brede og-image (homepagina) eenmalig genereren.
const sitePng = path.join(DATA_DIR, 'og', 'site.png');
if (!fs.existsSync(sitePng)) {
  generateOgImage('site', 'Recepten van Bram', ['pasta', 'tomaat', 'kruiden']).catch((e) => console.error(e));
}

app.listen(PORT, '127.0.0.1', () => console.log(`brambekkers.nl draait op 127.0.0.1:${PORT}`));
