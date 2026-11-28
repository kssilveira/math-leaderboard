// Spanish Study Track Helpers (lazy-loaded with Spanish Study courses)
(() => {
if (typeof globalThis.buildSpanishArticleTrackData === 'function') return;

const SPANISH_COMMON_TWO_GENDER_NOUNS = new Set([
  'estudiante', 'cliente', 'colega', 'artista', 'dentista', 'periodista',
  'turista', 'gerente', 'paciente', 'joven', 'adolescente', 'especialista',
  'recepcionista', 'telefonista', 'economista', 'atleta', 'pianista',
  'guía', 'intérprete', 'agente', 'representante', 'participante',
  'habitante', 'inmigrante', 'visitante', 'asistente', 'docente', 'piloto',
  'modelo', 'líder', 'cantante', 'comerciante', 'ayudante', 'dependiente',
  'taxista', 'deportista', 'ciclista', 'violinista', 'electricista',
  'oculista', 'protagonista', 'testigo', 'cónyuge'
]);

const SPANISH_FEM_STRESSED_A_NOUNS = new Set([
  'agua', 'aula', 'hambre', 'área', 'alma', 'águila', 'hacha', 'arma', 'asma'
]);

const SPANISH_PLURAL_ONLY_NOUNS = new Set([
  'gafas', 'vacaciones', 'padres', 'afueras', 'alrededores', 'modales',
  'finanzas', 'compras', 'celos', 'tijeras', 'prismáticos'
]);

const SPANISH_MASC_GREEK_MA_NOUNS = new Set([
  'problema', 'tema', 'sistema', 'programa', 'idioma', 'clima', 'diploma',
  'poema', 'síntoma', 'drama', 'esquema', 'fantasma', 'telegrama', 'aroma',
  'crucigrama'
]);

const SPANISH_MASC_A_EXCEPTIONS = new Set([
  'día', 'mapa', 'planeta', 'sofá', 'pijama', 'tranvía', 'mediodía', 'paraguas'
]);

const SPANISH_MASC_TIME_NOUNS = new Set([
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]);

const SPANISH_MASC_LANG_NOUNS = new Set([
  'español', 'inglés', 'portugués', 'francés', 'alemán'
]);

const SPANISH_FEM_O_EXCEPTIONS = new Set([
  'mano', 'radio'
]);

const SPANISH_FEM_OR_EXCEPTIONS = new Set([
  'flor', 'labor'
]);

const SPANISH_ARTICLE_PROMPT_DISAMBIG = {
  capital: '___ capital (ciudad)',
  policía: '___ policía (institución)',
  radio: '___ radio (emisora)',
  mañana: '___ mañana (del día)',
  frente: '___ frente (cuerpo)',
  cura: '___ cura (tratamiento)'
};

function getSpanishNounSuffixHint(noun, article) {
  if (article === 'los') {
    if (SPANISH_PLURAL_ONLY_NOUNS.has(noun)) return 'solo pl. → los';
    return 'Pl. masc. → los';
  }
  if (article === 'las') {
    if (SPANISH_PLURAL_ONLY_NOUNS.has(noun)) return 'solo pl. → las';
    return 'Pl. fem. → las';
  }
  if (article === 'la') {
    if (noun === 'foto') return 'la fotografía → la';
    if (noun === 'moto') return 'la motocicleta → la';
    if (SPANISH_FEM_O_EXCEPTIONS.has(noun)) return 'excepción (-o) → la';
    if (SPANISH_FEM_OR_EXCEPTIONS.has(noun)) return 'excepción (-or) → la';
    if (noun.endsWith('ción')) return '-ción → la';
    if (noun.endsWith('sión')) return '-sión → la';
    if (noun.endsWith('dad')) return '-dad → la';
    if (noun.endsWith('tad')) return '-tad → la';
    if (noun.endsWith('tud')) return '-tud → la';
    if (noun.endsWith('umbre')) return '-umbre → la';
    if (noun.endsWith('encia') || noun.endsWith('ancia')) return '-encia/-ancia → la';
    if (noun.endsWith('eza')) return '-eza → la';
    if (noun.endsWith('ura')) return '-ura → la';
    if (noun.endsWith('a')) return '-a → la';
    return 'fem. (la)';
  }
  if (SPANISH_FEM_STRESSED_A_NOUNS.has(noun)) return 'a-/ha- tónica (f.) → el';
  if (SPANISH_MASC_GREEK_MA_NOUNS.has(noun)) return '-ma (gr.) → el';
  if (SPANISH_MASC_A_EXCEPTIONS.has(noun)) return 'excepción (-a) → el';
  if (SPANISH_MASC_LANG_NOUNS.has(noun)) return 'idioma → el';
  if (SPANISH_MASC_TIME_NOUNS.has(noun)) return 'día/mes → el';
  if (noun.endsWith('aje')) return '-aje → el';
  if (noun.endsWith('miento') || noun.endsWith('mento')) return '-miento/-mento → el';
  if (noun.endsWith('ismo')) return '-ismo → el';
  if (noun.endsWith('or')) return '-or → el';
  if (noun.endsWith('o')) return '-o → el';
  return 'masc. (el)';
}

const SPANISH_DISTRACTOR_MAP = { el: ['la'], la: ['el'], los: ['las'], las: ['los'] };

function buildSpanishArticleTrackData(vocabCore, artExtra, articlePartDefs) {
  return globalThis.buildGenderedArticleTrackData({
    vocabCore,
    artExtra,
    articlePartDefs,
    articleRegex: /^(el|la|los|las)\s+(.+)$/,
    excludeNoun: (noun) => SPANISH_COMMON_TWO_GENDER_NOUNS.has(noun),
    getDistractors: (article) => SPANISH_DISTRACTOR_MAP[article] || ['la'],
    getPrompt: (noun) => SPANISH_ARTICLE_PROMPT_DISAMBIG[noun] || `___ ${noun}`,
    getHint: (noun, article) => getSpanishNounSuffixHint(noun, article)
  });
}

globalThis.buildSpanishArticleTrackData = buildSpanishArticleTrackData;
})();
