const axios = require("axios");
const cheerio = require("cheerio");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

class AnichinCafe {
  constructor() {
    this.id = "anichin.cafe";
    this.label = "Anichin.Cafe";
    this.base = "https://anichin.cafe";
  }

  async _get(path) {
    const url = path.startsWith("http") ? path : this.base + path;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "id,en;q=0.8" },
      timeout: 25000,
    });
    return data;
  }

  _parsePagination($, sel = ".pagination, .hpage, .pagi, nav.navigation") {
    let nums = [];
    $(sel + " a, " + sel + " span").each((i, el) => {
      const t = $(el).text().trim();
      if (/^\d+$/.test(t)) nums.push(parseInt(t));
    });
    nums = [...new Set(nums)];
    if (!nums.length) return null;
    const curHolder = $(sel + " .current, " + sel + " span.current");
    let current_page = curHolder.length ? parseInt(curHolder.first().text()) || 1 : nums[0];
    const max = Math.max(...nums);
    const nextExists = $(sel + " a.next, " + sel + " .next, " + sel + " a[rel='next']").length > 0 || current_page < max;
    return { total_pages: max, current_page, next_page: nextExists ? current_page + 1 : null, prev_page: current_page > 1 ? current_page - 1 : null };
  }

  _parseCard($, el) {
    const a = $(el).find("a").first();
    const href = a.attr("href") || "";
    const title = a.find("h2, .tt, h3").first().text().trim() || a.attr("title") || a.text().trim();
    const img = $(el).find("img").first().attr("src") || $(el).find("img").first().attr("data-src") || $(el).find("img").first().attr("data-lazy-src") || "";
    const ep = $(el).find(".bt .epx, .epx, .lchx, .ep").first().text().trim();
    const type = $(el).find(".typez, .types, .type").first().text().trim();
    const status = $(el).find(".bt .sb, .penz, .status").first().text().trim();
    const rating = $(el).find(".numscore, .rating, .score").first().text().trim();
    return { title, href, slug: href.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, ""), image: img || null, episode: ep || null, type: type || null, status: status || null, rating: rating || null, source: this.id };
  }

  _toSlug(urlOrSlug) {
    if (!urlOrSlug) return "";
    if (/^https?:\/\//.test(urlOrSlug)) return urlOrSlug.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "");
    return String(urlOrSlug).replace(/^\/+|\/+$/g, "");
  }

  async slider() {
    const html = await this._get("/");
    const $ = cheerio.load(html);
    const items = [];
    $(".swiper-slide.item").each((i, el) => {
      const info = $(el).find(".info");
      const h2 = info.find("h2 a");
      const backdrop = $(el).find(".backdrop");
      const style = backdrop.attr("style") || "";
      const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
      let desc = info.find("p").first().text().trim();
      const title = h2.attr("data-jtitle") || h2.text().trim();
      const url = h2.attr("href") || "";
      const watch = $(el).find("a.watch").attr("href") || "";
      const slib = watch || url;
      const isSer = /\/seri\//.test(watch || url);
      items.push({ title, url, image: (bgMatch && bgMatch[1]) || null, watch, slug: slib ? this._toSlug(slib) : null, isSeries: isSer, description: desc || null, source: this.id });
    });
    return items;
  }

  async popular() {
    const html = await this._get("/");
    const $ = cheerio.load(html);
    const items = [];
    const popBox = $(".bixbox .releases.hothome, .boxlist:nth-of-type(1), .wfull");
    let source = popBox.closest(".bixbox").length ? popBox.closest(".bixbox").find("article.bs") : $("article.bs").slice(0, 5);
    source.each((i, el) => items.push(this._parseCard($, el)));
    return items;
  }

  async latest(page = 1) {
    const html = await this._get(page > 1 ? `/page/${page}/` : "/");
    const $ = cheerio.load(html);
    const items = [];
    $("article.bs").each((i, el) => items.push(this._parseCard($, el)));
    return { items, pagination: this._parsePagination($) };
  }

  async genres() {
    const html = await this._get("/");
    const $ = cheerio.load(html);
    const seen = new Map();
    $("a[href*='/genres/']").each((i, el) => {
      const href = $(el).attr("href") || "";
      const name = $(el).text().replace(/\s+/g, " ").trim();
      if (!name) return;
      const parts = href.replace(/^https?:\/\/[^/]+\//, "").replace(/\/+$/g, "").split("/");
      const gslug = parts[parts.length - 1] || parts[0] || null;
      if (gslug && !seen.has(gslug)) seen.set(gslug, name);
    });
    return [...seen].map(([slug, name]) => ({ name, slug, source: this.id }));
  }

  async genre(slug, page = 1) {
    const html = await this._get(page > 1 ? `/genres/${slug}/page/${page}/` : `/genres/${slug}/`);
    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim() || $(".genrx, .page-title").text().replace(/\s+/g, " ").trim() || slug;
    const items = [];
    $("article.bs").each((i, el) => items.push(this._parseCard($, el)));
    return { genre: title, slug, page, items, pagination: this._parsePagination($), source: this.id };
  }

  async search(query, page = 1) {
    const q = encodeURIComponent(query);
    const html = await this._get(page > 1 ? `/?s=${q}&page=${page}` : `/?s=${q}`);
    const $ = cheerio.load(html);
    const results = [];
    $("article.bs").each((i, el) => results.push(this._parseCard($, el)));
    return { query, results, pagination: this._parsePagination($), source: this.id };
  }

  async ongoing(page = 1) {
    const html = await this._get(page > 1 ? `/ongoing/page/${page}/` : "/ongoing/");
    const $ = cheerio.load(html);
    const items = [];
    $("article.bs").each((i, el) => items.push(this._parseCard($, el)));
    return { items, pagination: this._parsePagination($), source: this.id };
  }

  async completed(page = 1) {
    const html = await this._get(page > 1 ? `/completed/page/${page}/` : "/completed/");
    const $ = cheerio.load(html);
    const items = [];
    $("article.bs").each((i, el) => items.push(this._parseCard($, el)));
    return { items, pagination: this._parsePagination($), source: this.id };
  }

  async schedule() {
    const html = await this._get("/schedule/");
    const $ = cheerio.load(html);
    const dayMap = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
    const AD_IMG = /gif|kaiko|pentaslot|gaza88|judi89|indo666|orangarab|logo/i;
    const out = [];
    $(".bixbox.schedulepage").each((i, el) => {
      const cls = $(el).attr("class") || "";
      const dayKey = (cls.match(/sch_([a-z]+)/i) || [])[1];
      const day = dayKey ? dayMap[dayKey.toLowerCase()] : null;
      const title = $(".releases", el).first().text().replace(/\s+/g, " ").trim() || $(el).find("h3, h2, .entry-title").first().text().trim() || day || null;
      const items = [];
      $(".listupd .bs, .listupd > div.bs", el).each((j, bs) => {
        const a = $(bs).find("a[href]").first();
        const href = a.attr("href") || "";
        if (!href) return;
        let timeRaw = $(bs).find(".epx, .bt .epx, .epx.cndwn").first().text().replace(/\s+/g, " ").trim();
        let time = null, released = false;
        if (/at\s+(\d{1,2}:\d{2})/i.test(timeRaw)) time = timeRaw.match(/at\s+(\d{1,2}:\d{2})/i)[1];
        else if (/released|tamat/i.test(timeRaw)) released = true;
          const epRaw = $(bs).find(".sb, .epx").last().text().replace(/\s+/g, " ").trim();
          let episode = null;
          if (/^\d+(?:\.\d+)?$/.test(epRaw)) episode = epRaw;
          else { const m = epRaw.match(/(\d+(?:\.\d+)?)/); if (m) episode = m[1]; }
        const ttl = $(bs).find(".tt").first().text().replace(/\s+/g, " ").trim();
        const name = ttl || a.title || "";
        let img = null;
        $(bs).find("img").each((k, el) => { const s = $(el).attr("src") || $(el).attr("data-src") || ""; if (s && !AD_IMG.test(s)) { img = s; return false; } });
        const slug = href.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "");
        items.push({ title: name || null, href, slug, image: img || null, time, episode, released, source: this.id });
      });
      items.sort((a, b) => { if (a.released !== b.released) return a.released ? 1 : -1; return (a.time || "99:99").localeCompare(b.time || "99:99"); });
      out.push({ day: day || title, label: title, items, count: items.length, source: this.id });
    });
    return out;
  }

  async detail(urlOrSlug) {
    const slug = this._toSlug(urlOrSlug);
    const html = await this._get(`/${slug}/`);
    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim() || $(".entry-title").first().text().trim() || slug;
    const poster = $(".thumb img").first().attr("src") || $(".thumb img[itemprop='image']").first().attr("src") || $("img[itemprop='image']").first().attr("src") || $(".tb img").first().attr("src") || "";
    let description = $(".entry-content, .sinop, .desc, #infoarea").first().text().trim();
    const meta = {};
    $(".spe .list-item, .spe li, .spe span, .info-content .spe span").each((i, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      const mm = t.match(/^([^:]+):\s*(.*)$/);
      if (mm && mm[1] && mm[2]) meta[mm[1].trim()] = mm[2].trim();
    });
    if (!Object.keys(meta).length) {
      const infoTxt = $(".spe").text().replace(/\s+/g, " ") || description || "";
      const re = /([A-Za-z][^:\n]{2,30}?):\s*([^;\n]+)/g;
      let m;
      while ((m = re.exec(infoTxt))) meta[m[1].trim()] = m[2].trim();
    }
    const alt = $(".alter").first().text().trim() || null;
    const tags = [];
    $("a[rel='tag'], .genres a, .genx a").each((i, el) => {
      const name = $(el).text().trim();
      if (name && !tags.some((t) => t.name === name)) tags.push({ name });
    });
    const episodes = this._parseEpisodes($, ".eplister ul li, .eplister li, .eplist li, .episodelist ul li, .episodelist li");
    const related = [];
    $(".related a, .relatria a, #related a, .mclist a, .widget_list li a").each((i, el) => {
      const href = $(el).attr("href") || "";
      const t = $(el).find("h3, .tt, .entry-title, img").first().attr("alt") || $(el).text().trim() || $(el).attr("title") || "";
      if (href && t) related.push({ title: t.slice(0, 120), href });
    });
    const isEpisode = $(".megavid").length > 0 || $("#pembed").length > 0 || $(".player-embed").length > 0 || (episodes.length === 0 && $(".epx").length > 0) || /-episode-/i.test(slug || "");
    return { title, slug, thumb: poster || null, image: poster || null, alt, synopsis: description || null, description: description || null, tags, info: meta, meta, type: meta["Type"] || meta["Tipe"] || null, status: meta["Status"] || null, country: meta["Country"] || null, released: meta["Released"] || null, duration: meta["Duration"] || null, network: meta["Network"] || null, studio: meta["Studio"] || null, season: meta["Season"] || null, isEpisode, episodes, related, episodeCount: episodes.length, episodesUrl: this.base + "/" + slug + "/", source: this.id };
  }

  _parseEpisodes($, listSel) {
    const eps = [];
    const seen = new Set();
    $(listSel).each((i, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href") || "";
      if (!href || seen.has(href)) return;
      seen.add(href);
      const numRaw = $(el).find(".epl-num").first().text().trim() || $(el).find(".epnum, .num").first().text().trim() || a.text().match(/[Ee]pisode\s*(\d+)/)?.[1] || $(el).text().match(/\b(\d+)\b/)?.[1] || "";
      const etitle = $(el).find(".epl-title").first().text().trim() || a.attr("title") || a.text().replace(/\s+/g, " ").trim() || null;
      const date = $(el).find(".epl-date").first().text().trim() || $(el).find("time, .date").first().text().trim() || null;
      eps.push({ num: numRaw ? parseInt(numRaw) : i + 1, numRaw, etitle, date, href, url: href });
    });
    return eps;
  }

  async episode(urlOrSlug) {
    const slug = this._toSlug(urlOrSlug);
    const html = await this._get(`/${slug}/`);
    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim() || $(".entry-title").first().text().trim() || slug;
    const epNum = $("[itemprop='episodeNumber']").attr("content") || $(".epx, [class*='episode']").first().attr("content") || $("h1").first().text().match(/[Ee]pisode\s*(\d+)/)?.[1] || null;
    const img = $(".megavid .tb img, .thumb img, .tb img").first().attr("src") || $("img[itemprop='image']").first().attr("src") || "";
    const embeds = [];
    const seen = new Set();
    const AD_LABEL = /\[ads?\]|\bads\b/i;
    const AD_DOMAIN = /cbox\.ws|akseskaiko|pentaslot|goid\.space|injd\.site|kegz\.site|goratu\.site|orangarab|terbangrusia|bergurukecina|menujupenta|gaza88|judi89|indo666|kaiko/i;
    const pushEmbed = (src, label) => {
      if (!src || seen.has(src)) return;
      if (AD_LABEL.test(label) || AD_DOMAIN.test(src)) return;
      seen.add(src);
      embeds.push({ src, label });
    };
    $('select.mirror option, select[name="mirror"] option').each((i, el) => {
      const val = ($(el).attr("value") || "").trim();
      const label = ($(el).text() || "").trim();
      if (!val || !label || val === "" || /select\s+video/i.test(label)) return;
      try { const decoded = Buffer.from(val, "base64").toString("utf8"); const m = decoded.match(/src="([^"]+)"/i); if (m) pushEmbed(m[1], label); } catch (_) {}
    });
    if (!embeds.length) { $("iframe").each((i, el) => { const src = $(el).attr("src") || ""; if (AD_DOMAIN.test(src)) return; pushEmbed(src, `Source ${embeds.length + 1}`); }); }
    const finalEmbeds = [];
    for (const e of embeds) {
      const anm = e.src.match(/anichin\.stream\/\?id=([A-Za-z0-9]+)/);
      if (anm) { finalEmbeds.push({ name: "Anichin [Clean]", src: `https://anichin.stream/hls/${anm[1]}.m3u8`, embedSrc: e.src, type: "hls", clean: true }); }
      else { const host = (e.src.match(/https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || ""; finalEmbeds.push({ name: e.label || host.toUpperCase(), src: e.src, embedSrc: e.src, type: "frame", clean: false }); }
    }
    const embedSrc = finalEmbeds[0]?.src || null;
    const download = [];
    $(".soraurlx, .soraurl, .dl-list .dl, .download a, .mob-download a, .soradlg .soraurlx").each((i, blk) => {
      const q = $(blk).find("strong").first().text().trim() || $(blk).find("b").first().text().trim() || "";
      const links = [];
      $(blk).find("a[href]").each((j, a) => {
        const href = ($(a).attr("href") || "").trim();
        const t = $(a).text().replace(/\s+/g, " ").trim();
        if (!href || href === "#" || href.startsWith("javascript:") || /share|facebook\.com|twitter\.com|whatsapp/i.test(href)) return;
        if (/kaiko|pentaslot|gaza88|judi89|indo666|orangarab|\.gif|logo|avatar/i.test(href)) return;
        links.push({ name: t || href.split("/").pop() || "Link", href });
      });
      if (!links.length) return;
      const quality = q || "Link";
      const existing = download.find((d) => d.quality === quality);
      if (existing) { for (const l of links) if (!existing.links.some((x) => x.href === l.href)) existing.links.push(l); }
      else download.push({ quality, links });
    });
    if (!download.length) {
      const FILE_RE = /\.(mp4|mkv|avi|webm|mov|zip|rar|7z)(\?|$)/i;
      const CLOUD_RE = /drive\.google\.com|mega\.nz|mediafire\.com|pixeldrain|racaty|1fichier|uptobox|dropapk|samefiles|expresslinks|gofile\.io|terabox|dood\.|streamtape|mirrored|clicknupload|tusfiles|sfile\.mobi/i;
      $("a[href]").each((i, el) => {
        const href = ($(el).attr("href") || "").trim();
        if (!href) return;
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (!(FILE_RE.test(href) || CLOUD_RE.test(href))) return;
        if (/share|facebook\.com|twitter\.com|whatsapp|\.gif|logo|avatar|kaiko|orangarab/i.test(href + " " + text)) return;
        const host = (href.match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || "Link";
        let grp = download.find((d) => d.quality === "Download");
        if (!grp) { grp = { quality: "Download", links: [] }; download.push(grp); }
        if (!grp.links.some((x) => x.href === href)) grp.links.push({ name: text || host, href });
      });
    }
    const related = [];
    $(".related a, .relatria a, .mclist a, #related a").each((i, el) => {
      const href = $(el).attr("href") || "";
      const t = $(el).text().trim();
      if (href && t) related.push({ title: t.slice(0, 120), href });
    });
    return { title, episode: epNum, img, embedSrc, embeds: finalEmbeds, download, related, nav: { prev: $('.naveps .nvs a[rel="prev"]').attr("href") || $('.nvs a[rel="prev"]').attr("href") || null, next: $('.naveps .nvs a[rel="next"]').attr("href") || $('.nvs a[rel="next"]').attr("href") || null, allEpisodes: $(".naveps .nvsc a").attr("href") || null }, source: this.id };
  }
}

module.exports = AnichinCafe;
