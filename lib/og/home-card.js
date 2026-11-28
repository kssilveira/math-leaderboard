import {
  FIREBASE_BASE_URL,
  APPROX_GAMES_COUNT,
  h,
  mergeLeaderboardsWithAliases,
  mergeTimeLeaderboardsWithAliases,
  getConfigCategory,
  getCategoryIcon,
  truncateText,
  renderOgMapBox,
} from './common.js';
import { getStudyOgHomeBadge } from '../study-meta.js';
import { formatConfigId, formatDurationMs } from '../config-labels.js';

const HOME_FALLBACK_CONFIGS = [
  'cfg_add-sub_0_10_0_10_0_20',
  'cfg_add-sub-mul-div_0_10_0_10_0_20',
  'cfg_geo_flag_country',
  'cfg_geo_map_country',
  'cfg_lang_pt_en',
  'cfg_lang_emoji_en',
  'cfg_study_de_de_a1_grammar',
  'cfg_study_en_en_a1_grammar',
  'cfg_chem_symbol_name',
  'cfg_other_morse_char',
];

function isStandardMathShowcaseConfig(cfgId) {
  const parts = String(cfgId || '').slice(4).split('_');
  if (parts.length < 7) return true;
  const min3 = Number(parts[5]);
  const max3 = Number(parts[6]);
  return Number.isNaN(min3) || Number.isNaN(max3) || max3 - min3 >= 5;
}

