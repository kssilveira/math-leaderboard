import {
  resolveConfigIdAlias,
  formatConfigId,
} from './lib/config-labels.js';

export const config = {
  matcher: ['/', '/index.html'],
};

const CANONICAL_APP_URL = 'https://kssilveira.github.io/math-leaderboard/';

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

    let opponent = null;
    if (payload.o && typeof payload.o === 'object') {
      opponent = {
        username: String(payload.o.u || 'Opponent'),
        score: Number(payload.o.s) || 0,
        right: Number(payload.o.r) || 0,
        wrong: Number(payload.o.w) || 0,
      };
    }

    return {
      username: String(payload.u || 'Player'),
      score: Number(payload.s) || 0,
      right: Number(payload.r) || 0,
      wrong: Number(payload.w) || 0,
      avgSec,
      opponent,
    };
  } catch (_) {
    return null;
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const replayParam = url.searchParams.get('replay');
  const rawConfigParam = url.searchParams.get('config');
  const configParam = rawConfigParam ? resolveConfigIdAlias(rawConfigParam) : null;
  const userParam = url.searchParams.get('user');
  const uParam = url.searchParams.get('u');
  const origin = url.origin;

  let ogTitle = '1-Minute Quiz — Global Leaderboards';
  let ogDesc =
    '1-minute mobile quiz game (Math, Geography, Language, Study & Other) with replays, ghost races, and global leaderboards.';
  let ogImage = `${origin}/api/og?v=3`;
  let targetUrl = CANONICAL_APP_URL + url.search;

  if (replayParam) {
    const summary = decodeReplaySummary(replayParam);
    ogImage = `${origin}/api/og?replay=${encodeURIComponent(replayParam)}`;
    if (summary) {
      if (summary.opponent) {
        const opp = summary.opponent;
        const diff = summary.score - opp.score;
        if (diff > 0) {
          ogTitle = `${summary.username} beat ${opp.username} (${summary.score} to ${opp.score}) in 1-Min Quiz!`;
        } else if (diff === 0) {
          ogTitle = `${summary.username} tied with ${opp.username} (${summary.score} to ${opp.score}) in 1-Min Quiz!`;
        } else {
          ogTitle = `${summary.username} vs ${opp.username} (${summary.score} to ${opp.score}) in 1-Min Quiz!`;
        }
        ogDesc = `Watch Ghost Race replay: ${summary.username} (${summary.right} right · ${summary.wrong} wrong) vs ${opp.username} (${opp.right} right · ${opp.wrong} wrong).`;
      } else {
        ogTitle = `${summary.username} scored ${summary.score} in 1-Min Quiz!`;
        ogDesc = `Watch replay: ${summary.right} right · ${summary.wrong} wrong · ${summary.avgSec}s avg per question.`;
      }
    }
  } else if (userParam) {
    const playerName = uParam || 'Player';
    ogTitle = `${playerName}'s Ranks & Scores — 1-Minute Quiz`;
    ogDesc = `See ${playerName}'s global leaderboard ranks and best scores across Math, Geography, Language, Study & Other.`;
    const imgParams = new URLSearchParams();
    imgParams.set('user', userParam);
    if (uParam) imgParams.set('u', uParam);
    ogImage = `${origin}/api/og?${imgParams.toString()}`;
  } else if (configParam) {
    const cfgLabel = formatConfigId(configParam);
    ogTitle = `1-Minute Quiz — ${cfgLabel} Leaderboard`;
    ogDesc = `Compete on the ${cfgLabel} 60-second global leaderboard in 1-Minute Quiz!`;
    ogImage = `${origin}/api/og?config=${encodeURIComponent(configParam)}`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDesc)}">
  <meta property="og:url" content="${escapeHtml(url.href)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <title>${escapeHtml(ogTitle)}</title>
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(targetUrl)}">1-Minute Quiz</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
