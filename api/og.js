import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

const FIREBASE_BASE_URL =
  'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app';
const DEFAULT_CONFIG_ID = 'cfg_add-sub_0_10_0_10_0_20';
const ALL_OPS = ['+', '-', '×', '÷'];

function h(type, style, children) {
  return {
    type,
    props: {
      style,
      children,
    },
  };
}

function svgEl(type, attrs, children) {
  return {
    type,
    props: {
      ...attrs,
      ...(children !== undefined ? { children } : {}),
    },
  };
}

const QUIZ_LANG_META = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

const QUIZ_CONFIG_LABELS = {
  cfg_geo_flag_country: '🚩 Flag → 🌐 Country',
  cfg_geo_country_flag: '🌐 Country → 🚩 Flag',
  cfg_geo_country_capital: '🌐 Country → 🏛️ Capital',
  cfg_geo_capital_country: '🏛️ Capital → 🌐 Country',
  cfg_geo_flag_capital: '🚩 Flag → 🏛️ Capital',
  cfg_geo_capital_flag: '🏛️ Capital → 🚩 Flag',
  cfg_geo_map_country: '🗺️ Map → 🌐 Country',
  cfg_geo_country_map: '🌐 Country → 🗺️ Map',
  cfg_geo_map_flag: '🗺️ Map → 🚩 Flag',
  cfg_geo_flag_map: '🚩 Flag → 🗺️ Map',
  cfg_geo_map_capital: '🗺️ Map → 🏛️ Capital',
  cfg_geo_capital_map: '🏛️ Capital → 🗺️ Map',
  cfg_chem_symbol_name: '🏷️ Symbol → ⚛️ Element',
  cfg_chem_name_symbol: '⚛️ Element → 🏷️ Symbol',
  cfg_other_morse_char: '📡 Morse → 🔤 Character',
  cfg_other_char_morse: '🔤 Character → 📡 Morse',
  cfg_study_de_en_a1_vocab_de_en: '🇩🇪 A1 · 🇩🇪 DE → 🇬🇧 EN',
  cfg_study_de_en_a1_vocab_en_de: '🇩🇪 A1 · 🇬🇧 EN → 🇩🇪 DE',
  cfg_study_de_en_a1_grammar: '🇩🇪 A1 · 📐 Grammar',
  cfg_study_de_en_a1_verbs: '🇩🇪 A1 · ⚡ Verbs & Conjugation',
  cfg_study_de_en_a1_articles: '🇩🇪 A1 · 🏷️ Articles & Gender',
  cfg_study_de_en_a1_phrases: '🇩🇪 A1 · 🗣️ Everyday Phrases',
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
        '⏰ Basics & Time',
        '👪 People & Family',
        '🏠 Home & Routine',
        '🍎 Food & Shopping',
        '🚆 City & Travel',
        '💼 Work & Free Time',
        '✨ Verbs & Qualities'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_grammar')) {
      return [
        '❓ Word Order & Questions',
        '🚫 Pronouns & Negation',
        '📚 Cases & Plurals',
        '📍 Prepositions',
        '🔗 Modals & Connectors'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_verbs')) {
      return [
        '⭐ sein, haben & Modals',
        '✅ Regular Present',
        '🔀 Stem-Changing',
        '⏪ Separable & Perfekt'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_articles')) {
      return [
        '🏠 People & Home',
        '🍎 Food & City',
        '💼 Work & Time',
        '⚖️ Nom vs Akk'
      ][partNum - 1] || `Part ${partNum}`;
    }
    if (baseId.endsWith('_phrases')) {
      return [
        '👋 Greetings & Intro',
        '☕ Café & Shopping',
        '🧭 Directions & Travel',
        '🏥 Time & Health'
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

function decodeQuestionsList(list) {
  return (list || []).map((item, idx) => {
    const a = Number(item[0]) || 0;
    const isQuiz = Number(item[1]) === 4;
    const op = ALL_OPS[item[1]] || '+';
    const b = Number(item[2]) || 0;
    let c = 0;
    if (op === '+') c = a + b;
    else if (op === '-') c = a - b;
    else if (op === '×') c = a * b;
    else if (op === '÷') c = b !== 0 ? Math.trunc(a / b) : 0;

    const nums = [a, b, c];
    const missingIndex = typeof item[3] === 'number' ? item[3] : 2;
    const expected = nums[missingIndex];
    const durationMs = typeof item[4] === 'number' ? item[4] : 800;
    const wrongAnswers = Array.isArray(item[5]) ? item[5].map(String) : [];
    const right = item[6] === 0 ? 0 : 1;

    return {
      qNum: idx + 1,
      isQuiz,
      nums,
      op: op === '-' ? '−' : op,
      missingIndex,
      expected,
      wrongAnswers,
      right,
      wrong: wrongAnswers.length,
      durationMs,
    };
  });
}

function decodeReplay(encoded) {
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

    const questions = decodeQuestionsList(payload.q);
    const totalQMs = questions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const slowestMs = questions.reduce((max, q) => Math.max(max, q.durationMs || 0), 0);
    const avgSec = (totalQMs / questions.length / 1000).toFixed(1);
    const slowestSec = (slowestMs / 1000).toFixed(1);

    let opponent = null;
    if (payload.o && Array.isArray(payload.o.q) && payload.o.q.length > 0) {
      const oppQuestions = decodeQuestionsList(payload.o.q);
      const oppTotalMs = oppQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
      const oppAvgSec = (oppTotalMs / oppQuestions.length / 1000).toFixed(1);
      opponent = {
        username: String(payload.o.u || 'Opponent'),
        score: Number(payload.o.s) || 0,
        right: Number(payload.o.r) || 0,
        wrong: Number(payload.o.w) || 0,
        avgSec: oppAvgSec,
        questions: oppQuestions,
      };
    }

    return {
      username: String(payload.u || 'Player'),
      configLabel: formatConfigId(String(payload.c || '')),
      score: Number(payload.s) || 0,
      right: Number(payload.r) || 0,
      wrong: Number(payload.w) || 0,
      avgSec,
      slowestSec,
      opponent,
      questions,
    };
  } catch (_) {
    return null;
  }
}

function buildTimelineEvents(questions) {
  let cursorMs = 0;
  const segments = (questions || []).map((q) => {
    const dur = Math.max(150, q.durationMs || 800);
    const startMs = cursorMs;
    const endMs = startMs + dur;
    cursorMs = endMs;
    const attempts = [
      ...(q.wrongAnswers || []).map(() => ({ isRight: false })),
      ...(q.right > 0 ? [{ isRight: true }] : []),
    ];
    const k = attempts.length;
    const events = attempts.map((att, idx) => ({
      isRight: att.isRight,
      triggerMs: startMs + Math.round(((idx + 1) / (k + 0.15)) * dur),
    }));
    return { startMs, endMs, question: q, events };
  });
  return { segments, totalDurationMs: Math.max(cursorMs, 500) };
}

function getScoreAt(timeline, elapsedMs) {
  const { segments, totalDurationMs } = timeline;
  const clampedMs = Math.min(Math.max(0, elapsedMs), totalDurationMs);
  let r = 0;
  let w = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (clampedMs >= seg.endMs) {
      r += seg.question.right > 0 ? 1 : 0;
      w += seg.question.wrong || 0;
    } else {
      seg.events.forEach((ev) => {
        if (clampedMs >= ev.triggerMs) {
          if (ev.isRight) r += 1;
          else w += 1;
        }
      });
      break;
    }
  }
  return r - w;
}

function renderRaceScoreChartBox(replay, opp) {
  const p1Timeline = buildTimelineEvents(replay.questions);
  const p2Timeline = buildTimelineEvents(opp.questions);
  const totalDurationMs = Math.max(p1Timeline.totalDurationMs, 500);
  const steps = 60;
  const samples = [];
  let minScore = 0;
  let maxScore = 5;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalDurationMs;
    const p1 = getScoreAt(p1Timeline, t);
    const p2 = getScoreAt(p2Timeline, t);
    minScore = Math.min(minScore, p1, p2);
    maxScore = Math.max(maxScore, p1, p2);
    samples.push({ t, p1, p2, delta: p1 - p2 });
  }

  const svgW = 486;
  const padX = 6;
  const plotW = svgW - padX * 2;
  const topPad = 8;
  const bottomPad = 88;
  const plotH = bottomPad - topPad;
  const getX = (ms) => padX + (Math.min(Math.max(0, ms), totalDurationMs) / totalDurationMs) * plotW;
  const getY = (s) => bottomPad - ((s - minScore) / Math.max(1, maxScore - minScore)) * plotH;

  const svgChildren = [];
  const yZero = getY(0).toFixed(1);
  svgChildren.push(
    svgEl('line', {
      x1: String(padX),
      y1: String(topPad),
      x2: String(svgW - padX),
      y2: String(topPad),
      stroke: '#cbd5e1',
      'stroke-width': '1',
      'stroke-dasharray': '4 4',
    }),
    svgEl('line', {
      x1: String(padX),
      y1: yZero,
      x2: String(svgW - padX),
      y2: yZero,
      stroke: '#cbd5e1',
      'stroke-width': '1',
      'stroke-dasharray': '4 4',
    })
  );

  for (let i = 0; i < steps; i++) {
    const s0 = samples[i];
    const s1 = samples[i + 1];
    const avgDelta = (s0.delta + s1.delta) / 2;
    if (avgDelta !== 0) {
      const x1 = getX(s0.t).toFixed(1);
      const x2 = getX(s1.t).toFixed(1);
      const y1a = getY(s0.p1).toFixed(1);
      const y2a = getY(s1.p1).toFixed(1);
      const y1b = getY(s0.p2).toFixed(1);
      const y2b = getY(s1.p2).toFixed(1);
      svgChildren.push(
        svgEl('polygon', {
          points: `${x1},${y1a} ${x2},${y2a} ${x2},${y2b} ${x1},${y1b}`,
          fill: avgDelta > 0 ? 'rgba(31, 147, 76, 0.22)' : 'rgba(227, 38, 54, 0.22)',
        })
      );
    }
  }

  const p2Pts = samples.map((s) => `${getX(s.t).toFixed(1)},${getY(s.p2).toFixed(1)}`).join(' ');
  const p1Pts = samples.map((s) => `${getX(s.t).toFixed(1)},${getY(s.p1).toFixed(1)}`).join(' ');
  const lastSample = samples[samples.length - 1];

  svgChildren.push(
    svgEl('polyline', {
      fill: 'none',
      stroke: '#f59e0b',
      'stroke-width': '3',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      points: p2Pts,
    }),
    svgEl('polyline', {
      fill: 'none',
      stroke: '#1264e1',
      'stroke-width': '3.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      points: p1Pts,
    }),
    svgEl('circle', {
      cx: getX(lastSample.t).toFixed(1),
      cy: getY(lastSample.p2).toFixed(1),
      r: '4.5',
      fill: '#f59e0b',
      stroke: '#ffffff',
      'stroke-width': '1.5',
    }),
    svgEl('circle', {
      cx: getX(lastSample.t).toFixed(1),
      cy: getY(lastSample.p1).toFixed(1),
      r: '5',
      fill: '#1264e1',
      stroke: '#ffffff',
      'stroke-width': '1.5',
    })
  );

  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      border: '1px solid #dbe2ea',
      borderRadius: '14px',
      padding: '10px 14px 8px',
      marginBottom: '8px',
      gap: '6px',
    },
    [
      h(
        'div',
        {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontWeight: 800,
          color: '#627084',
        },
        [
          h('span', {}, `Score Timeline (0 -> ${maxScore})`),
          h(
            'div',
            { display: 'flex', alignItems: 'center', gap: '14px' },
            [
              h(
                'div',
                { display: 'flex', alignItems: 'center', gap: '5px', color: '#1264e1' },
                [
                  h('div', {
                    width: '9px',
                    height: '9px',
                    borderRadius: '999px',
                    backgroundColor: '#1264e1',
                  }),
                  h('span', {}, `${replay.username} (${replay.score})`),
                ]
              ),
              h(
                'div',
                { display: 'flex', alignItems: 'center', gap: '5px', color: '#d97706' },
                [
                  h('div', {
                    width: '9px',
                    height: '9px',
                    borderRadius: '999px',
                    backgroundColor: '#f59e0b',
                  }),
                  h('span', {}, `${opp.username} (${opp.score})`),
                ]
              ),
            ]
          ),
        ]
      ),
      svgEl(
        'svg',
        {
          width: String(svgW),
          height: '96',
          viewBox: `0 0 ${svgW} 96`,
          style: { width: `${svgW}px`, height: '96px', display: 'flex' },
        },
        svgChildren
      ),
    ]
  );
}

