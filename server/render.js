const { ICONS, iconSvg } = require('./icons');

const TAGS = ['ontbijt', 'lunch', 'diner', 'bakken', 'vega'];
const SITE = 'https://brambekkers.nl';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tijdLabel(min) {
  if (!min) return '';
  if (min >= 60) {
    const u = Math.floor(min / 60), r = min % 60;
    return r ? `${u}u ${r} min` : `${u} uur`;
  }
  return `${min} min`;
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
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
</head>
<body>
<nav>
  <a class="brand" href="/">bram bekkers</a>
  <a href="/" ${reqPath === '/' ? 'class="active"' : ''}>home</a>
  <a href="/recepten" ${reqPath.startsWith('/recept') ? 'class="active"' : ''}>recepten</a>
  ${loggedIn ? '<a href="/nieuw" class="nav-nieuw">+ nieuw</a>' : ''}
</nav>
<main>
${body}
</main>
<footer>
  <span>© Bram Bekkers</span>
  ${loggedIn ? '<form method="post" action="/api/logout" class="inline"><button class="linkbtn">uitloggen</button></form>' : '<a href="/login" rel="nofollow">inloggen</a>'}
</footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

function tile(r) {
  const icons = JSON.parse(r.icons).map((k) => iconSvg(k, 56)).join('');
  const art = r.has_photo
    ? `<img src="/foto/${esc(r.slug)}/w400.webp" alt="" loading="lazy" width="400" height="300">`
    : `<div class="tile-icons">${icons}</div>`;
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
    title: 'Recepten — Bram Bekkers',
    description: 'De recepten die ik zelf kook: doordeweeks, bakken en alles ertussenin.',
    path: '/recepten',
    loggedIn,
    body: `<h1>Recepten</h1>
<form class="zoek" method="get" action="/recepten">
  <input type="search" name="q" value="${esc(q || '')}" placeholder="Zoek op naam of ingrediënt…" aria-label="Zoeken">
  ${tag ? `<input type="hidden" name="tag" value="${esc(tag)}">` : ''}
</form>
<div class="chips">${chips}</div>
${grid}
${draftBlock}`
  });
}

function homePage({ latest, loggedIn }) {
  return layout({
    title: 'Bram Bekkers',
    description: 'Persoonlijke site van Bram Bekkers, met de recepten die ik zelf kook.',
    path: '/',
    loggedIn,
    body: `<h1>Hoi, ik ben Bram.</h1>
<p class="lede">Hier verzamel ik de recepten die ik zelf kook — zodat ik ze terugvind, en jij ze mee kunt koken.</p>
<p><a class="btn" href="/recepten">Bekijk alle recepten</a></p>
${latest.length ? `<h2 class="klein">Nieuwste recepten</h2><div class="grid">${latest.map(tile).join('')}</div>` : ''}`
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
    : `<div class="hero illu">${iconKeys.map((k) => iconSvg(k, 96)).join('')}</div>`;

  const jsonLd = JSON.stringify({
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
    title: `${r.name} — Bram Bekkers`,
    description: `Recept: ${r.name}. ${tijdLabel(r.time_min)}${tags.length ? ', ' + tags.join(', ') : ''}.`,
    ogImage: `/og/${r.slug}.png`,
    path: `/recept/${r.slug}`,
    loggedIn,
    jsonLd,
    body: `<article class="recept" data-slug="${esc(r.slug)}">
${r.status === 'draft' ? '<p class="concept-banner">Concept — alleen jij ziet dit.</p>' : ''}
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
    title: 'Inloggen — Bram Bekkers',
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
  const iconData = JSON.stringify(Object.fromEntries(Object.entries(ICONS).map(([k, ic]) => [k, ic.match])));

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
  <div class="field-rij">
    <label class="field"><span class="lab">Tijd (minuten)</span>
      <input class="input" name="time_min" type="number" min="1" max="1440" inputmode="numeric" value="${r?.time_min || ''}">
    </label>
    <label class="field"><span class="lab">Porties</span>
      <input class="input" name="servings" maxlength="40" value="${r ? esc(r.servings) : ''}" placeholder="2 personen">
    </label>
  </div>
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
  <div class="field"><span class="lab">Tegel-icoontjes (automatisch gekozen — tik om aan te passen)</span>
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

module.exports = { layout, receptenPage, homePage, receptPage, loginPage, nieuwPage, TAGS, esc };
