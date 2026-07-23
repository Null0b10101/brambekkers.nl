const fs = require('fs');
const path = require('path');
const { ICONS, iconSvg } = require('./icons');
const { renderMarkdown, paperShortLabel, plainIntro } = require('./markdown');

// Onderwerpen delen artikelen én papers; pas deze lijst aan naar je interesses.
const ONDERWERPEN = ['supplementen', 'ziektes', 'voeding', 'darmgezondheid', 'immuunsysteem', 'hersenen', 'metabolisme', 'hormonen'];

// Wordmark-master uit het logopakket, inline met currentColor zodat hij
// meekleurt met het thema (zie scripts/genereer-logo.js).
const WORDMARK_SVG = fs.readFileSync(path.join(__dirname, '..', 'logo', 'vector', 'navy', 'bb-wordmark.svg'), 'utf8')
  .replace('stroke="#0D3B66"', 'stroke="currentColor"')
  .replace('<svg ', '<svg class="wordmark" aria-hidden="true" focusable="false" ');

// Cache-busting: versie in asset-URL's op basis van de css-bestandstijd, zodat
// browsers na een deploy direct de nieuwe bestanden ophalen (maxAge is 1 uur).
const ASSET_V = Math.floor(fs.statSync(path.join(__dirname, '..', 'public', 'style.css')).mtimeMs).toString(36);

const TAGS = ['ontbijt', 'lunch', 'diner', 'voorgerecht', 'hoofdgerecht', 'bijgerecht', 'nagerecht', 'bakken', 'vega'];
const SITE = 'https://brambekkers.nl';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// JSON dat rechtstreeks in een <script>-blok komt: escape de tekens waarmee je
// uit het script-element kunt breken (</script>, <!--). Houdt geldige JSON,
// voorkomt HTML-injectie via receptvelden (defense-in-depth naast de CSP).
function jsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// Tijd wordt opgeslagen als bovengrens van het gekozen vak (15/30/45/60,
// 60+ als 90) en overal als vak getoond; "snel" filtert op <= 30.
const TIJDVAKKEN = [
  { value: 15, label: '0–15 min' },
  { value: 30, label: '15–30 min' },
  { value: 45, label: '30–45 min' },
  { value: 60, label: '45–60 min' },
  { value: 90, label: '60+ min' }
];
function tijdVak(min) {
  if (!min) return null;
  return TIJDVAKKEN.find((v) => min <= v.value) || TIJDVAKKEN[TIJDVAKKEN.length - 1];
}
function tijdLabel(min) {
  return tijdVak(min)?.label || '';
}

