const path = require('path');
const sharp = require('sharp');
const { DATA_DIR } = require('./db');
const { ICONS } = require('./icons');

const CHIFFON = '#FAF0CA';
const NAVY = '#0D3B66';

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Social preview (og:image) is bewust ALTIJD de ingrediënt-illustratie,
// nooit de foto — elke gedeelde link heeft dezelfde huisstijl.
async function generateOgImage(slug, name, iconKeys) {
  const icons = (iconKeys || []).filter((k) => ICONS[k]).slice(0, 3);
  const iconSize = 220;
  const gap = 40;
  const totalW = icons.length * iconSize + (icons.length - 1) * gap;
  const startX = (1200 - totalW) / 2;

  const iconGroup = icons.map((k, i) => {
    const x = startX + i * (iconSize + gap);
    const scale = iconSize / 64;
    return `<g transform="translate(${x} 120) scale(${scale})" fill="none" stroke="${NAVY}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${ICONS[k].svg}</g>`;
  }).join('');

  const title = escapeXml(name.length > 42 ? name.slice(0, 41) + '…' : name);
  const fontSize = name.length > 28 ? 52 : 64;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CHIFFON}"/>
  ${iconGroup}
  <text x="600" y="470" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-size="${fontSize}" fill="${NAVY}">${title}</text>
  <text x="600" y="560" text-anchor="middle" font-family="'DejaVu Sans', sans-serif" font-size="26" letter-spacing="4" fill="${NAVY}" opacity="0.65">BRAMBEKKERS.NL</text>
</svg>`;

  const out = path.join(DATA_DIR, 'og', `${slug}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

module.exports = { generateOgImage };
