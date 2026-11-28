import {
  FIREBASE_BASE_URL,
  h,
  mergeLeaderboardsWithAliases,
  mergeTimeLeaderboardsWithAliases,
} from './common.js';
import { formatConfigId, formatDurationMs } from '../config-labels.js';

export async function fetchUserProfileStats(userId, fallbackName = 'Player', mode = '1min') {
  const isAll = mode === 'all';
  try {
    const rootPath = isAll ? 'timeLeaderboards' : 'leaderboards';
    const res = await fetch(`${FIREBASE_BASE_URL}/${rootPath}.json`);
    const raw = res.ok ? await res.json() : {};
    const allBoards = isAll
      ? mergeTimeLeaderboardsWithAliases(raw)
      : mergeLeaderboardsWithAliases(raw);
    const performances = [];
    let resolvedUsername = fallbackName || 'Player';

    Object.entries(allBoards || {}).forEach(([cfgId, boardObj]) => {
      if (!boardObj || typeof boardObj !== 'object') return;
      const entries = Object.values(boardObj).filter((e) =>
        isAll
          ? Boolean(e && typeof e.durationMs === 'number' && e.durationMs > 0)
          : Boolean(e && typeof e.score === 'number')
      );
      if (entries.length === 0) return;
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
      const ranked = entries.map((e, idx) => {
        if (idx > 0) {
          if (isAll) {
            if (e.durationMs > entries[idx - 1].durationMs) currentRank = idx + 1;
          } else if (e.score < entries[idx - 1].score) {
            currentRank = idx + 1;
          }
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
          score: isAll ? formatDurationMs(myEntry.durationMs) : myEntry.score,
          rawScore: isAll ? myEntry.durationMs : myEntry.score,
          right: typeof myEntry.right === 'number' ? myEntry.right : (myEntry.targetCount || myEntry.score || 0),
          wrong: typeof myEntry.wrong === 'number' ? myEntry.wrong : 0,
        });
      }
    });

    performances.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (isAll) {
        if (a.rawScore !== b.rawScore) return a.rawScore - b.rawScore;
      } else if (b.rawScore !== a.rawScore) {
        return b.rawScore - a.rawScore;
      }
      return b.totalPlayers - a.totalPlayers;
    });

    const firstPlaceCount = performances.filter((p) => p.rank === 1).length;
    const bestRank =
      performances.length > 0
        ? Math.min(...performances.map((p) => p.rank))
        : null;
    const topScore = isAll
      ? (performances.length > 0
          ? formatDurationMs(Math.min(...performances.map((p) => p.rawScore)))
          : null)
      : (performances.length > 0
          ? Math.max(...performances.map((p) => p.rawScore))
          : 0);

    return {
      userId,
      mode: isAll ? 'all' : '1min',
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
      mode: isAll ? 'all' : '1min',
      username: fallbackName || 'Player',
      gamesRanked: 0,
      firstPlaceCount: 0,
      bestRank: null,
      topScore: isAll ? null : 0,
      performances: [],
    };
  }
}

export function renderUserProfileCard(profile) {
  const isAll = profile && profile.mode === 'all';
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
                isAll ? 'TIME ATTACK PROFILE' : 'PLAYER PROFILE'
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
            statCard(
              isAll ? 'Fastest Time' : 'Top Score',
              isAll
                ? (profile.topScore || '—')
                : (profile.topScore > 0 ? profile.topScore : '—')
            ),
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
                isAll ? 'Performances by Rank & Time' : 'Performances by Rank & Score'
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
