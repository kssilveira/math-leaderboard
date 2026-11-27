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

const QUIZ_LANG_META = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

const QUIZ_CONFIG_LABELS = {
  cfg_geo_flag_country: '🚩 Flag → Country',
  cfg_geo_country_flag: '🌐 Country → Flag',
  cfg_geo_country_capital: '🌐 Country → Capital',
  cfg_geo_capital_country: '🏛️ Capital → Country',
  cfg_geo_flag_capital: '🚩 Flag → Capital',
  cfg_geo_capital_flag: '🏛️ Capital → Flag',
  cfg_geo_map_country: '🗺️ Map → Country',
  cfg_geo_country_map: '🌐 Country → Map',
  cfg_geo_map_flag: '🗺️ Map → Flag',
  cfg_geo_flag_map: '🚩 Flag → Map',
  cfg_geo_map_capital: '🗺️ Map → Capital',
  cfg_geo_capital_map: '🏛️ Capital → Map',
  cfg_chem_symbol_name: 'Symbol → Element',
  cfg_chem_name_symbol: 'Element → Symbol',
  cfg_other_morse_char: 'Morse → Character',
  cfg_other_char_morse: 'Character → Morse',
  cfg_study_de_en_a1_vocab_de_en: '🇩🇪 A1 · Vocab (DE → EN)',
  cfg_study_de_en_a1_vocab_en_de: '🇩🇪 A1 · Vocab (EN → DE)',
  cfg_study_de_en_a1_grammar: '🇩🇪 A1 · Grammar',
  cfg_study_de_en_a1_verbs: '🇩🇪 A1 · Verbs & Conjugation',
  cfg_study_de_en_a1_articles: '🇩🇪 A1 · Articles & Gender',
  cfg_study_de_en_a1_phrases: '🇩🇪 A1 · Everyday Phrases',
};

for (const src of QUIZ_LANG_META) {
  for (const dst of QUIZ_LANG_META) {
    if (src.code === dst.code) continue;
    const srcLabel = `${src.flag} ${src.code.toUpperCase()}`;
    const dstLabel = `${dst.flag} ${dst.code.toUpperCase()}`;
    QUIZ_CONFIG_LABELS[`cfg_lang_${src.code}_${dst.code}`] = `${srcLabel} → ${dstLabel}`;
  }
}
for (const lang of QUIZ_LANG_META) {
  const langLabel = `${lang.flag} ${lang.code.toUpperCase()}`;
  QUIZ_CONFIG_LABELS[`cfg_lang_emoji_${lang.code}`] = `😀 Emoji → ${langLabel}`;
  QUIZ_CONFIG_LABELS[`cfg_lang_${lang.code}_emoji`] = `${langLabel} → 😀 Emoji`;
  const synKey = lang.code === 'en' ? 'cfg_lang_synonym' : `cfg_lang_synonym_${lang.code}`;
  const antKey = lang.code === 'en' ? 'cfg_lang_antonym' : `cfg_lang_antonym_${lang.code}`;
  const idmKey = lang.code === 'en' ? 'cfg_lang_idiom_meaning' : `cfg_lang_idiom_meaning_${lang.code}`;
  const mngKey = lang.code === 'en' ? 'cfg_lang_meaning_idiom' : `cfg_lang_meaning_idiom_${lang.code}`;
  QUIZ_CONFIG_LABELS[synKey] = `${lang.flag} Synonyms`;
  QUIZ_CONFIG_LABELS[antKey] = `${lang.flag} Antonyms`;
  QUIZ_CONFIG_LABELS[idmKey] = `${lang.flag} Idiom → Meaning`;
  QUIZ_CONFIG_LABELS[mngKey] = `${lang.flag} Meaning → Idiom`;
}

function getMiniPartLabel(baseId, partNum) {
  if (baseId.startsWith('cfg_study_')) {
    if (baseId.includes('_vocab_')) {
      return [
        'Basics & Time',
        'People & Family',
        'Home & Routine',
        'Food & Shopping',
        'City & Travel',
        'Work & Free Time',
        'Verbs & Qualities'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_grammar')) {
      return [
        'Word Order & Questions',
        'Pronouns & Negation',
        'Cases & Plurals',
        'Prepositions',
        'Modals & Connectors'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_verbs')) {
      return [
        'sein, haben & Modals',
        'Regular Present',
        'Stem-Changing',
        'Separable & Perfekt'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_articles')) {
      return [
        'People & Home',
        'Food & City',
        'Work & Time',
        'Nom vs Akk'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_phrases')) {
      return [
        'Greetings & Intro',
        'Café & Shopping',
        'Directions & Travel',
        'Time & Health'
      ][partNum - 1] || `Part ${partNum}`;
    }
  }
  if (baseId.startsWith('cfg_geo_')) {
    return ['Americas', 'Europe', 'Africa', 'Asia & Oceania'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_lang_synonym') || baseId.startsWith('cfg_lang_antonym')) {
    return ['1–75', '76–150', '151–225', '226–300'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_lang_idiom_meaning') || baseId.startsWith('cfg_lang_meaning_idiom')) {
    return ['1–50', '51–100', '101–150', '151–200'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_lang_')) {
    return ['1–250', '251–500', '501–750', '751–1000'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_chem_')) {
    return ['1–30', '31–56', '57–88', '89–118'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.includes('morse')) {
    return ['1–2 Signals', '3 Signals', '4 Signals', '5 Signals'][partNum - 1] || `Part ${partNum}`;
  }
  return `Part ${partNum}`;
}

function formatConfigId(configId) {
  if (typeof configId === 'string') {
    const miniMatch = configId.match(/^(.+)_p(\d+)$/);
    if (miniMatch && QUIZ_CONFIG_LABELS[miniMatch[1]]) {
      return `${QUIZ_CONFIG_LABELS[miniMatch[1]]} · ${getMiniPartLabel(miniMatch[1], Number(miniMatch[2]))}`;
    }
  }
  if (configId && QUIZ_CONFIG_LABELS[configId]) {
    return QUIZ_CONFIG_LABELS[configId];
  }
  if (!configId || !configId.startsWith('cfg_')) {
    return '+ − (0..10, 0..10, 0..20)';
  }
  const parts = configId.slice(4).split('_');
  if (parts.length < 7) return configId;
  const opMap = { add: '+', sub: '−', mul: '×', div: '÷' };
  const ops = parts[0]
    .split('-')
    .map((k) => opMap[k] || k)
    .join(' ');
  return `${ops} (${parts[1]}..${parts[2]}, ${parts[3]}..${parts[4]}, ${parts[5]}..${parts[6]})`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const replayParam = url.searchParams.get('replay');
  const configParam = url.searchParams.get('config');
  const userParam = url.searchParams.get('user');
  const uParam = url.searchParams.get('u');
  const origin = url.origin;

  let ogTitle = '1-Minute Quiz — Global Leaderboards';
  let ogDesc =
    '1-minute mobile quiz game (Math, Geography, Language & Other) with replays, ghost races, and global leaderboards.';
  let ogImage = `${origin}/api/og?v=2`;
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
    ogDesc = `See ${playerName}'s global leaderboard ranks and best scores across Math, Geography, Language & Other.`;
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