function renderReplayCard(replay) {
  const opp = replay.opponent;
  const isRace = Boolean(opp && Array.isArray(opp.questions) && opp.questions.length > 0);
  const sampleQuestions = replay.questions.slice(0, isRace ? 6 : 9);

  const statBox = (label, value, color = '#1b222c') =>
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: '#f8fafc',
        border: '1px solid #dbe2ea',
        borderRadius: '14px',
        padding: '14px 10px',
      },
      [
        h(
          'div',
          {
            fontSize: '13px',
            fontWeight: 800,
            color: '#627084',
            textTransform: 'uppercase',
            marginBottom: '4px',
          },
          label
        ),
        h(
          'div',
          {
            fontSize: '30px',
            fontWeight: 900,
            color,
          },
          String(value)
        ),
      ]
    );

  const questionRows = sampleQuestions.map((q) => {
    const hadMistake = q.wrong > 0 || q.right === 0;
    const eqText = q.isQuiz
      ? `Question #${q.qNum}`
      : q.nums
          .map((n, idx) => (idx === q.missingIndex ? `[${n}]` : String(n)))
          .join(' ')
          .replace(' ', ` ${q.op} `)
          .replace(/ (\S+)$/, ' = $1');

    const statusText = q.isQuiz
      ? hadMistake
        ? 'Mistake'
        : 'Correct'
      : hadMistake
      ? `Wrong: ${q.wrongAnswers.join(', ')}${q.right > 0 ? ` -> ${q.expected}` : ''}`
      : `Ans: ${q.expected}`;

    return h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: hadMistake ? '#fef2f3' : '#f4f7fa',
        borderRadius: '10px',
        padding: '9px 14px',
        fontSize: '18px',
        fontWeight: 700,
      },
      [
        h('div', { color: '#1b222c', display: 'flex' }, eqText),
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          },
          [
            h(
              'span',
              {
                color: hadMistake ? '#e32636' : '#1f934c',
                fontSize: '16px',
              },
              statusText
            ),
            h(
              'span',
              {
                color: '#627084',
                fontSize: '16px',
              },
              `${(q.durationMs / 1000).toFixed(1)}s`
            ),
          ]
        ),
      ]
    );
  });

  const diff = isRace ? replay.score - opp.score : 0;
  const diffStr = diff > 0 ? `+${diff}` : String(diff);

  let scoreCenterBox;
  if (isRace) {
    const isWin = diff > 0;
    const isTie = diff === 0;
    const bannerColor = isWin ? '#1f934c' : isTie ? '#1264e1' : '#e32636';
    const bannerBg = isWin ? '#eefbf3' : isTie ? '#f0f6ff' : '#fef2f3';
    const outcomeText = isWin
      ? `${replay.username} Beat ${opp.username} (${diffStr})`
      : isTie
      ? `Tied with ${opp.username}`
      : `Race vs ${opp.username} (${diffStr})`;

    scoreCenterBox = h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bannerBg,
        border: `2px solid ${bannerColor}`,
        borderRadius: '18px',
        padding: '16px 18px',
        gap: '10px',
      },
      [
        h(
          'div',
          {
            fontSize: '14px',
            fontWeight: 800,
            color: bannerColor,
            textTransform: 'uppercase',
          },
          outcomeText
        ),
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          },
          [
            h(
              'div',
              {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              },
              [
                h(
                  'div',
                  { fontSize: '16px', fontWeight: 800, color: '#1b222c' },
                  replay.username
                ),
                h(
                  'div',
                  {
                    fontSize: '54px',
                    fontWeight: 900,
                    color: isWin ? '#1f934c' : '#1264e1',
                    lineHeight: 1.05,
                  },
                  String(replay.score)
                ),
                h(
                  'div',
                  { fontSize: '13px', fontWeight: 700, color: '#627084' },
                  `${replay.right}R / ${replay.wrong}W`
                ),
              ]
            ),
            h(
              'div',
              {
                fontSize: '18px',
                fontWeight: 900,
                color: '#627084',
                padding: '0 10px',
              },
              'VS'
            ),
            h(
              'div',
              {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              },
              [
                h(
                  'div',
                  { fontSize: '16px', fontWeight: 800, color: '#1b222c' },
                  opp.username
                ),
                h(
                  'div',
                  {
                    fontSize: '54px',
                    fontWeight: 900,
                    color: diff < 0 ? '#1f934c' : '#627084',
                    lineHeight: 1.05,
                  },
                  String(opp.score)
                ),
                h(
                  'div',
                  { fontSize: '13px', fontWeight: 700, color: '#627084' },
                  `${opp.right}R / ${opp.wrong}W`
                ),
              ]
            ),
          ]
        ),
      ]
    );
  } else {
    scoreCenterBox = h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f6ff',
        border: '2px solid #1264e1',
        borderRadius: '18px',
        padding: '20px',
      },
      [
        h(
          'div',
          {
            fontSize: '15px',
            fontWeight: 800,
            color: '#1264e1',
            textTransform: 'uppercase',
          },
          'Final Score'
        ),
        h(
          'div',
          {
            fontSize: '74px',
            fontWeight: 900,
            color: '#1264e1',
            lineHeight: 1.05,
          },
          String(replay.score)
        ),
      ]
    );
  }

  return h(
    'div',
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      padding: '36px 44px',
      backgroundColor: '#eef3f9',
      fontFamily: 'sans-serif',
      gap: '32px',
    },
    [
      // Left Column: Player & Replay Stats Summary
      h(
        'div',
        {
          width: '490px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          border: '1px solid #dbe2ea',
          borderRadius: '22px',
          padding: '28px',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            },
            [
              h(
                'div',
                {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
                [
                  h(
                    'span',
                    {
                      fontSize: '26px',
                      fontWeight: 900,
                      color: '#1264e1',
                    },
                    isRace ? 'Ghost Race Replay' : 'Game Replay'
                  ),
                  h(
                    'span',
                    {
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#1264e1',
                      backgroundColor: '#e8f1fd',
                      padding: '6px 12px',
                      borderRadius: '999px',
                    },
                    '1-Min Quiz'
                  ),
                ]
              ),
              h(
                'div',
                {
                  fontSize: isRace ? '32px' : '40px',
                  fontWeight: 900,
                  color: '#1b222c',
                  marginTop: '6px',
                },
                isRace ? `${replay.username} vs ${opp.username}` : replay.username
              ),
              h(
                'div',
                {
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#627084',
                },
                replay.configLabel
              ),
            ]
          ),
          scoreCenterBox,
          h(
            'div',
            {
              display: 'flex',
              gap: '10px',
            },
            [
              statBox('Right', replay.right, '#1f934c'),
              statBox('Wrong', replay.wrong, '#e32636'),
              statBox('Avg Speed', `${replay.avgSec}s`, '#1264e1'),
              statBox('Slowest', `${replay.slowestSec}s`, '#627084'),
            ]
          ),
        ]
      ),
      // Right Column: Question Breakdown
      h(
        'div',
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          border: '1px solid #dbe2ea',
          borderRadius: '22px',
          padding: '24px 28px',
          justifyContent: 'space-between',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            },
            [
              h(
                'span',
                {
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#1b222c',
                },
                'Replay Breakdown'
              ),
              h(
                'span',
                {
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#1264e1',
                  backgroundColor: '#e8f1fd',
                  padding: '5px 12px',
                  borderRadius: '999px',
                },
                `${replay.questions.length} Questions Played`
              ),
            ]
          ),
          ...(isRace ? [renderRaceScoreChartBox(replay, opp)] : []),
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flex: 1,
            },
            questionRows
          ),
        ]
      ),
    ]
  );
}

