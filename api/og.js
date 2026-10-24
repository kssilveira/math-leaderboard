import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

const FIREBASE_LB_URL =
  'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app/leaderboards/cfg_add-sub_0_10_0_10_0_20.json';
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

function formatConfigId(configId) {
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
  return (list || []).map((item) => {
    const a = Number(item[0]) || 0;
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

  const width = 520;
  const topPad = 8;
  const bottomPad = 88;
  const plotH = bottomPad - topPad;
  const getX = (ms) => (Math.min(Math.max(0, ms), totalDurationMs) / totalDurationMs) * width;
  const getY = (s) => bottomPad - ((s - minScore) / Math.max(1, maxScore - minScore)) * plotH;

  const svgChildren = [];
  const yZero = getY(0).toFixed(1);
  svgChildren.push(
    svgEl('line', {
      x1: '0',
      y1: String(topPad),
      x2: String(width),
      y2: String(topPad),
      stroke: '#cbd5e1',
      'stroke-width': '1',
      'stroke-dasharray': '4 4',
    }),
    svgEl('line', {
      x1: '0',
      y1: yZero,
      x2: String(width),
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
          width: '520',
          height: '96',
          viewBox: '0 0 520 96',
          style: { width: '520px', height: '96px', display: 'flex' },
        },
        svgChildren
      ),
    ]
  );
}

function renderReplayCard(replay) {
  const opp = replay.opponent;
  const isRace = Boolean(opp && Array.isArray(opp.questions) && opp.questions.length > 0);
  const sampleQuestions = replay.questions.slice(0, isRace ? 5 : 9);

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
    const eqText = q.nums
      .map((n, idx) => (idx === q.missingIndex ? `[${n}]` : String(n)))
      .join(' ')
      .replace(' ', ` ${q.op} `)
      .replace(/ (\S+)$/, ' = $1');

    const statusText = hadMistake
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
                    '1-Min Math'
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

async function fetchTop10Leaderboard() {
  try {
    const res = await fetch(FIREBASE_LB_URL);
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

function renderLeaderboardCard(top10) {
  const rows = top10.map((item, idx) =>
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
  );

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
                '1-Min Math'
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
                '+ − (0..10, 0..10, 0..20)'
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
          // Equation Card
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
          // Keypad
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
                'Top 10'
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

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const replayParam = searchParams.get('replay');

  if (replayParam) {
    const decoded = decodeReplay(replayParam);
    if (decoded) {
      return new ImageResponse(renderReplayCard(decoded), {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }

  const top10 = await fetchTop10Leaderboard();
  return new ImageResponse(renderLeaderboardCard(top10), {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
