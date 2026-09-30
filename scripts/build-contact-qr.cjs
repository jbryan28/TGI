// Build-time only. Install qrcode outside this site's production dependencies:
// npm install --prefix /tmp/tgi-contact-tools qrcode
// NODE_PATH=/tmp/tgi-contact-tools/node_modules node scripts/build-contact-qr.cjs
const QRCode = require('qrcode');
const path = require('node:path');
const fs = require('node:fs');
const target = 'https://www.tradergrowth.com/jay/';
QRCode.toString(target, { type: 'svg', errorCorrectionLevel: 'H', margin: 4, color: { dark: '#091411', light: '#ffffff' } })
  .then(svg => fs.writeFileSync(path.join(__dirname, '../jay/jay-qr.svg'), svg))
  .catch(error => { console.error(error); process.exit(1); });
