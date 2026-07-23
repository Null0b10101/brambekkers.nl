const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { DATA_DIR } = require('./db');

// Verwerkt een geüploade foto tot alle benodigde varianten.
// - .rotate() past de EXIF-oriëntatie toe; metadata (incl. GPS) wordt daarna
//   NIET teruggeschreven, dus elke output is schoon.
// - srcset-breedtes voor de pagina, JPEG-fallback, en de drie crops
//   (1:1 / 4:3 / 16:9) die Google voor Recipe rich results vraagt.
async function processPhoto(buffer, slug) {
  const dir = path.join(DATA_DIR, 'photos', slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const base = sharp(buffer, { failOn: 'error' }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error('Geen geldige afbeelding');

  const jobs = [
    ...[400, 800, 1600].map((w) =>
      base.clone().resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 }).toFile(path.join(dir, `w${w}.webp`))),
    base.clone().resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(dir, 'fallback.jpg')),
    base.clone().resize(1200, 1200, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(dir, 'crop-1x1.jpg')),
    base.clone().resize(1200, 900, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(dir, 'crop-4x3.jpg')),
    base.clone().resize(1200, 675, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(dir, 'crop-16x9.jpg'))
  ];
  await Promise.all(jobs);
}

function removePhoto(slug) {
  fs.rmSync(path.join(DATA_DIR, 'photos', slug), { recursive: true, force: true });
}

module.exports = { processPhoto, removePhoto };
