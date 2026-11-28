import { QUIZ_LANG_META } from '../study-meta.js';
import { STUDY_PREVIEW_SAMPLES } from '../study-og-samples.js';
import { QUIZ_CONFIG_LABELS, resolveConfigIdAlias } from '../config-labels.js';

export const FIREBASE_BASE_URL =
  'https://math-leaderboard-122f4-default-rtdb.europe-west1.firebasedatabase.app';
export const DEFAULT_CONFIG_ID = 'cfg_add-sub_0_10_0_10_0_20';
export const ALL_OPS = ['+', '-', '×', '÷'];

export function h(type, style, children) {
  return {
    type,
    props: {
      style,
      children,
    },
  };
}

export function svgEl(type, attrs, children) {
  return {
    type,
    props: {
      ...attrs,
      ...(children !== undefined ? { children } : {}),
    },
  };
}

export const APPROX_GAMES_COUNT =
  Math.floor(Object.keys(QUIZ_CONFIG_LABELS).length / 10) * 10;

export function mergeLeaderboardsWithAliases(rawBoards) {
  const merged = {};
  Object.entries(rawBoards || {}).forEach(([rawCfgId, boardObj]) => {
    if (!boardObj || typeof boardObj !== 'object') return;
    const cfgId = resolveConfigIdAlias(rawCfgId);
    if (!merged[cfgId]) merged[cfgId] = {};
    const targetBoard = merged[cfgId];
    Object.entries(boardObj).forEach(([uId, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const existing = targetBoard[uId];
      if (
        !existing ||
        (typeof entry.score === 'number' &&
          (typeof existing.score !== 'number' ||
            entry.score > existing.score ||
            (entry.score === existing.score &&
              (entry.updatedAt || Infinity) < (existing.updatedAt || Infinity))))
      ) {
        targetBoard[uId] = entry;
      }
    });
  });
  return merged;
}

export function mergeTimeLeaderboardsWithAliases(rawBoards) {
  const merged = {};
  Object.entries(rawBoards || {}).forEach(([rawCfgId, boardObj]) => {
    if (!boardObj || typeof boardObj !== 'object') return;
    const cfgId = resolveConfigIdAlias(rawCfgId);
    if (!merged[cfgId]) merged[cfgId] = {};
    const targetBoard = merged[cfgId];
    Object.entries(boardObj).forEach(([uId, entry]) => {
      if (!entry || typeof entry !== 'object' || typeof entry.durationMs !== 'number' || entry.durationMs <= 0) {
        return;
      }
      const existing = targetBoard[uId];
      if (
        !existing ||
        entry.durationMs < existing.durationMs ||
        (entry.durationMs === existing.durationMs &&
          ((entry.wrong || 0) < (existing.wrong || 0) ||
            ((entry.wrong || 0) === (existing.wrong || 0) &&
              (entry.updatedAt || Infinity) < (existing.updatedAt || Infinity))))
      ) {
        targetBoard[uId] = entry;
      }
    });
  });
  return merged;
}

export function getConfigCategory(cfgId) {
  if (!cfgId) return 'math';
  if (cfgId.startsWith('cfg_geo_')) return 'geo';
  if (cfgId.startsWith('cfg_lang_')) return 'lang';
  if (cfgId.startsWith('cfg_study_')) return 'study';
  if (cfgId.startsWith('cfg_chem_') || cfgId.startsWith('cfg_other_')) return 'other';
  return 'math';
}

export function getCategoryIcon(cat) {
  if (cat === 'geo') return '🌍';
  if (cat === 'lang') return '💬';
  if (cat === 'study') return '🎓';
  if (cat === 'other') return '🧩';
  return '🔢';
}

export function truncateText(str, maxLen) {
  const s = String(str || '');
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

export const OG_SAMPLE_MAPS = {
  'map:Brazil': {
    nb: 'M25 6L24 8L22 10L21 9L20 7L18 6L18 4L20 5L25 6ZM29 30L27 31L26 29L28 29L29 30ZM19 13L17 15L19 16L20 19L19 21L16 19L14 15L16 11L19 13ZM26 22L28 26L26 26L23 24L25 22L26 22ZM19 4L18 6L21 8L20 11L19 12L15 10L15 6L18 4L19 4ZM19 21L21 25L19 30L19 36L18 40L19 41L17 40L18 35L18 30L19 21ZM20 21L20 17L22 17L26 20L26 22L23 24L20 22L20 21ZM26 28L27 32L24 33L22 36L20 41L17 40L19 36L19 28L21 24L24 24L28 26L26 28Z',
    tg: 'M21 10L25 8L26 10L30 9L31 10L29 12L32 11L39 14L39 16L37 19L36 23L31 26L31 28L29 30L27 28L28 25L26 22L25 20L22 16L18 17L17 15L19 13L20 10L21 10Z',
  },
  'map:Argentina': {
    nb: 'M34 18L31 19L31 16L33 17L34 18ZM25 -1L23 1L25 5L24 8L21 5L19 0L22 -4L25 -2L25 -1ZM31 9L33 13L31 14L29 11L29 9L31 9ZM24 8L26 11L25 16L24 23L23 30L25 30L22 30L23 24L24 16L24 8ZM26 -5L34 -5L35 -2L40 -2L43 1L41 5L41 9L36 13L35 17L32 16L33 12L30 6L26 3L23 2L25 -3L26 -5ZM25 8L25 3L28 4L31 8L29 11L26 11L25 8Z',
    tg: 'M31 16L32 20L29 22L27 24L26 29L24 30L23 28L24 22L25 14L26 11L29 11L32 14L33 13L31 16Z',
  },
};

export function renderOgMapBox(mapKey, w, ht) {
  const mapEntry = OG_SAMPLE_MAPS[mapKey];
  if (!mapEntry) return mapKey;
  return h(
    'div',
    {
      display: 'flex',
      width: `${w}px`,
      height: `${ht}px`,
      borderRadius: '10px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#d8eaf8',
      overflow: 'hidden',
    },
    [
      svgEl(
        'svg',
        {
          viewBox: '0 0 56 38',
          width: String(w),
          height: String(ht),
          style: { width: `${w}px`, height: `${ht}px`, display: 'flex' },
        },
        [
          svgEl('rect', { width: '56', height: '38', fill: '#d8eaf8' }),
          svgEl('path', {
            d: mapEntry.nb,
            fill: '#f1f5f9',
            stroke: '#94a3b8',
            'stroke-width': '0.6',
            'fill-rule': 'evenodd',
          }),
          svgEl('path', {
            d: mapEntry.tg,
            fill: '#ea580c',
            stroke: '#7c2d12',
            'stroke-width': '0.9',
            'fill-rule': 'evenodd',
          }),
        ]
      ),
    ]
  );
}

export function renderOgQuizNode(val, isPrompt = false) {
  if (OG_SAMPLE_MAPS[val]) {
    const w = isPrompt ? 224 : 168;
    const ht = isPrompt ? 148 : 112;
    return renderOgMapBox(val, w, ht);
  }
  return val;
}

export const QUIZ_PREVIEW_SAMPLES = {
  cfg_geo_flag_country: { prompt: '🇧🇷', choices: ['Brazil', 'Argentina'] },
  cfg_geo_country_flag: { prompt: 'Brazil', choices: ['🇧🇷', '🇦🇷'] },
  cfg_geo_country_capital: { prompt: 'Brazil', choices: ['Brasília', 'Buenos Aires'] },
  cfg_geo_capital_country: { prompt: 'Brasília', choices: ['Brazil', 'Argentina'] },
  cfg_geo_flag_capital: { prompt: '🇧🇷', choices: ['Brasília', 'Buenos Aires'] },
  cfg_geo_capital_flag: { prompt: 'Brasília', choices: ['🇧🇷', '🇦🇷'] },
  cfg_geo_map_country: { prompt: 'map:Brazil', choices: ['Brazil', 'Argentina'] },
  cfg_geo_country_map: { prompt: 'Brazil', choices: ['map:Brazil', 'map:Argentina'] },
  cfg_geo_map_flag: { prompt: 'map:Brazil', choices: ['🇧🇷', '🇦🇷'] },
  cfg_geo_flag_map: { prompt: '🇧🇷', choices: ['map:Brazil', 'map:Argentina'] },
  cfg_geo_map_capital: { prompt: 'map:Brazil', choices: ['Brasília', 'Buenos Aires'] },
  cfg_geo_capital_map: { prompt: 'Brasília', choices: ['map:Brazil', 'map:Argentina'] },
  cfg_lang_synonym: { prompt: 'ancient', choices: ['old', 'modern'] },
  cfg_lang_synonym_pt: { prompt: 'antigo', choices: ['velho', 'moderno'] },
  cfg_lang_synonym_es: { prompt: 'antiguo', choices: ['viejo', 'moderno'] },
  cfg_lang_synonym_fr: { prompt: 'ancien', choices: ['vieux', 'moderne'] },
  cfg_lang_synonym_de: { prompt: 'schnell', choices: ['rasch', 'langsam'] },
  cfg_lang_antonym: { prompt: 'expand', choices: ['shrink', 'grow'] },
  cfg_lang_antonym_pt: { prompt: 'grande', choices: ['pequeno', 'enorme'] },
  cfg_lang_antonym_es: { prompt: 'alto', choices: ['bajo', 'grande'] },
  cfg_lang_antonym_fr: { prompt: 'grand', choices: ['petit', 'énorme'] },
  cfg_lang_antonym_de: { prompt: 'groß', choices: ['klein', 'riesig'] },
  cfg_lang_idiom_meaning: { prompt: 'break the ice', choices: ['start a conversation', 'delay a decision'] },
  cfg_lang_meaning_idiom: { prompt: 'start a conversation', choices: ['break the ice', 'call it a day'] },
  cfg_lang_idiom_meaning_pt: { prompt: 'quebrar o galho', choices: ['ajudar numa emergência', 'cometer um erro'] },
  cfg_lang_meaning_idiom_pt: { prompt: 'ajudar numa emergência', choices: ['quebrar o galho', 'cair do cavalo'] },
  cfg_lang_idiom_meaning_es: { prompt: 'tomar el pelo', choices: ['burlarse de alguien', 'cometer un error'] },
  cfg_lang_meaning_idiom_es: { prompt: 'burlarse de alguien', choices: ['tomar el pelo', 'meter la pata'] },
  cfg_lang_idiom_meaning_fr: { prompt: 'poser un lapin', choices: ['ne pas venir au rendez-vous', 'se sentir triste'] },
  cfg_lang_meaning_idiom_fr: { prompt: 'ne pas venir au rendez-vous', choices: ['poser un lapin', 'tomber dans les pommes'] },
  cfg_lang_idiom_meaning_de: { prompt: 'ins Fettnäpfchen treten', choices: ['etwas Peinliches sagen oder tun', 'viel Glück wünschen'] },
  cfg_lang_meaning_idiom_de: { prompt: 'etwas Peinliches sagen oder tun', choices: ['ins Fettnäpfchen treten', 'auf dem Holzweg sein'] },
  cfg_chem_symbol_name: { prompt: 'Au', choices: ['Gold', 'Silver'] },
  cfg_chem_name_symbol: { prompt: 'Gold', choices: ['Au', 'Ag'] },
  cfg_other_morse_char: { prompt: '• • •', choices: ['S', 'O'] },
  cfg_other_char_morse: { prompt: 'S', choices: ['• • •', '− − −'] },
  ...STUDY_PREVIEW_SAMPLES,
};

const PREVIEW_LANG_WORDS = {
  en: ['always', 'never'],
  pt: ['sempre', 'nunca'],
  es: ['siempre', 'nunca'],
  fr: ['toujours', 'jamais'],
  de: ['immer', 'nie'],
};
const PREVIEW_EMOJI_WORDS = {
  en: ['rocket', 'airplane'],
  pt: ['foguete', 'avião'],
  es: ['cohete', 'avión'],
  fr: ['fusée', 'avion'],
  de: ['Rakete', 'Flugzeug'],
};
for (const src of QUIZ_LANG_META) {
  for (const dst of QUIZ_LANG_META) {
    if (src.code === dst.code) continue;
    QUIZ_PREVIEW_SAMPLES[`cfg_lang_${src.code}_${dst.code}`] = {
      prompt: PREVIEW_LANG_WORDS[src.code][0],
      choices: PREVIEW_LANG_WORDS[dst.code],
    };
  }
  QUIZ_PREVIEW_SAMPLES[`cfg_lang_emoji_${src.code}`] = {
    prompt: '🚀',
    choices: PREVIEW_EMOJI_WORDS[src.code],
  };
  QUIZ_PREVIEW_SAMPLES[`cfg_lang_${src.code}_emoji`] = {
    prompt: PREVIEW_EMOJI_WORDS[src.code][0],
    choices: ['🚀', '✈️'],
  };
}
