// Zet het thema vóór de eerste paint (voorkomt een lichtflits bij donker thema).
// Keuze van de bezoeker (localStorage) wint van de systeemvoorkeur.
(function () {
  var keuze = null;
  try { keuze = localStorage.getItem('thema'); } catch (e) {}
  var donker = keuze ? keuze === 'dark'
    : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = donker ? 'dark' : 'light';
})();
