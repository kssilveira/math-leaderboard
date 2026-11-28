import { FIREBASE_BASE_URL, h, mergeLeaderboardsWithAliases } from './common.js';
import { formatConfigId } from '../config-labels.js';

export async function fetchUserProfileStats(userId, fallbackName = 'Player') {
  try {
    const res = await fetch(`${FIREBASE_BASE_URL}/leaderboards.json`);
    const allBoards = mergeLeaderboardsWithAliases(res.ok ? await res.json() : {});
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

export function renderUserProfileCard(profile) {
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
                { fontSize: '16px', fontWeight: 700, color: '#475569' },
                'Math · Geography · Language · Study · Other'
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
