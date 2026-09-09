const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

const db = new sqlite3.Database(path.join(__dirname, "..", "dongwal.sqlite3"));

db.run("PRAGMA journal_mode=WAL", (err) => {
  if (err) log(`WAL PRAGMA err: ${err.message}`);
});

db.run(`
  CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'episode',
    series_slug TEXT,
    episode TEXT,
    image TEXT,
    source TEXT,
    played_at INTEGER NOT NULL
  );
`);

const runAsync = (sql, ...params) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const getAsync = (sql, ...params) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const allAsync = (sql, ...params) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

async function upsertHistory(entry) {
  const { slug, title, type = "episode", series_slug = null, episode = null, image = null, source = null } = entry;
  const ts = Date.now();
  await runAsync(
    `INSERT INTO watch_history (slug, title, type, series_slug, episode, image, source, played_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title, type = excluded.type, series_slug = excluded.series_slug,
       episode = excluded.episode, image = excluded.image, source = excluded.source,
       played_at = excluded.played_at`,
    slug, title, type, series_slug, episode, image, source, ts
  );
  return await getAsync(`SELECT * FROM watch_history WHERE slug = ?`, slug);
}

async function getHistory(limit = 20) {
  const rows = await allAsync(`SELECT * FROM watch_history ORDER BY played_at DESC LIMIT ?`, parseInt(limit) || 20);
  const { total } = await getAsync(`SELECT COUNT(*) AS total FROM watch_history`);
  return { list: rows, total: total || 0 };
}

async function removeHistory(slug) {
  const { changes } = await runAsync(`DELETE FROM watch_history WHERE slug = ?`, slug);
  return changes > 0;
}

async function clearHistory() {
  const { changes } = await runAsync(`DELETE FROM watch_history`);
  return changes;
}

module.exports = { upsertHistory, getHistory, removeHistory, clearHistory };
