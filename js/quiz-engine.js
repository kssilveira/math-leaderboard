// Question normalization, cloze rendering, math samplers, and quiz distractor engine.

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function normalizeQuestionRecord(q, targetConfigId = activeConfigId) {
  const nums = Array.isArray(q.nums) ? [...q.nums] : [0, 0, 0];
  const op = q.op || '+';
  const resolvedCfgId = typeof targetConfigId === 'string' && targetConfigId ? targetConfigId : activeConfigId;
  const cfg = getConfigById(resolvedCfgId);

  if (op === '?' || isQuizConfig(cfg)) {
    const items = cfg && Array.isArray(cfg.items) ? cfg.items : [];
    const qIdx = items.length > 0 ? Math.max(0, Math.min(items.length - 1, Number(nums[0]) || 0)) : (Number(nums[0]) || 0);
    const explicit = isExplicitDistractorConfig(cfg);
    let dIdx;
    if (explicit) {
      const dList = items[qIdx] && Array.isArray(items[qIdx][2]) ? items[qIdx][2] : [];
      dIdx = dList.length > 0 ? Math.max(0, Math.min(dList.length - 1, Number(nums[1]) || 0)) : (Number(nums[1]) || 0);
    } else {
      dIdx = items.length > 0 ? Math.max(0, Math.min(items.length - 1, Number(nums[1]) || 0)) : (Number(nums[1]) || 0);
      if (items.length > 1 && dIdx === qIdx) {
        dIdx = (qIdx + 1) % items.length;
      }
    }
    const choiceOrder = q.missingIndex === 1 ? 1 : 0;
    const prompt = q.prompt !== undefined ? String(q.prompt) : (items[qIdx] ? items[qIdx][0] : '?');
    const expected = (q.expected !== undefined && typeof q.expected === 'string' && q.expected !== String(qIdx))
      ? q.expected
      : (items[qIdx] ? items[qIdx][1] : String(q.expected ?? ''));
    const distractor = q.distractor !== undefined
      ? String(q.distractor)
      : getQuizDistractorFromIndices(cfg, qIdx, dIdx);
    const choices = Array.isArray(q.choices) && q.choices.length === 2
      ? q.choices.map(String)
      : (choiceOrder === 0 ? [expected, distractor] : [distractor, expected]);
    const note = q.note !== undefined ? String(q.note) : getQuizItemNote(cfg, qIdx);

    const expectedStr = String(expected);
    const answers = Array.isArray(q.answers) ? q.answers.map(String) : [];
    const wrongAnswers = Array.isArray(q.wrongAnswers)
      ? q.wrongAnswers.map(String)
      : answers.filter(a => a !== expectedStr);
    const right = typeof q.right === 'number' ? q.right : (answers.includes(expectedStr) ? 1 : 0);
    const wrong = typeof q.wrong === 'number' ? q.wrong : wrongAnswers.length;
    const durationMs = typeof q.durationMs === 'number' ? q.durationMs : 0;

    return {
      nums: [qIdx, dIdx, qIdx],
      op: '?',
      missingIndex: choiceOrder,
      prompt,
      expected: expectedStr,
      distractor,
      choices,
      ...(note ? { note } : {}),
      answers,
      wrongAnswers,
      right,
      wrong,
      durationMs
    };
  }

  const missingIndex = typeof q.missingIndex === 'number' ? q.missingIndex : 2;
  const expected = typeof q.expected === 'number' ? q.expected : nums[missingIndex];
  const expectedStr = String(expected);
  const answers = Array.isArray(q.answers) ? q.answers.map(String) : [];
  const wrongAnswers = Array.isArray(q.wrongAnswers)
    ? q.wrongAnswers.map(String)
    : answers.filter(a => a !== expectedStr);
  const right = typeof q.right === 'number' ? q.right : (answers.includes(expectedStr) ? 1 : 0);
  const wrong = typeof q.wrong === 'number' ? q.wrong : wrongAnswers.length;
  const durationMs = typeof q.durationMs === 'number' ? q.durationMs : 0;

  return {
    nums,
    op,
    missingIndex,
    expected,
    answers,
    wrongAnswers,
    right,
    wrong,
    durationMs
  };
}

