import http from 'node:http';

function parsePort(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      const next = Number(argv[i + 1]);
      if (Number.isInteger(next) && next > 0 && next <= 65535) return next;
    } else if (/^--port=\d+$/.test(arg)) {
      const val = Number(arg.split('=')[1]);
      if (val > 0 && val <= 65535) return val;
    } else if (/^\d+$/.test(arg)) {
      const val = Number(arg);
      if (val > 0 && val <= 65535) return val;
    }
  }
  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort > 0 && envPort <= 65535) return envPort;
  return 8001;
}

function encodeReplayPayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

const SAMPLE_SOLO_QUESTIONS = [
  [8, 0, 7, 2, 1150],
  [9, 2, 6, 2, 1420],
  [14, 1, 5, 1, 1680, ['8']],
  [24, 3, 6, 2, 1290],
  [7, 0, 9, 0, 1540],
  [8, 2, 7, 2, 1180],
  [18, 1, 9, 2, 1310],
  [36, 3, 4, 1, 1620],
  [6, 0, 8, 2, 1050],
  [12, 2, 5, 2, 1490],
];

const SAMPLE_OPP_QUESTIONS = [
  [8, 0, 7, 2, 1300],
  [9, 2, 6, 2, 1600, ['56']],
  [14, 1, 5, 1, 1500],
  [24, 3, 6, 2, 1750],
  [7, 0, 9, 0, 1800, ['8']],
  [8, 2, 7, 2, 1400],
  [18, 1, 9, 2, 1550],
  [36, 3, 4, 1, 1900],
  [6, 0, 8, 2, 1250],
];

const SAMPLE_SOLO_REPLAY = encodeReplayPayload({
  u: 'Alex',
  c: 'cfg_add-sub-mul-div_0_10_0_10_0_20',
  s: 9,
  r: 10,
  w: 1,
  q: SAMPLE_SOLO_QUESTIONS,
});

const SAMPLE_RACE_REPLAY = encodeReplayPayload({
  u: 'Alex',
  c: 'cfg_add-sub-mul-div_0_10_0_10_0_20',
  s: 9,
  r: 10,
  w: 1,
  q: SAMPLE_SOLO_QUESTIONS,
  o: {
    u: 'Sam',
    s: 7,
    r: 9,
    w: 2,
    q: SAMPLE_OPP_QUESTIONS,
  },
});

