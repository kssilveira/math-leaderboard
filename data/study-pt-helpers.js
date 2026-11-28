// Portuguese Study Track Helpers (lazy-loaded with Portuguese Study courses)
(() => {
if (typeof globalThis.buildPortugueseArticleTrackData === 'function') return;

const PORTUGUESE_COMMON_TWO_GENDER_NOUNS = new Set([
  'estudante', 'cliente', 'colega', 'artista', 'dentista', 'jornalista',
  'motorista', 'turista', 'gerente', 'presidente', 'chefe', 'paciente',
  'policial', 'jovem', 'adolescente', 'especialista', 'recepcionista',
  'telefonista', 'economista', 'atleta', 'pianista', 'guia', 'intérprete',
  'agente', 'representante', 'participante', 'habitante', 'imigrante',
  'visitante', 'assistente', 'docente', 'fumante', 'piloto', 'modelo',
  'cônjuge', 'líder'
]);

const PORTUGUESE_PLURAL_ONLY_NOUNS = new Set([
  'óculos', 'férias', 'pais', 'parabéns', 'costas', 'arredores',
  'dados', 'compras', 'finanças', 'alimentos'
]);

const PORTUGUESE_MASC_TIME_LANG_NOUNS = new Set([
  'sábado', 'domingo',
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'português', 'inglês', 'espanhol', 'francês', 'alemão'
]);

const PORTUGUESE_MASC_GREEK_MA_NOUNS = new Set([
  'clima', 'tema', 'problema', 'sistema', 'programa', 'idioma',
  'cinema', 'diploma', 'poema', 'sintoma', 'drama', 'esquema',
  'fantasma', 'telefonema'
]);

const PORTUGUESE_MASC_A_EXCEPTIONS = new Set([
  'dia', 'mapa', 'planeta', 'sofá', 'cometa', 'pijama'
]);

const PORTUGUESE_FEM_AO_EXCEPTIONS = new Set([
  'mão', 'razão', 'lição', 'estação', 'opinião', 'reunião', 'região', 'questão'
]);

const PORTUGUESE_FEM_OR_EXCEPTIONS = new Set([
  'cor', 'dor', 'flor'
]);

const PORTUGUESE_ARTICLE_PROMPT_DISAMBIG = {
  capital: '___ capital (cidade)',
  rádio: '___ rádio (aparelho)',
  caixa: '___ caixa (objeto)',
  cabeça: '___ cabeça (corpo)',
  grama: '___ grama (relva)',
  polícia: '___ polícia (instituição)'
};

function getPortugueseNounSuffixHint(noun, article) {
  if (article === 'os') {
    if (PORTUGUESE_PLURAL_ONLY_NOUNS.has(noun)) return 'só pl. → os';
    return 'Pl. masc. → os';
  }
  if (article === 'as') {
    if (PORTUGUESE_PLURAL_ONLY_NOUNS.has(noun)) return 'só pl. → as';
    return 'Pl. fem. → as';
  }
  if (article === 'a') {
    if (noun === 'foto') return 'a fotografia → a';
    if (noun === 'moto') return 'a motocicleta → a';
    if (noun === 'tribo' || noun === 'libido') return 'exceção (-o) → a';
    if (PORTUGUESE_FEM_AO_EXCEPTIONS.has(noun)) return 'exceção (-ão) → a';
    if (PORTUGUESE_FEM_OR_EXCEPTIONS.has(noun)) return 'exceção (-or) → a';
    if (noun.endsWith('ção')) return '-ção → a';
    if (noun.endsWith('são')) return '-são → a';
    if (noun.endsWith('dade')) return '-dade → a';
    if (noun.endsWith('tade')) return '-tade → a';
    if (noun.endsWith('gem')) return '-gem → a';
    if (noun.endsWith('ência') || noun.endsWith('ância')) return '-ência/-ância → a';
    if (noun.endsWith('eza') || noun.endsWith('ez')) return '-eza/-ez → a';
    if (noun.endsWith('ice')) return '-ice → a';
    if (noun.endsWith('ura')) return '-ura → a';
    if (noun.endsWith('tude')) return '-tude → a';
    if (noun.endsWith('-feira')) return '-feira → a';
    if (noun.endsWith('a') || noun.endsWith('ã')) return '-a → a';
    return 'fem. (a)';
  }
  if (PORTUGUESE_MASC_GREEK_MA_NOUNS.has(noun)) return '-ma (gr.) → o';
  if (PORTUGUESE_MASC_A_EXCEPTIONS.has(noun)) return 'exceção (-a) → o';
  if (['português', 'inglês', 'espanhol', 'francês', 'alemão'].includes(noun)) return 'idioma → o';
  if (PORTUGUESE_MASC_TIME_LANG_NOUNS.has(noun)) return 'dia/mês → o';
  if (noun.endsWith('mento')) return '-mento → o';
  if (noun.endsWith('ismo')) return '-ismo → o';
  if (noun.endsWith('or')) return '-or → o';
  if (noun.endsWith('l')) return '-l → o';
  if (noun.endsWith('o') || noun.endsWith('ão')) return '-o → o';
  return 'masc. (o)';
}

function buildPortugueseArticleTrackData(vocabCore, artExtra, articlePartDefs) {
  const items = [];
  const groups = articlePartDefs.map(() => []);
  const keyToGroupIdx = new Map();
  let extraGroupIdx = articlePartDefs.length - 1;
  articlePartDefs.forEach((def, idx) => {
    (def.keys || []).forEach((k) => {
      if (k === 'extra') extraGroupIdx = idx;
      else keyToGroupIdx.set(k, idx);
    });
  });

  const pushNounArticleItem = ([pt, pos, setKey]) => {
    if (pos !== 'n') return;
    const match = pt.match(/^(o|a|os|as)\s+(.+)$/);
    if (!match) return;
    const article = match[1];
    const noun = match[2];
    if (PORTUGUESE_COMMON_TWO_GENDER_NOUNS.has(noun)) return;
    const distractorMap = { o: ['a'], a: ['o'], os: ['as'], as: ['os'] };
    const distractors = distractorMap[article] || ['a'];
    const hint = getPortugueseNounSuffixHint(noun, article);
    const prompt = PORTUGUESE_ARTICLE_PROMPT_DISAMBIG[noun] || `___ ${noun}`;
    const idx = items.length;
    items.push([prompt, article, distractors, hint]);
    const gIdx = keyToGroupIdx.has(setKey) ? keyToGroupIdx.get(setKey) : Math.max(0, extraGroupIdx - 1);
    if (groups[gIdx]) groups[gIdx].push(idx);
  };

  vocabCore.forEach(pushNounArticleItem);
  artExtra.forEach(([prompt, correct, distractors, ruleNote]) => {
    const idx = items.length;
    items.push([prompt, correct, distractors, ruleNote]);
    if (groups[extraGroupIdx]) groups[extraGroupIdx].push(idx);
  });

  const parts = articlePartDefs.map((def, idx) => ({
    label: def.label,
    indices: groups[idx]
  }));
  return { items, parts };
}

globalThis.buildPortugueseArticleTrackData = buildPortugueseArticleTrackData;
})();
