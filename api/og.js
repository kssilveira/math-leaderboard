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

    const questions = payload.q.map((item) => {
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

    const totalQMs = questions.reduce((sum, q) => sum + (q.durationMs || 0), 0);
    const slowestMs = questions.reduce((max, q) => Math.max(max, q.durationMs || 0), 0);
    const avgSec = (totalQMs / questions.length / 1000).toFixed(1);
    const slowestSec = (slowestMs / 1000).toFixed(1);

    return {
      username: String(payload.u || 'Player'),
      configLabel: formatConfigId(String(payload.c || '')),
      score: Number(payload.s) || 0,
      right: Number(payload.r) || 0,
      wrong: Number(payload.w) || 0,
      avgSec,
      slowestSec,
      questions,
    };
  } catch (_) {
    return null;
  }
}

function renderReplayCard(replay) {
  const sampleQuestions = replay.questions.slice(0, 9);

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
                      fontSize: '28px',
                      fontWeight: 900,
                      color: '#1264e1',
                    },
                    '▶ Game Replay'
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
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#1b222c',
                  marginTop: '6px',
                },
                replay.username
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
          h(
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
          ),
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
          h(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #dbe2ea',
              borderRadius: '18px',
              padding: '36px 20px',
              fontSize: '52px',
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
                  padding: '6px 22px',
                },
                '?'
              ),
              h('span', {}, ' = 15'),
            ]
          ),
          h(
            'div',
            {
              fontSize: '18px',
              fontWeight: 700,
              color: '#627084',
              textAlign: 'center',
            },
            'Play 1-Minute Math · Watch Replays · Compete Globally'
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