const GALLERY_EXAMPLES = [
  { title: 'Home Overview', query: '' },
  { title: 'Math Leaderboard', query: 'config=cfg_add-sub_0_10_0_10_0_20' },
  { title: 'Geography Map Leaderboard', query: 'config=cfg_geo_map_country' },
  { title: 'Language Leaderboard', query: 'config=cfg_lang_pt_en' },
  { title: 'Study Leaderboard', query: 'config=cfg_study_de_de_a1_grammar' },
  { title: 'Other (Chemistry) Leaderboard', query: 'config=cfg_chem_symbol_name' },
  { title: 'Solo Replay', query: `replay=${encodeURIComponent(SAMPLE_SOLO_REPLAY)}` },
  { title: 'Ghost Race Replay', query: `replay=${encodeURIComponent(SAMPLE_RACE_REPLAY)}` },
  { title: 'Player Profile', query: 'user=preview_demo&u=Alex' },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderGalleryHtml(port) {
  const cardsHtml = GALLERY_EXAMPLES.map((item, idx) => {
    const qs = item.query ? `?${item.query}` : '';
    const imgUrl = `/api/og${qs}`;
    const metaUrl = `/meta${qs}`;
    return `
      <article class="card" data-idx="${idx}" data-query="${escapeHtml(item.query)}">
        <header class="card-header">
          <div>
            <h2>${escapeHtml(item.title)}</h2>
            <code>/api/og${escapeHtml(qs)}</code>
          </div>
          <div class="card-actions">
            <span class="timing" data-timing>loading…</span>
            <a class="btn" href="${escapeHtml(imgUrl)}" target="_blank" rel="noopener">PNG</a>
            <a class="btn" href="${escapeHtml(metaUrl)}" target="_blank" rel="noopener">Meta</a>
            <button class="btn" type="button" data-reload>Reload</button>
          </div>
        </header>
        <a class="img-wrap" href="${escapeHtml(imgUrl)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.title)}" width="1200" height="630">
        </a>
      </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1-Min Quiz — Local OG Image Preview</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #eef3f9;
      color: #1b222c;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0f172a; color: #e2e8f0; }
      .toolbar, .card, .custom-box { background: #1e293b !important; border-color: #334155 !important; }
      .btn, input { background: #0f172a !important; color: #e2e8f0 !important; border-color: #475569 !important; }
      code { background: #0f172a !important; color: #93c5fd !important; }
    }
    .wrap { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
    .toolbar, .custom-box {
      background: #ffffff;
      border: 1px solid #dbe2ea;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .sub { margin: 0; font-size: 13px; color: #64748b; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      background: #f1f5f9;
      color: #1264e1;
      padding: 2px 6px;
      border-radius: 6px;
      word-break: break-all;
    }
    .custom-form { display: flex; flex: 1; min-width: 280px; gap: 8px; align-items: center; }
    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #1b222c;
      text-decoration: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn.primary { background: #1264e1; border-color: #1264e1; color: #ffffff; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
      gap: 18px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #dbe2ea;
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    .card-header h2 { margin: 0 0 4px; font-size: 16px; }
    .card-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .timing { font-size: 11px; color: #64748b; font-variant-numeric: tabular-nums; }
    .img-wrap { display: block; border-radius: 10px; overflow: hidden; border: 1px solid #cbd5e1; }
    .img-wrap img { display: block; width: 100%; height: auto; aspect-ratio: 1200 / 630; background: #e2e8f0; }
    #custom-preview { display: none; width: 100%; }
    #custom-preview.visible { display: flex; flex-direction: column; gap: 10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="toolbar">
      <div>
        <h1>1-Min Quiz — Local OG Image Preview</h1>
        <p class="sub">Running on <code>http://localhost:${port}</code> · Tip: run <code>node --watch scripts/preview-og.mjs</code> to auto-restart on edits to <code>api/og.js</code> or <code>lib/</code>.</p>
      </div>
      <div class="card-actions">
        <button class="btn primary" type="button" id="reload-all">Reload All</button>
      </div>
    </section>

    <section class="custom-box">
      <form class="custom-form" id="custom-form">
        <label for="custom-query"><strong>?</strong></label>
        <input id="custom-query" type="text" placeholder="config=cfg_study_fr_fr_a2_verbs" value="config=cfg_study_fr_fr_a2_verbs">
        <button class="btn primary" type="submit">Preview</button>
        <a class="btn" id="custom-png" href="/api/og?config=cfg_study_fr_fr_a2_verbs" target="_blank" rel="noopener">PNG</a>
        <a class="btn" id="custom-meta" href="/meta?config=cfg_study_fr_fr_a2_verbs" target="_blank" rel="noopener">Meta</a>
      </form>
      <div id="custom-preview">
        <a class="img-wrap" id="custom-link" href="/api/og?config=cfg_study_fr_fr_a2_verbs" target="_blank" rel="noopener">
          <img id="custom-img" alt="Custom OG preview" width="1200" height="630">
        </a>
      </div>
    </section>

    <section class="grid">
      ${cardsHtml}
    </section>
  </div>
  <script>
    function wireImgTiming(img, labelEl) {
      let t0 = performance.now();
      img.addEventListener('load', () => {
        labelEl.textContent = Math.round(performance.now() - t0) + ' ms';
      });
      img.addEventListener('error', () => {
        labelEl.textContent = 'error';
      });
      return () => { t0 = performance.now(); labelEl.textContent = 'loading…'; };
    }

    function buildOgUrl(base, query, bust) {
      const params = new URLSearchParams(query || '');
      if (bust) params.set('_t', String(Date.now()));
      const qs = params.toString();
      return base + (qs ? '?' + qs : '');
    }

    document.querySelectorAll('.card').forEach((card) => {
      const query = card.dataset.query || '';
      const img = card.querySelector('img');
      const timing = card.querySelector('[data-timing]');
      const reloadBtn = card.querySelector('[data-reload]');
      const resetTimer = wireImgTiming(img, timing);
      reloadBtn.addEventListener('click', () => {
        resetTimer();
        img.src = buildOgUrl('/api/og', query, true);
      });
    });

    document.getElementById('reload-all').addEventListener('click', () => {
      document.querySelectorAll('[data-reload]').forEach((btn) => btn.click());
    });

    const customForm = document.getElementById('custom-form');
    const customInput = document.getElementById('custom-query');
    const customPreview = document.getElementById('custom-preview');
    const customImg = document.getElementById('custom-img');
    const customLink = document.getElementById('custom-link');
    const customPng = document.getElementById('custom-png');
    const customMeta = document.getElementById('custom-meta');

    customForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = customInput.value.trim().replace(/^\\?/, '');
      const imgUrl = buildOgUrl('/api/og', q, true);
      const cleanPng = buildOgUrl('/api/og', q, false);
      const cleanMeta = buildOgUrl('/meta', q, false);
      customImg.src = imgUrl;
      customLink.href = cleanPng;
      customPng.href = cleanPng;
      customMeta.href = cleanMeta;
      customPreview.classList.add('visible');
    });
  </script>
</body>
</html>`;
}

async function loadHandlers() {
  try {
    const [{ default: ogHandler }, { default: middlewareHandler }] = await Promise.all([
      import('../api/og.js'),
      import('../middleware.js'),
    ]);
    return { ogHandler, middlewareHandler };
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (err?.code === 'ERR_MODULE_NOT_FOUND' && msg.includes('@vercel/og')) {
      console.error(
        'Missing dependency "@vercel/og". Install dependencies first by running:\n\n  npm install\n'
      );
      process.exit(1);
    }
    throw err;
  }
}

async function main() {
  const port = parsePort(process.argv.slice(2));
  const { ogHandler, middlewareHandler } = await loadHandlers();

  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);

    if (reqUrl.pathname === '/api/og') {
      try {
        const webReq = new Request(reqUrl.href, { method: req.method || 'GET' });
        const webRes = await ogHandler(webReq);
        const body = Buffer.from(await webRes.arrayBuffer());
        res.writeHead(webRes.status, {
          'content-type': webRes.headers.get('content-type') || 'image/png',
          'cache-control': 'no-store',
        });
        res.end(body);
      } catch (err) {
        console.error('[preview-og] /api/og error:', err);
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`Failed to render OG image: ${err?.message || err}`);
      }
      return;
    }

    if (reqUrl.pathname === '/meta') {
      try {
        const mwUrl = new URL(`/${reqUrl.search}`, `http://localhost:${port}`);
        const webReq = new Request(mwUrl.href, { method: req.method || 'GET' });
        const webRes = await middlewareHandler(webReq);
        const text = await webRes.text();
        res.writeHead(webRes.status, {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        });
        res.end(text);
      } catch (err) {
        console.error('[preview-og] /meta error:', err);
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`Failed to render middleware HTML: ${err?.message || err}`);
      }
      return;
    }

    if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(renderGalleryHtml(port));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found. Open / for the OG preview gallery or /api/og for raw PNG output.');
  });

  const onListening = () => {
    console.log(`OG preview gallery:  http://localhost:${port}/`);
    console.log(`Home OG image:       http://localhost:${port}/api/og`);
    console.log(`Config OG example:   http://localhost:${port}/api/og?config=cfg_study_de_de_a1_grammar`);
    console.log(`Meta tags preview:   http://localhost:${port}/meta?config=cfg_geo_map_country`);
    console.log('Tip: use "node --watch scripts/preview-og.mjs" to auto-restart on edits.');
  };

  server.once('error', (err) => {
    if (err && (err.code === 'EAFNOSUPPORT' || err.code === 'EADDRNOTAVAIL')) {
      server.listen(port, '127.0.0.1', onListening);
      return;
    }
    throw err;
  });

  server.listen(port, '::', onListening);
}

main();
