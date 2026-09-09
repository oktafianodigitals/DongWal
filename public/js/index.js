const API = '';
const cfg = window.__DW_CONFIG__ || {};
let currentSection = 'home';
let currentPage = {};
let loaded = {};

function getSourceParam() {
  return '';
}

function srcParam() {
  return '';
}

function showSection(name) {
  currentSection = name;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const map = {
    home: ['sec-home', 0, () => { if (!loaded.home) loadHome(); }],
    ongoing: ['sec-ongoing', 1, () => { if (!loaded.ongoing) loadOngoing(1); }],
    completed: ['sec-completed', 2, () => { if (!loaded.completed) loadCompleted(1); }],
    genres: ['sec-genres', 3, () => { if (!loaded.genres) loadGenres(); }],
    schedule: ['sec-schedule', 4, () => { if (!loaded.schedule) loadSchedule(); }],
    'api-doc': ['sec-api-doc', 5, () => loadApiDocs()],
    search: ['sec-search', -1, null],
  };
  const m = map[name];
  if (!m) return;
  document.getElementById(m[0]).classList.add('active');
  if (m[1] >= 0) document.querySelectorAll('.nav-btn')[m[1]]?.classList.add('active');
  if (m[2]) m[2]();
}

async function fetchJSON(url) {
  const res = await fetch(API + url);
  return await res.json();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function extractSlug(href) {
  if (!href) return '';
  return href.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '');
}

const NO_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'%3E%3Crect fill='%2312121e' width='300' height='400'/%3E%3Crect x='10' y='10' width='280' height='380' rx='4' fill='none' stroke='%2300f0ff' stroke-width='1' stroke-dasharray='6 4' opacity='0.3'/%3E%3Ctext fill='%2300f0ff' x='50%25' y='45%25' text-anchor='middle' font-family='monospace' font-size='11' opacity='0.5'%3E%3CNONE/%3E%3C/text%3E%3Ctext fill='%23ff00de' x='50%25' y='55%25' text-anchor='middle' font-family='monospace' font-size='10' opacity='0.4'%3EIMAGE%3C/text%3E%3C/svg%3E";

function imgErr(el) {
  el.onerror = null;
  el.src = NO_IMG;
  el.style.opacity = '0.5';
}

function makeCard(item) {
  const slug = extractSlug(item.href);
  const isSeries = /\/?(seri|series|donghua)\//.test(item.href || '');
  const src = item.source ? ` data-src-id="${item.source}"` : '';
  const onclick = item.href
    ? (isSeries ? `onclick="openDetail('${slug.replace(/'/g, "\\'")}')"` : `onclick="goPlay('${slug.replace(/'/g, "\\'")}'${item.source ? ",'"+item.source+"'" : ''})"`)
    : '';
  const srcBadge = item.source ? `<span class="badge badge-type" style="font-size:0.5rem;opacity:0.7">${item.source}</span>` : '';
  return `
    <div class="card" ${onclick}${src}>
      <img class="card-img" src="${item.image || NO_IMG}"
           alt="${item.title || ''}" loading="lazy"
           onerror="imgErr(this)">
      <div class="card-body">
        <div class="card-title">${item.title || 'Unknown'}</div>
        <div class="card-meta">
          ${!isSeries ? `<span class="badge badge-status">PLAY</span>` : ''}
          ${item.episode ? `<span class="badge badge-ep">${item.episode}</span>` : ''}
          ${item.type ? `<span class="badge badge-type">${item.type}</span>` : ''}
          ${isSeries && item.status ? `<span class="badge badge-status">${item.status}</span>` : ''}
          ${srcBadge}
        </div>
      </div>
    </div>`;
}

function renderCards(containerId, items, countId, useStrip = false) {
  const el = document.getElementById(containerId);
  if (!items || items.length === 0) {
    el.innerHTML = '<div class="loading">NO DATA FOUND // TRY ANOTHER QUERY</div>';
    return;
  }
  el.innerHTML = items.map(item => useStrip ? makeStripCard(item) : makeCard(item)).join('');
  if (countId) document.getElementById(countId).textContent = `[${items.length}]`;
}