const OG_SAMPLE_MAPS = {
  'map:Brazil': {
    nb: 'M25 6L24 8L22 10L21 9L20 7L18 6L18 4L20 5L25 6ZM29 30L27 31L26 29L28 29L29 30ZM19 13L17 15L19 16L20 19L19 21L16 19L14 15L16 11L19 13ZM26 22L28 26L26 26L23 24L25 22L26 22ZM19 4L18 6L21 8L20 11L19 12L15 10L15 6L18 4L19 4ZM19 21L21 25L19 30L19 36L18 40L19 41L17 40L18 35L18 30L19 21ZM20 21L20 17L22 17L26 20L26 22L23 24L20 22L20 21ZM26 28L27 32L24 33L22 36L20 41L17 40L19 36L19 28L21 24L24 24L28 26L26 28Z',
    tg: 'M21 10L25 8L26 10L30 9L31 10L29 12L32 11L39 14L39 16L37 19L36 23L31 26L31 28L29 30L27 28L28 25L26 22L25 20L22 16L18 17L17 15L19 13L20 10L21 10Z',
  },
  'map:Argentina': {
    nb: 'M34 18L31 19L31 16L33 17L34 18ZM25 -1L23 1L25 5L24 8L21 5L19 0L22 -4L25 -2L25 -1ZM31 9L33 13L31 14L29 11L29 9L31 9ZM24 8L26 11L25 16L24 23L23 30L25 30L22 30L23 24L24 16L24 8ZM26 -5L34 -5L35 -2L40 -2L43 1L41 5L41 9L36 13L35 17L32 16L33 12L30 6L26 3L23 2L25 -3L26 -5ZM25 8L25 3L28 4L31 8L29 11L26 11L25 8Z',
    tg: 'M31 16L32 20L29 22L27 24L26 29L24 30L23 28L24 22L25 14L26 11L29 11L32 14L33 13L31 16Z',
  },
};

