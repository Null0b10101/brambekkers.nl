# Marktonderzoek: persoonlijke receptensites

*Uitgevoerd 2026-07-23 met een deep-research-workflow (Claude Code). Vraag: wat maakt receptensites met een persoonlijke touch goed, welke anti-patronen moeten we vermijden, en welke features missen we mogelijk op brambekkers.nl?*

## Methode

Het onderzoek liep in vijf fasen, uitgevoerd door 103 parallelle agents:

1. **Scope** — de vraag is opgedeeld in 5 zoekhoeken: exemplarische persoonlijke receptensites (bekend + indie), Nederlandstalige receptensites en foodblogs, UX-best-practices voor receptpagina's, anti-patronen en gebruikersergernissen, feature-set en indie-web-functionaliteit.
2. **Search** — 5 parallelle webzoek-agents, één per hoek (30 resultaten, dedup naar 21 unieke bronnen).
3. **Fetch** — de 21 bronnen zijn opgehaald en uitgelezen; daaruit zijn 104 falsifieerbare claims geëxtraheerd.
4. **Verify** — de top-25 claims zijn elk adversarieel geverifieerd door 3 onafhankelijke agents (2/3 refutaties = claim vervalt): 22 bevestigd, 3 afgevallen.
5. **Synthesize** — semantische duplicaten samengevoegd tot 11 bevindingen, gerangschikt op betrouwbaarheid, met bronnen.

Feature-verificaties op live sites (Uit Paulines Keuken, Smitten Kitchen, Love and Lemons, Minimalist Baker) zijn momentopnames van 2026-07-23.

## Hoofdconclusie

