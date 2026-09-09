const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const axios = require("axios");
const { SOURCES, SOURCE_LIST, getSource, resolveSource, mergeResults } = require("./lib/sources");
const { upsertHistory, getHistory, removeHistory, clearHistory } = require("./lib/db");
const { version } = require("./package.json");

const app = express();
const PORT = process.env.PORT || 2504;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const log = (msg) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
};

const ok = (data, extra = {}) => ({
  status: true,
  sources: SOURCE_LIST,
  version,
  ...extra,
  data,
});

const fail = (message, error = null) => ({
  status: false,
  message,
  error: error?.message || null,
});

// ─── Web UI ───
app.get("/", (req, res) => {
  res.render("index", { version, sources: SOURCE_LIST });
});

// ─── API: Sources list ───
app.get("/api/sources", (req, res) => {
  res.json(ok(SOURCE_LIST.map((id) => ({ id, label: SOURCES[id].label, base: SOURCES[id].base }))));
});

// ─── API: Slider ───
app.get("/slide", async (req, res) => {
  try {
    const src = req.query.source;
    log(`GET /slide source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.slider()));
    const merged = mergeResults(results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value));
    res.json(ok(merged, { total: merged.length }));
  } catch (e) {
    log(`ERROR /slide: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil slider", e));
  }
});

// ─── API: Popular ───
app.get("/popular", async (req, res) => {
  try {
    const src = req.query.source;
    log(`GET /popular source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.popular()));
    const merged = mergeResults(results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value));
    res.json(ok(merged, { total: merged.length }));
  } catch (e) {
    log(`ERROR /popular: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil popular", e));
  }
});

// ─── API: Latest ───
app.get("/latest", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const src = req.query.source;
    log(`GET /latest?page=${page} source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.latest(page)));
    const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const allItems = mergeResults(fulfilled.flatMap((r) => r.items || []));
    const pagination = fulfilled[0]?.pagination || null;
    res.json(ok({ items: allItems, pagination }));
  } catch (e) {
    log(`ERROR /latest: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil latest", e));
  }
});

// ─── API: Genres ───
app.get("/genres", async (req, res) => {
  try {
    const src = req.query.source;
    log(`GET /genres source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.genres()));
    const merged = mergeResults(results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value));
    res.json(ok(merged, { total: merged.length }));
  } catch (e) {
    log(`ERROR /genres: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil genres", e));
  }
});

// ─── API: Genre Detail ───
app.get("/genres/:genre", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const src = req.query.source;
    log(`GET /genres/${req.params.genre}?page=${page} source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.genre(req.params.genre, page)));
    const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const allItems = mergeResults(fulfilled.flatMap((r) => r.items || []));
    const pagination = fulfilled[0]?.pagination || null;
    res.json(ok({ genre: req.params.genre, slug: req.params.genre, page, items: allItems, pagination }));
  } catch (e) {
    log(`ERROR /genres/${req.params.genre}: ${e.message}`);
    res.status(500).json(fail(`Gagal mengambil genre ${req.params.genre}`, e));
  }
});

// ─── API: Detail ───
app.get("/detail/*", async (req, res) => {
  try {
    const slug = req.params[0] || req.params.slug;
    const src = req.query.source;
    log(`GET /detail/${slug} source=${src || "all"}`);
    const sources = resolveSource(src);
    let detail = null;
    for (const s of sources) {
      try { detail = await s.detail(slug); if (detail) break; } catch (_) {}
    }
    if (!detail) return res.status(404).json(fail(`Detail ${slug} tidak ditemukan`));
    res.json(ok(detail));
  } catch (e) {
    log(`ERROR /detail/${req.params[0]}: ${e.message}`);
    res.status(500).json(fail(`Gagal mengambil detail ${req.params[0]}`, e));
  }
});

// ─── API: Episode ───
app.get("/episode/*", async (req, res) => {
  try {
    const slug = req.params[0] || req.params.slug;
    const src = req.query.source;
    log(`GET /episode/${slug} source=${src || "all"}`);
    const sources = resolveSource(src);
    let episode = null;
    for (const s of sources) {
      try { episode = await s.episode(slug); if (episode) break; } catch (_) {}
    }
    if (!episode) return res.status(404).json(fail(`Episode ${slug} tidak ditemukan`));
    res.json(ok(episode));
  } catch (e) {
    log(`ERROR /episode/${req.params[0]}: ${e.message}`);
    res.status(500).json(fail(`Gagal mengambil episode ${req.params[0]}`, e));
  }
});

// ─── API: History ───
app.get("/api/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    log(`GET /api/history?limit=${limit}`);
    const hist = await getHistory(limit);
    res.json(ok(hist.list, { total: hist.total }));
  } catch (e) {
    log(`ERROR /api/history: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil riwayat", e));
  }
});

app.post("/api/history", async (req, res) => {
  try {
    const { slug, title, series_slug, episode, image, source, type } = req.body || {};
    if (!slug || !title) return res.status(400).json(fail("Field 'slug' dan 'title' wajib diisi"));
    log(`POST /api/history ${slug}`);
    const row = await upsertHistory({ slug, title, series_slug, episode, image, source, type });
    res.json(ok(row, { message: "Riwayat tersimpan" }));
  } catch (e) {
    log(`ERROR POST /api/history: ${e.message}`);
    res.status(500).json(fail("Gagal menyimpan riwayat", e));
  }
});

app.delete("/api/history/*", async (req, res) => {
  try {
    const slug = req.params[0] || req.params.slug;
    log(`DELETE /api/history/${slug}`);
    const removed = await removeHistory(slug);
    res.json(ok(null, { removed, message: removed ? "Riwayat dihapus" : "Riwayat tidak ditemukan" }));
  } catch (e) {
    log(`ERROR DELETE /api/history: ${e.message}`);
    res.status(500).json(fail("Gagal menghapus riwayat", e));
  }
});

app.delete("/api/history", async (req, res) => {
  try {
    log("DELETE /api/history (clear)");
    const removed = await clearHistory();
    res.json(ok(null, { removed, message: "Semua riwayat dihapus" }));
  } catch (e) {
    log(`ERROR DELETE /api/history clear: ${e.message}`);
    res.status(500).json(fail("Gagal menghapus riwayat", e));
  }
});

// ─── API: Search ───
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const src = req.query.source;
    if (!q) return res.status(400).json(fail("Parameter 'q' wajib diisi"));
    log(`GET /search?q=${q}&page=${page} source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.search(q, page)));
    const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const allResults = mergeResults(fulfilled.flatMap((r) => r.results || []));
    const pagination = fulfilled[0]?.pagination || null;
    res.json(ok({ query: q, results: allResults, pagination }));
  } catch (e) {
    log(`ERROR /search: ${e.message}`);
    res.status(500).json(fail("Gagal melakukan pencarian", e));
  }
});

// ─── API: Ongoing ───
app.get("/ongoing", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const src = req.query.source;
    log(`GET /ongoing?page=${page} source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.ongoing(page)));
    const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const allItems = mergeResults(fulfilled.flatMap((r) => r.items || []));
    const pagination = fulfilled[0]?.pagination || null;
    res.json(ok({ items: allItems, pagination }));
  } catch (e) {
    log(`ERROR /ongoing: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil ongoing", e));
  }
});

// ─── API: Completed ───
app.get("/completed", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const src = req.query.source;
    log(`GET /completed?page=${page} source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.completed(page)));
    const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const allItems = mergeResults(fulfilled.flatMap((r) => r.items || []));
    const pagination = fulfilled[0]?.pagination || null;
    res.json(ok({ items: allItems, pagination }));
  } catch (e) {
    log(`ERROR /completed: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil completed", e));
  }
});

// ─── API: Schedule ───
app.get("/schedule", async (req, res) => {
  try {
    const src = req.query.source;
    log(`GET /schedule source=${src || "all"}`);
    const sources = resolveSource(src);
    const results = await Promise.allSettled(sources.map((s) => s.schedule()));
    const allDays = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
    const dayMap = {};
    for (const day of allDays) {
      const key = day.day || day.label;
      if (!dayMap[key]) dayMap[key] = { ...day, items: [] };
      dayMap[key].items.push(...(day.items || []));
    }
    res.json(ok(Object.values(dayMap)));
  } catch (e) {
    log(`ERROR /schedule: ${e.message}`);
    res.status(500).json(fail("Gagal mengambil schedule", e));
  }
});

// ─── Web: Player page ───
app.get("/play/*", async (req, res) => {
  const slug = req.params[0] || "";
  log(`GET /play/${slug}`);
  res.render("player", { slug, version, sources: SOURCE_LIST });
});

// ─── Stream proxy ───
const STREAM_REFERER = "https://anichin.stream/";
let streamCache = new Map();
const streamCacheMax = 200;

app.get("/api/stream", async (req, res) => {
  const { url } = req.query;
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json(fail("Parameter 'url' wajib berupa http(s)"));
  try {
    const cached = streamCache.get(url);
    if (cached && Date.now() - cached.at < 60 * 1000) {
      res.set("Content-Type", cached.type);
      return res.send(cached.body);
    }
    const r = await axios.get(url, {
      headers: { Referer: STREAM_REFERER, "User-Agent": "Mozilla/5.0" },
      responseType: "arraybuffer",
      timeout: 20000,
    });
    let body = Buffer.from(r.data);
    const ctype = String(r.headers["content-type"] || "application/octet-stream");
    if (/mpegurl|m3u8|vnd\.apple/i.test(ctype)) body = rewriteM3u8(body.toString("utf8"), url);
    streamCache.set(url, { at: Date.now(), body, type: ctype });
    if (streamCache.size > streamCacheMax) { const oldest = streamCache.keys().next().value; streamCache.delete(oldest); }
    res.set({ "Content-Type": ctype, "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" });
    res.send(body);
  } catch (e) {
    log(`STREAM ERR ${url}: ${e.message}`);
    res.status(502).json(fail("Gagal mengambil stream", e));
  }
});

function rewriteM3u8(playlist, baseUrl) {
  const base = new URL(baseUrl);
  const out = [];
  for (const line of playlist.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) { out.push(line); continue; }
    const resolved = /^https?:\/\//i.test(t) ? t : new URL(t, base).href;
    out.push(`/api/stream?url=${encodeURIComponent(resolved)}`);
  }
  return out.join("\n");
}

// 404
app.use((req, res) => { res.status(404).json(fail("Endpoint tidak ditemukan")); });

// Error handler
app.use((err, req, res, _next) => {
  log(`FATAL: ${err.message}`);
  res.status(500).json(fail("Internal Server Error", err));
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║            DONGWAL  API  v${version}                   ║
  ║                                                   ║
  ║  Server    : http://localhost:${String(PORT).padEnd(20)}║
  ║  Edition   : CYBER-EDITION                        ║
  ║  Sources   : ${SOURCE_LIST.join(", ").padEnd(36)}║
  ║  Database  : SQLite (dongwal.sqlite3)             ║
  ║  Status    : ONLINE                               ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