export async function fetchHomeOverviewStats(mode = '1min') {
  const isAll = mode === 'all';
  try {
    const [res1Min, resAll] = await Promise.all([
      isAll ? Promise.resolve(null) : fetch(`${FIREBASE_BASE_URL}/leaderboards.json`).catch(() => null),
      fetch(`${FIREBASE_BASE_URL}/timeLeaderboards.json`).catch(() => null),
    ]);
    const boards1Min = res1Min && res1Min.ok ? mergeLeaderboardsWithAliases(await res1Min.json()) : {};
    const boardsAll = resAll && resAll.ok ? mergeTimeLeaderboardsWithAliases(await resAll.json()) : {};
    const uniqueUserIds = new Set();
    const activeGameIds = new Set();
    const byCategory = { math: [], geo: [], lang: [], study: [], other: [] };

    if (!isAll) {
      Object.entries(boardsAll).forEach(([cfgId, boardObj]) => {
        if (!boardObj || typeof boardObj !== 'object') return;
        const entries = Object.values(boardObj).filter(
          (e) => e && typeof e.durationMs === 'number' && e.durationMs > 0
        );
        if (entries.length === 0) return;
        activeGameIds.add(cfgId);
        entries.forEach((e) => {
          if (e.userId) uniqueUserIds.add(e.userId);
        });
      });
    }

    const sourceBoards = isAll ? boardsAll : boards1Min;
    Object.entries(sourceBoards || {}).forEach(([cfgId, boardObj]) => {
      if (!boardObj || typeof boardObj !== 'object') return;
      const entries = Object.values(boardObj).filter((e) =>
        isAll
          ? Boolean(e && typeof e.durationMs === 'number' && e.durationMs > 0)
          : Boolean(e && typeof e.score === 'number')
      );
      if (entries.length === 0) return;
      activeGameIds.add(cfgId);
      entries.forEach((e) => {
        if (e.userId) uniqueUserIds.add(e.userId);
      });
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
      const cat = getConfigCategory(cfgId);
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        cfgId,
        category: cat,
        label: formatConfigId(cfgId),
        playerCount: entries.length,
        leaderName: String(entries[0].username || 'Player'),
        topScore: isAll ? formatDurationMs(entries[0].durationMs) : entries[0].score,
        bestDurationMs: isAll ? entries[0].durationMs : null,
        isFullGame: !/_p\d+$/.test(cfgId),
        isStandardMath: cat !== 'math' || isStandardMathShowcaseConfig(cfgId),
      });
    });

    const sortGames = (a, b) => {
      if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
      if (isAll) {
        return (a.bestDurationMs || Infinity) - (b.bestDurationMs || Infinity);
      }
      return (b.topScore || 0) - (a.topScore || 0);
    };

    const sortFeaturedGames = (a, b) => {
      if (a.isFullGame !== b.isFullGame) {
        return a.isFullGame ? -1 : 1;
      }
      if (a.isStandardMath !== b.isStandardMath) {
        return a.isStandardMath ? -1 : 1;
      }
      return sortGames(a, b);
    };

    const categories = ['math', 'geo', 'lang', 'study', 'other'];
    categories.forEach((cat) => {
      byCategory[cat].sort(sortFeaturedGames);
    });

    const selected = [];
    const seen = new Set();
    categories.forEach((cat) => {
      if (byCategory[cat].length > 0) {
        const g = byCategory[cat][0];
        selected.push(g);
        seen.add(g.cfgId);
      }
    });

    if (selected.length < 8) {
      const remaining = categories
        .flatMap((cat) => byCategory[cat])
        .filter((g) => !seen.has(g.cfgId))
        .sort(sortFeaturedGames);
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
      mode: isAll ? 'all' : '1min',
      activeGames: activeGameIds.size,
      uniquePlayers: uniqueUserIds.size,
      featuredGames: selected.slice(0, 8),
    };
  } catch (_) {
    return {
      mode: isAll ? 'all' : '1min',
      activeGames: 0,
      uniquePlayers: 0,
      featuredGames: HOME_FALLBACK_CONFIGS.slice(0, 8).map((cfgId) => ({
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

export function renderHomeOverviewCard(overview, mode) {
  const isAll = (mode || overview?.mode) === 'all';
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
        padding: '13px 14px',
      },
      [
        h(
          'div',
          {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          },
          [
            h(
              'span',
              { fontSize: '16px', fontWeight: 900, color: '#1b222c', whiteSpace: 'nowrap' },
              title
            ),
            h(
              'span',
              {
                fontSize: badgeText.length > 16 ? '10px' : '11px',
                fontWeight: 800,
                color: '#1264e1',
                backgroundColor: '#e8f1fd',
                padding: badgeText.length > 16 ? '3px 7px' : '3px 9px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
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

  const langCard = cardShell('💬 Language', '50 Games', [
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
        padding: '6px 6px',
      },
      [
        h(
          'span',
          { fontSize: '10px', fontWeight: 800, color: '#627084' },
          '🇬🇧 EN · 🇧🇷 PT · 🇪🇸 ES · 🇫🇷 FR · 🇩🇪 DE · 😀'
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

  const studyCard = cardShell('🎓 Study', getStudyOgHomeBadge(), [
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
        padding: '6px 6px',
      },
      [
        h(
          'span',
          { fontSize: '9.5px', fontWeight: 800, color: '#627084' },
          'WORDS · PHRASES · GRAMMAR · VERBS · ARTICLES'
        ),
        h(
          'span',
          { fontSize: '24px', fontWeight: 900, color: '#1b222c' },
          'er ___ (fahren)'
        ),
      ]
    ),
    h('div', { display: 'flex', gap: '8px' }, [
      miniChoiceBtn('fährt', true),
      miniChoiceBtn('fahrt', false),
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
              truncateText(g.label, isAll ? 27 : 29)
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
                    fontSize: isAll ? '17px' : '19px',
                    fontWeight: 900,
                    color: '#1264e1',
                    minWidth: isAll ? '54px' : '30px',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
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
      ? `${overview.activeGames} ${overview.activeGames === 1 ? 'Game' : 'Games'} · ${overview.uniquePlayers} ${overview.uniquePlayers === 1 ? 'Player' : 'Players'}`
      : `${APPROX_GAMES_COUNT}+ Leaderboards`;

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
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: '#1264e1',
                  padding: isAll ? '6px 12px' : '6px 13px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                },
                isAll
                  ? `🏁 Time Attack · ${APPROX_GAMES_COUNT}+ Games`
                  : `${APPROX_GAMES_COUNT}+ Games · 60s & Time Attack`
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
              featureItem('⏱️', '60s Blitz'),
              featureItem('🏁', 'Time Attack'),
              featureItem('⚔️', 'Ghost Races'),
              featureItem('▶', 'Replays'),
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
                studyCard,
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
                { fontSize: isAll ? '21px' : '23px', fontWeight: 800, color: '#1b222c' },
                isAll ? '#1 Time Attack Leaders' : '#1 Global Leaders'
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