**brambekkers.nl zit qua opzet al aan de goede kant van vrijwel alle bekende ergernissen.** De anti-patronen (SEO-levensverhalen, advertenties, popups, trage pagina's) bestaan door ad- en SEO-prikkels die deze site niet heeft. De winst zit in een paar kleine ontdek-features en een scherpere persoonlijke belofte.

## Bevindingen

### 1. Anti-patroon: lange levensverhalen boven het recept *(hoog vertrouwen, 3-0)*
De bekendste receptensite-ergernis; puur SEO/advertentie-gedreven ("1000 woorden over de geschiedenis van eieren voordat je een omelet leert maken"). De alomtegenwoordige "Jump to Recipe"-knop bestaat vanwege déze frustratie. Aanbeveling: recept (vrijwel) direct bovenaan.
Bronnen: [simeongriggs.dev](https://www.simeongriggs.dev/designing-a-more-complete-recipe-website), [bootstrapped.ventures](https://bootstrapped.ventures/top-recipe-sites/), [AOL/Today over Recipeasly](https://www.aol.com/news/backlash-food-bloggers-website-aimed-173500434.html)

### 2. Anti-patroon: advertentie-overload en trage laadtijden *(hoog vertrouwen, 3-0/2-1)*
Popups, autoplay-video's, 10+ ads vóór het recept, ads tussen bereidingsstappen (typische receptpagina: 15–30 ads, 3–5 MB). Alles wat de kookflow onderbreekt is taboe. Vertaling: pagina licht houden, geen popups/modals — het kleine Express+SQLite-project is hier al in het voordeel.
Bronnen: [sidechef.com UX-analyse](https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites), [muffingroup.com](https://muffingroup.com/blog/recipe-website-design/), [bootstrapped.ventures](https://bootstrapped.ventures/top-recipe-sites/)

### 3. De Recipeasly-les: alleen met eigen content *(hoog vertrouwen, 3-0)*
Recipeasly (gelanceerd 28-02-2021) bood andermans recepten aan "zonder ads of levensverhalen" en werd binnen ~5 uur offline gedwongen door massale kritiek van foodbloggers. Een advertentievrije site is alleen onomstreden met eigen recepten. Praktisch: bij geïnspireerde recepten netjes bron/inspiratie vermelden.
Bronnen: [AOL](https://www.aol.com/news/backlash-food-bloggers-website-aimed-173500434.html), [Yahoo](https://www.yahoo.com/lifestyle/backlash-food-bloggers-website-aimed-173500381.html)

### 4. Persoonlijke touch is een kracht — mits kort *(gemiddeld vertrouwen, 3-0)*
Topblogs worden geprezen om storytelling (Pioneer Woman, Pinch of Yum); een korte intro met "net genoeg" achtergrond voelt als "koken met een vriend". Uit Paulines Keuken doet dit met een ondertekend homepage-welkomstbericht ("Liefs, Pauline"). Aanbeveling: 1–3 zinnen persoonlijke context per recept, direct gevolgd door het recept; kort ondertekend "over mij"-blok op de homepage.
Bronnen: [wpzoom.com](https://www.wpzoom.com/blog/best-recipe-blogs/), [bootstrapped.ventures](https://bootstrapped.ventures/top-recipe-sites/), [uitpaulineskeuken.nl](https://uitpaulineskeuken.nl/)

### 5. Presentatie-basis: clean layout + duidelijke categorieën *(gemiddeld vertrouwen, 3-0)*
Opgeruimde layout die het eten vooropzet plus recepten in duidelijke categorieën verbetert gebruikservaring én vindbaarheid. Het tegelgrid met ingrediënt-illustraties past hier goed in, mits gecombineerd met duidelijke categorie-ingangen naast de filterchips.
Bronnen: [samanthadigital.com](https://samanthadigital.com/food-blog-web-design-inspiration/), [sidechef.com](https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites)

### 6. Receptformaat-kernelementen *(gemiddeld vertrouwen, 3-0)*
"Jump to recipe"-anker (overbodig als het recept al bovenaan staat — principe: recept binnen één scroll), portie-schaling met realtime herberekening, afvinkbare ingrediënt-checkboxes (✓ hebben we al). Ontbrekende portie-aanpassing en ingrediëntfilters worden expliciet als UX-valkuil genoemd. Metrisch/imperiaal-toggle is voor een NL-site optioneel.
Bronnen: [bootstrapped.ventures](https://bootstrapped.ventures/top-recipe-sites/), [sidechef.com](https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites)

### 7. Facetfilters inclusief seizoen *(hoog vertrouwen, 3-0)*
Love and Lemons filtert op categorie, seizoen, dieet en ingrediënt; Uit Paulines Keuken biedt 11 combineerbare facetten waaronder seizoen (lente/zomer/herfst/winter), bereidingstijd en apparaat (live geverifieerd in hun FacetWP-config). Aanbeveling: seizoensfilter toevoegen aan de bestaande filterchips — klein om te bouwen.
Bronnen: [uitpaulineskeuken.nl/zoeken](https://uitpaulineskeuken.nl/zoeken), [loveandlemons.com/recipes](https://www.loveandlemons.com/recipes/)

### 8. Ingrediënt-gebaseerd zoeken ("wat heb je in huis") *(hoog vertrouwen, 3-0)*
Uit Paulines Keuken heeft op de homepage een selector met 48 aanvinkbare ingrediënten (live geverifieerd in de HTML). Lichte variant voor ons: recepten taggen op hoofdingrediënten + een "kies je ingrediënten"-pagina — sluit mooi aan op de ingrediënt-illustraties in het tegelgrid.
Bron: [uitpaulineskeuken.nl](https://uitpaulineskeuken.nl/)

### 9. Weekmenu-hulp en seizoenscollecties *(hoog vertrouwen, 3-0)*
Pauline heeft "Wat eten we vandaag?" (wekelijks ververst menu) en seizoenscollecties. Voor een kleine persoonlijke site past de lichte variant: een handmatig samengestelde "deze week/dit seizoen"-sectie op de homepage. Accounts en boodschappenlijst-generatie zijn op deze schaal overkill.
Bronnen: [uitpaulineskeuken.nl](https://uitpaulineskeuken.nl/), [uitpaulineskeuken.nl/wat-eten-we-vandaag](https://uitpaulineskeuken.nl/wat-eten-we-vandaag)

### 10. "Surprise me"-knop (random recept) *(hoog vertrouwen, 3-0)*
Smitten Kitchen — archetype van de persoonlijke receptensite — heeft "Surprise me!" als vast menu-item. Voor ons: één route + redirect (`ORDER BY RANDOM() LIMIT 1`) — maximale charme per regel code.
Bron: [smittenkitchen.com](https://smittenkitchen.com/)

### 11. Eenvoud-constraint als merk *(hoog vertrouwen, 3-0)*
Minimalist Baker werd groot op de belofte: elk recept "10 ingrediënten of minder, 1 kom, óf 30 minuten" (live geverifieerd op hun about-pagina). Overweeg een eigen expliciete belofte rond eenvoud, seizoen of de illustratie-esthetiek — zichtbaar als badge/chip per recept; het stuurt bovendien de curatie.
Bron: [minimalistbaker.com/about](https://minimalistbaker.com/about/)

## Aanbevelingen voor brambekkers.nl

**Wel doen** (klein → groter):
1. Random-receptknop (route + `ORDER BY RANDOM()`)
2. Seizoensfilter als extra filterchip
3. Portie-schaling met realtime herberekening
4. "Kies je ingrediënten"-zoek (lichte variant van Paulines selector)
5. Korte persoonlijke intro per recept (1–3 zinnen) + ondertekend "over mij"-blok
6. Handmatige "dit seizoen"-sectie op de homepage
7. Eigen belofte/constraint als badge per recept (eigenaarskeuze, potentieel het meest onderscheidend)

**Niet doen:**
- Lappen tekst vóór het recept
- Alles wat de kookflow onderbreekt (popups, modals, zware pagina's)
- Andermans recepten overnemen zonder bronvermelding
- Accounts, weekmenu-planner met opslag, boodschappenlijst-generatie (overkill voor deze schaal)

## Afgevallen claims (verificatie niet overleefd)

- "Persoonlijkheid in het sitedesign verhoogt lezersbinding" (0-3) — te generiek, geen bewijs.
- "Sites zonder jump-to-recipe-knop verliezen actief gebruikers" (0-3) — de zwakkere vorm ("gangbaar en gewaardeerd") is aangehouden.
- "RussianFood.com als voorbeeld van minimalistisch design" (1-2).

## Kanttekeningen

- Veel UX-advies komt uit vendor-blogs met commercieel belang (Bootstrapped Ventures verkoopt WP Recipe Maker; SideChef verkoopt receptplatform-diensten); de anti-patroon-claims zijn consensueel, niet gemeten via gebruikersonderzoek.
- De generalisatie van "Nederlandse receptensites" leunt op één (toonaangevende) site: Uit Paulines Keuken.
- Over kooktimers, print-CSS, kook-modus (wake-lock) en RSS overleefde geen enkele claim de verificatie — geen bewijs vóór of tegen; print-CSS en wake-lock zijn in de bredere literatuur wel gangbaar en goedkoop.

## Open vragen

1. Hoe landen ingrediënt-illustraties i.p.v. foodfotografie bij bezoekers? Alle onderzochte succesvoorbeelden leunen op fotografie — onze keuze is bewust onderscheidend maar onbewezen terrein.
2. Welke niet-geverifieerde features (print-CSS, kook-modus, per-recept-notities, RSS) leveren voor een klein persoonlijk publiek echt gebruik op?
3. Wat is de etiquette-standaard voor bronvermelding bij geïnspireerde recepten op een niet-commerciële site?
4. Is er Nederlandstalig gebruikersonderzoek naar receptensite-gedrag (zoek- vs. bladergedrag, mobiel in de keuken)?

## Statistieken

| | |
|---|---|
| Zoekhoeken | 5 |
| Bronnen opgehaald | 21 |
| Claims geëxtraheerd | 104 |
| Claims geverifieerd (3 stemmen elk) | 25 |
| Bevestigd / afgevallen | 22 / 3 |
| Bevindingen na synthese | 11 |
| Agents totaal | 103 |