function renderOgMapBox(mapKey, w, ht) {
  const mapEntry = OG_SAMPLE_MAPS[mapKey];
  if (!mapEntry) return mapKey;
  return h(
    'div',
    {
      display: 'flex',
      width: `${w}px`,
      height: `${ht}px`,
      borderRadius: '10px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#d8eaf8',
      overflow: 'hidden',
    },
    [
      svgEl(
        'svg',
        {
          viewBox: '0 0 56 38',
          width: String(w),
          height: String(ht),
          style: { width: `${w}px`, height: `${ht}px`, display: 'flex' },
        },
        [
          svgEl('rect', { width: '56', height: '38', fill: '#d8eaf8' }),
          svgEl('path', {
            d: mapEntry.nb,
            fill: '#f1f5f9',
            stroke: '#94a3b8',
            'stroke-width': '0.6',
            'fill-rule': 'evenodd',
          }),
          svgEl('path', {
            d: mapEntry.tg,
            fill: '#ea580c',
            stroke: '#7c2d12',
            'stroke-width': '0.9',
            'fill-rule': 'evenodd',
          }),
        ]
      ),
    ]
  );
}

function renderOgQuizNode(val, isPrompt = false) {
  if (OG_SAMPLE_MAPS[val]) {
    const w = isPrompt ? 224 : 168;
    const ht = isPrompt ? 148 : 112;
    return renderOgMapBox(val, w, ht);
  }
  return val;
}

const QUIZ_PREVIEW_SAMPLES = {
  cfg_geo_flag_country: { prompt: '🇧🇷', choices: ['Brazil', 'Argentina'] },
  cfg_geo_country_flag: { prompt: 'Brazil', choices: ['🇧🇷', '🇦🇷'] },
  cfg_geo_country_capital: { prompt: 'Brazil', choices: ['Brasília', 'Buenos Aires'] },
  cfg_geo_capital_country: { prompt: 'Brasília', choices: ['Brazil', 'Argentina'] },
  cfg_geo_flag_capital: { prompt: '🇧🇷', choices: ['Brasília', 'Buenos Aires'] },
  cfg_geo_capital_flag: { prompt: 'Brasília', choices: ['🇧🇷', '🇦🇷'] },
  cfg_geo_map_country: { prompt: 'map:Brazil', choices: ['Brazil', 'Argentina'] },
  cfg_geo_country_map: { prompt: 'Brazil', choices: ['map:Brazil', 'map:Argentina'] },
  cfg_geo_map_flag: { prompt: 'map:Brazil', choices: ['🇧🇷', '🇦🇷'] },
  cfg_geo_flag_map: { prompt: '🇧🇷', choices: ['map:Brazil', 'map:Argentina'] },
  cfg_geo_map_capital: { prompt: 'map:Brazil', choices: ['Brasília', 'Buenos Aires'] },
  cfg_geo_capital_map: { prompt: 'Brasília', choices: ['map:Brazil', 'map:Argentina'] },
  cfg_lang_synonym: { prompt: 'ancient', choices: ['old', 'modern'] },
  cfg_lang_synonym_pt: { prompt: 'antigo', choices: ['velho', 'moderno'] },
  cfg_lang_synonym_es: { prompt: 'antiguo', choices: ['viejo', 'moderno'] },
  cfg_lang_synonym_fr: { prompt: 'ancien', choices: ['vieux', 'moderne'] },
  cfg_lang_synonym_de: { prompt: 'schnell', choices: ['rasch', 'langsam'] },
  cfg_lang_antonym: { prompt: 'expand', choices: ['shrink', 'grow'] },
  cfg_lang_antonym_pt: { prompt: 'grande', choices: ['pequeno', 'enorme'] },
  cfg_lang_antonym_es: { prompt: 'alto', choices: ['bajo', 'grande'] },
  cfg_lang_antonym_fr: { prompt: 'grand', choices: ['petit', 'énorme'] },
  cfg_lang_antonym_de: { prompt: 'groß', choices: ['klein', 'riesig'] },
  cfg_lang_idiom_meaning: { prompt: 'break the ice', choices: ['start a conversation', 'delay a decision'] },
  cfg_lang_meaning_idiom: { prompt: 'start a conversation', choices: ['break the ice', 'call it a day'] },
  cfg_lang_idiom_meaning_pt: { prompt: 'quebrar o galho', choices: ['ajudar numa emergência', 'cometer um erro'] },
  cfg_lang_meaning_idiom_pt: { prompt: 'ajudar numa emergência', choices: ['quebrar o galho', 'cair do cavalo'] },
  cfg_lang_idiom_meaning_es: { prompt: 'tomar el pelo', choices: ['burlarse de alguien', 'cometer un error'] },
  cfg_lang_meaning_idiom_es: { prompt: 'burlarse de alguien', choices: ['tomar el pelo', 'meter la pata'] },
  cfg_lang_idiom_meaning_fr: { prompt: 'poser un lapin', choices: ['ne pas venir au rendez-vous', 'se sentir triste'] },
  cfg_lang_meaning_idiom_fr: { prompt: 'ne pas venir au rendez-vous', choices: ['poser un lapin', 'tomber dans les pommes'] },
  cfg_lang_idiom_meaning_de: { prompt: 'ins Fettnäpfchen treten', choices: ['etwas Peinliches sagen oder tun', 'viel Glück wünschen'] },
  cfg_lang_meaning_idiom_de: { prompt: 'etwas Peinliches sagen oder tun', choices: ['ins Fettnäpfchen treten', 'auf dem Holzweg sein'] },
  cfg_chem_symbol_name: { prompt: 'Au', choices: ['Gold', 'Silver'] },
  cfg_chem_name_symbol: { prompt: 'Gold', choices: ['Au', 'Ag'] },
  cfg_other_morse_char: { prompt: '• • •', choices: ['S', 'O'] },
  cfg_other_char_morse: { prompt: 'S', choices: ['• • •', '− − −'] },
  cfg_study_de_en_a1_vocab_de_en: { prompt: 'der Bahnhof', choices: ['train station', 'airport'] },
  cfg_study_de_en_a1_vocab_en_de: { prompt: 'train station', choices: ['der Bahnhof', 'der Flughafen'] },
  cfg_study_de_en_a1_grammar: { prompt: 'Heute ___ ___ nach Berlin.', choices: ['fahre ich', 'ich fahre'] },
  cfg_study_de_en_a1_verbs: { prompt: 'er ___ (fahren)', choices: ['fährt', 'fahrt'] },
  cfg_study_de_en_a1_articles: { prompt: '___ Bahnhof', choices: ['der', 'die'] },
  cfg_study_de_en_a1_phrases: { prompt: 'Asking for the bill:', choices: ['Zahlen, bitte!', 'Bestellen, bitte!'] },
};