function makeStripCard(item) {
  const slug = extractSlug(item.href);
  const isSeries = /\/?(seri|series|donghua)\//.test(item.href || '');
  return `
    <div class="strip-card" onclick="${isSeries
      ? `openDetail('${slug.replace(/'/g, "\\'")}')`
      : `goPlay('${slug.replace(/'/g, "\\'")}'${item.source ? ",'"+item.source+"'" : ''})`}">
      <img class="strip-img" src="${item.image || NO_IMG}" alt="${item.title || ''}" loading="lazy"
           onerror="imgErr(this)">
      <div class="strip-title">${item.title || 'Unknown'}</div>
    </div>`;
}

function goPlay(slug, source) {
  const q = source ? `?source=${encodeURIComponent(source)}` : '';
  window.location.href = '/play/' + slug + q;
}

let heroTimer = null;
function renderHero(slides) {
  const el = document.getElementById('hero-slider');
  if (!slides || slides.length === 0) { el.style.display = 'none'; return; }
  const good = slides.filter(s => s.image);
  const data = good.length > 0 ? good : slides;
  el.innerHTML = `
    ${data.map((s, i) => `
      <div class="hero-slide ${i===0?'active':''}" style="background-image:url('${s.image}')">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h2>${s.title || ''}</h2>
          <p>${s.description || ''}</p>
          <button onclick="openDetail('${extractSlug(s.url).replace(/'/g, "\\'")}')">WATCH NOW</button>
        </div>
      </div>
    `).join('')}
    <div class="hero-dots">${data.map((x, i) => `<div class="hero-dot ${i===0?'active':''}" onclick="heroGo(${i})"></div>`).join('')}</div>
  `;
  window._heroTotal = data.length;
  window._heroIdx = 0;
  clearInterval(heroTimer);
  heroTimer = setInterval(() => { heroGo((window._heroIdx + 1) % window._heroTotal); }, 6000);
}

function heroGo(idx) {
  window._heroIdx = idx;
  document.querySelectorAll('.hero-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

async function loadHome() {
  document.getElementById('latest-grid').innerHTML = '<div class="loading">INITIALIZING NEURAL LINK...</div>';
  try { const slide = await fetchJSON('/slide' + (srcParam() ? '?' + srcParam().slice(1) : '')); renderHero(slide.data); } catch (e) {}
  try {
    const his = await fetchJSON('/api/history?limit=12');
    renderHistoryStrip(his.data, his.total || 0);
  } catch (e) {
    document.getElementById('history-strip').innerHTML = '<div class="loading" style="color:var(--text-secondary)">NO HISTORY YET</div>';
  }
  try {
    const pop = await fetchJSON('/popular' + (srcParam() ? '?' + srcParam().slice(1) : ''));
    renderCards('popular-strip', pop.data, 'popular-count', true);
  } catch (e) { document.getElementById('popular-strip').innerHTML = ''; }
  await loadLatest(1, true);
}

function renderHistoryStrip(items, total) {
  const strip = document.getElementById('history-strip');
  document.getElementById('history-count').textContent = total ? '(' + total + ')' : '';
  if (!items || !items.length) { strip.innerHTML = '<div class="loading" style="color:var(--text-secondary)">NO HISTORY YET</div>'; return; }
  strip.innerHTML = items.map(h => `
    <div class="strip-card mini" style="cursor:pointer" onclick="location.href='/play/${h.slug}'">
      <img class="strip-img" src="${h.image || NO_IMG}" alt="" onerror="imgErr(this)">
      <div class="overlay-tip">▶ RESUME</div>
      <div class="strip-bar">
        <a class="strip-title">${escapeHtml(h.title || h.slug)}</a>
        <button class="strip-del" onclick="event.stopPropagation();removeHistory('${h.slug.replace(/'/g,"\\'")}')" title="Hapus dari riwayat">×</button>
      </div>
    </div>
  `).join('');
}

async function removeHistory(slug) {
  await fetch('/api/history/' + encodeURIComponent(slug), { method: 'DELETE' }).catch(() => {});
  loadHome();
}

async function clearHistory() {
  if (!confirm('Hapus semua riwayat tonton?')) return;
  await fetch('/api/history', { method: 'DELETE' }).catch(() => {});
  loadHome();
}

function renderPagination(containerId, pagination, loaderFn) {
  const el = document.getElementById(containerId);
  if (!pagination) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <button class="page-btn" ${!pagination.prev_page ? 'disabled' : ''} onclick="${loaderFn}(Math.max(1,(${currentPage[loaderFn]||1})-1))"><< PREV</button>
    <button class="page-btn" style="pointer-events:none;color:var(--neon-magenta)">PAGE ${currentPage[loaderFn]||1}</button>
    <button class="page-btn" ${!pagination.next_page ? 'disabled' : ''} onclick="${loaderFn}((${currentPage[loaderFn]||1})+1)">NEXT >></button>
  `;
}

