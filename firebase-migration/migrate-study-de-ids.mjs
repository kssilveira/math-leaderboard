#!/usr/bin/env node
/**
 * Migrates the 16 legacy German A1 monolingual keys in Firebase RTDB:
 *   cfg_study_de_en_a1_{grammar,verbs,articles}(_pN) -> cfg_study_de_de_a1_{grammar,verbs,articles}(_pN)
 *
 * Usage:
 *   node firebase-migration/migrate-study-de-ids.mjs --dry-run
 *   FIREBASE_AUTH_TOKEN=<oauth2_token> node firebase-migration/migrate-study-de-ids.mjs --apply
 *   FIREBASE_DB_SECRET=<db_secret> node firebase-migration/migrate-study-de-ids.mjs --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIREBASE_DB_URL = 'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app';
const LEGACY_ID_RE = /^cfg_study_de_en_a1_(grammar|verbs|articles)(_p\d+)?$/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isApply = process.argv.includes('--apply');

function toCanonicalId(cfgId) {
  return String(cfgId || '').replace(LEGACY_ID_RE, 'cfg_study_de_de_a1_$1$2');
}

function buildAuthQuery() {
  if (process.env.FIREBASE_AUTH_TOKEN) {
    return `?access_token=${encodeURIComponent(process.env.FIREBASE_AUTH_TOKEN)}`;
  }
  if (process.env.FIREBASE_DB_SECRET) {
    return `?auth=${encodeURIComponent(process.env.FIREBASE_DB_SECRET)}`;
  }
  return '';
}

function isBetterEntry(candidate, existing) {
  if (!existing || typeof existing.score !== 'number') return true;
  if (!candidate || typeof candidate.score !== 'number') return false;
  if (candidate.score !== existing.score) return candidate.score > existing.score;
  return (candidate.updatedAt || Infinity) < (existing.updatedAt || Infinity);
}

function appendAuthQuery(pathname, authQuery = '') {
  if (!authQuery) return pathname;
  const sep = pathname.includes('?') ? '&' : '?';
  return `${pathname}${sep}${authQuery.slice(1)}`;
}

async function fetchJson(pathname, authQuery = '') {
  const res = await fetch(`${FIREBASE_DB_URL}${appendAuthQuery(pathname, authQuery)}`);
  if (!res.ok) {
    throw new Error(`GET ${pathname} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const authQuery = buildAuthQuery();
  if (isApply && !authQuery) {
    console.error('Error: --apply requires FIREBASE_AUTH_TOKEN (OAuth2 access token) or FIREBASE_DB_SECRET.');
    process.exit(1);
  }

  console.log(`Fetching /leaderboards.json and /replays.json from ${FIREBASE_DB_URL}...`);
  const [leaderboards, replays] = await Promise.all([
    fetchJson('/leaderboards.json', authQuery),
    fetchJson('/replays.json', authQuery),
  ]);

  const lbData = leaderboards && typeof leaderboards === 'object' ? leaderboards : {};
  const rpData = replays && typeof replays === 'object' ? replays : {};

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `backup-study-rename-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ leaderboards: lbData, replays: rpData }, null, 2));
  console.log(`Backup written to ${backupPath}`);

  const legacyIds = new Set([
    ...Object.keys(lbData).filter((k) => LEGACY_ID_RE.test(k)),
    ...Object.keys(rpData).filter((k) => LEGACY_ID_RE.test(k)),
  ]);

  if (legacyIds.size === 0) {
    console.log('No legacy cfg_study_de_en_a1_{grammar,verbs,articles}* keys found in Firebase.');
    return;
  }

  const patch = {};
  const summary = [];

  for (const oldId of Array.from(legacyIds).sort()) {
    const newId = toCanonicalId(oldId);
    const oldBoard = lbData[oldId] && typeof lbData[oldId] === 'object' ? lbData[oldId] : {};
    const existingNewBoard = lbData[newId] && typeof lbData[newId] === 'object' ? lbData[newId] : {};
    const oldReplays = rpData[oldId] && typeof rpData[oldId] === 'object' ? rpData[oldId] : {};
    const existingNewReplays = rpData[newId] && typeof rpData[newId] === 'object' ? rpData[newId] : {};

    const mergedBoard = { ...existingNewBoard };
    const mergedReplays = { ...existingNewReplays };
    let movedUsers = 0;
    let keptHigherNew = 0;

    const allUserIds = new Set([
      ...Object.keys(oldBoard),
      ...Object.keys(oldReplays),
    ]);

    for (const userId of allUserIds) {
      const oldEntry = oldBoard[userId];
      const curEntry = mergedBoard[userId];

      if (oldEntry && typeof oldEntry === 'object') {
        if (isBetterEntry(oldEntry, curEntry)) {
          mergedBoard[userId] = oldEntry;
          if (oldReplays[userId]) {
            mergedReplays[userId] = oldReplays[userId];
          }
          movedUsers += 1;
        } else {
          keptHigherNew += 1;
        }
      } else if (oldReplays[userId] && !mergedReplays[userId]) {
        mergedReplays[userId] = oldReplays[userId];
      }
    }

    if (Object.keys(mergedBoard).length > 0) {
      patch[`leaderboards/${newId}`] = mergedBoard;
    }
    if (Object.keys(mergedReplays).length > 0) {
      patch[`replays/${newId}`] = mergedReplays;
    }
    if (oldId in lbData) {
      patch[`leaderboards/${oldId}`] = null;
    }
    if (oldId in rpData) {
      patch[`replays/${oldId}`] = null;
    }

    summary.push({
      oldId,
      newId,
      oldEntries: Object.keys(oldBoard).length,
      existingNewEntries: Object.keys(existingNewBoard).length,
      finalEntries: Object.keys(mergedBoard).length,
      movedUsers,
      keptHigherNew,
    });
  }

  const patchPath = path.join(__dirname, 'study-de-rename-patch.json');
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2));
  console.log(`Root multi-path PATCH written to ${patchPath}`);
  console.table(summary);

  if (!isApply) {
    console.log('\nDry-run complete. To apply atomically to Firebase RTDB, run:');
    console.log('  FIREBASE_AUTH_TOKEN=<oauth2_access_token> node firebase-migration/migrate-study-de-ids.mjs --apply');
    return;
  }

  console.log('\nApplying atomic multi-path PATCH to /.json ...');
  const patchRes = await fetch(`${FIREBASE_DB_URL}/.json${authQuery}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`PATCH /.json failed: ${patchRes.status} ${patchRes.statusText} — ${errText}`);
  }

  const afterShallow = await fetchJson('/leaderboards.json?shallow=true', authQuery);
  const remaining = Object.keys(afterShallow || {}).filter((k) => LEGACY_ID_RE.test(k));
  if (remaining.length > 0) {
    console.warn('Warning: remaining legacy keys detected:', remaining);
  } else {
    console.log('Migration applied and verified: 0 legacy cfg_study_de_en_a1_{grammar,verbs,articles}* keys remain.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
