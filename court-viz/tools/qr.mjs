// Make the container's QR code: node tools/qr.mjs https://hoopheroes.co.uk
import QRCode from 'qrcode';

const url = process.argv[2] ?? 'https://hoopheroes.co.uk';
await QRCode.toFile(new URL('../assets/qr.png', import.meta.url).pathname, url, {
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 1200,
  color: { dark: '#14264e', light: '#ffffff' },
});
console.log(`assets/qr.png -> ${url}`);