async function loadLatest(page = 1, quiet = false) {
  currentPage.loadLatest = page;
  if (!quiet) document.getElementById('latest-grid').innerHTML = '<div class="loading">CONNECTING TO NEURAL NETWORK...</div>';
  try {
    const d = await fetchJSON(`/latest?page=${page}${srcParam()}`);
    renderCards('latest-grid', d.data.items, 'latest-count');
    renderPagination('latest-pagination', d.data.pagination, 'loadLatest');
  } catch (e) {
    document.getElementById('latest-grid').innerHTML = '<div class="loading">CONNECTION FAILED // RETRY LATER</div>';
  }
  loaded.home = true;
}

async function loadOngoing(page = 1) {
  currentPage.loadOngoing = page;
  document.getElementById('ongoing-grid').innerHTML = '<div class="loading">SCANNING ONGOING FEEDS...</div>';
  try {
    const d = await fetchJSON(`/ongoing?page=${page}${srcParam()}`);
    renderCards('ongoing-grid', d.data.items, 'ongoing-count');
    renderPagination('ongoing-pagination', d.data.pagination, 'loadOngoing');
  } catch (e) {
    document.getElementById('ongoing-grid').innerHTML = '<div class="loading">FEED ERROR // RETRY LATER</div>';
  }
  loaded.ongoing = true;
}

async function loadCompleted(page = 1) {
  currentPage.loadCompleted = page;
  document.getElementById('completed-grid').innerHTML = '<div class="loading">LOADING ARCHIVED DATA...</div>';
  try {
    const d = await fetchJSON(`/completed?page=${page}${srcParam()}`);
    renderCards('completed-grid', d.data.items, 'completed-count');
    renderPagination('completed-pagination', d.data.pagination, 'loadCompleted');
  } catch (e) {
    document.getElementById('completed-grid').innerHTML = '<div class="loading">ARCHIVE ACCESS DENIED</div>';
  }
  loaded.completed = true;
}

async function doSearch(page = 1) {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  currentPage.doSearch = page;
  showSection('search');
  document.getElementById('sec-search').classList.add('active');
  document.getElementById('search-grid').innerHTML = '<div class="loading">SCANNING DATABASE...</div>';
  try {
    const d = await fetchJSON(`/search?q=${encodeURIComponent(q)}&page=${page}${srcParam()}`);
    renderCards('search-grid', d.data.results, 'search-count');
    renderPagination('search-pagination', d.data.pagination, 'doSearch');
  } catch (e) {
    document.getElementById('search-grid').innerHTML = '<div class="loading">SCAN FAILED // NO RESULTS</div>';
  }
}

