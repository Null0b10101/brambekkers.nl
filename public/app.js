// brambekkers.nl — client-side gedrag (progressive enhancement)

// ── thema wisselen (zon/maan in de navigatie) ─────────────────────────────
const themaKnop = document.getElementById('thema-knop');
if (themaKnop) {
  themaKnop.addEventListener('click', () => {
    const root = document.documentElement;
    const nieuw = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nieuw;
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