const PREVIEW_LANG_WORDS = {
  en: ['always', 'never'],
  pt: ['sempre', 'nunca'],
  es: ['siempre', 'nunca'],
  fr: ['toujours', 'jamais'],
  de: ['immer', 'nie'],
};
const PREVIEW_EMOJI_WORDS = {
  en: ['rocket', 'airplane'],
  pt: ['foguete', 'avião'],
  es: ['cohete', 'avión'],
  fr: ['fusée', 'avion'],
  de: ['Rakete', 'Flugzeug'],
};
for (const src of QUIZ_LANG_META) {
  for (const dst of QUIZ_LANG_META) {
    if (src.code === dst.code) continue;
    QUIZ_PREVIEW_SAMPLES[`cfg_lang_${src.code}_${dst.code}`] = {
      prompt: PREVIEW_LANG_WORDS[src.code][0],
      choices: PREVIEW_LANG_WORDS[dst.code],
    };
  }
  QUIZ_PREVIEW_SAMPLES[`cfg_lang_emoji_${src.code}`] = {
    prompt: '🚀',
    choices: PREVIEW_EMOJI_WORDS[src.code],
  };
  QUIZ_PREVIEW_SAMPLES[`cfg_lang_${src.code}_emoji`] = {
    prompt: PREVIEW_EMOJI_WORDS[src.code][0],
    choices: ['🚀', '✈️'],
  };
}

async function fetchTop10Leaderboard(configId = DEFAULT_CONFIG_ID) {
  try {
    const safeCfgId = configId || DEFAULT_CONFIG_ID;
    const res = await fetch(
      `${FIREBASE_BASE_URL}/leaderboards/${encodeURIComponent(safeCfgId)}.json`
    );
    const raw = res.ok ? await res.json() : {};
    const entries = Object.values(raw || {}).filter(
      (e) => e && typeof e.score === 'number'
    );
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.updatedAt || 0) - (b.updatedAt || 0);
    });
    let currentRank = 1;
    return entries.slice(0, 10).map((e, idx) => {
      if (idx > 0 && e.score < entries[idx - 1].score) {
        currentRank = idx + 1;
      }
      return {
        rank: currentRank,
        username: String(e.username || 'Player'),
        score: e.score,
      };
    });
  } catch (_) {
    return [];
  }
}

async function fetchUserProfileStats(userId, fallbackName = 'Player') {
  try {
    const res = await fetch(`${FIREBASE_BASE_URL}/leaderboards.json`);
    const allBoards = res.ok ? await res.json() : {};
    const performances = [];
    let resolvedUsername = fallbackName || 'Player';

    Object.entries(allBoards || {}).forEach(([cfgId, boardObj]) => {
      if (!boardObj || typeof boardObj !== 'object') return;
      const entries = Object.values(boardObj).filter(
        (e) => e && typeof e.score === 'number'
      );
      if (entries.length === 0) return;
      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      });
      let currentRank = 1;
      const ranked = entries.map((e, idx) => {
        if (idx > 0 && e.score < entries[idx - 1].score) {
          currentRank = idx + 1;
        }
        return { ...e, rank: currentRank };
      });
      const myEntry = ranked.find((e) => e.userId === userId);
      if (myEntry) {
        if (myEntry.username) resolvedUsername = String(myEntry.username);
        performances.push({
          cfgId,
          label: formatConfigId(cfgId),
          rank: myEntry.rank,
          totalPlayers: ranked.length,
          score: myEntry.score,
          right: typeof myEntry.right === 'number' ? myEntry.right : myEntry.score,
          wrong: typeof myEntry.wrong === 'number' ? myEntry.wrong : 0,
        });
      }
    });

    performances.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (b.score !== a.score) return b.score - a.score;
      return b.totalPlayers - a.totalPlayers;
    });

    const firstPlaceCount = performances.filter((p) => p.rank === 1).length;
    const bestRank =
      performances.length > 0
        ? Math.min(...performances.map((p) => p.rank))
        : null;
    const topScore =
      performances.length > 0
        ? Math.max(...performances.map((p) => p.score))
        : 0;

    return {
      userId,
      username: resolvedUsername,
      gamesRanked: performances.length,
      firstPlaceCount,
      bestRank,
      topScore,
      performances: performances.slice(0, 8),
    };
  } catch (_) {
    return {
      userId,
      username: fallbackName || 'Player',
      gamesRanked: 0,
      firstPlaceCount: 0,
      bestRank: null,
      topScore: 0,
      performances: [],
    };
  }
}

function renderUserProfileCard(profile) {
  const statCard = (label, val, highlight = false) =>
    h(
      'div',
      {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        border: '1px solid #dbe2ea',
        borderRadius: '16px',
        padding: '14px 12px',
      },
      [
        h(
          'span',
          {
            fontSize: '12px',
            fontWeight: 800,
            color: '#627084',
            textTransform: 'uppercase',
            marginBottom: '4px',
          },
          label
        ),
        h(
          'span',
          {
            fontSize: '28px',
            fontWeight: 900,
            color: highlight ? '#1264e1' : '#1b222c',
          },
          String(val)
        ),
      ]
    );

  const perfRows =
    profile.performances.length > 0
      ? profile.performances.map((p) =>
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: p.rank === 1 ? '#e8f1fd' : '#f8fafc',
              color: p.rank === 1 ? '#1264e1' : '#1b222c',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '17px',
              fontWeight: 700,
            },
            [
              h(
                'div',
                { display: 'flex', alignItems: 'center', gap: '12px' },
                [
                  h(
                    'span',
                    {
                      color: p.rank === 1 ? '#d97706' : '#1264e1',
                      fontWeight: 900,
                      minWidth: '82px',
                    },
                    p.rank === 1
                      ? `🏆 #1/${p.totalPlayers}`
                      : `#${p.rank}/${p.totalPlayers}`
                  ),
                  h('span', { color: '#1b222c' }, p.label),
                ]
              ),
              h(
                'div',
                { display: 'flex', alignItems: 'center', gap: '10px' },
                [
                  h(
                    'span',
                    { fontSize: '14px', color: '#627084', fontWeight: 700 },
                    `${p.right}R / ${p.wrong}W`
                  ),
                  h(
                    'span',
                    { fontSize: '20px', fontWeight: 900, color: '#1264e1', minWidth: '34px', textAlign: 'right' },
                    String(p.score)
                  ),
                ]
              ),
            ]
          )
        )
      : [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: '#627084',
              fontSize: '18px',
              fontWeight: 700,
            },
            'No leaderboard scores recorded yet'
          ),
        ];

  return h(
    'div',
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      padding: '34px 44px',
      backgroundColor: '#eef3f9',
      fontFamily: 'sans-serif',
      gap: '34px',
    },
    [
      // Left Column: Player Summary
      h(
        'div',
        {
          width: '450px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            [
              h(
                'span',
                { fontSize: '34px', fontWeight: 900, color: '#1b222c' },
                '1-Min Quiz'
              ),
              h(
                'span',
                {
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: '#1264e1',
                  padding: '6px 14px',
                  borderRadius: '999px',
                },
                'PLAYER PROFILE'
              ),
            ]
          ),
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ecfdf3',
              border: '3px solid #16a34a',
              borderRadius: '20px',
              padding: '26px 20px',
              gap: '6px',
            },
            [
              h(
                'span',
                {
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#15803d',
                  textTransform: 'uppercase',
                },
                profile.firstPlaceCount > 0
                  ? `🏆 ${profile.firstPlaceCount} × #1 Global Leader`
                  : 'Global Quiz Competitor'
              ),
              h(
                'span',
                { fontSize: '52px', fontWeight: 900, color: '#15803d' },
                profile.username
              ),
              h(
                'span',
                { fontSize: '17px', fontWeight: 700, color: '#475569' },
                'Math · Geography · Language · Other'
              ),
            ]
          ),
          h('div', { display: 'flex', gap: '12px' }, [
            statCard('Games Ranked', profile.gamesRanked, true),
            statCard('🏆 #1 Ranks', profile.firstPlaceCount, true),
          ]),
          h('div', { display: 'flex', gap: '12px' }, [
            statCard(
              'Best Rank',
              profile.bestRank !== null ? `#${profile.bestRank}` : '—'
            ),
            statCard('Top Score', profile.topScore > 0 ? profile.topScore : '—'),
          ]),
        ]
      ),
      // Right Column: Performances Table
      h(
        'div',
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          border: '1px solid #dbe2ea',
          borderRadius: '22px',
          padding: '24px 28px',
          justifyContent: 'space-between',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            },
            [
              h(
                'span',
                { fontSize: '23px', fontWeight: 800, color: '#1b222c' },
                'Performances by Rank & Score'
              ),
              h(
                'span',
                {
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#1264e1',
                  backgroundColor: '#e8f1fd',
                  padding: '5px 12px',
                  borderRadius: '999px',
                },
                `${profile.gamesRanked} Ranked`
              ),
            ]
          ),
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              flex: 1,
            },
            perfRows
          ),
        ]
      ),
    ]
  );
}

