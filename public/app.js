// brambekkers.nl — client-side gedrag (progressive enhancement)

// ── thema wisselen (zon/maan in de navigatie) ─────────────────────────────
const themaKnop = document.getElementById('thema-knop');
if (themaKnop) {
  themaKnop.addEventListener('click', () => {
    const root = document.documentElement;
    const nieuw = root.dataset.theme === 'dark' ? 'light' : 'dark';
    zetThema(nieuw);
    try { localStorage.setItem('thema', nieuw); } catch (e) {}
  });
}

// ── ingrediënten afvinken, onthouden per recept ───────────────────────────
const recept = document.querySelector('.recept[data-slug]');
if (recept) {
  const key = 'afgevinkt:' + recept.dataset.slug;
  const boxes = recept.querySelectorAll('.ingredienten input[type=checkbox]');
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  boxes.forEach((box, i) => {
    box.checked = saved.includes(i);
    box.addEventListener('change', () => {
      const on = [...boxes].flatMap((b, j) => (b.checked ? [j] : []));
      localStorage.setItem(key, JSON.stringify(on));
    });
  });
}

// ── porties schalen ───────────────────────────────────────────────────────
// Herrekent het getal waarmee een ingrediëntregel begint ("250 g bloem",
// "½ citroen"); regels zonder getal ("snuf zout") blijven staan. Met een
// getal in het portieveld telt de knop in porties, anders in ×-factoren.
if (recept) {
  const FRACTIES = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  function leesGetal(s) {
    let m = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
    if (m) return { v: parseFloat(m[1].replace(',', '.')), v2: parseFloat(m[2].replace(',', '.')), len: m[0].length };
    m = s.match(/^(\d+)\s*([¼½¾⅓⅔])/);
    if (m) return { v: +m[1] + FRACTIES[m[2]], len: m[0].length };
    m = s.match(/^([¼½¾⅓⅔])/);
    if (m) return { v: FRACTIES[m[1]], len: m[0].length };
    m = s.match(/^(\d+)\s*\/\s*(\d+)/);
    if (m && +m[2]) return { v: +m[1] / +m[2], len: m[0].length };
    m = s.match(/^\d+(?:[.,]\d+)?/);
    if (m) return { v: parseFloat(m[0].replace(',', '.')), len: m[0].length };
    return null;
  }
  function maakGetal(v) {
    const heel = Math.floor(v + 1e-9);
    const rest = v - heel;
    if (rest < 0.04 || rest > 0.96) return String(Math.round(v));
    for (const [teken, f] of Object.entries(FRACTIES))
      if (Math.abs(rest - f) < 0.04) return (heel || '') + teken;
    return String(Math.round(v * 100) / 100).replace('.', ',');
  }

  const regels = [...recept.querySelectorAll('.ingredienten li span')]
    .map((el) => ({ el, orig: el.textContent, getal: leesGetal(el.textContent) }));
  const blok = document.getElementById('porties');
  if (blok && regels.some((r) => r.getal)) {
    const tekstEl = document.getElementById('porties-tekst');
    const basis = parseInt(recept.dataset.porties, 10) || 0;
    const servings = recept.dataset.servings || '';
    const FACTOREN = [0.5, 1, 1.5, 2, 3, 4];
    let porties = basis;
    let fi = 1; // index in FACTOREN als er geen portie-getal is
    function render() {
      const factor = basis ? porties / basis : FACTOREN[fi];
      tekstEl.textContent = basis ? servings.replace(/\d+/, porties) : '×' + String(FACTOREN[fi]).replace('.', ',');
      for (const r of regels) {
        if (!r.getal) continue;
        const g = maakGetal(r.getal.v * factor) + (r.getal.v2 ? '-' + maakGetal(r.getal.v2 * factor) : '');
        r.el.textContent = g + r.orig.slice(r.getal.len);
      }
    }
    document.getElementById('porties-min').addEventListener('click', () => {
      if (basis) porties = Math.max(1, porties - 1); else fi = Math.max(0, fi - 1);
      render();
    });
    document.getElementById('porties-plus').addEventListener('click', () => {
      if (basis) porties = Math.min(24, porties + 1); else fi = Math.min(FACTOREN.length - 1, fi + 1);
      render();
    });
    render();
    blok.hidden = false;
  }
}

