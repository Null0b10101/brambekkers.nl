// Genereert het volledige logopakket van bram bekkers uit één bron.
//   node scripts/genereer-logo.js
// Schrijft masters naar logo/vector/, rasters naar logo/raster/ en de
// web-assets (favicon, apple-touch-icon, avatar) naar public/.
//
// Het wordmark "dansende letters" is met de hand getekend als monolijn-paden
// (stroke 7, ronde uiteinden) — zelfde tekentaal als server/icons.js.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const NAVY = '#0D3B66';
const CHIFFON = '#FAF0CA';

// ── letterset ─────────────────────────────────────────────────────────────
const L = {
  b: { w: 26, d: (x) => `M${x + 3} 10V56M${x + 3} 44.5a11 11 0 1 0 11-11a11 11 0 0 0-11 11z` },
  r: { w: 19, d: (x) => `M${x + 3} 32V56M${x + 3} 43q0-11 13-11` },
  a: { w: 28, d: (x) => `M${x + 25} 44.5a11 11 0 1 0-11 11a11 11 0 0 0 11-11zM${x + 25} 32V56` },
  m: { w: 40, d: (x) => `M${x + 3} 56V32M${x + 3} 41q0-9 8.5-9q8.5 0 8.5 9V56M${x + 20} 41q0-9 8.5-9q8.5 0 8.5 9V56` },
  e: { w: 25, d: (x) => `M${x + 3} 43h19q0-11-9.5-11q-9.5 0-9.5 12q0 12 10 12q6 0 9-4` },
  k: { w: 22, d: (x) => `M${x + 3} 10V56M${x + 18} 32L${x + 3} 45M${x + 9} 40L${x + 19} 56` },
  s: { w: 22, d: (x) => `M${x + 18} 35q-3-3-8-3q-7 0-7 5.5q0 5 7.5 6q8 1 8 6.5q0 6-8 6q-6 0-9-4` },
  ' ': { w: 14, d: () => '' }
};

function wordmarkPaths(text) {
  let x = 4, i = 0;
  const parts = [];
  for (const ch of text) {
    const glyph = L[ch];
    if (!glyph) continue;
    const dy = i % 2 ? 2.2 : -2.2;
    const rot = i % 2 ? 2.5 : -2.5;
    const d = glyph.d(0);
    if (d) parts.push(`<g transform="translate(${x} ${dy}) rotate(${rot} ${glyph.w / 2} 44)"><path d="${d}"/></g>`);
    x += glyph.w + (ch === ' ' ? 0 : 2.5);
    i++;
  }
  return { inner: parts.join(''), width: x + 4 };
}

// ── beeldmerk: stoomstempel ───────────────────────────────────────────────
function stempelPaths({ simpel = false } = {}) {
  return `
<circle cx="60" cy="60" r="54"/>
${simpel ? '' : '<circle cx="60" cy="60" r="46" stroke-dasharray="0.1 9"/>'}
<g transform="translate(34 34)">
  <path d="M3 16V60M3 48.5a11.5 11.5 0 1 0 11.5-11.5A11.5 11.5 0 0 0 3 48.5z"/>
  <path d="M29 16V60M29 48.5a11.5 11.5 0 1 0 11.5-11.5A11.5 11.5 0 0 0 29 48.5z"/>
</g>
<path d="M50 40q-4-4 0-9M60 38q-4-4 0-9M70 40q-4-4 0-9"/>`;
}

function svgDoc(inner, viewBox, color, sw, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
${bg ? `<rect x="${viewBox.split(' ')[0]}" y="${viewBox.split(' ')[1]}" width="100%" height="100%" fill="${bg}"/>` : ''}<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`;
}

const wm = wordmarkPaths('bram bekkers');
const WM_VB = `0 1 ${Math.ceil(wm.width)} 62`; // strak om de letters (y 4..62 incl. stroke)
const MARK_VB = '0 0 120 120';

// horizontaal: stempel (geschaald naar letterhoogte) links van het wordmark;
// stroke-width in de scale-groep gecompenseerd zodat de lijndikte optisch gelijk blijft
function horizontaal(color) {
  const inner = `<g transform="translate(0 1) scale(0.517)" stroke-width="12">${stempelPaths({ simpel: true })}</g><g transform="translate(76 0)">${wm.inner}</g>`;
  return svgDoc(inner, `0 1 ${Math.ceil(wm.width) + 78} 62`, color, 7, null);
}
// gestapeld: stempel boven wordmark
function gestapeld(color) {
  const inner = `<g transform="translate(${(wm.width - 120 * 0.9) / 2} 0) scale(0.9)" stroke-width="6.1">${stempelPaths()}</g><g transform="translate(0 112)">${wm.inner}</g>`;
  return svgDoc(inner, `0 0 ${Math.ceil(wm.width)} 176`, color, 7, null);
}

const versies = { navy: NAVY, chiffon: CHIFFON, zwart: '#000000' };
const out = {};
for (const [naam, kleur] of Object.entries(versies)) {
  const dir = path.join(ROOT, 'logo', 'vector', naam);
  fs.mkdirSync(dir, { recursive: true });
  out[`${naam}/bb-wordmark.svg`] = svgDoc(wm.inner, WM_VB, kleur, 7, null);
  out[`${naam}/bb-beeldmerk.svg`] = svgDoc(stempelPaths(), MARK_VB, kleur, 5.5, null);
  out[`${naam}/bb-horizontaal.svg`] = horizontaal(kleur);
  out[`${naam}/bb-gestapeld.svg`] = gestapeld(kleur);
  for (const [file, svg] of Object.entries(out)) {
    if (file.startsWith(naam + '/')) fs.writeFileSync(path.join(ROOT, 'logo', 'vector', file), svg);
  }
}

(async () => {
  // rasters
  for (const kleur of ['navy', 'chiffon']) {
    const rdir = path.join(ROOT, 'logo', 'raster', kleur);
    fs.mkdirSync(rdir, { recursive: true });
    for (const naam of ['bb-wordmark', 'bb-beeldmerk', 'bb-horizontaal']) {
      const src = path.join(ROOT, 'logo', 'vector', kleur, `${naam}.svg`);
      for (const w of [512, 1024, 2048]) {
        await sharp(src, { density: 300 }).resize({ width: w })
          .png().toFile(path.join(rdir, `${naam}-${w}.png`));
      }
    }
  }

  // web-assets → public/
  const pub = path.join(ROOT, 'public');
  // favicon: vereenvoudigde stempel (zonder stippelring) leest beter op 16px
  fs.writeFileSync(path.join(pub, 'favicon.svg'),
    svgDoc(stempelPaths({ simpel: true }), MARK_VB, NAVY, 7.5, CHIFFON));
  await sharp(Buffer.from(svgDoc(stempelPaths({ simpel: true }), MARK_VB, NAVY, 7.5, CHIFFON)), { density: 300 })
    .resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'));
  // avatar: volledige stempel binnen circle-crop-veilige zone (80%)
  const avatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">
<rect width="150" height="150" fill="${CHIFFON}"/>
<g transform="translate(15 15)"><g fill="none" stroke="${NAVY}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">${stempelPaths()}</g></g>
</svg>`;
  await sharp(Buffer.from(avatarSvg), { density: 300 }).resize(1024, 1024).png()
    .toFile(path.join(ROOT, 'logo', 'social-avatar.png'));
  console.log('logopakket gegenereerd');
})();
