// Ingrediënt-icoontjes: simpele lijntekeningen (viewBox 0 0 64 64, stroke = currentColor).
// `match` zijn de woorden waarop automatisch een icoontje wordt gekozen uit de ingrediëntenlijst.

// Gedeelde basis voor de keukenvlaggetjes: stokje + wapperende vlag.
const VLAG = '<path d="M18 54V10"/><path d="M18 12q15-5 30 0v22q-15-5-30 0z"/>';

const ICONS = {
  tomaat: {
    label: 'tomaat',
    match: ['tomaat', 'tomaten', 'cherrytomaat', 'passata', 'tomatenblokjes'],
    svg: '<circle cx="32" cy="40" r="16"/><path d="M32 24q-8-7-15-3M32 24q8-7 15-3M32 24v-9"/>'
  },
  ui: {
    label: 'ui',
    match: ['ui', 'uien', 'sjalot', 'rode ui', 'bosui', 'prei'],
    svg: '<circle cx="32" cy="38" r="17"/><path d="M32 21q-6 9 0 17q6-8 0-17M32 21v-9M26 13l6-1l6 1"/>'
  },
  knoflook: {
    label: 'knoflook',
    match: ['knoflook', 'teen', 'tenen'],
    svg: '<path d="M32 14q-3 9-11 15q-7 6-5 13q3 12 16 12q13 0 16-12q2-7-5-13q-8-6-11-15zM32 14v-4"/><path d="M32 32v22M24 34q-2 8 2 18M40 34q2 8-2 18"/>'
  },
  paprika: {
    label: 'paprika',
    match: ['paprika', 'puntpaprika'],
    svg: '<path d="M22 24q-8 4-7 16q1 13 17 13q16 0 17-13q1-12-7-16q-5-3-10-1q-5-2-10 1zM32 22v-8q0-4 6-4"/>'
  },
  peper: {
    label: 'peper',
    match: ['peper', 'chili', 'chilipeper', 'rawit', 'jalapeño', 'sambal'],
    svg: '<path d="M40 16q8 14-4 30q-6 8-11 3q-6-6 3-16q8-9 12-17zM40 16q0-6 8-6"/>'
  },
  wortel: {
    label: 'wortel',
    match: ['wortel', 'wortels', 'winterpeen', 'bospeen'],
    svg: '<path d="M24 26L40 42q6-8 3-15q-3-7-11-4q-6 2-8 3zM24 26L14 52l26-10"/><path d="M44 20l8-8M46 26l9-3M40 18l3-9"/>'
  },
  pompoen: {
    label: 'pompoen',
    match: ['pompoen', 'flespompoen', 'butternut'],
    svg: '<ellipse cx="32" cy="38" rx="20" ry="15"/><path d="M32 24v29M22 25q-4 13 0 26M42 25q4 13 0 26M32 23v-7q0-4 6-4"/>'
  },
  komkommer: {
    label: 'komkommer',
    match: ['komkommer', 'augurk'],
    svg: '<path d="M14 47q-6-6 1-12l23-20q7-6 12-1q5 5-1 12L26 48q-6 5-12-1z"/><path d="M24 38h.1M32 31h.1M40 24h.1"/>'
  },
  radijs: {
    label: 'radijs',
    match: ['radijs', 'radijsjes', 'rammenas'],
    svg: '<circle cx="32" cy="38" r="13"/><path d="M32 51v9M32 25v-3M32 22q-3-9-10-11M32 22q3-9 10-11"/>'
  },
  courgette: {
    label: 'courgette',
    match: ['courgette'],
    svg: '<path d="M14 46q-4-5 2-9l28-19q7-4 10 1q3 5-3 9L23 47q-6 4-9-1zM47 17l5-5"/>'
  },
  champignon: {
    label: 'champignon',
    match: ['champignon', 'champignons', 'paddenstoel', 'shiitake', 'portobello'],
    svg: '<path d="M12 34q0-18 20-18q20 0 20 18q0 3-4 3H16q-4 0-4-3z"/><path d="M26 38l1 10q0 4 5 4q5 0 5-4l1-10"/>'
  },
  aardappel: {
    label: 'aardappel',
    match: ['aardappel', 'aardappels', 'aardappelen', 'krieltjes', 'friet'],
    svg: '<path d="M18 26q6-10 20-8q14 2 12 16q-2 14-16 14q-14 0-18-10q-2-6 2-12z"/><path d="M28 30h.1M38 36h.1M26 42h.1"/>'
  },
  ei: {
    label: 'ei',
    match: ['ei', 'eieren', 'eidooier', 'eiwit'],
    svg: '<path d="M32 12q13 12 13 26q0 14-13 14q-13 0-13-14q0-14 13-26z"/>'
  },
  kaas: {
    label: 'kaas',
    match: ['kaas', 'parmezaan', 'feta', 'mozzarella', 'geitenkaas', 'cheddar'],
    svg: '<path d="M10 44L50 24q6 5 4 12l-2 8H12q-4 0-2-8z"/><path d="M30 38h.1M40 42h.1M22 42h.1"/>'
  },
  kip: {
    label: 'kip',
    match: ['kip', 'kipfilet', 'kippendij', 'kipgehakt', 'drumstick'],
    svg: '<path d="M20 20q12-8 22 2q10 10 2 20q-8 8-18 2q-4-3-6-8zM18 38l-6 8M12 46l8 4"/>'
  },
  vis: {
    label: 'vis',
    match: ['vis', 'zalm', 'kabeljauw', 'tonijn', 'forel', 'makreel', 'ansjovis'],
    svg: '<path d="M12 32q10-12 24-12q10 6 16 12q-6 6-16 12q-14 0-24-12z"/><path d="M52 32l-14-8v16zM22 30h.1"/>'
  },
  garnaal: {
    label: 'garnaal',
    match: ['garnaal', 'garnalen', 'gamba'],
    svg: '<path d="M44 18q10 8 2 20q-8 12-22 10q-10-2-10-10q0-6 8-6q10 0 14-6q4-6 8-8zM44 18q-4-4-10-2M14 44l-4 8M20 46l0 8"/>'
  },
  gehakt: {
    label: 'gehakt(bal)',
    match: ['gehakt', 'rundergehakt', 'gehaktbal', 'gehaktballen', 'half-om-half'],
    svg: '<circle cx="30" cy="39" r="13"/><path d="M26 36h.1M34 42h.1M31 45h.1"/><path d="M39 30L48 19"/><circle cx="50" cy="16" r="3.5"/>'
  },
  worst: {
    label: 'worst',
    match: ['worst', 'worstjes', 'braadworst', 'chorizo', 'merguez', 'sucuk'],
    svg: '<path d="M12 38q0-8 10-8h20q10 0 10 8q0 8-10 8H22q-10 0-10-8z"/><path d="M11 35q-4-1-4-5M53 35q4-1 4-5"/><path d="M24 34l-2 6M38 34l-2 6"/>'
  },
  spek: {
    label: 'spek / bacon',
    match: ['spek', 'spekjes', 'spekreepjes', 'ontbijtspek', 'bacon', 'pancetta'],
    svg: '<path d="M12 26q7-6 13 0q7 6 14 0q6-5 13 0v12q-7-6-13 0q-7 6-14 0q-6-5-13 0z"/><path d="M12 32q7-6 13 0q7 6 14 0q6-5 13 0"/>'
  },
  biefstuk: {
    label: 'rund / biefstuk',
    match: ['biefstuk', 'rundvlees', 'entrecote', 'ribeye', 'steak', 'riblappen', 'sucade', 'stoofvlees'],
    svg: '<path d="M14 36q0-12 18-12q18 0 18 11q0 13-18 13q-18 0-18-12z"/><path d="M26 31q-4 3 0 6M36 34h.1M40 30h.1"/>'
  },
  pasta: {
    label: 'pasta',
    match: ['pasta', 'spaghetti', 'penne', 'macaroni', 'tagliatelle', 'lasagne', 'noedels', 'noodles'],
    svg: '<path d="M26 12v20M32 12v20M38 12v20"/><path d="M20 36q12-6 24 0q4 10-12 14q-16-4-12-14z"/>'
  },
  rijst: {
    label: 'rijst',
    match: ['rijst', 'basmati', 'risotto', 'couscous', 'bulgur', 'quinoa'],
    svg: '<path d="M12 34h40q0 18-20 18q-20 0-20-18z"/><path d="M22 28q2-4 0-8M32 28q2-4 0-8M42 28q2-4 0-8"/>'
  },
  brood: {
    label: 'brood',
    match: ['brood', 'stokbrood', 'pita', 'tortilla', 'wrap', 'bladerdeeg', 'deeg'],
    svg: '<path d="M12 40q-2-14 20-14q22 0 20 14q-1 10-20 10q-19 0-20-10z"/><path d="M24 32l-2 6M34 32l-2 6M44 32l-2 6"/>'
  },
  citroen: {
    label: 'citroen',
    match: ['citroen', 'limoen', 'citroensap', 'citroenrasp'],
    svg: '<path d="M14 40q-4-4 0-8q6-16 24-16q4-4 8 0q4 4 0 8q-6 16-24 16q-4 4-8 0z" transform="rotate(8 32 28) translate(2 6)"/>'
  },
  appel: {
    label: 'appel',
    match: ['appel', 'appels', 'peer', 'peren'],
    svg: '<path d="M31 22q-13-4-15 10q-1 12 8 17q4 2 8-1q4 3 8 1q9-5 8-17q-2-14-15-10zM32 21q0-7 6-9"/>'
  },
  gember: {
    label: 'gember',
    match: ['gember', 'kurkuma', 'gemberwortel'],
    svg: '<path d="M20 38q-8-2-6-10q2-8 10-6q4 1 6 4q2-6 9-5q7 1 6 8q0 4-3 6q6 2 5 9q-2 8-10 6q-8-2-9-8q-4 2-8-4z"/>'
  },
  kruiden: {
    label: 'verse kruiden',
    match: ['basilicum', 'peterselie', 'koriander', 'munt', 'tijm', 'rozemarijn', 'oregano', 'bieslook', 'dille', 'kruiden'],
    svg: '<path d="M32 54V22"/><path d="M32 34q-12 2-14-10q12-2 14 10zM32 26q12 2 14-10q-12-2-14 10zM32 44q-12 2-14-10q12-2 14 10z"/>'
  },
  boter: {
    label: 'boter / room',
    match: ['boter', 'roomboter', 'room', 'crème fraîche', 'creme fraiche', 'slagroom', 'kookroom'],
    svg: '<path d="M12 30h40v14q0 4-4 4H16q-4 0-4-4zM20 30v-6q0-4 4-4h16q4 0 4 4v6"/>'
  },
  melk: {
    label: 'melk / yoghurt',
    match: ['melk', 'yoghurt', 'karnemelk', 'kokosmelk'],
    svg: '<path d="M24 12h16v8l4 10v20q0 4-4 4H24q-4 0-4-4V30l4-10zM20 30h24"/>'
  },
  chocolade: {
    label: 'chocolade',
    match: ['chocolade', 'chocola', 'cacao', 'chocoladereep'],
    svg: '<rect x="16" y="14" width="32" height="36" rx="2"/><path d="M32 14v36M16 32h32"/>'
  },
  tofu: {
    label: 'tofu / peulvrucht',
    match: ['tofu', 'tempeh', 'kikkererwten', 'linzen', 'bonen', 'kidneybonen', 'erwten'],
    svg: '<path d="M14 26l18-8l18 8l-18 8z"/><path d="M14 26v14l18 8v-14M50 26v14l-18 8"/>'
  },
  bouillon: {
    label: 'bouillon / soep',
    match: ['bouillon', 'soep', 'fond'],
    svg: '<path d="M14 30h36v6q0 16-18 16q-18 0-18-16zM8 30h48"/><path d="M26 22q-2-4 0-8M38 22q-2-4 0-8"/>'
  },

  // ── keukenvlaggetjes ──────────────────────────────────────────────────────
  // Zelfde wapperende vlag op een stokje (VLAG), met per land een klein teken
  // erin. Echte vlaggen zijn in één kleur vaak niet te onderscheiden (Italië,
  // Frankrijk en Ierland zijn monochroom identiek), dus waar het vlagembleem
  // niet werkt staat er een gerechtje in. Match = typische voorraadkast-woorden.
  italiaans: {
    label: 'Italiaans',
    match: ['pesto', 'mascarpone', 'pecorino', 'gnocchi'],
    svg: VLAG + '<path d="M27 16l13 4l-9 10z"/><path d="M31 21h.1"/>'
  },
  frans: {
    label: 'Frans',
    match: ['dijonmosterd', 'provence', 'baguette'],
    svg: VLAG + '<path d="M26 27q1-9 7-9q6 0 7 9M26 27l-3 1M40 27l3 1"/>'
  },
  spaans: {
    label: 'Spaans',
    match: ['paella', 'saffraan', 'manchego'],
    svg: VLAG + '<path d="M33 28V16M33 28l-8-7M33 28l8-7M26 17q7-4 14 0"/>'
  },
  grieks: {
    label: 'Grieks',
    match: ['tzatziki', 'olijven', 'halloumi'],
    svg: VLAG + '<path d="M27 18v11M33 18v11M39 18v11M25 16h16M25 31h16"/>'
  },
  marokkaans: {
    label: 'Marokkaans',
    match: ['harissa', 'hanout', 'couscous'],
    svg: VLAG + '<path d="M25 28h16M27 28q0-8 6-8q6 0 6 8M33 20v-3"/>'
  },
  turks: {
    label: 'Turks',
    match: ['sucuk', 'filodeeg', 'granaatappel'],
    svg: VLAG + '<path d="M36 15A8 8 0 1 0 36 29A10 10 0 0 1 36 15z"/>'
  },
  indiaas: {
    label: 'Indiaas',
    match: ['masala', 'curry', 'naan', 'ghee', 'kerrie'],
    svg: VLAG + '<circle cx="33" cy="22" r="6.5"/><path d="M33 15.5v13M26.5 22h13"/>'
  },
  thais: {
    label: 'Thais',
    match: ['currypasta', 'vissaus', 'citroengras'],
    svg: VLAG + '<path d="M38 15q5 6-2 12q-5 4-8 1q-2-3 3-5q5-3 7-8zM38 15q0-3 4-3"/>'
  },
  japans: {
    label: 'Japans',
    match: ['miso', 'sushi', 'nori', 'mirin', 'sojasaus'],
    svg: VLAG + '<circle cx="33" cy="22" r="6"/>'
  },
  mexicaans: {
    label: 'Mexicaans',
    match: ['taco', 'tacos', 'guacamole', 'nachos'],
    svg: VLAG + '<path d="M33 30V15M33 23q-5 0-5-5M33 26q5 0 5-5"/>'
  }
};

// Kies automatisch max 3 icoontjes op basis van de ingrediëntentekst,
// in de volgorde waarin ze in de lijst staan (hoofdingrediënt staat meestal bovenaan).
function suggestIcons(ingredientsText) {
  const t = (ingredientsText || '').toLowerCase();
  const found = [];
  for (const [key, icon] of Object.entries(ICONS)) {
    let pos = Infinity;
    for (const w of icon.match) {
      const m = t.match(new RegExp(`(^|[^a-zà-ü])${w}([^a-zà-ü]|$)`));
      if (m && m.index < pos) pos = m.index;
    }
    if (pos !== Infinity) found.push({ key, pos });
  }
  return found.sort((a, b) => a.pos - b.pos).slice(0, 3).map((f) => f.key);
}

function iconSvg(key, size = 64, cls = '') {
  const icon = ICONS[key];
  if (!icon) return '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="${cls}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon.svg}</svg>`;
}

module.exports = { ICONS, suggestIcons, iconSvg };