async function loadGenres() {
  document.getElementById('genre-chips').innerHTML = '<div class="loading">LOADING GENRE MATRIX...</div>';
  try {
    const d = await fetchJSON('/genres' + (srcParam() ? '?' + srcParam().slice(1) : ''));
    document.getElementById('genre-chips').innerHTML = d.data.map(g =>
      `<div class="genre-chip" onclick="loadGenreDetail('${g.slug}')">${g.name}</div>`
    ).join('');
  } catch (e) {
    document.getElementById('genre-chips').innerHTML = '<div class="loading">MATRIX ERROR</div>';
  }
  loaded.genres = true;
}

async function loadGenreDetail(slug, page = 1) {
  currentPage.loadGenreDetail = page;
  document.getElementById('genre-grid').innerHTML = '<div class="loading">FILTERING DATA STREAM...</div>';
  try {
    const d = await fetchJSON(`/genres/${slug}?page=${page}${srcParam()}`);
    renderCards('genre-grid', d.data.items);
    renderPagination('genre-pagination', d.data.pagination, 'loadGenreDetail');
  } catch (e) {
    document.getElementById('genre-grid').innerHTML = '<div class="loading">FILTER ERROR</div>';
  }
}

async function loadSchedule() {
  const wrap = document.getElementById('schedule-container');
  wrap.innerHTML = '<div class="loading">RETRIEVING SCHEDULE MATRIX...</div>';
  try {
    const d = await fetchJSON('/schedule' + (srcParam() ? '?' + srcParam().slice(1) : ''));
    const days = d.data || [];
    if (!days.length) { wrap.innerHTML = '<div class="loading">NO SCHEDULE DATA</div>'; loaded.schedule = true; return; }
    wrap.innerHTML = days.map(day => {
      const rows = day.items || [];
      const epLabel = it => it.released ? 'RELEASED' : (it.episode ? 'EP ' + it.episode : '??');
      return `
      <div class="section-title" style="margin-top:24px">${escapeHtml(day.day)} <span class="count">[${rows.length}]</span></div>
      <div class="card-grid">
        ${rows.map(it => {
          const slug = (it.slug || '').replace(/'/g, "\\'");
          return `
          <div class="card" onclick="openDetail('${slug}')">
            <img class="card-img" src="${it.image || NO_IMG}" alt="${escapeHtml(it.title||'')}" loading="lazy" onerror="imgErr(this)">
            <div class="card-body">
              <div class="card-title">${escapeHtml(it.title || 'Unknown')}</div>
              <div class="card-meta">
                ${it.time ? `<span class="sched-badge sched-badge-time">${escapeHtml(it.time)}</span>` : ''}
                <span class="sched-badge ${it.released ? 'sched-badge-rel' : 'sched-badge-ep'}">${escapeHtml(epLabel(it))}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<div class="loading">SCHEDULE OFFLINE</div>';
  }
  loaded.schedule = true;
}

function openModal() {
  document.getElementById('modal').classList.add('active');
  document.body.classList.add('modal-open');
}
function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.body.classList.remove('modal-open');
  window._modalDetailSlug = null;
}
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('modal').classList.contains('active')) closeModal(); });
function setModalHTML(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-box').scrollTop = 0;
  openModal();
}

