import {
  QUIZ_LANG_META,
  STUDY_CONFIG_LABELS,
  getStudyMiniPartLabel,
  resolveStudyConfigIdAlias,
} from './study-meta.js';

export const QUIZ_CONFIG_LABELS = {
  cfg_geo_flag_country: '🚩 Flag → 🌐 Country',
  cfg_geo_country_flag: '🌐 Country → 🚩 Flag',
  cfg_geo_country_capital: '🌐 Country → 🏛️ Capital',
  cfg_geo_capital_country: '🏛️ Capital → 🌐 Country',
  cfg_geo_flag_capital: '🚩 Flag → 🏛️ Capital',
  cfg_geo_capital_flag: '🏛️ Capital → 🚩 Flag',
  cfg_geo_map_country: '🗺️ Map → 🌐 Country',
  cfg_geo_country_map: '🌐 Country → 🗺️ Map',
  cfg_geo_map_flag: '🗺️ Map → 🚩 Flag',
  cfg_geo_flag_map: '🚩 Flag → 🗺️ Map',
  cfg_geo_map_capital: '🗺️ Map → 🏛️ Capital',
  cfg_geo_capital_map: '🏛️ Capital → 🗺️ Map',
  cfg_chem_symbol_name: '🏷️ Symbol → ⚛️ Element',
  cfg_chem_name_symbol: '⚛️ Element → 🏷️ Symbol',
  cfg_other_morse_char: '📡 Morse → 🔤 Character',
  cfg_other_char_morse: '🔤 Character → 📡 Morse',
  ...STUDY_CONFIG_LABELS,
};

for (const src of QUIZ_LANG_META) {
  for (const dst of QUIZ_LANG_META) {
    if (src.code === dst.code) continue;
    const srcLabel = `${src.flag} ${src.code.toUpperCase()}`;
    const dstLabel = `${dst.flag} ${dst.code.toUpperCase()}`;
    QUIZ_CONFIG_LABELS[`cfg_lang_${src.code}_${dst.code}`] = `${srcLabel} → ${dstLabel}`;
  }
}

for (const lang of QUIZ_LANG_META) {
  const langLabel = `${lang.flag} ${lang.code.toUpperCase()}`;
  QUIZ_CONFIG_LABELS[`cfg_lang_emoji_${lang.code}`] = `😀 Emoji → ${langLabel}`;
  QUIZ_CONFIG_LABELS[`cfg_lang_${lang.code}_emoji`] = `${langLabel} → 😀 Emoji`;
  const synKey = lang.code === 'en' ? 'cfg_lang_synonym' : `cfg_lang_synonym_${lang.code}`;
  const antKey = lang.code === 'en' ? 'cfg_lang_antonym' : `cfg_lang_antonym_${lang.code}`;
  const idmKey = lang.code === 'en' ? 'cfg_lang_idiom_meaning' : `cfg_lang_idiom_meaning_${lang.code}`;
  const mngKey = lang.code === 'en' ? 'cfg_lang_meaning_idiom' : `cfg_lang_meaning_idiom_${lang.code}`;
  QUIZ_CONFIG_LABELS[synKey] = `${lang.flag} Synonyms`;
  QUIZ_CONFIG_LABELS[antKey] = `${lang.flag} Antonyms`;
  QUIZ_CONFIG_LABELS[idmKey] = `${lang.flag} Idiom → Meaning`;
  QUIZ_CONFIG_LABELS[mngKey] = `${lang.flag} Meaning → Idiom`;
}

export function getMiniPartLabel(baseId, partNum) {
  if (baseId.startsWith('cfg_study_')) {
    return getStudyMiniPartLabel(baseId, partNum);
  }
  if (baseId.startsWith('cfg_geo_')) {
    return ['Americas', 'Europe', 'Africa', 'Asia & Oceania'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_lang_synonym') || baseId.startsWith('cfg_lang_antonym')) {
    return ['1–75', '76–150', '151–225', '226–300'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_lang_idiom_meaning') || baseId.startsWith('cfg_lang_meaning_idiom')) {
    return ['1–50', '51–100', '101–150', '151–200'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_lang_')) {
    return ['1–250', '251–500', '501–750', '751–1000'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.startsWith('cfg_chem_')) {
    return ['1–30', '31–56', '57–88', '89–118'][partNum - 1] || `Part ${partNum}`;
  }
  if (baseId.includes('morse')) {
    return ['1–2 Signals', '3 Signals', '4 Signals', '5 Signals'][partNum - 1] || `Part ${partNum}`;
  }
  return `Part ${partNum}`;
}

export function resolveConfigIdAlias(configId) {
  return resolveStudyConfigIdAlias(configId);
}

export function formatDurationMs(ms) {
  const totalTenths = Math.max(0, Math.round((Number(ms) || 0) / 100));
  if (totalTenths < 600) {
    return `${(totalTenths / 10).toFixed(1)}s`;
  }
  const mins = Math.floor(totalTenths / 600);
  const secs = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatConfigId(configId) {
  configId = resolveConfigIdAlias(configId);
  if (typeof configId === 'string') {
    const miniMatch = configId.match(/^(.+)_p(\d+)$/);
    if (miniMatch && QUIZ_CONFIG_LABELS[miniMatch[1]]) {
      return `${QUIZ_CONFIG_LABELS[miniMatch[1]]} · ${getMiniPartLabel(miniMatch[1], Number(miniMatch[2]))}`;
    }
  }
  if (configId && QUIZ_CONFIG_LABELS[configId]) {
    return QUIZ_CONFIG_LABELS[configId];
  }
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