function renderLeaderboardCard(top10, configId = DEFAULT_CONFIG_ID) {
  const safeCfgId = configId || DEFAULT_CONFIG_ID;
  const cfgLabel = formatConfigId(safeCfgId);
  const baseSampleId = safeCfgId.replace(/_p\d+$/, '');
  const quizSample = QUIZ_PREVIEW_SAMPLES[safeCfgId] || QUIZ_PREVIEW_SAMPLES[baseSampleId] || null;
  const rows =
    top10.length > 0
      ? top10.map((item, idx) =>
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: idx === 0 ? '#e8f1fd' : '#f8fafc',
              color: idx === 0 ? '#1264e1' : '#1b222c',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '18px',
              fontWeight: idx === 0 ? 800 : 600,
            },
            [
              h(
                'div',
                { display: 'flex', alignItems: 'center', gap: '14px' },
                [
                  h(
                    'span',
                    {
                      color: idx === 0 ? '#1264e1' : '#627084',
                      fontWeight: 800,
                      minWidth: '38px',
                    },
                    `#${item.rank}`
                  ),
                  h('span', {}, item.username),
                ]
              ),
              h('span', { fontWeight: 800 }, String(item.score)),
            ]
          )
        )
      : [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: '#627084',
              fontSize: '18px',
              fontWeight: 700,
            },
            'No scores yet — be the first to rank #1!'
          ),
        ];

  const keyCell = (digit, hidden = false) =>
    h(
      'div',
      {
        flex: 1,
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hidden ? 'transparent' : '#ffffff',
        border: hidden ? 'none' : '1px solid #dbe2ea',
        borderRadius: '12px',
        fontSize: '24px',
        fontWeight: 800,
        color: '#1b222c',
      },
      hidden ? '' : String(digit)
    );

  const leftGameplayNodes = quizSample
    ? [
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #dbe2ea',
            borderRadius: '18px',
            padding: '32px 20px',
            color: '#1b222c',
          },
          [
            h(
              'span',
              {
                fontSize: '15px',
                fontWeight: 800,
                color: '#627084',
                textTransform: 'uppercase',
              },
              cfgLabel
            ),
            OG_SAMPLE_MAPS[quizSample.prompt]
              ? renderOgQuizNode(quizSample.prompt, true)
              : h(
                  'span',
                  { fontSize: '54px', fontWeight: 900, color: '#1b222c' },
                  quizSample.prompt
                ),
          ]
        ),
        h(
          'div',
          { display: 'flex', gap: '14px', flex: 1 },
          [
            h(
              'div',
              {
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e8f1fd',
                border: '3px solid #1264e1',
                borderRadius: '18px',
                fontSize: '28px',
                fontWeight: 800,
                color: '#1264e1',
                padding: OG_SAMPLE_MAPS[quizSample.choices[0]] ? '10px' : '20px',
                textAlign: 'center',
              },
              renderOgQuizNode(quizSample.choices[0], false)
            ),
            h(
              'div',
              {
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                border: '2px solid #dbe2ea',
                borderRadius: '18px',
                fontSize: '28px',
                fontWeight: 800,
                color: '#1b222c',
                padding: OG_SAMPLE_MAPS[quizSample.choices[1]] ? '10px' : '20px',
                textAlign: 'center',
              },
              renderOgQuizNode(quizSample.choices[1], false)
            ),
          ]
        ),
      ]
    : [
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #dbe2ea',
            borderRadius: '18px',
            padding: '22px 20px',
            fontSize: '46px',
            fontWeight: 900,
            color: '#1b222c',
          },
          [
            h('span', {}, '8 + '),
            h(
              'span',
              {
                color: '#1264e1',
                backgroundColor: '#e8f1fd',
                border: '3px solid #1264e1',
                borderRadius: '14px',
                padding: '4px 22px',
              },
              '?'
            ),
            h('span', {}, ' = 15'),
          ]
        ),
        h(
          'div',
          {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          },
          [
            h('div', { display: 'flex', gap: '8px' }, [
              keyCell(1),
              keyCell(2),
              keyCell(3),
            ]),
            h('div', { display: 'flex', gap: '8px' }, [
              keyCell(4),
              keyCell(5),
              keyCell(6),
            ]),
            h('div', { display: 'flex', gap: '8px' }, [
              keyCell(7),
              keyCell(8),
              keyCell(9),
            ]),
            h('div', { display: 'flex', gap: '8px' }, [
              keyCell('', true),
              keyCell(0),
              keyCell('', true),
            ]),
          ]
        ),
      ];

  return h(
    'div',
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      padding: '34px 44px',
      backgroundColor: '#eef3f9',
      fontFamily: 'sans-serif',
      gap: '34px',
    },
    [
      h(
        'div',
        {
          width: '520px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            [
              h(
                'span',
                { fontSize: '34px', fontWeight: 900, color: '#1b222c' },
                '1-Min Quiz'
              ),
              h(
                'span',
                {
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: '#1264e1',
                  padding: '6px 14px',
                  borderRadius: '999px',
                },
                cfgLabel
              ),
            ]
          ),
          // HUD Card: Time / Score / Right / Wrong
          h(
            'div',
            {
              display: 'flex',
              backgroundColor: '#ffffff',
              border: '1px solid #dbe2ea',
              borderRadius: '16px',
              padding: '12px 16px',
              justifyContent: 'space-between',
            },
            [
              h(
                'div',
                {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                },
                [
                  h(
                    'span',
                    {
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#627084',
                      textTransform: 'uppercase',
                      marginBottom: '2px',
                    },
                    'Time'
                  ),
                  h(
                    'span',
                    { fontSize: '26px', fontWeight: 800, color: '#1b222c' },
                    '42s'
                  ),
                ]
              ),
              h(
                'div',
                {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                },
                [
                  h(
                    'span',
                    {
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#627084',
                      textTransform: 'uppercase',
                      marginBottom: '2px',
                    },
                    'Score'
                  ),
                  h(
                    'span',
                    { fontSize: '26px', fontWeight: 800, color: '#1264e1' },
                    '28'
                  ),
                ]
              ),
              h(
                'div',
                {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                },
                [
                  h(
                    'span',
                    {
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#627084',
                      textTransform: 'uppercase',
                      marginBottom: '2px',
                    },
                    'Right / Wrong'
                  ),
                  h(
                    'div',
                    {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '26px',
                      fontWeight: 800,
                    },
                    [
                      h('span', { color: '#1f934c' }, '29'),
                      h('span', { color: '#1b222c' }, '/'),
                      h('span', { color: '#e32636' }, '1'),
                    ]
                  ),
                ]
              ),
            ]
          ),
          ...leftGameplayNodes,
        ]
      ),
      h(
        'div',
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          border: '1px solid #dbe2ea',
          borderRadius: '22px',
          padding: '24px 28px',
          justifyContent: 'space-between',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            },
            [
              h(
                'span',
                { fontSize: '24px', fontWeight: 800, color: '#1b222c' },
                'Global Leaderboard'
              ),
              h(
                'span',
                {
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#1264e1',
                  backgroundColor: '#e8f1fd',
                  padding: '5px 12px',
                  borderRadius: '999px',
                },
                cfgLabel
              ),
            ]
          ),
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flex: 1,
            },
            rows
          ),
        ]
      ),
    ]
  );
}

