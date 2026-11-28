// French Study Track Helpers (lazy-loaded with French Study courses)
(() => {
if (typeof globalThis.buildFrenchArticleTrackData === 'function') return;

const FRENCH_COMMON_TWO_GENDER_NOUNS = new Set([
  'élève', 'enfant', 'adulte', 'collègue', 'artiste', 'dentiste',
  'journaliste', 'touriste', 'secrétaire', 'architecte', 'propriétaire',
  'locataire', 'stagiaire', 'partenaire', 'camarade', 'photographe',
  'spécialiste', 'cycliste', 'comptable', 'responsable', 'bénévole',
  'interprète', 'athlète', 'vétérinaire', 'bibliothécaire', 'fonctionnaire',
  'concierge', 'jeune', 'guide', 'pilote', 'juge', 'maire', 'pianiste',
  'économiste', 'réceptionniste', 'adversaire', 'malade', 'célibataire',
  'scientifique', 'diplomate'
]);

const FRENCH_MASS_L_NOUNS = new Set([
  'eau', 'huile', 'ail', 'argent', 'air', 'alcool', 'essence',
  'électricité', 'informatique', 'est', 'ouest', 'or', 'oxygène',
  'encre', 'agriculture', 'économie', 'éducation', 'énergie',
  'environnement', 'alimentation', 'architecture', 'orthographe',
  'ambiance', 'attention', 'aide', 'amitié', 'amour', 'ennui',
  'humour', 'ombre', 'herbe', 'actualité', 'avenir'
]);

const FRENCH_MASC_TIME_LANG_NOUNS = new Set([
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  'printemps', 'été', 'automne', 'hiver',
  'français', 'anglais', 'portugais', 'espagnol', 'allemand'
]);

const FRENCH_MASC_GREEK_ME_NOUNS = new Set([
  'problème', 'système', 'thème', 'programme', 'diplôme', 'poème',
  'schéma', 'drame', 'symptôme', 'rythme', 'climat', 'cinéma'
]);

const FRENCH_MASC_E_EXCEPTIONS = new Set([
  'musée', 'lycée', 'silence', 'incendie', 'parapluie', 'cimetière',
  'dictionnaire', 'anniversaire', 'salaire', 'horaire', 'formulaire',
  'vocabulaire', 'commentaire', 'exercice', 'service', 'bureau',
  'monde', 'groupe', 'compte', 'texte', 'exemple', 'centre', 'titre',
  'article', 'siècle', 'rêve', 'livre', 'poste', 'mode', 'mémoire', 'vase'
]);

const FRENCH_FEM_AGE_EXCEPTIONS = new Set([
  'page', 'plage', 'image', 'cage', 'nage', 'rage'
]);

const FRENCH_FEM_EAU_EXCEPTIONS = new Set([
  'eau', 'peau'
]);

const FRENCH_FEM_CONSONANT_EXCEPTIONS = new Set([
  'main', 'fin', 'mer', 'fleur', 'nuit', 'dent', 'forêt', 'loi', 'voix',
  'foi', 'fois', 'croix', 'noix', 'paix', 'toux', 'cour', 'tour',
  'maison', 'saison', 'raison', 'chanson', 'leçon', 'boisson', 'façon',
  'cuillère', 'mercredi', 'souris', 'brebis', 'clé', 'clef', 'photo',
  'moto', 'radio', 'vidéo', 'météo'
]);

const FRENCH_MASC_EUR_AGENT_OR_DEVICE = new Set([
  'professeur', 'directeur', 'docteur', 'acteur', 'auteur', 'chanteur',
  'danseur', 'vendeur', 'serveur', 'chauffeur', 'coiffeur', 'facteur',
  'voyageur', 'spectateur', 'utilisateur', 'travailleur', 'joueur',
  'ordinateur', 'aspirateur', 'réfrigérateur', 'congélateur', 'ascenseur',
  'moteur', 'ventilateur', 'chargeur', 'téléviseur', 'radiateur',
  'cœur', 'bonheur', 'malheur', 'secteur', 'extérieur', 'intérieur'
]);

const FRENCH_ARTICLE_PROMPT_DISAMBIG = {
  'le livre': '___ livre (à lire)',
  'la livre': '___ livre (poids / monnaie)',
  'la poste': '___ poste (courrier)',
  'le poste': '___ poste (emploi)',
  'le tour': '___ tour (promenade)',
  'la tour': '___ tour (bâtiment)',
  'la mode': '___ mode (vêtements)',
  'le mode': '___ mode (manière)',
  'la mémoire': '___ mémoire (souvenir)',
  'le mémoire': '___ mémoire (texte)',
  'la page': '___ page (livre)',
  'le vase': '___ vase (fleurs)',
  'la manche': '___ manche (vêtement)',
  'la physique': '___ physique (science)',
  'la critique': '___ critique (avis)',
  'la politique': '___ politique (gouvernement)',
  'la radio': '___ radio (appareil / station)',
  'la souris': '___ souris (animal / PC)',
  'le voile': '___ voile (tissu)',
  'la voile': '___ voile (bateau)'
};

function getFrenchNounSuffixHint(noun, gender, isIndef = false) {
  const target = isIndef ? (gender === 'f' ? 'une' : 'un') : (gender === 'f' ? 'la' : 'le');
  const tag = isIndef ? (gender === 'f' ? 'f. (une)' : 'm. (un)') : (gender === 'f' ? 'fém. (la)' : 'masc. (le)');

  if (gender === 'f') {
    if (noun === 'photo') return `la photographie → ${target}`;
    if (noun === 'moto') return `la motocyclette → ${target}`;
    if (noun === 'radio') return `radiophonie → ${target}`;
    if (FRENCH_FEM_AGE_EXCEPTIONS.has(noun)) return `exception (-age) → ${target}`;
    if (FRENCH_FEM_EAU_EXCEPTIONS.has(noun)) return `exception (-eau) → ${target}`;
    if (FRENCH_FEM_CONSONANT_EXCEPTIONS.has(noun)) return `exception fém. → ${target}`;
    if (noun.endsWith('tion') || noun.endsWith('sion') || noun.endsWith('xion')) return `-tion/-sion → ${target}`;
    if (noun.endsWith('té') || noun.endsWith('tié')) return `-té/-tié → ${target}`;
    if (noun.endsWith('ette')) return `-ette → ${target}`;
    if (noun.endsWith('ure')) return `-ure → ${target}`;
    if (noun.endsWith('ence') || noun.endsWith('ance')) return `-ence/-ance → ${target}`;
    if (noun.endsWith('ade') || noun.endsWith('ude')) return `-ade/-ude → ${target}`;
    if (noun.endsWith('ie') && noun !== 'incendie' && noun !== 'parapluie') return `-ie → ${target}`;
    if (noun.endsWith('eur') && !FRENCH_MASC_EUR_AGENT_OR_DEVICE.has(noun)) return `-eur (abstrait) → ${target}`;
    if (noun.endsWith('ée') && noun !== 'musée' && noun !== 'lycée') return `-ée → ${target}`;
    if (noun.endsWith('e')) return `-e → ${target}`;
    return tag;
  }

  if (FRENCH_MASC_GREEK_ME_NOUNS.has(noun)) return `-me (gr.) → ${target}`;
  if (FRENCH_MASC_E_EXCEPTIONS.has(noun)) return `exception (-e) → ${target}`;
  if (['français', 'anglais', 'portugais', 'espagnol', 'allemand'].includes(noun)) return `langue → ${target}`;
  if (FRENCH_MASC_TIME_LANG_NOUNS.has(noun)) return `jour/mois/saison → ${target}`;
  if (FRENCH_MASC_EUR_AGENT_OR_DEVICE.has(noun)) return `-eur (agent/objet) → ${target}`;
  if (noun.endsWith('age') && !FRENCH_FEM_AGE_EXCEPTIONS.has(noun)) return `-age → ${target}`;
  if (noun.endsWith('ment')) return `-ment → ${target}`;
  if (noun.endsWith('isme')) return `-isme → ${target}`;
  if (noun.endsWith('eau') && !FRENCH_FEM_EAU_EXCEPTIONS.has(noun)) return `-eau → ${target}`;
  if (noun.endsWith('oir') || noun.endsWith('ier')) return `-oir/-ier → ${target}`;
  if (noun.endsWith('phone') || noun.endsWith('scope')) return `-phone/-scope → ${target}`;
  return tag;
}

function buildFrenchArticleTrackData(vocabCore, artExtra, articlePartDefs) {
  return globalThis.buildGenderedArticleTrackData({
    vocabCore,
    artExtra,
    articlePartDefs,
    articleRegex: /^(le |la |les |l['’])(.+)$/,
    transformItem: ({ article, noun, row }) => {
      const art = article.trim();
      if (art === 'les') return null;
      if (FRENCH_COMMON_TWO_GENDER_NOUNS.has(noun)) return null;
      const prompt = FRENCH_ARTICLE_PROMPT_DISAMBIG[`${art} ${noun}`] || `___ ${noun}`;
      if (art === 'le' || art === 'la') {
        const gender = art === 'la' ? 'f' : 'm';
        return {
          prompt,
          correct: art,
          distractors: [art === 'le' ? 'la' : 'le'],
          hint: getFrenchNounSuffixHint(noun, gender, false)
        };
      }
      if (FRENCH_MASS_L_NOUNS.has(noun)) return null;
      const rawHint = String(row[3] || '').trim();
      let gender = '';
      if (/^f\./.test(rawHint)) gender = 'f';
      else if (/^m\./.test(rawHint)) gender = 'm';
      if (!gender) return null;
      const correct = gender === 'f' ? 'une' : 'un';
      const distractors = [gender === 'f' ? 'un' : 'une'];
      return {
        prompt,
        correct,
        distractors,
        hint: getFrenchNounSuffixHint(noun, gender, true)
      };
    }
  });
}

globalThis.buildFrenchArticleTrackData = buildFrenchArticleTrackData;
})();
