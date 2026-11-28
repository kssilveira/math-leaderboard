import {
  FIREBASE_BASE_URL,
  DEFAULT_CONFIG_ID,
  h,
  mergeLeaderboardsWithAliases,
  mergeTimeLeaderboardsWithAliases,
  OG_SAMPLE_MAPS,
  renderOgQuizNode,
  QUIZ_PREVIEW_SAMPLES,
} from './common.js';
import { toLegacyDeEnAlias } from '../study-meta.js';
import { resolveConfigIdAlias, formatConfigId, formatDurationMs } from '../config-labels.js';

export async function fetchTop10Leaderboard(configId = DEFAULT_CONFIG_ID, mode = '1min') {
  try {
    const isAll = mode === 'all';
    const rootPath = isAll ? 'timeLeaderboards' : 'leaderboards';
    const safeCfgId = resolveConfigIdAlias(configId || DEFAULT_CONFIG_ID);
    const legacyId = toLegacyDeEnAlias(safeCfgId);
    const [res, legacyRes] = await Promise.all([
      fetch(`${FIREBASE_BASE_URL}/${rootPath}/${encodeURIComponent(safeCfgId)}.json`),
      legacyId
        ? fetch(`${FIREBASE_BASE_URL}/${rootPath}/${encodeURIComponent(legacyId)}.json`)
        : Promise.resolve(null),
    ]);
    const rawCanonical = res.ok ? await res.json() : {};
    const rawLegacy = legacyRes && legacyRes.ok ? await legacyRes.json() : {};
    const combined = {
      ...(legacyId && rawLegacy ? { [legacyId]: rawLegacy } : {}),
      ...(rawCanonical ? { [safeCfgId]: rawCanonical } : {}),
    };
    const merged = isAll
      ? mergeTimeLeaderboardsWithAliases(combined)
      : mergeLeaderboardsWithAliases(combined);
    const entries = Object.values(merged[safeCfgId] || {}).filter((e) =>
      isAll
        ? Boolean(e && typeof e.durationMs === 'number' && e.durationMs > 0)
        : Boolean(e && typeof e.score === 'number')
    );
    if (isAll) {
      entries.sort((a, b) => {
        if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
        if ((a.wrong || 0) !== (b.wrong || 0)) return (a.wrong || 0) - (b.wrong || 0);
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      });
    } else {
      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      });
    }
    let currentRank = 1;
    return entries.slice(0, 10).map((e, idx) => {
      if (idx > 0) {
        if (isAll) {
          if (e.durationMs > entries[idx - 1].durationMs) currentRank = idx + 1;
        } else if (e.score < entries[idx - 1].score) {
          currentRank = idx + 1;
        }
      }
      return {
        rank: currentRank,
        username: String(e.username || 'Player'),
        score: isAll ? formatDurationMs(e.durationMs) : e.score,
      };
    });
  } catch (_) {
    return [];
  }
}

export function renderLeaderboardCard(top10, configId = DEFAULT_CONFIG_ID, mode = '1min') {
  const isAll = mode === 'all';
  const safeCfgId = resolveConfigIdAlias(configId || DEFAULT_CONFIG_ID);
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
            isAll ? 'No times yet — be the first to rank #1!' : 'No scores yet — be the first to rank #1!'
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
                isAll ? 'Time Attack (≤100)' : '1-Min Quiz'
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
          // HUD Card: Time / Score or Progress / Right / Wrong
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
                    isAll ? '38.4s' : '42s'
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
                    isAll ? 'Progress' : 'Score'
                  ),
                  h(
                    'span',
                    { fontSize: '26px', fontWeight: 800, color: '#1264e1' },
                    isAll ? '42 / 100' : '28'
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