async function openDetail(slug) {
  setModalHTML('<div class="modal-loading">LOADING ANIME DATA...</div>');
  try {
    const src = getSourceParam();
    const q = src ? `?source=${encodeURIComponent(src)}` : '';
    const d = await fetchJSON(`/detail/${slug}${q}`);
    const info = d.data;
    if (info.isEpisode) { goPlay(slug, info.source); return; }
    setModalHTML(`
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <div class="modal-hero">
        <img class="modal-poster" src="${info.thumb || NO_IMG}" alt="${info.title || ''}" onerror="imgErr(this)">
        <div class="modal-info">
          <h1>${info.title || 'Unknown'}</h1>
          <div class="modal-alt">${info.alt || ''} ${info.source ? `<span class="badge badge-type" style="font-size:0.55rem">${info.source}</span>` : ''}</div>
          <div class="modal-synopsis">${info.synopsis || 'No synopsis available.'}</div>
          <div class="modal-tags">${(info.tags || []).map(t => `<span class="tag">${t.name}</span>`).join('')}</div>
          <div class="modal-meta">${Object.entries(info.info || {}).map(([k,v]) => `<div class="meta-item"><b>${k}</b>${v}</div>`).join('')}</div>
          ${info.episodes && info.episodes.length > 0 ? `
          <div class="modal-actions">
            <button class="modal-btn grn" onclick="document.getElementById('ep-marker').scrollIntoView({behavior:'smooth'})">EPISODE LIST [${info.episodes.length}]</button>
          </div>` : ''}
        </div>
      </div>
      ${info.episodes && info.episodes.length > 0 ? `
        <div id="ep-marker" class="section-title" style="scroll-margin-top:20px">Episodes <span class="count">[${info.episodes.length}]</span></div>
        <div id="ep-list" class="ep-list modal-ep-list"></div>` : ''}
      ${info.related && info.related.length > 0 ? `
        <div class="section-title" style="margin-top:28px">Related</div>
        <div class="card-grid">${info.related.map(makeCard).join('')}</div>` : ''}
    `);
    if (info.episodes && info.episodes.length > 0) {
      document.getElementById('ep-list').innerHTML = info.episodes.map(ep => `
        <a class="ep-item" style="display:block;text-decoration:none" href="/play/${extractSlug(ep.href).replace(/'/g, "%27")}${info.source ? '?source='+encodeURIComponent(info.source) : ''}">
          <div class="ep-num">EP ${ep.num || '?'}</div>
          <div class="ep-name">${ep.etitle || ''}</div>
          <div class="ep-date">${ep.date || ''}</div>
        </a>
      `).join('');
    }
  } catch (e) {
    setModalHTML(`<button class="modal-close" onclick="closeModal()">&times;</button><div class="modal-loading">DATA ACCESS FAILED // RETRY LATER</div>`);
  }
}

function loadApiDocs() {
  const endpoints = [
    ['GET', '/slide?source=NAME', 'Featured anime (all or specific source)'],
    ['GET', '/popular?source=NAME', 'Popular anime (all or specific source)'],
    ['GET', '/latest?page=N&source=NAME', 'Latest episode updates (paginated)'],
    ['GET', '/genres?source=NAME', 'Available genre list'],
    ['GET', '/genres/:genre?page=N', 'Anime series by genre (paginated)'],
    ['GET', '/detail/:slug?source=NAME', 'Detailed anime info + episode list'],
    ['GET', '/episode/:slug?source=NAME', 'Episode info + embed sources + download links'],
    ['GET', '/search?q=QUERY&page=N&source=NAME', 'Search anime (paginated)'],
    ['GET', '/ongoing?page=N&source=NAME', 'Ongoing anime series (paginated)'],
    ['GET', '/completed?page=N&source=NAME', 'Completed anime series (paginated)'],
    ['GET', '/schedule?source=NAME', 'Weekly release schedule'],
    ['GET', '/play/:slug', 'Dedicated video player page'],
    ['GET', '/api/sources', 'List all available sources'],
    ['GET', '/api/stream?url=URL', 'HLS stream proxy (ad-free)'],
    ['GET', '/api/history?limit=N', 'Get watch history'],
    ['POST', '/api/history', 'Save/update watch history'],
    ['DELETE', '/api/history/:slug', 'Delete one history entry'],
    ['DELETE', '/api/history', 'Clear all history'],
  ];
  document.getElementById('api-doc-content').innerHTML = endpoints.map(([method, path, desc]) => `
    <div class="api-endpoint">
      <span class="method">${method}</span> <span class="path">${path}</span>
      <div class="desc">${desc}</div>
    </div>
  `).join('');
}

loadHome();
(async () => {
  const params = new URLSearchParams(window.location.search);
  const dDetail = params.get('detail');
  const dPlay = params.get('play');
  if (dPlay) goPlay(dPlay);
  else if (dDetail) setTimeout(() => openDetail(dDetail), 400);
})();
