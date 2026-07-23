// Zet of vervangt het admin-wachtwoord.
//   node server/set-password.js --generate   → genereert er een en print het
//   node server/set-password.js 'mijn-nieuwe-wachtwoord'
const crypto = require('crypto');
const { setPassword } = require('./auth');

(async () => {
  let pw = process.argv[2];
  if (pw === '--generate') {
    pw = crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x');
    await setPassword(pw);
    console.log(pw);
  } else if (pw && pw.length >= 10) {
    await setPassword(pw);
    console.log('Wachtwoord bijgewerkt.');
  } else {
    console.error('Gebruik: node server/set-password.js --generate | <wachtwoord van min. 10 tekens>');
    process.exit(1);
  }
})();