const HOME_FALLBACK_CONFIGS = [
  'cfg_add-sub_0_10_0_10_0_20',
  'cfg_add-sub-mul-div_0_10_0_10_0_20',
  'cfg_geo_flag_country',
  'cfg_geo_map_country',
  'cfg_lang_pt_en',
  'cfg_lang_emoji_en',
  'cfg_chem_symbol_name',
  'cfg_other_morse_char',
];

function getConfigCategory(cfgId) {
  if (!cfgId) return 'math';
  if (cfgId.startsWith('cfg_geo_')) return 'geo';
  if (cfgId.startsWith('cfg_lang_')) return 'lang';
  if (cfgId.startsWith('cfg_study_')) return 'study';
  if (cfgId.startsWith('cfg_chem_') || cfgId.startsWith('cfg_other_')) return 'other';
  return 'math';
}

function getCategoryIcon(cat) {
  if (cat === 'geo') return '🌍';
  if (cat === 'lang') return '💬';
  if (cat === 'study') return '🎓';
  if (cat === 'other') return '🧩';
  return '🔢';
}

function truncateText(str, maxLen) {
  const s = String(str || '');
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

function isStandardMathShowcaseConfig(cfgId) {
  const parts = String(cfgId || '').slice(4).split('_');
  if (parts.length < 7) return true;
  const min3 = Number(parts[5]);
  const max3 = Number(parts[6]);
  return Number.isNaN(min3) || Number.isNaN(max3) || max3 - min3 >= 5;
}

async function fetchHomeOverviewStats() {
  try {
    const res = await fetch(`${FIREBASE_BASE_URL}/leaderboards.json`);
    const allBoards = res.ok ? await res.json() : {};
    const uniqueUserIds = new Set();
    const byCategory = { math: [], geo: [], lang: [], other: [] };
    let activeGames = 0;

    Object.entries(allBoards || {}).forEach(([cfgId, boardObj]) => {
      if (!boardObj || typeof boardObj !== 'object') return;
      const entries = Object.values(boardObj).filter(
        (e) => e && typeof e.score === 'number'
      );
      if (entries.length === 0) return;
      activeGames += 1;
      entries.forEach((e) => {
        if (e.userId) uniqueUserIds.add(e.userId);
      });
      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      });
      const cat = getConfigCategory(cfgId);
      byCategory[cat].push({
        cfgId,
        category: cat,
        label: formatConfigId(cfgId),
        playerCount: entries.length,
        leaderName: String(entries[0].username || 'Player'),
        topScore: entries[0].score,
        isFullGame: !/_p[1-4]$/.test(cfgId),
        isStandardMath: cat !== 'math' || isStandardMathShowcaseConfig(cfgId),
      });
    });

    const sortGames = (a, b) => {
      if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
      return (b.topScore || 0) - (a.topScore || 0);
    };

    const categories = ['math', 'geo', 'lang', 'other'];
    categories.forEach((cat) => {
      byCategory[cat].sort((a, b) => {
        if (a.isFullGame !== b.isFullGame) {
          return a.isFullGame ? -1 : 1;
        }
        if (a.isStandardMath !== b.isStandardMath) {
          return a.isStandardMath ? -1 : 1;
        }
        return sortGames(a, b);
      });
    });

    const selected = [];
    const seen = new Set();
    categories.forEach((cat) => {
      byCategory[cat].slice(0, 2).forEach((g) => {
        selected.push(g);
        seen.add(g.cfgId);
      });
    });

    if (selected.length < 8) {
      const remaining = categories
        .flatMap((cat) => byCategory[cat])
        .filter((g) => !seen.has(g.cfgId))
        .sort(sortGames);
      for (const g of remaining) {
        if (selected.length >= 8) break;
        selected.push(g);
        seen.add(g.cfgId);
      }
    }

    selected.sort(sortGames);

    for (const fallbackId of HOME_FALLBACK_CONFIGS) {
      if (selected.length >= 8) break;
      if (seen.has(fallbackId)) continue;
      const cat = getConfigCategory(fallbackId);
      selected.push({
        cfgId: fallbackId,
        category: cat,
        label: formatConfigId(fallbackId),
        playerCount: 0,
        leaderName: null,
        topScore: null,
      });
      seen.add(fallbackId);
    }

    return {
      activeGames,
      uniquePlayers: uniqueUserIds.size,
      featuredGames: selected.slice(0, 8),
    };
  } catch (_) {
    return {
      activeGames: 0,
      uniquePlayers: 0,
      featuredGames: HOME_FALLBACK_CONFIGS.map((cfgId) => ({
        cfgId,
        category: getConfigCategory(cfgId),
        label: formatConfigId(cfgId),
        playerCount: 0,
        leaderName: null,
        topScore: null,
      })),
    };
  }
}