function layout({ title, description, ogImage, path: reqPath, loggedIn, body, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${esc(reqPath)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}${esc(ogImage || '/og/site.png')}">
<meta property="og:url" content="${SITE}${esc(reqPath)}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg?v=${ASSET_V}" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script src="/theme.js?v=${ASSET_V}"></script>
<link rel="stylesheet" href="/style.css?v=${ASSET_V}">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>
<body>
<nav>
  <a class="brand" href="/" aria-label="bram bekkers, home">${WORDMARK_SVG}</a>
  <a href="/" ${reqPath === '/' ? 'class="active"' : ''}>home</a>
  <a href="/recepten" ${reqPath.startsWith('/recept') ? 'class="active"' : ''}>recepten</a>
  <a href="/lezen" ${reqPath.startsWith('/lezen') || reqPath.startsWith('/paper') ? 'class="active"' : ''}>lezen</a>
  <button id="thema-knop" aria-label="Wissel tussen licht en donker thema" title="Licht/donker thema">
    <svg class="zon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.6" fill="#d9b56d"/>
      <g stroke="#d9b56d" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="1.5" x2="12" y2="3.8"/><line x1="12" y1="20.2" x2="12" y2="22.5"/>
        <line x1="1.5" y1="12" x2="3.8" y2="12"/><line x1="20.2" y1="12" x2="22.5" y2="12"/>
        <line x1="4.6" y1="4.6" x2="6.2" y2="6.2"/><line x1="17.8" y1="17.8" x2="19.4" y2="19.4"/>
        <line x1="17.8" y1="6.2" x2="19.4" y2="4.6"/><line x1="4.6" y1="19.4" x2="6.2" y2="17.8"/>
      </g>
    </svg>
    <svg class="maan" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="var(--navy-soft)"/></svg>
  </button>
</nav>
<main>
${body}
</main>
<footer>
  <span>© Bram Bekkers</span>
  ${loggedIn ? '<form method="post" action="/api/logout" class="inline"><button class="linkbtn">uitloggen</button></form>' : '<a href="/login" rel="nofollow">inloggen</a>'}
</footer>
<script src="/app.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

// Tegel-illustratie: "dansend trio" — zelfde ritme als het logo (om en om
// omhoog/omlaag, licht gekanteld), hoofdingrediënt het grootst. Eén svg die
// meeschaalt met de tegel; stroke per groep gecompenseerd zodat de lijndikte
// overal gelijk blijft (monolijn, net als het logo).
function tileArt(keys) {
  const posities = {
    3: [{ x: 12, y: 26, s: 1.42, r: -6 }, { x: 82, y: 46, s: 1.08, r: 5 }, { x: 136, y: 26, s: 0.92, r: -4 }],
    2: [{ x: 30, y: 28, s: 1.42, r: -6 }, { x: 108, y: 44, s: 1.12, r: 5 }],
    1: [{ x: 55, y: 28, s: 1.42, r: -5 }]
  }[Math.min(keys.length, 3)] || [];
  const groepen = keys.slice(0, 3).map((k, i) => {
    const p = posities[i];
    return `<g transform="translate(${p.x} ${p.y}) scale(${p.s}) rotate(${p.r} 32 32)" stroke-width="${(4 / p.s).toFixed(2)}">${ICONS[k].svg}</g>`;
  }).join('');
  return `<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${groepen}</svg>`;
}

function tile(r) {
  const art = r.has_photo
    ? `<img src="/foto/${esc(r.slug)}/w400.webp" alt="" loading="lazy" width="400" height="300">`
    : `<div class="tile-icons">${tileArt(JSON.parse(r.icons))}</div>`;
  return `<a class="tile" href="/recept/${esc(r.slug)}">
  <span class="art">${art}</span>
  <span class="body">
    <span class="name">${esc(r.name)}</span>
    <span class="meta">${[tijdLabel(r.time_min), ...JSON.parse(r.tags)].filter(Boolean).map(esc).join(' · ')}</span>
  </span>
</a>`;
}

function receptenPage({ recipes, q, tag, loggedIn, drafts }) {
  const chips = ['alles', ...TAGS, 'snel'].map((t) => {
    const on = (t === 'alles' && !tag) || t === tag;
    const href = t === 'alles' ? '/recepten' : `/recepten?tag=${t}`;
    return `<a class="chip ${on ? 'on' : ''}" href="${href}${q ? `&q=${encodeURIComponent(q)}` : ''}">${t === 'snel' ? 'snel &lt; 30 min' : t}</a>`;
  }).join('');

  const grid = recipes.length
    ? `<div class="grid">${recipes.map(tile).join('')}</div>`
    : `<p class="leeg">Geen recepten gevonden${q ? ` voor “${esc(q)}”` : ''}.</p>`;

  const draftBlock = loggedIn && drafts.length
    ? `<h2 class="klein">Concepten</h2><div class="grid concepten">${drafts.map(tile).join('')}</div>`
    : '';

  return layout({
    title: 'Recepten · Bram Bekkers',
    description: 'Beproefde recepten uit mijn eigen keuken, voor doordeweeks en voor het weekend.',
    path: '/recepten',
    loggedIn,
    body: `<div class="kop-rij"><h1>Recepten</h1>${loggedIn ? '<a class="btn ghost" href="/nieuw">+ nieuw recept</a>' : ''}</div>
<form class="zoek" method="get" action="/recepten">
  <input type="search" name="q" value="${esc(q || '')}" placeholder="Zoek op naam of ingrediënt…" aria-label="Zoeken">
  ${tag ? `<input type="hidden" name="tag" value="${esc(tag)}">` : ''}
</form>
<div class="chips">${chips}</div>
${grid}
${draftBlock}`
  });
}

// Illustraties voor de twee ingangen — monolijn, zelfde taal als de icoontjes.
const ART_RECEPT = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="38" r="13"/><path d="M18 27q6-4 12 0M24 25v-6"/><ellipse cx="45" cy="40" rx="10" ry="13"/><path d="M45 27v-6q0-3 4-3"/></svg>`;
const ART_LEZEN = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 18C26 13 16 13 10 15v34c6-2 16-2 22 3 6-5 16-5 22-3V15c-6-2-16-2-22 3z"/><path d="M32 21v29"/></svg>`;

function homePage({ latest, latestArticle, loggedIn }) {
  const nieuwsteRecepten = latest.length
    ? `<h2 class="klein">Nieuwste recepten <a href="/recepten">alle recepten →</a></h2><div class="grid">${latest.map(tile).join('')}</div>`
    : '';
  const nieuwsteStuk = latestArticle
    ? `<h2 class="klein">Laatste stuk <a href="/lezen">naar Lezen →</a></h2>${artikelKaart(latestArticle)}`
    : '';

  return layout({
    title: 'Bram Bekkers',
    description: 'Beproefde recepten en goed onderbouwde stukken over voeding en gezondheid.',
    path: '/',
    loggedIn,
    body: `<div class="ingangen">
  <a class="ingang" href="/recepten">
    <span class="art">${ART_RECEPT}</span>
    <span class="ingang-tekst"><span class="i-titel">Recepten</span><span class="i-uitleg">Beproefde recepten uit mijn eigen keuken.</span></span>
    <span class="ga">Bekijk recepten →</span>
  </a>
  <a class="ingang" href="/lezen">
    <span class="art">${ART_LEZEN}</span>
    <span class="ingang-tekst"><span class="i-titel">Lezen</span><span class="i-uitleg">Onderbouwde stukken over voeding en gezondheid, met de bronnen erbij.</span></span>
    <span class="ga">Ga naar Lezen →</span>
  </a>
</div>
${nieuwsteRecepten}
${nieuwsteStuk}`
  });
}

function receptPage({ r, loggedIn }) {
  const tags = JSON.parse(r.tags);
  const iconKeys = JSON.parse(r.icons);
  const ingredients = r.ingredients.split('\n').map((s) => s.trim()).filter(Boolean);
  const steps = r.steps.split('\n').map((s) => s.trim()).filter(Boolean);

  const hero = r.has_photo
    ? `<picture>
  <source type="image/webp" srcset="/foto/${esc(r.slug)}/w400.webp 400w, /foto/${esc(r.slug)}/w800.webp 800w, /foto/${esc(r.slug)}/w1600.webp 1600w" sizes="(max-width: 760px) 100vw, 720px">
  <img class="hero" src="/foto/${esc(r.slug)}/fallback.jpg" alt="${esc(r.alt_text || r.name)}" width="1600" height="1200">
</picture>`
    : `<div class="hero illu">${iconKeys.map((k, i) => {
        const dans = [{ y: -8, r: -6, m: 110 }, { y: 9, r: 5, m: 88 }, { y: -6, r: -4, m: 82 }][i] || { y: 0, r: 0, m: 88 };
        return `<span style="display:inline-flex;transform:translateY(${dans.y}px) rotate(${dans.r}deg)">${iconSvg(k, dans.m)}</span>`;
      }).join('')}</div>`;

  const jsonLd = jsonForScript({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.name,
    author: { '@type': 'Person', name: 'Bram Bekkers' },
    datePublished: r.created_at.slice(0, 10),
    totalTime: r.time_min ? `PT${r.time_min}M` : undefined,
    recipeYield: r.servings || undefined,
    keywords: tags.join(', ') || undefined,
    recipeIngredient: ingredients,
    recipeInstructions: steps.map((s) => ({ '@type': 'HowToStep', text: s })),
    image: r.has_photo
      ? ['crop-1x1', 'crop-4x3', 'crop-16x9'].map((c) => `${SITE}/foto/${r.slug}/${c}.jpg`)
      : [`${SITE}/og/${r.slug}.png`]
  });

  return layout({
    title: `${r.name} · Bram Bekkers`,
    description: `Recept: ${r.name}. ${tijdLabel(r.time_min)}${tags.length ? ', ' + tags.join(', ') : ''}.`,
    ogImage: `/og/${r.slug}.png`,
    path: `/recept/${r.slug}`,
    loggedIn,
    jsonLd,
    body: `<article class="recept" data-slug="${esc(r.slug)}">
${r.status === 'draft' ? '<p class="concept-banner">Concept, alleen jij ziet dit.</p>' : ''}
<h1>${esc(r.name)}</h1>
<div class="chips meta-chips">
  ${r.time_min ? `<span class="chip">${tijdLabel(r.time_min)}</span>` : ''}
  ${r.servings ? `<span class="chip">${esc(r.servings)}</span>` : ''}
  ${tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
</div>
${hero}
<h2>Ingrediënten</h2>
<ul class="ingredienten">
${ingredients.map((i) => `  <li><label><input type="checkbox"> <span>${esc(i)}</span></label></li>`).join('\n')}
</ul>
<h2>Bereiding</h2>
<ol class="stappen">
${steps.map((s) => `  <li>${esc(s)}</li>`).join('\n')}
</ol>
${loggedIn ? `<p><a class="btn ghost" href="/nieuw?bewerk=${esc(r.slug)}">Bewerk dit recept</a></p>` : ''}
</article>`
  });
}

function loginPage({ error }) {
  return layout({
    title: 'Inloggen · Bram Bekkers',
    description: 'Inloggen',
    path: '/login',
    loggedIn: false,
    body: `<h1>Inloggen</h1>
${error ? `<p class="fout">${esc(error)}</p>` : ''}
<div id="passkey-blok" hidden>
  <button class="btn" id="passkey-login">Inloggen met passkey</button>
  <p class="klein-grijs">of met wachtwoord:</p>
</div>
<form class="form" method="post" action="/api/login" id="login-form">
  <label class="field"><span class="lab">Wachtwoord</span>
    <input class="input" type="password" name="password" autocomplete="current-password" required>
  </label>
  <button class="btn">Inloggen</button>
</form>`
  });
}

function nieuwPage({ r, loggedIn, hasPasskey }) {
  const iconOpts = Object.entries(ICONS).map(([k, ic]) =>
    `<label class="chip icon-chip"><input type="checkbox" name="icons" value="${k}" ${r && JSON.parse(r.icons).includes(k) ? 'checked' : ''}>${iconSvg(k, 22)} ${ic.label}</label>`
  ).join('');
  const tagOpts = TAGS.map((t) =>
    `<label class="chip"><input type="checkbox" name="tags" value="${t}" ${r && JSON.parse(r.tags).includes(t) ? 'checked' : ''}>${t}</label>`
  ).join('');
  const iconData = jsonForScript(Object.fromEntries(Object.entries(ICONS).map(([k, ic]) => [k, ic.match])));

  return layout({
    title: r ? `Bewerk: ${r.name}` : 'Nieuw recept',
    description: 'Recept toevoegen',
    path: '/nieuw',
    loggedIn,
    body: `<h1>${r ? 'Recept bewerken' : 'Nieuw recept'}</h1>
<form class="form" id="recept-form" data-bewerk="${r ? esc(r.slug) : ''}">
  <label class="field"><span class="lab">Naam</span>
    <input class="input" name="name" required maxlength="120" value="${r ? esc(r.name) : ''}" placeholder="Pompoensoep met gember">
  </label>
  <div class="field"><span class="lab">Hoe snel klaar?</span>
    <div class="chips">${TIJDVAKKEN.map((v) =>
      `<label class="chip"><input type="radio" name="time_min" value="${v.value}" ${tijdVak(r?.time_min)?.value === v.value ? 'checked' : ''}>${v.label}</label>`).join('')}
    </div>
  </div>
  <label class="field"><span class="lab">Porties</span>
    <input class="input" name="servings" maxlength="40" value="${r ? esc(r.servings) : ''}" placeholder="2 personen">
  </label>
  <div class="field"><span class="lab">Tags</span><div class="chips">${tagOpts}</div></div>
  <label class="field"><span class="lab">Ingrediënten (één per regel)</span>
    <textarea class="input" name="ingredients" rows="7" required placeholder="1 flespompoen&#10;duim gember&#10;1 ui">${r ? esc(r.ingredients) : ''}</textarea>
  </label>
  <label class="field"><span class="lab">Bereiding (één stap per regel)</span>
    <textarea class="input" name="steps" rows="7" required placeholder="Pompoen roosteren in de oven.&#10;Ui en gember fruiten, bouillon erbij, blenden.">${r ? esc(r.steps) : ''}</textarea>
  </label>
  <div class="field"><span class="lab">Foto (mag ook later)</span>
    <input type="file" name="photo" accept="image/*" class="input">
    ${r?.has_photo ? `<label class="chip"><input type="checkbox" name="remove_photo" value="1"> huidige foto verwijderen</label>` : ''}
  </div>
  <label class="field"><span class="lab">Alt-tekst foto (voor Google &amp; schermlezers, automatisch als je niets invult)</span>
    <input class="input" name="alt_text" maxlength="200" value="${r ? esc(r.alt_text) : ''}">
  </label>
  <div class="field"><span class="lab">Tegel-icoontjes (automatisch gekozen, tik om aan te passen)</span>
    <div class="chips" id="icon-keuze">${iconOpts}</div>
  </div>
  <div class="knoppen">
    <button class="btn" name="status" value="published">Publiceren</button>
    <button class="btn ghost" name="status" value="draft">Opslaan als concept</button>
  </div>
  <p class="fout" id="form-fout" hidden></p>
</form>
<script type="application/json" id="icon-data">${iconData}</script>
<hr>
<details class="beheer">
  <summary>Beveiliging</summary>
  <p>${hasPasskey ? 'Er is een passkey geregistreerd voor dit apparaat of je account.' : 'Nog geen passkey geregistreerd.'}</p>
  <button class="btn ghost" id="passkey-register">Passkey toevoegen voor dit apparaat</button>
  <p class="klein-grijs" id="passkey-status"></p>
</details>`
  });
}

// ── Lezen: artikelen + leeslijst ──────────────────────────────────────────
function datumNL(iso) {
  const [j, m, d] = iso.slice(0, 10).split('-');
  const mnd = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][+m - 1];
  return `${+d} ${mnd} ${j}`;
}

function artikelKaart(a) {
  const topics = JSON.parse(a.topics);
  return `<a class="artikel-kaart" href="/lezen/${esc(a.slug)}">
  <span class="a-titel">${esc(a.title)}</span>
  <span class="a-meta">${[datumNL(a.updated_at), ...topics].map(esc).join(' · ')}</span>
  <span class="a-intro">${esc(plainIntro(a.body_md))}</span>
</a>`;
}

function paperItem(p) {
  const topics = JSON.parse(p.topics);
  return `<li class="paper" id="paper-${esc(p.slug)}">
  <div class="p-titel">${p.url ? `<a href="${esc(/^https?:/i.test(p.url) ? p.url : '#')}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a>` : esc(p.title)}</div>
  <div class="p-meta">${[esc(p.authors), p.year ? esc(String(p.year)) : '', esc(p.source)].filter(Boolean).join(' · ')}</div>
  ${p.note ? `<div class="p-note">${esc(p.note)}</div>` : ''}
  ${topics.length ? `<div class="p-topics">${topics.map((t) => `<span class="tagje">${esc(t)}</span>`).join('')}</div>` : ''}
</li>`;
}

function lezenPage({ articles, papers, onderwerp, loggedIn, drafts }) {
  const chips = ['alles', ...ONDERWERPEN].map((t) => {
    const on = (t === 'alles' && !onderwerp) || t === onderwerp;
    const href = t === 'alles' ? '/lezen' : `/lezen?onderwerp=${encodeURIComponent(t)}`;
    return `<a class="chip ${on ? 'on' : ''}" href="${href}">${esc(t)}</a>`;
  }).join('');

  const artikelenBlok = articles.length
    ? `<div class="artikelen">${articles.map(artikelKaart).join('')}</div>`
    : `<p class="leeg">Nog geen stukken${onderwerp ? ` over ${esc(onderwerp)}` : ''}.</p>`;

  const draftBlok = loggedIn && drafts.length
    ? `<h2 class="klein">Concepten</h2><div class="artikelen">${drafts.map(artikelKaart).join('')}</div>` : '';

  const papersBlok = papers.length
    ? `<ul class="leeslijst">${papers.map(paperItem).join('')}</ul>`
    : `<p class="leeg">Nog geen papers in de leeslijst${onderwerp ? ` over ${esc(onderwerp)}` : ''}.</p>`;

  return layout({
    title: 'Lezen · Bram Bekkers',
    description: 'Onderbouwde stukken over voeding en gezondheid, plus een leeslijst met de papers erachter.',
    path: '/lezen',
    loggedIn,
    body: `<div class="kop-rij"><h1>Lezen</h1>${loggedIn ? '<span class="knoppen"><a class="btn ghost" href="/lezen/nieuw">+ artikel</a><a class="btn ghost" href="/papers/nieuw">+ paper</a></span>' : ''}</div>
<p class="lede">Ik graaf in de wetenschap achter voeding en gezondheid en schrijf op wat ik vind. De papers die ertoe doen, staan in de leeslijst.</p>
<div class="chips">${chips}</div>
<h2 class="klein">Stukken</h2>
${artikelenBlok}
${draftBlok}
<h2 class="klein" id="leeslijst">Leeslijst</h2>
${papersBlok}`
  });
}

function artikelPage({ a, papersBySlug, papersList, loggedIn }) {
  const topics = JSON.parse(a.topics);
  const { html, cited } = renderMarkdown(a.body_md, papersBySlug);
  const citedPapers = cited.map((s) => papersList.find((p) => p.slug === s)).filter(Boolean);
  const refs = citedPapers.length
    ? `<section class="referenties"><h2>Besproken literatuur</h2><ul class="leeslijst">${citedPapers.map(paperItem).join('')}</ul></section>` : '';

  return layout({
    title: `${a.title} · Bram Bekkers`,
    description: plainIntro(a.body_md),
    path: `/lezen/${a.slug}`,
    loggedIn,
    body: `<article class="stuk">
${a.status === 'draft' ? '<p class="concept-banner">Concept, alleen jij ziet dit.</p>' : ''}
<h1>${esc(a.title)}</h1>
<p class="a-meta">${[datumNL(a.updated_at), ...topics].map(esc).join(' · ')}</p>
<div class="prose">${html}</div>
${refs}
${loggedIn ? `<p><a class="btn ghost" href="/lezen/nieuw?bewerk=${esc(a.slug)}">Bewerk dit stuk</a></p>` : ''}
</article>`
  });
}

function artikelEditor({ a, loggedIn }) {
  const topicOpts = ONDERWERPEN.map((t) =>
    `<label class="chip"><input type="checkbox" name="topics" value="${t}" ${a && JSON.parse(a.topics).includes(t) ? 'checked' : ''}>${t}</label>`).join('');
  return layout({
    title: a ? `Bewerk: ${a.title}` : 'Nieuw artikel',
    description: 'Artikel schrijven', path: '/lezen/nieuw', loggedIn,
    body: `<h1>${a ? 'Artikel bewerken' : 'Nieuw artikel'}</h1>
<form class="form breed" id="artikel-form" data-bewerk="${a ? esc(a.slug) : ''}">
  <label class="field"><span class="lab">Titel</span>
    <input class="input" name="title" required maxlength="160" value="${a ? esc(a.title) : ''}" placeholder="Vitamine D en het immuunsysteem"></label>
  <div class="field"><span class="lab">Onderwerpen</span><div class="chips">${topicOpts}</div></div>
  <label class="field"><span class="lab">Tekst (Markdown)</span>
    <textarea class="input mono" name="body_md" rows="20" required placeholder="## Inleiding&#10;&#10;Schrijf hier je stuk. **Vet**, *cursief*, [een link](https://...).&#10;&#10;Verwijs naar een paper uit je leeslijst met [@paper-slug].">${a ? esc(a.body_md) : ''}</textarea></label>
  <details class="beheer"><summary>Markdown-hulp</summary>
    <p class="klein-grijs"><code>## Kop</code> · <code>### Subkop</code> · <code>**vet**</code> · <code>*cursief*</code> · <code>[tekst](url)</code> · <code>- lijst</code> · <code>1. genummerd</code> · <code>&gt; citaat</code> · <code>---</code> streep · <code>[@paper-slug]</code> verwijst naar een paper (het slug staat in de leeslijst-URL).</p>
  </details>
  <div class="knoppen">
    <button class="btn" name="status" value="published">Publiceren</button>
    <button class="btn ghost" name="status" value="draft">Opslaan als concept</button>
  </div>
  <p class="fout" id="form-fout" hidden></p>
</form>`
  });
}

function paperEditor({ p, loggedIn }) {
  const topicOpts = ONDERWERPEN.map((t) =>
    `<label class="chip"><input type="checkbox" name="topics" value="${t}" ${p && JSON.parse(p.topics).includes(t) ? 'checked' : ''}>${t}</label>`).join('');
  return layout({
    title: p ? `Bewerk paper: ${p.title}` : 'Nieuwe paper', description: 'Paper toevoegen',
    path: '/papers/nieuw', loggedIn,
    body: `<h1>${p ? 'Paper bewerken' : 'Paper toevoegen'}</h1>
<form class="form" id="paper-form" data-bewerk="${p ? esc(p.slug) : ''}">
  <label class="field"><span class="lab">Titel</span>
    <input class="input" name="title" required maxlength="300" value="${p ? esc(p.title) : ''}"></label>
  <label class="field"><span class="lab">Auteurs</span>
    <input class="input" name="authors" maxlength="300" value="${p ? esc(p.authors) : ''}" placeholder="Boer J, Jansen A"></label>
  <div class="field-rij">
    <label class="field"><span class="lab">Jaar</span>
      <input class="input" name="year" type="number" min="1900" max="2100" inputmode="numeric" value="${p?.year || ''}"></label>
    <label class="field"><span class="lab">Tijdschrift / bron</span>
      <input class="input" name="source" maxlength="200" value="${p ? esc(p.source) : ''}" placeholder="The Lancet"></label>
  </div>
  <label class="field"><span class="lab">Link (URL of DOI)</span>
    <input class="input" name="url" maxlength="500" value="${p ? esc(p.url) : ''}" placeholder="https://doi.org/..."></label>
  <div class="field"><span class="lab">Onderwerpen</span><div class="chips">${topicOpts}</div></div>
  <label class="field"><span class="lab">Jouw notitie (waarom interessant?)</span>
    <textarea class="input" name="note" rows="4" maxlength="1000">${p ? esc(p.note) : ''}</textarea></label>
  <div class="knoppen"><button class="btn" name="save" value="1">Opslaan</button></div>
  <p class="fout" id="form-fout" hidden></p>
</form>`
  });
}

module.exports = { layout, receptenPage, homePage, receptPage, loginPage, nieuwPage,
  lezenPage, artikelPage, artikelEditor, paperEditor, TAGS, ONDERWERPEN, esc };
