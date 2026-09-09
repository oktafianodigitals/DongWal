const AnichinCafe = require("./anichinCafe");
const AnichinWp = require("./anichinWp");

const SOURCES = {
  "anichin.cafe": new AnichinCafe(),
  "anichin.moe": new AnichinWp("https://anichin.moe", "anichin.moe", "Anichin.Moe"),
  "anichin.watch": new AnichinWp("https://anichin.watch", "anichin.watch", "Anichin.Watch"),
};

const SOURCE_LIST = Object.keys(SOURCES);

function getSource(name) {
  return SOURCES[name] || null;
}

function getAllSources() {
  return Object.values(SOURCES);
}

function resolveSource(query) {
  if (query && SOURCES[query]) return [SOURCES[query]];
  return Object.values(SOURCES);
}

function mergeResults(results, key) {
  const seen = new Set();
  const merged = [];
  for (const item of results) {
    const slug = item.slug || item.href || item.title;
    if (slug && !seen.has(slug)) { seen.add(slug); merged.push(item); }
    else if (!slug) merged.push(item);
  }
  return merged;
}

async function aggregate(method, ...args) {
  const sourceQuery = args.find((a) => typeof a === "string" && SOURCES[a]);
  const sources = sourceQuery ? [SOURCES[sourceQuery]] : Object.values(SOURCES);
  const remaining = args.filter((a) => typeof a !== "string" || !SOURCES[a]);

  const results = await Promise.allSettled(sources.map((src) => src[method](...remaining)));

  const all = [];
  const errors = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      const data = r.value;
      if (Array.isArray(data)) all.push(...data);
      else if (data && typeof data === "object") {
        if (data.items) all.push(...data.items);
        else if (data.results) all.push(...data.results);
        else all.push(data);
      }
    } else {
      errors.push({ source: sources[i].id, error: r.reason?.message });
    }
  }

  return { all, errors };
}

module.exports = { SOURCES, SOURCE_LIST, getSource, getAllSources, resolveSource, mergeResults, aggregate };
