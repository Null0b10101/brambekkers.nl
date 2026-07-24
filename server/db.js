const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'photos'), { recursive: true, mode: 0o750 });
fs.mkdirSync(path.join(DATA_DIR, 'og'), { recursive: true, mode: 0o750 });

const DB_PATH = path.join(DATA_DIR, 'brambekkers.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
// db-bestanden (incl. -wal/-shm) niet leesbaar voor andere gebruikers: bevat
// wachtwoordhash en sessietokens.
for (const f of ['brambekkers.db', 'brambekkers.db-wal', 'brambekkers.db-shm']) {
  try { fs.chmodSync(path.join(DATA_DIR, f), 0o600); } catch (e) { /* nog niet aangemaakt */ }
}

db.exec(`
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  time_min INTEGER,
  servings TEXT DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  ingredients TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '',
  icons TEXT NOT NULL DEFAULT '[]',
  has_photo INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  topics TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '',
  year INTEGER,
  source TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT DEFAULT '[]',
  created_at TEXT NOT NULL
);
`);

// Migratie 2026-07: actieve tijd (hands-on) naast totale tijd; time_min is
// sindsdien de totale tijd in exacte minuten (was: bovengrens van een tijdvak).
const recipeCols = db.prepare('PRAGMA table_info(recipes)').all().map((c) => c.name);
if (!recipeCols.includes('active_min')) db.exec('ALTER TABLE recipes ADD COLUMN active_min INTEGER');

// Migratie 2026-07: seizoenen (lente/zomer/herfst/winter) als apart filter
// naast de tags, zelfde JSON-array-vorm.
if (!recipeCols.includes('seasons')) db.exec("ALTER TABLE recipes ADD COLUMN seasons TEXT NOT NULL DEFAULT '[]'");

module.exports = { db, DATA_DIR };
