// Zet het thema vóór de eerste paint (voorkomt een lichtflits bij donker thema).
// Keuze van de bezoeker (localStorage) wint van de systeemvoorkeur.
(function () {
  // Achtergrond direct als inline stijl op <html>, vóór de stylesheet geladen
  // is: tussen twee pagina's tekent de browser anders heel even zijn witte
  // standaardcanvas. Kleuren gelijk houden aan --chiffon in style.css.
  window.zetThema = function (naam) {
    var wortel = document.documentElement;
    wortel.dataset.theme = naam;
    wortel.style.backgroundColor = naam === 'dark' ? '#0A2C4C' : '#FAF0CA';
    wortel.style.colorScheme = naam;
  };
  var keuze = null;
  try { keuze = localStorage.getItem('thema'); } catch (e) {}
  var donker = keuze ? keuze === 'dark'
    : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  window.zetThema(donker ? 'dark' : 'light');
})();