// ── WebAuthn-hulpjes ──────────────────────────────────────────────────────
const b64uToBuf = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const bufToB64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ── login: passkey aanbieden als die er is ────────────────────────────────
const passkeyBlok = document.getElementById('passkey-blok');
if (passkeyBlok && window.PublicKeyCredential) {
  fetch('/api/webauthn/login-options').then((r) => {
    if (r.ok) passkeyBlok.hidden = false;
  }).catch(() => {});
  document.getElementById('passkey-login').addEventListener('click', async () => {
    try {
      const opts = await (await fetch('/api/webauthn/login-options')).json();
      opts.challenge = b64uToBuf(opts.challenge);
      (opts.allowCredentials || []).forEach((c) => { c.id = b64uToBuf(c.id); });
      const cred = await navigator.credentials.get({ publicKey: opts });
      const payload = {
        id: cred.id, rawId: bufToB64u(cred.rawId), type: cred.type,
        clientExtensionResults: cred.getClientExtensionResults(),
        response: {
          authenticatorData: bufToB64u(cred.response.authenticatorData),
          clientDataJSON: bufToB64u(cred.response.clientDataJSON),
          signature: bufToB64u(cred.response.signature),
          userHandle: cred.response.userHandle ? bufToB64u(cred.response.userHandle) : null
        }
      };
      const res = await fetch('/api/webauthn/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) location.href = '/nieuw';
      else alert('Passkey-login mislukt, probeer je wachtwoord.');
    } catch (e) { /* geannuleerd */ }
  });
}

// ── /nieuw: passkey registreren ───────────────────────────────────────────
const regBtn = document.getElementById('passkey-register');
if (regBtn) {
  regBtn.addEventListener('click', async () => {
    const status = document.getElementById('passkey-status');
    try {
      const opts = await (await fetch('/api/webauthn/register-options')).json();
      opts.challenge = b64uToBuf(opts.challenge);
      opts.user.id = b64uToBuf(opts.user.id);
      (opts.excludeCredentials || []).forEach((c) => { c.id = b64uToBuf(c.id); });
      const cred = await navigator.credentials.create({ publicKey: opts });
      const payload = {
        id: cred.id, rawId: bufToB64u(cred.rawId), type: cred.type,
        clientExtensionResults: cred.getClientExtensionResults(),
        response: {
          attestationObject: bufToB64u(cred.response.attestationObject),
          clientDataJSON: bufToB64u(cred.response.clientDataJSON),
          transports: cred.response.getTransports ? cred.response.getTransports() : []
        }
      };
      const res = await fetch('/api/webauthn/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      status.textContent = res.ok ? 'Passkey geregistreerd — je kunt voortaan inloggen zonder wachtwoord.' : 'Registreren mislukt.';
    } catch (e) {
      status.textContent = 'Registreren geannuleerd of mislukt.';
    }
  });
}

// ── Lezen: artikel- en paper-formulieren (JSON-POST) ──────────────────────
function koppelForm(id, endpoint, naar) {
  const f = document.getElementById(id);
  if (!f) return;
  f.addEventListener('submit', (e) => e.preventDefault());
  f.querySelectorAll('button[name=status], button[name=save]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const fout = document.getElementById('form-fout');
      if (fout) fout.hidden = true;
      if (!f.reportValidity()) return;
      const fd = new FormData(f);
      if (btn.name === 'status') fd.set('status', btn.value);
      if (f.dataset.bewerk) fd.set('bewerk', f.dataset.bewerk);
      btn.disabled = true;
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams(fd) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Onbekende fout');
        location.href = naar(data.slug);
      } catch (err) {
        if (fout) { fout.textContent = err.message; fout.hidden = false; }
        btn.disabled = false;
      }
    });
  });
}
koppelForm('artikel-form', '/api/artikelen', (slug) => '/lezen/' + slug);
koppelForm('paper-form', '/api/papers', () => '/lezen#leeslijst');

// ── /nieuw: formulier + automatische icoontjes ────────────────────────────
const form = document.getElementById('recept-form');
if (form) {
  const iconData = JSON.parse(document.getElementById('icon-data').textContent);
  const iconBoxes = [...form.querySelectorAll('#icon-keuze input')];
  let handmatig = iconBoxes.some((b) => b.checked); // bij bewerken niets overschrijven
  iconBoxes.forEach((b) => b.addEventListener('change', () => { handmatig = true; }));

  const ingrediënten = form.querySelector('[name=ingredients]');
  ingrediënten.addEventListener('input', () => {
    if (handmatig) return;
    const t = ' ' + ingrediënten.value.toLowerCase() + ' ';
    let n = 0;
    iconBoxes.forEach((b) => { b.checked = false; });
    for (const box of iconBoxes) {
      if (n === 3) break;
      if (iconData[box.value].some((w) => t.includes(w))) { box.checked = true; n++; }
    }
  });

  form.addEventListener('submit', (e) => e.preventDefault());
  form.querySelectorAll('button[name=status]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const fout = document.getElementById('form-fout');
      fout.hidden = true;
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      fd.set('status', btn.value);
      if (form.dataset.bewerk) fd.set('bewerk', form.dataset.bewerk);
      btn.disabled = true;
      try {
        const res = await fetch('/api/recepten', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Onbekende fout');
        location.href = '/recept/' + data.slug;
      } catch (err) {
        fout.textContent = err.message;
        fout.hidden = false;
        btn.disabled = false;
      }
    });
  });
}
