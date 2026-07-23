// Compacte, veilige Markdown→HTML-renderer voor de "Lezen"-artikelen.
// Veiligheidsmodel: alle invoer wordt éérst volledig HTML-geëscaped, daarna
// introduceren we alleen een gecontroleerde set tags terug. Rauwe HTML die de
// schrijver typt wordt dus inerte tekst — er kan geen tag/script binnenkomen.
// Ondersteunt: ## / ### koppen, alinea's, **vet**, *cursief*, `code`,
// [tekst](url), lijsten (- en 1.), > citaat, --- streep, en [@paper-slug]
// literatuurverwijzingen die naar de leeslijst linken.

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeUrl(raw) {
  const u = raw.trim();
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : '#';
}

// Rendert markdown. papers = { slug: {shortLabel} }. Retourneert { html, cited }
// waarbij cited de in-tekst geciteerde paper-slugs in volgorde van eerste
// voorkomen zijn.
function renderMarkdown(md, papers = {}) {
  const cited = [];
  const escInline = (t) => {
    // t is al HTML-geëscaped
    // [@paper-slug] → superscript-verwijzing naar de leeslijst
    t = t.replace(/\[@([a-z0-9-]+)\]/gi, (m, slug) => {
      const p = papers[slug];
      if (!p) return m;
      if (!cited.includes(slug)) cited.push(slug);
      return `<sup class="cite"><a href="#paper-${slug}">${escapeHtml(p.shortLabel)}</a></sup>`;
    });
    // [tekst](url)
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
      const href = safeUrl(url);
      const ext = /^https?:/i.test(url.trim());
      return `<a href="${href}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${txt}</a>`;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    return t;
  };

  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{2,3}\s|>\s?|\s*[-*]\s|\s*\d+\.\s|---+\s*$)/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^###\s+/.test(line)) { out.push(`<h3>${escInline(escapeHtml(line.replace(/^###\s+/, '')))}</h3>`); i++; continue; }
    if (/^##\s+/.test(line)) { out.push(`<h2>${escInline(escapeHtml(line.replace(/^##\s+/, '')))}</h2>`); i++; continue; }
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(escapeHtml(lines[i].replace(/^>\s?/, ''))); i++; }
      out.push(`<blockquote>${escInline(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { buf.push(`<li>${escInline(escapeHtml(lines[i].replace(/^\s*[-*]\s+/, '')))}</li>`); i++; }
      out.push(`<ul>${buf.join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push(`<li>${escInline(escapeHtml(lines[i].replace(/^\s*\d+\.\s+/, '')))}</li>`); i++; }
      out.push(`<ol>${buf.join('')}</ol>`);
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { buf.push(escapeHtml(lines[i])); i++; }
    out.push(`<p>${escInline(buf.join(' '))}</p>`);
  }

  return { html: out.join('\n'), cited };
}

// Korte etiket voor een paper: achternaam eerste auteur + jaar (bijv. "Boer 2023").
// Papers worden meestal geciteerd als "Achternaam Initialen" (Boer J), dus we
// pakken het eerste woord dat geen initiaal is.
function paperShortLabel(authors, year) {
  const first = (authors || '').split(/[,;&]/)[0].trim();
  const woorden = first.split(/\s+/).filter(Boolean);
  const naam = woorden.find((w) => w.replace(/\./g, '').length > 1) || woorden[0] || 'Paper';
  return year ? `${naam} ${year}` : naam;
}

// Eerste alinea platte tekst als samenvatting voor de kaartjes.
function plainIntro(md, max = 160) {
  const t = String(md).replace(/\r\n/g, '\n').split('\n\n')[0]
    .replace(/[#>*`_-]/g, '').replace(/\[@[a-z0-9-]+\]/gi, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

module.exports = { renderMarkdown, paperShortLabel, plainIntro, escapeHtml };
