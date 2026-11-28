import { ALL_OPS, h, svgEl } from './common.js';
import { formatConfigId, formatDurationMs } from '../config-labels.js';

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

export function decodeReplay(encoded) {
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

    const mode = payload.m === 'all' ? 'all' : '1min';
    const questions = decodeQuestionsList(payload.q);
    const totalQMs = questions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const slowestMs = questions.reduce((max, q) => Math.max(max, q.durationMs || 0), 0);
    const avgSec = (totalQMs / questions.length / 1000).toFixed(1);
    const slowestSec = (slowestMs / 1000).toFixed(1);
    const durationMs = Number(payload.d) || totalQMs;
    const targetCount = mode === 'all'
      ? (Number(payload.n || payload.r || questions.filter((q) => q.right > 0).length) || questions.length)
      : undefined;

    let opponent = null;
    if (payload.o && Array.isArray(payload.o.q) && payload.o.q.length > 0) {
      const oppQuestions = decodeQuestionsList(payload.o.q);
      const oppTotalMs = oppQuestions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
      const oppAvgSec = (oppTotalMs / oppQuestions.length / 1000).toFixed(1);
      opponent = {
        username: String(payload.o.u || 'Opponent'),
        mode,
        targetCount: mode === 'all'
          ? (Number(payload.o.n || payload.o.r || oppQuestions.filter((q) => q.right > 0).length) || oppQuestions.length)
          : undefined,
        durationMs: Number(payload.o.d) || oppTotalMs,
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
      mode,
      targetCount,
      durationMs,
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

function getProgressAt(timeline, elapsedMs, useRightOnly = false) {
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
  return useRightOnly ? r : r - w;
}

function renderRaceScoreChartBox(replay, opp) {
  const isAll = replay.mode === 'all';
  const p1Timeline = buildTimelineEvents(replay.questions);
  const p2Timeline = buildTimelineEvents(opp.questions);
  const totalDurationMs = isAll
    ? Math.max(p1Timeline.totalDurationMs, p2Timeline.totalDurationMs, 500)
    : Math.max(p1Timeline.totalDurationMs, 500);
  const steps = 60;
  const samples = [];
  let minScore = 0;
  let maxScore = isAll ? Math.max(5, replay.targetCount || 0) : 5;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalDurationMs;
    const p1 = getProgressAt(p1Timeline, t, isAll);
    const p2 = getProgressAt(p2Timeline, t, isAll);
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
          h('span', {}, isAll ? `Progress Timeline (0 -> ${maxScore})` : `Score Timeline (0 -> ${maxScore})`),
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
                  h('span', {}, `${replay.username} (${isAll ? formatDurationMs(replay.durationMs) : replay.score})`),
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
                  h('span', {}, `${opp.username} (${isAll ? formatDurationMs(opp.durationMs) : opp.score})`),
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

export function renderReplayCard(replay) {
  const isAll = replay.mode === 'all';
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

  const diff = isRace
    ? (isAll ? opp.durationMs - replay.durationMs : replay.score - opp.score)
    : 0;
  const diffStr = isAll
    ? (diff > 0 ? `-${formatDurationMs(diff)}` : diff < 0 ? `+${formatDurationMs(-diff)}` : '0.0s')
    : (diff > 0 ? `+${diff}` : String(diff));

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
                    fontSize: isAll ? '42px' : '54px',
                    fontWeight: 900,
                    color: isWin ? '#1f934c' : '#1264e1',
                    lineHeight: 1.05,
                  },
                  isAll ? formatDurationMs(replay.durationMs) : String(replay.score)
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
                    fontSize: isAll ? '42px' : '54px',
                    fontWeight: 900,
                    color: diff < 0 ? '#1f934c' : '#627084',
                    lineHeight: 1.05,
                  },
                  isAll ? formatDurationMs(opp.durationMs) : String(opp.score)
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
          isAll ? `Final Time (${replay.targetCount || replay.right} Qs)` : 'Final Score'
        ),
        h(
          'div',
          {
            fontSize: isAll ? '64px' : '74px',
            fontWeight: 900,
            color: '#1264e1',
            lineHeight: 1.05,
          },
          isAll ? formatDurationMs(replay.durationMs) : String(replay.score)
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
                    isAll ? 'Time Attack' : '1-Min Quiz'
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