function getQuestionKeyFromRecord(q) {
  if (q && q.op === '?') {
    const qIdx = Array.isArray(q.nums) ? (Number(q.nums[0]) || 0) : 0;
    return `quiz_${qIdx}`;
  }
  return `${q.nums[0]}${q.op}${q.nums[1]}=${q.nums[2]}?${q.missingIndex}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isMapVal(val) {
  return typeof isGeoMapToken === 'function' && isGeoMapToken(val);
}

function formatQuizAnswerText(val) {
  if (isMapVal(val)) {
    return `🗺️ ${getGeoMapCountryName(val)}`;
  }
  return String(val ?? '');
}

function renderInlineQuizValHtml(val, asSlot = false) {
  if (isMapVal(val)) {
    const cname = escapeHtml(getGeoMapCountryName(val));
    const svg = renderGeoMapSvg(val, { variant: 'mini' });
    return asSlot
      ? `<span class="review-q-slot review-slot-map" title="${cname}">${svg}</span>`
      : `<span class="review-inline-map" title="${cname}">${svg}</span>`;
  }
  return asSlot
    ? `<span class="review-q-slot">${escapeHtml(val)}</span>`
    : escapeHtml(val);
}

function renderQuizPromptTextHtml(promptVal) {
  const escaped = escapeHtml(promptVal);
  if (!String(promptVal).includes('___')) return escaped;
  return escaped.replace(/___/g, '<span class="cloze-blank">___</span>');
}

function splitClozeAnswerParts(expectedStr, blankCount) {
  const expected = String(expectedStr ?? '').trim();
  if (blankCount <= 1) return [expected];
  const sepParts = expected.split(/\s*(?:\.\.\.|…|\/)\s*/).filter(Boolean);
  if (sepParts.length === blankCount) return sepParts;
  const wsParts = expected.split(/\s+/).filter(Boolean);
  if (wsParts.length === blankCount) return wsParts;
  return null;
}

const ELISION_PREFIX_RE = /(?:^|[\s(])(?:[ldnjscmt]|qu)['’]$/i;

function fillClozePromptHtml(promptStr, expectedStr) {
  const prompt = String(promptStr ?? '');
  const blankRe = /___(?:\s+___)*/g;
  const matches = prompt.match(blankRe);
  if (!matches || matches.length === 0) {
    return `${renderInlineQuizValHtml(prompt, false)} → ${renderInlineQuizValHtml(expectedStr, true)}`;
  }
  const parts = splitClozeAnswerParts(expectedStr, matches.length);
  if (!parts) {
    return `${renderInlineQuizValHtml(prompt, false)} → ${renderInlineQuizValHtml(expectedStr, true)}`;
  }
  let out = '';
  let lastIdx = 0;
  let partIdx = 0;
  prompt.replace(blankRe, (match, offset) => {
    out += escapeHtml(prompt.slice(lastIdx, offset));
    const partText = String(parts[partIdx++] ?? '').trim();
    out += renderInlineQuizValHtml(partText, true);
    lastIdx = offset + match.length;
    if (ELISION_PREFIX_RE.test(partText) && /^\s+\p{L}/u.test(prompt.slice(lastIdx))) {
      lastIdx += prompt.slice(lastIdx).match(/^\s+/)[0].length;
    }
    return match;
  });
  out += escapeHtml(prompt.slice(lastIdx));
  return out;
}

function fillClozePlainText(promptStr, expectedStr) {
  const prompt = String(promptStr ?? '');
  const blankRe = /___(?:\s+___)*/g;
  const matches = prompt.match(blankRe);
  if (!matches || matches.length === 0) return String(expectedStr ?? '');
  const parts = splitClozeAnswerParts(expectedStr, matches.length);
  if (!parts) return `${prompt} ${String(expectedStr ?? '')}`;
  let partIdx = 0;
  return prompt
    .replace(blankRe, () => {
      const part = String(parts[partIdx++] ?? '').trim();
      return part === '—' ? '' : part;
    })
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\b([ldnjscmt]|qu)(['’])\s+(?=\p{L})/giu, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// --- Constraint-Based Integer Equation Generation ---

function getValidSamplers(cfg) {
  const { ops, min1, max1, min2, max2, min3, max3 } = cfg;
  if (min1 > max1 || min2 > max2 || min3 > max3) return [];

  const samplers = [];

  // 1. Addition: a + b = c
  if (ops.includes('+')) {
    const aLow = Math.max(min1, min3 - max2);
    const aHigh = Math.min(max1, max3 - min2);
    if (aLow <= aHigh) {
      samplers.push(() => {
        const a = randomInt(aLow, aHigh);
        const bLow = Math.max(min2, min3 - a);
        const bHigh = Math.min(max2, max3 - a);
        const b = randomInt(bLow, bHigh);
        return { a, b, c: a + b, op: '+' };
      });
    }
  }

  // 2. Subtraction: a - b = c
  if (ops.includes('-')) {
    const aLow = Math.max(min1, min2 + min3);
    const aHigh = Math.min(max1, max2 + max3);
    if (aLow <= aHigh) {
      samplers.push(() => {
        const a = randomInt(aLow, aHigh);
        const bLow = Math.max(min2, a - max3);
        const bHigh = Math.min(max2, a - min3);
        const b = randomInt(bLow, bHigh);
        return { a, b, c: a - b, op: '-' };
      });
    }
  }

  // 3. Multiplication: a × b = c (integers)
  if (ops.includes('×')) {
    const validRanges = [];
    const span = max1 - min1;
    const step = span > 2000 ? Math.ceil(span / 2000) : 1;
    for (let a = min1; a <= max1; a += step) {
      let bLow, bHigh;
      if (a === 0) {
        if (min3 <= 0 && 0 <= max3) {
          bLow = min2;
          bHigh = max2;
        } else {
          bLow = 1;
          bHigh = 0;
        }
      } else if (a > 0) {
        bLow = Math.max(min2, Math.ceil(min3 / a));
        bHigh = Math.min(max2, Math.floor(max3 / a));
      } else {
        bLow = Math.max(min2, Math.ceil(max3 / a));
        bHigh = Math.min(max2, Math.floor(min3 / a));
      }
      if (bLow <= bHigh) {
        validRanges.push([a, bLow, bHigh]);
      }
    }
    if (validRanges.length > 0) {
      samplers.push(() => {
        const [a, bLow, bHigh] = validRanges[randomInt(0, validRanges.length - 1)];
        const b = randomInt(bLow, bHigh);
        return { a, b, c: a * b, op: '×' };
      });
    }
  }

  // 4. Division: a ÷ b = c (restricted to exact integers: b != 0 and a = b * c)
  if (ops.includes('÷')) {
    const validDivisors = [];
    const span = max2 - min2;
    const step = span > 2000 ? Math.ceil(span / 2000) : 1;
    for (let b = min2; b <= max2; b += step) {
      if (b === 0) continue;
      let cLow, cHigh;
      if (b > 0) {
        cLow = Math.max(min3, Math.ceil(min1 / b));
        cHigh = Math.min(max3, Math.floor(max1 / b));
      } else {
        cLow = Math.max(min3, Math.ceil(max1 / b));
        cHigh = Math.min(max3, Math.floor(min1 / b));
      }
      if (cLow <= cHigh) {
        validDivisors.push([b, cLow, cHigh]);
      }
    }
    if (validDivisors.length > 0) {
      samplers.push(() => {
        const [b, cLow, cHigh] = validDivisors[randomInt(0, validDivisors.length - 1)];
        const c = randomInt(cLow, cHigh);
        return { a: b * c, b, c, op: '÷' };
      });
    }
  }

  return samplers;
}

function getValidMissingIndices(a, op, b, c) {
  if (op === '+' || op === '-') {
    return [0, 1, 2];
  }
  if (op === '×') {
    const indices = [2];
    if (b !== 0) indices.push(0);
    if (a !== 0) indices.push(1);
    return indices;
  }
  if (op === '÷') {
    const indices = [0, 2];
    if (c !== 0) indices.push(1);
    return indices;
  }
  return [0, 1, 2];
}

const quizPosBucketsCache = new WeakMap();

function isExplicitDistractorConfig(cfg) {
  return Boolean(cfg && cfg.distractorMode === 'explicit');
}

function getQuizPosBuckets(items) {
  if (!Array.isArray(items)) return null;
  let buckets = quizPosBucketsCache.get(items);
  if (!buckets) {
    const byPos = new Map();
    const bySetPos = new Map();
    items.forEach((row, idx) => {
      const pos = row && row[2];
      if (!pos) return;
      let arr = byPos.get(pos);
      if (!arr) {
        arr = [];
        byPos.set(pos, arr);
      }
      arr.push(idx);
      const setKey = row[3];
      if (setKey) {
        const spKey = `${setKey}|${pos}`;
        let spArr = bySetPos.get(spKey);
        if (!spArr) {
          spArr = [];
          bySetPos.set(spKey, spArr);
        }
        spArr.push(idx);
      }
    });
    buckets = { byPos, bySetPos };
    quizPosBucketsCache.set(items, buckets);
  }
  return buckets;
}

function getQuizDistractorFromIndices(cfg, qIdx, dIdx) {
  const items = cfg && Array.isArray(cfg.items) ? cfg.items : [];
  if (items.length === 0) return '';
  if (isExplicitDistractorConfig(cfg)) {
    const row = items[qIdx];
    const dList = row && Array.isArray(row[2]) ? row[2] : [];
    if (dList.length === 0) return '';
    const safeIdx = Math.max(0, Math.min(dList.length - 1, Number(dIdx) || 0));
    return String(dList[safeIdx] ?? '');
  }
  let safeIdx = Math.max(0, Math.min(items.length - 1, Number(dIdx) || 0));
  if (items.length > 1 && safeIdx === qIdx) {
    safeIdx = (qIdx + 1) % items.length;
  }
  return items[safeIdx] ? String(items[safeIdx][1] ?? '') : '';
}

function getQuizItemNote(cfg, qIdx) {
  const items = cfg && Array.isArray(cfg.items) ? cfg.items : [];
  const row = items[qIdx];
  if (!row) return '';
  if (isExplicitDistractorConfig(cfg)) {
    return typeof row[3] === 'string' ? row[3] : '';
  }
  if (cfg && cfg.distractorMode === 'pos_pool') {
    return typeof row[4] === 'string' ? row[4] : '';
  }
  return '';
}

function extractGlossTokens(str) {
  const parts = String(str ?? '').split(/\s+\/\s+/);
  const tokens = new Set();
  parts.forEach((p) => {
    const cleaned = p.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    if (cleaned) tokens.add(cleaned);
  });
  return tokens;
}

function answersOverlapGloss(a, b) {
  if (a === b) return true;
  const aStr = String(a ?? '');
  const bStr = String(b ?? '');
  if (!aStr.includes(' / ') && !bStr.includes(' / ')) return false;
  const aTokens = extractGlossTokens(aStr);
  const bTokens = extractGlossTokens(bStr);
  for (const tok of aTokens) {
    if (bTokens.has(tok)) return true;
  }
  return false;
}

function sampleQuizDistractorIndex(cfgOrItems, qIdx) {
  const cfg = Array.isArray(cfgOrItems) ? null : cfgOrItems;
  const items = Array.isArray(cfgOrItems) ? cfgOrItems : (cfg && Array.isArray(cfg.items) ? cfg.items : []);
  if (isExplicitDistractorConfig(cfg)) {
    const row = items[qIdx];
    const dList = row && Array.isArray(row[2]) ? row[2] : [];
    return dList.length > 1 ? randomInt(0, dList.length - 1) : 0;
  }
  const n = items.length;
  if (n <= 1) return 0;
  const targetAns = items[qIdx][1];
  const targetLen = String(targetAns ?? '').length;
  const isPosPool = Boolean(cfg && cfg.distractorMode === 'pos_pool');
  const pickBestFromPool = (pool) => {
    if (!pool || pool.length === 0) return -1;
    if (pool.length === 1 && (pool[0] === qIdx || items[pool[0]][1] === targetAns)) return -1;
    const sampleCount = targetLen >= 12 ? 3 : 1;
    let bestIdx = -1;
    let bestRatio = Infinity;
    for (let s = 0; s < sampleCount; s++) {
      let candidate = -1;
      let fallbackCandidate = -1;
      for (let attempt = 0; attempt < 25; attempt++) {
        const idx = pool[randomInt(0, pool.length - 1)];
        if (idx === qIdx || items[idx][1] === targetAns) continue;
        if (isPosPool && answersOverlapGloss(targetAns, items[idx][1])) {
          if (fallbackCandidate < 0) fallbackCandidate = idx;
          continue;
        }
        candidate = idx;
        break;
      }
      if (candidate < 0) candidate = fallbackCandidate;
      if (candidate < 0) continue;
      if (sampleCount === 1) return candidate;
      const candLen = Math.max(1, String(items[candidate][1] ?? '').length);
      const ratio = Math.max(targetLen, candLen) / Math.min(Math.max(1, targetLen), candLen);
      if (ratio < bestRatio) {
        bestRatio = ratio;
        bestIdx = candidate;
      }
    }
    return bestIdx;
  };
  if (cfg && cfg.distractorMode === 'pos_pool') {
    const pos = items[qIdx][2];
    const setKey = items[qIdx][3];
    const buckets = pos ? getQuizPosBuckets(items) : null;
    if (buckets && setKey && Math.random() < 0.7) {
      const picked = pickBestFromPool(buckets.bySetPos.get(`${setKey}|${pos}`));
      if (picked >= 0) return picked;
    }
    const pickedByPos = pickBestFromPool(buckets ? buckets.byPos.get(pos) : null);
    if (pickedByPos >= 0) return pickedByPos;
    if (pos === '!' || pos === '.') {
      const altPunct = pos === '!' ? '.' : '!';
      if (buckets && setKey && Math.random() < 0.7) {
        const pickedAltSet = pickBestFromPool(buckets.bySetPos.get(`${setKey}|${altPunct}`));
        if (pickedAltSet >= 0) return pickedAltSet;
      }
      const pickedAlt = pickBestFromPool(buckets ? buckets.byPos.get(altPunct) : null);
      if (pickedAlt >= 0) return pickedAlt;
    }
  }
  for (let attempt = 0; attempt < 25; attempt++) {
    const idx = randomInt(0, n - 1);
    if (idx !== qIdx && items[idx][1] !== targetAns) {
      return idx;
    }
  }
  return (qIdx + 1) % n;
}

function buildQuizQuestionFromIndices(cfg, qIdx, dIdx, choiceOrder, lastPerf = null) {
  const items = cfg.items;
  const [prompt, expected] = items[qIdx];
  const distractor = getQuizDistractorFromIndices(cfg, qIdx, dIdx);
  const choices = choiceOrder === 0 ? [expected, distractor] : [distractor, expected];
  const note = getQuizItemNote(cfg, qIdx);
  const key = `quiz_${qIdx}`;
  return {
    nums: [qIdx, dIdx, qIdx],
    op: '?',
    missingIndex: choiceOrder,
    prompt,
    answer: expected,
    distractor,
    choices,
    ...(note ? { note } : {}),
    key,
    lastPerf
  };
}
