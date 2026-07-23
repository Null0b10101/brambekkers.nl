# brambekkers.nl

Persoonlijke receptensite van Bram Bekkers. Klein Express-appje met SQLite, server-side gerenderd, in de huisstijl Lemon Chiffon `#FAF0CA` / Regal Navy `#0D3B66`.

## Hoe het werkt

- **Tegels met ingrediënt-illustraties** — elk recept toont 2–3 ingrediënt-icoontjes (lijntekeningen, `server/icons.js`) op de overzichtstegel; automatisch gekozen uit de ingrediëntenlijst, handmatig aan te passen. Heeft een recept een foto, dan toont de tegel die.
- **Receptpagina** — optionele telefoonfoto (fallback: illustratie), afvinkbare ingrediënten (onthouden in localStorage), Recipe JSON-LD voor Google rich results.
- **Foto-pijplijn** (`server/photos.js`) — uploads worden server-side her-gecodeerd: WebP in 400/800/1600 + JPEG-fallback, EXIF/GPS gestript, crops 1:1/4:3/16:9 voor Google.
- **Social preview** — og:image is **altijd** de ingrediënt-illustratie op chiffon (`server/ogimage.js`), nooit de foto. Bewuste keuze.
- **Toevoegen** — beveiligd formulier op `/nieuw`: passkey (WebAuthn) of wachtwoord (argon2id), rate-limiting + fail2ban, sessies met HttpOnly/Secure/SameSite=Strict cookies.

## Deploy (op de VPS)

```bash
sudo bash deploy.sh
```

Idempotent: zet gebruiker `brambekkers`, `/opt/brambekkers` (code root-owned, `data/` app-owned), systemd-service op poort 3002 (alleen 127.0.0.1), nginx-vhost, fail2ban-jail en dagelijkse db-backup neer. `data/` (database + foto's) blijft bij elke deploy staan.

Bij de **eerste** deploy wordt een admin-wachtwoord gegenereerd in `/opt/brambekkers/data/ADMIN-WACHTWOORD.txt` (alleen root leesbaar). Na inloggen op `/login`: registreer een passkey via `/nieuw` → Beveiliging, en verwijder dat bestand.

Certificaat (zodra DNS naar de server wijst):

```bash
certbot --nginx -d brambekkers.nl -d www.brambekkers.nl --redirect -m brambekkers.cs@gmail.com --agree-tos
```

## Wachtwoord wijzigen

```bash
sudo -u brambekkers env DATA_DIR=/opt/brambekkers/data node /opt/brambekkers/server/set-password.js 'nieuw-wachtwoord'
```

## Lokaal draaien

```bash
npm install
RP_ID=localhost ORIGIN=http://localhost:3002 node server/index.js
node server/set-password.js --generate   # eerste keer
```