function renderHomeOverviewCard(overview) {
  const miniChoiceBtn = (text, selected = false) =>
    h(
      'div',
      {
        flex: 1,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? '#e8f1fd' : '#ffffff',
        border: selected ? '2.5px solid #1264e1' : '1.5px solid #dbe2ea',
        borderRadius: '11px',
        fontSize: '16px',
        fontWeight: 800,
        color: selected ? '#1264e1' : '#1b222c',
        padding: '0 8px',
      },
      text
    );

  const miniKey = (digit, selected = false) =>
    h(
      'div',
      {
        flex: 1,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? '#e8f1fd' : '#ffffff',
        border: selected ? '2.5px solid #1264e1' : '1.5px solid #dbe2ea',
        borderRadius: '11px',
        fontSize: '18px',
        fontWeight: 800,
        color: selected ? '#1264e1' : '#1b222c',
      },
      String(digit)
    );

  const cardShell = (title, badgeText, bodyChildren) =>
    h(
      'div',
      {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        border: '1px solid #dbe2ea',
        borderRadius: '18px',
        padding: '13px 15px',
      },
      [
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          [
            h(
              'span',
              { fontSize: '16px', fontWeight: 900, color: '#1b222c' },
              title
            ),
            h(
              'span',
              {
                fontSize: '11px',
                fontWeight: 800,
                color: '#1264e1',
                backgroundColor: '#e8f1fd',
                padding: '3px 9px',
                borderRadius: '999px',
              },
              badgeText
            ),
          ]
        ),
        ...bodyChildren,
      ]
    );

  const mathCard = cardShell('🔢 Math', '+ − × ÷ · Custom', [
    h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        height: '86px',
        fontSize: '28px',
        fontWeight: 900,
        color: '#1b222c',
      },
      [
        h('span', {}, '8 +'),
        h(
          'span',
          {
            color: '#1264e1',
            backgroundColor: '#e8f1fd',
            border: '2.5px solid #1264e1',
            borderRadius: '9px',
            padding: '2px 13px',
          },
          '?'
        ),
        h('span', {}, '= 15'),
      ]
    ),
    h('div', { display: 'flex', gap: '6px' }, [
      miniKey(5),
      miniKey(6),
      miniKey(7, true),
      miniKey(8),
    ]),
  ]);

  const geoCard = cardShell('🌍 Geography', '12 Games', [
    h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        height: '86px',
        padding: '4px',
      },
      [renderOgMapBox('map:Brazil', 120, 74)]
    ),
    h('div', { display: 'flex', gap: '8px' }, [
      miniChoiceBtn('🇧🇷 Brazil', true),
      miniChoiceBtn('🇦🇷 Argentina', false),
    ]),
  ]);

  const langCard = cardShell('💬 Language', '14 Games', [
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        height: '86px',
        padding: '6px 10px',
      },
      [
        h(
          'span',
          { fontSize: '11px', fontWeight: 800, color: '#627084' },
          '🇧🇷 PT · 🇪🇸 ES · 🇫🇷 FR · 🇩🇪 DE · 😀'
        ),
        h(
          'span',
          { fontSize: '30px', fontWeight: 900, color: '#1b222c' },
          'sempre'
        ),
      ]
    ),
    h('div', { display: 'flex', gap: '8px' }, [
      miniChoiceBtn('always', true),
      miniChoiceBtn('never', false),
    ]),
  ]);

  const otherCard = cardShell('🧩 Other', 'Elements · Morse', [
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        height: '86px',
        padding: '6px 10px',
      },
      [
        h(
          'span',
          { fontSize: '11px', fontWeight: 800, color: '#627084' },
          '118 ELEMENTS & MORSE CODE'
        ),
        h(
          'span',
          { fontSize: '30px', fontWeight: 900, color: '#1b222c' },
          'Au'
        ),
      ]
    ),
    h('div', { display: 'flex', gap: '8px' }, [
      miniChoiceBtn('Gold', true),
      miniChoiceBtn('Silver', false),
    ]),
  ]);

  const featureItem = (icon, text) =>
    h(
      'div',
      {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '13px',
        fontWeight: 800,
        color: '#334155',
      },
      [h('span', {}, icon), h('span', {}, text)]
    );

  const gameRows = overview.featuredGames.map((g, idx) =>
    h(
      'div',
      {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: idx === 0 ? '#e8f1fd' : '#f8fafc',
        borderRadius: '11px',
        padding: '0 14px',
        fontSize: '16px',
        fontWeight: 700,
      },
      [
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
          },
          [
            h('span', { fontSize: '16px' }, getCategoryIcon(g.category)),
            h(
              'span',
              {
                color: '#1b222c',
                fontWeight: idx === 0 ? 800 : 700,
              },
              truncateText(g.label, 29)
            ),
          ]
        ),
        g.leaderName
          ? h(
              'div',
              {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              },
              [
                h(
                  'div',
                  {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#627084',
                  },
                  [
                    h('span', {}, '🏆'),
                    h('span', {}, truncateText(g.leaderName, 12)),
                  ]
                ),
                h(
                  'span',
                  {
                    fontSize: '19px',
                    fontWeight: 900,
                    color: '#1264e1',
                    minWidth: '30px',
                    textAlign: 'right',
                  },
                  String(g.topScore)
                ),
              ]
            )
          : h(
              'span',
              { fontSize: '14px', fontWeight: 700, color: '#627084' },
              'Play Now'
            ),
      ]
    )
  );

  const rightHeaderBadge =
    overview.activeGames > 0 && overview.uniquePlayers > 0
      ? `${overview.activeGames} Games · ${overview.uniquePlayers} Players`
      : '30+ Leaderboards';

  return h(
    'div',
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      padding: '32px 42px',
      backgroundColor: '#eef3f9',
      fontFamily: 'sans-serif',
      gap: '28px',
    },
    [
      // Left Column: Brand + Features + 2x2 Category Gameplay Showcase
      h(
        'div',
        {
          width: '560px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            [
              h(
                'span',
                { fontSize: '36px', fontWeight: 900, color: '#1b222c' },
                '1-Min Quiz'
              ),
              h(
                'span',
                {
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: '#1264e1',
                  padding: '6px 14px',
                  borderRadius: '999px',
                },
                '30+ Games · 60s Sprints'
              ),
            ]
          ),
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              border: '1px solid #dbe2ea',
              borderRadius: '14px',
              padding: '10px 16px',
            },
            [
              featureItem('⚡', '60s Blitz'),
              featureItem('▶', 'Replays'),
              featureItem('⚔️', 'Ghost Races'),
              featureItem('🏆', 'Global Ranks'),
            ]
          ),
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
            },
            [
              h('div', { display: 'flex', gap: '12px', flex: 1 }, [
                mathCard,
                geoCard,
              ]),
              h('div', { display: 'flex', gap: '12px', flex: 1 }, [
                langCard,
                otherCard,
              ]),
            ]
          ),
        ]
      ),
      // Right Column: Live #1 Champions Across Categories
      h(
        'div',
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          border: '1px solid #dbe2ea',
          borderRadius: '22px',
          padding: '22px 24px',
          justifyContent: 'space-between',
        },
        [
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            },
            [
              h(
                'span',
                { fontSize: '23px', fontWeight: 800, color: '#1b222c' },
                '#1 Global Leaders'
              ),
              h(
                'span',
                {
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#1264e1',
                  backgroundColor: '#e8f1fd',
                  padding: '5px 12px',
                  borderRadius: '999px',
                },
                rightHeaderBadge
              ),
            ]
          ),
          h(
            'div',
            {
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
              flex: 1,
            },
            gameRows
          ),
        ]
      ),
    ]
  );
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const replayParam = searchParams.get('replay');
  const userParam = searchParams.get('user');
  const uParam = searchParams.get('u');
  const configParam = searchParams.get('config');

  if (replayParam) {
    const decoded = decodeReplay(replayParam);
    if (decoded) {
      return new ImageResponse(renderReplayCard(decoded), {
        width: 1200,
        height: 630,
        headers: {
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }

  if (userParam) {
    const profile = await fetchUserProfileStats(userParam, uParam || 'Player');
    return new ImageResponse(renderUserProfileCard(profile), {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  if (configParam) {
    const top10 = await fetchTop10Leaderboard(configParam);
    return new ImageResponse(renderLeaderboardCard(top10, configParam), {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  const overview = await fetchHomeOverviewStats();
  return new ImageResponse(renderHomeOverviewCard(overview), {
    width: 1200,
    height: 630,
    headers: {
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
