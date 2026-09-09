const cfg = window.__DW_CONFIG__ || {};
const slug = cfg.slug || '';
const API = '';
const state = { embeds: [], current: 0, hls: null };

async function load() {
  const loading = document.getElementById('loading');
  loading.style.display = 'flex';
  document.getElementById('player-frame').style.display = 'none';
  document.getElementById('no-stream').style.display = 'none';
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get('source') || '';
    const q = src ? `?source=${encodeURIComponent(src)}` : '';
    const d = await fetch(API + '/episode/' + slug + q).then(r => r.json());
    if (!d.status || !d.data) throw new Error('episode not found');
    const ep = d.data;
    state.embeds = (ep.embeds || []).filter(e => e.src);
    document.title = (ep.title || 'DONGWAL PLAYER');
    document.getElementById('player-title').textContent = ep.title || 'Episode';
    document.getElementById('slug-label').textContent = slug;
    renderTabs();
    renderToolbar(ep);
    renderDownload(ep.download);
    saveHistory(ep);
    switchEmbed(0);
  } catch (e) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('no-stream').style.display = 'flex';
  }
}

function renderTabs() {
  const el = document.getElementById('embed-tabs');
  if (!state.embeds.length) { el.innerHTML = ''; return; }
  el.innerHTML = state.embeds.map((e, i) =>
    `<div class="embed-tab ${i===0?'active':''}" onclick="switchEmbed(${i})">${e.name || 'Source '+(i+1)}</div>`
  ).join('');
}

function saveHistory(ep) {
  const src = (state.embeds[0]?.src) || ep.embedSrc || null;
  fetch(API + '/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      title: ep.title || slug,
      type: 'episode',
      series_slug: ep.nav?.allEpisodes ? extractSlug(ep.nav.allEpisodes) : null,
      episode: ep.episode || null,
      image: ep.img || null,
      source: src,
    }),
  }).catch(() => {});
}

function switchEmbed(idx) {
  if (!state.embeds[idx]) return;
  state.current = idx;
  const emb = state.embeds[idx];
  stopHls();
  const frame = document.getElementById('player-frame');
  const video = document.getElementById('player-video');
  const loading = document.getElementById('loading');
  const noStream = document.getElementById('no-stream');
  loading.style.display = 'flex';
  noStream.style.display = 'none';
  frame.style.display = 'none';
  video.style.display = 'none';
  if (emb.type === 'hls' || /\.m3u8($|\?)/.test(emb.src)) {
    playHls(emb.src, video, loading);
  } else {
    frame.onload = () => { loading.style.display = 'none'; frame.style.display = 'block'; };
    frame.onerror = () => { loading.style.display = 'none'; frame.style.display = 'block'; };
    frame.src = emb.src;
  }
  document.querySelectorAll('#embed-tabs .embed-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function playHls(src, video, loading) {
  const proxyUrl = '/api/stream?url=' + encodeURIComponent(src);
  const fail = () => { loading.style.display = 'none'; video.style.display = 'none'; document.getElementById('no-stream').style.display = 'flex'; };
  if (window.Hls && Hls.isSupported()) {
    state.hls = new Hls({ maxBufferLength: 30 });
    state.hls.loadSource(proxyUrl);
    state.hls.attachMedia(video);
    state.hls.on(Hls.Events.MANIFEST_PARSED, (evt, data) => {
      const levels = data.levels || [];
      if (levels.length) { const maxIdx = levels.length - 1; state.hls.currentLevel = maxIdx; state.hls.loadLevel = maxIdx; }
      loading.style.display = 'none';
      video.style.display = 'block';
      video.play().catch(() => {});
    });
    state.hls.on(Hls.Events.ERROR, (evt, data) => {
      if (data.fatal) { console.error('[HLS]', data); state.hls.destroy(); state.hls = null; fail(); }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = proxyUrl;
    video.addEventListener('loadedmetadata', () => { loading.style.display = 'none'; video.style.display = 'block'; video.play().catch(() => {}); });
    video.addEventListener('error', fail);
  } else { fail(); }
}

function stopHls() {
  if (state.hls) { try { state.hls.destroy(); } catch (e) {} state.hls = null; }
  const video = document.getElementById('player-video');
  if (video) { video.removeAttribute('src'); video.load(); }
}

function renderToolbar(ep) {
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  const series = document.getElementById('btn-series');
  if (ep.nav?.prev) { prev.href = '/play/' + extractSlug(ep.nav.prev); prev.style.display = ''; }
  if (ep.nav?.next) { next.href = '/play/' + extractSlug(ep.nav.next); next.style.display = ''; }
  if (ep.nav?.allEpisodes) { series.href = '/?detail=' + extractSlug(ep.nav.allEpisodes); series.style.display = ''; }
}

function renderDownload(down) {
  const el = document.getElementById('download-section');
  if (!down || !down.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="section-title">Download Links</div>
    ${down.map(d => `
      <div class="api-endpoint">
        <span class="method">[${d.quality || 'Q'}]</span>
        ${(d.links||[]).map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.name}</a>`).join(' ')}
      </div>
    `).join('')}
  `;
}

function extractSlug(href) {
  if (!href) return '';
  return href.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '');
}

function openNewTab() {
  const src = state.embeds[state.current]?.src;
  if (src) window.open(src, '_blank', 'noopener');
}

load();
