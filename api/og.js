import { ImageResponse } from '@vercel/og';
import { decodeReplay, renderReplayCard } from '../lib/og/replay-card.js';
import {
  fetchUserProfileStats,
  renderUserProfileCard,
} from '../lib/og/user-profile-card.js';
import {
  fetchTop10Leaderboard,
  renderLeaderboardCard,
} from '../lib/og/leaderboard-card.js';
import {
  fetchHomeOverviewStats,
  renderHomeOverviewCard,
} from '../lib/og/home-card.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const replayParam = searchParams.get('replay');
  const userParam = searchParams.get('user');
  const uParam = searchParams.get('u');
  const configParam = searchParams.get('config');
  const modeParam = searchParams.get('mode') === 'all' ? 'all' : '1min';

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
    const profile = await fetchUserProfileStats(userParam, uParam || 'Player', modeParam);
    return new ImageResponse(renderUserProfileCard(profile), {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  if (configParam) {
    const top10 = await fetchTop10Leaderboard(configParam, modeParam);
    return new ImageResponse(renderLeaderboardCard(top10, configParam, modeParam), {
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
