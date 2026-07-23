# Logo bram bekkers — v1.0

Twee vaste onderdelen, altijd uit dit pakket gebruiken (nooit opnieuw tekenen):

- **Wordmark "dansende letters"** — handgetekende monolijn-letters (geen lettertype; vrij van fontlicenties). Primair logo: navigatie, documenten, brede vlakken.
- **Beeldmerk "stoomstempel"** — bb met stoomkrullen in stippelring. Voor kleine en vierkante plekken: favicon, avatars, og-beelden, receptkaart-stempel.

Alles wordt gegenereerd door `scripts/genereer-logo.js` (bron van waarheid). Aanpassen = script aanpassen en opnieuw draaien, nooit losse bestanden bewerken.

## Bestanden

- `vector/{navy,chiffon,zwart}/` — masters: `bb-wordmark`, `bb-beeldmerk`, `bb-horizontaal` (beeldmerk + wordmark), `bb-gestapeld` (beeldmerk boven wordmark). Navy op licht, chiffon op donker/navy, zwart voor druk/één-kleur.
- `raster/` — PNG's (512/1024/2048 breed, transparant).
- `social-avatar.png` — 1024×1024, stempel binnen de circle-crop-veilige zone.
- Webassets staan in `public/`: `favicon.svg`, `apple-touch-icon.png`.

## Regels

- **Witruimte:** rondom minimaal de hoogte van de letter "b" van het wordmark (bij het beeldmerk: ¼ van de stempeldiameter).
- **Minimumformaat:** wordmark 110 px / 28 mm breed; volledige stempel 48 px / 12 mm. Kleiner (favicon 16–32 px): gebruik de **vereenvoudigde stempel zonder stippelring** (`public/favicon.svg`) — de stippels dichten anders.
- **Kleur:** alleen navy `#0D3B66`, chiffon `#FAF0CA` of zwart. Op foto's: alleen chiffon-versie op een donker vlak eronder.
- **Niet doen:** uitrekken, roteren, andere kleuren, schaduw/gradiënt/outline, letters herschikken, de stippelring op klein formaat, wordmark en stempel te dicht op elkaar (gebruik dan `bb-horizontaal`).

## Merkregistratie

Niet gecheckt op merkregisters — voor een persoonlijke naamsite is dat doorgaans geen punt; mocht er ooit iets commercieels onder deze naam komen, dan eerst BOIP/EUIPO laten checken.
