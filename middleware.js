export const config = {
  matcher: ['/', '/index.html'],
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeReplaySummary(encoded) {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || !Array.isArray(payload.q) || payload.q.length === 0) return null;

    const totalMs = payload.q.reduce((sum, q) => sum + (Number(q[4]) || 0), 0);
    const avgSec = (totalMs / payload.q.length / 1000).toFixed(1);

    return {
      username: String(payload.u || 'Player'),
      score: Number(payload.s) || 0,
      right: Number(payload.r) || 0,
      wrong: Number(payload.w) || 0,
      avgSec,
    };
  } catch (_) {
    return null;
  }
}

export default async function middleware(request) {
  if (request.headers.get('x-mw-bypass') === '1') {
    return;
  }

  const url = new URL(request.url);
  const replayParam = url.searchParams.get('replay');

  const response = await fetch(new URL('/index.html', url.origin), {
    headers: { 'x-mw-bypass': '1' },
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();
  const origin = url.origin;

  let ogTitle = '1-Minute Math — Global Leaderboard';
  let ogDesc =
    '1-minute mobile math game with customizable game configurations, replays, and global leaderboards.';
  let ogImage = `${origin}/api/og`;
  let ogUrl = url.href;

  if (replayParam) {
    const summary = decodeReplaySummary(replayParam);
    ogImage = `${origin}/api/og?replay=${encodeURIComponent(replayParam)}`;
    if (summary) {
      ogTitle = `${summary.username} scored ${summary.score} in 1-Min Math!`;
      ogDesc = `Watch replay: ${summary.right} right · ${summary.wrong} wrong · ${summary.avgSec}s avg per question.`;
    }
  }

  html = html
    .replace(
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${escapeHtml(ogTitle)}">`
    )
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${escapeHtml(ogDesc)}">`
    )
    .replace(
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${escapeHtml(ogUrl)}">`
    )
    .replace(
      /<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${escapeHtml(ogImage)}">`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${escapeHtml(ogDesc)}">`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*">/,
      `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`
    );

  return new Response(html, {
    status: response.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
