export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

// ── TRADITION ROUTING ─────────────────────────────────────────────────────────
// Routes scripture reference requests to the appropriate external API.
// All external calls happen server-side — no CORS restrictions for the client.
//
// Supported traditions:
//   quran        — Quran (alquran.cloud, Sahih International)
//   torah        — Hebrew Bible / Tanakh (Sefaria)
//   apocrypha    — Deuterocanonical / Catholic Apocrypha (Sefaria)
//   enoch        — 1 Enoch (static text — no public API; key passages served locally)
//   gita         — Bhagavad Gita (bhagavad-gita.org API)
//   mormon       — Book of Mormon (scriptures.byu.edu)
//   nwt          — New World Translation (routed through ESV/standard API with NWT note)
//   buddhist     — Pali Canon (suttacentral.net)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { tradition, ref } = req.query;

  if (!tradition || !ref) {
    return res.status(400).json({ error: 'Missing tradition or ref parameter' });
  }

  try {
    const result = await fetchText(tradition.toLowerCase(), ref);
    if (!result) return res.status(404).json({ error: 'Text not found' });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Scripture proxy error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve text' });
  }
}

async function fetchText(tradition, ref) {
  switch (tradition) {
    case 'quran':      return await fetchQuran(ref);
    case 'torah':
    case 'apocrypha':  return await fetchSefaria(ref);
    case 'enoch':      return fetchEnoch(ref);
    case 'gita':       return await fetchGita(ref);
    case 'mormon':     return await fetchMormon(ref);
    case 'nwt':        return await fetchNWT(ref);
    case 'buddhist':   return await fetchBuddhist(ref);
    default:           return null;
  }
}

// ── QURAN ─────────────────────────────────────────────────────────────────────
// API: alquran.cloud (free, no key)
// Ref format: "2:255" (surah:ayah)
async function fetchQuran(ref) {
  const match = ref.match(/(\d+)\s*[:\s]\s*(\d+)/);
  if (!match) return null;
  const [, surah, ayah] = match;

  const res = await fetch(
    `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.sahih`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.code !== 200 || !data.data) return null;

  const d = data.data;
  const surahName = d.surah?.englishName || `Surah ${surah}`;
  return {
    tradition: 'quran',
    ref: `Quran ${surah}:${ayah} \u2014 ${surahName}`,
    text: d.text,
    source: 'Sahih International'
  };
}

// ── TORAH / HEBREW BIBLE / APOCRYPHA ─────────────────────────────────────────
// API: Sefaria (free, no key)
// Ref format: "Genesis 1:1", "Sirach 24:3", "Wisdom 7:22", etc.
async function fetchSefaria(ref) {
  const encoded = encodeURIComponent(ref);
  const res = await fetch(
    `https://www.sefaria.org/api/texts/${encoded}?lang=en&context=0`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error) return null;

  // Sefaria returns text as array of strings or nested arrays
  let text = '';
  if (Array.isArray(data.text)) {
    text = data.text.flat().join(' ').replace(/<[^>]+>/g, '').trim();
  } else if (typeof data.text === 'string') {
    text = data.text.replace(/<[^>]+>/g, '').trim();
  }

  if (!text) return null;

  return {
    tradition: 'torah',
    ref: data.ref || ref,
    text,
    source: data.versionTitle || 'Sefaria'
  };
}

// ── 1 ENOCH ───────────────────────────────────────────────────────────────────
// No reliable public API exists for 1 Enoch.
// Serving key passages from the R.H. Charles translation (1917, public domain).
// Covers the most commonly referenced sections.
function fetchEnoch(ref) {
  const enochTexts = {
    '1:1':   'The words of the blessing of Enoch, wherewith he blessed the elect and righteous, who will be living in the day of tribulation, when all the wicked and godless are to be removed.',
    '1:2':   'And he took up his parable and said: Enoch a righteous man, whose eyes were opened by God, saw the vision of the Holy One in the heavens, which the angels showed me, and from them I heard everything, and from them I understood as I saw, but not for this generation, but for a remote one which is to come.',
    '1:9':   'And behold! He cometh with ten thousands of His holy ones to execute judgement upon all, and to destroy all the ungodly: and to convict all flesh of all the works of their ungodliness which they have ungodly committed, and of all the hard things which ungodly sinners have spoken against Him.',
    '6:1':   'And it came to pass when the children of men had multiplied that in those days were born unto them beautiful and comely daughters. And the angels, the children of the heaven, saw and lusted after them, and said to one another: Come, let us choose us wives from among the children of men and beget us children.',
    '6:2':   'And Semjaza, who was their leader, said unto them: I fear ye will not indeed agree to do this deed, and I alone shall have to pay the penalty of a great sin. And they all answered him and said: Let us all swear an oath, and all bind ourselves by mutual imprecations not to abandon this plan but to do this thing.',
    '9:1':   'And then Michael, Uriel, Raphael, and Gabriel looked down from heaven and saw much blood being shed upon the earth, and all lawlessness being wrought upon the earth.',
    '10:11': 'And the Lord said unto Michael: Go, bind Semjaza and his associates who have united themselves with women so as to have defiled themselves with them in all their uncleanness.',
    '14:8':  'The vision was shown to me thus: Behold, in the vision clouds invited me and a mist summoned me, and the course of the stars and the lightnings sped and hastened me, and the winds in the vision caused me to fly and lifted me upward, and bore me into heaven.',
    '37:1':  'The second vision which he saw, the vision of wisdom: which Enoch the son of Jared, the son of Mahalalel, the son of Cainan, the son of Enos, the son of Seth, the son of Adam, saw.',
    '46:1':  'And there I saw One who had a head of days, and His head was white like wool, and with Him was another being whose countenance had the appearance of a man, and his face was full of graciousness, like one of the holy angels.',
    '48:2':  'And at that hour that Son of Man was named in the presence of the Lord of Spirits, and his name before the Head of Days.',
    '48:10': 'And in those days a change shall take place for the holy and elect, and the light of days shall abide upon them, and glory and honour shall turn to the holy.',
    '62:5':  'Then shall the kings, the princes and all who possess the earth glorify and bless and extol him who rules over all, who was hidden.',
    '69:27': 'And he sat on the throne of his glory, and the sum of judgment was given unto the Son of Man, and he caused the sinners to pass away and be destroyed from off the face of the earth, and those who have led the world astray.',
    '71:14': 'And he came to me and greeted me with His voice, and said unto me: This is the Son of Man who is born unto righteousness, and righteousness abides over him, and the righteousness of the Head of Days forsakes him not.',
    '104:2': 'Be hopeful; for aforetime ye were put to shame through ill and affliction; but now ye shall shine as the lights of heaven, ye shall shine and ye shall be seen, and the portals of heaven shall be opened to you.',
  };

  // Normalize ref — strip "1 Enoch" prefix if present
  const normalized = ref.replace(/^1\s*enoch\s*/i, '').trim();
  const text = enochTexts[normalized];

  if (!text) {
    return {
      tradition: 'enoch',
      ref: `1 Enoch ${normalized}`,
      text: `[1 Enoch ${normalized} — R.H. Charles translation. This specific passage is not in the local index. Reference the Charles (1917) or Nickelsburg critical edition for the full text.]`,
      source: 'R.H. Charles, 1917 (public domain)'
    };
  }

  return {
    tradition: 'enoch',
    ref: `1 Enoch ${normalized}`,
    text,
    source: 'R.H. Charles, 1917 (public domain)'
  };
}

// ── BHAGAVAD GITA ─────────────────────────────────────────────────────────────
// API: bhagavad-gita.org (free, requires API key from RapidAPI — use env var)
// Fallback: hardcoded key verses if API key not available
async function fetchGita(ref) {
  // Ref format: "2:47" (chapter:verse)
  const match = ref.match(/(\d+)\s*[:\s]\s*(\d+)/);
  if (!match) return null;
  const [, chapter, verse] = match;

  const apiKey = process.env.GITA_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch(
        `https://bhagavad-gita3.p.rapidapi.com/v2/chapters/${chapter}/verses/${verse}/`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'bhagavad-gita3.p.rapidapi.com'
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        const translation = data.translations?.find(t => t.language === 'english');
        if (translation) {
          return {
            tradition: 'gita',
            ref: `Bhagavad Gita ${chapter}:${verse}`,
            text: translation.description,
            source: translation.author_name || 'Bhagavad Gita'
          };
        }
      }
    } catch {}
  }

  // Fallback — key verses hardcoded
  const gitaTexts = {
    '2:47':  'You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty.',
    '2:20':  'The soul is never born nor dies at any time. It has not come into being, does not come into being, and will not come into being. It is unborn, eternal, ever-existing, and primeval. It is not slain when the body is slain.',
    '4:7':   'Whenever and wherever there is a decline in religious practice, O descendant of Bharata, and a predominant rise of irreligion — at that time I descend Myself.',
    '4:8':   'To deliver the pious and to annihilate the miscreants, as well as to reestablish the principles of religion, I Myself appear, millennium after millennium.',
    '6:5':   'Let a man lift himself by his own Self alone, let him not lower himself; for this Self alone is the friend of oneself and this Self alone is the enemy of oneself.',
    '9:22':  'But those who worship Me with devotion, meditating on My transcendental form — to them I carry what they lack, and I preserve what they have.',
    '10:20': 'I am the Self, O Gudakesha, seated in the hearts of all creatures. I am the beginning, the middle and the end of all beings.',
    '11:32': 'The Lord said: I am mighty world-destroying Time, now engaged in destroying the worlds. Even without thee, none of the warriors arrayed in the hostile armies shall live.',
    '18:65': 'Think of Me, be devoted to Me, worship Me, bow to Me. So you shall come to Me. I promise you truly, for you are dear to Me.',
    '18:66': 'Abandoning all duties, come to Me alone for shelter. I will liberate you from all sins. Do not grieve.',
  };

  const text = gitaTexts[`${chapter}:${verse}`];
  return {
    tradition: 'gita',
    ref: `Bhagavad Gita ${chapter}:${verse}`,
    text: text || `[Bhagavad Gita ${chapter}:${verse} — text not in local index. See Prabhupada or Easwaran translation.]`,
    source: 'Various translations'
  };
}

// ── BOOK OF MORMON ────────────────────────────────────────────────────────────
// API: Scriptures BYU (free, no key) or static key passages
async function fetchMormon(ref) {
  // Normalize common Book of Mormon book names
  const bookMap = {
    '1 nephi': '1-ne', '2 nephi': '2-ne', 'jacob': 'jacob',
    'enos': 'enos', 'jarom': 'jarom', 'omni': 'omni',
    'mosiah': 'mosiah', 'alma': 'alma', 'helaman': 'hel',
    '3 nephi': '3-ne', '4 nephi': '4-ne', 'mormon': 'morm',
    'ether': 'ether', 'moroni': 'moro'
  };

  // Try scriptures.byu.edu API
  try {
    const encoded = encodeURIComponent(ref);
    const res = await fetch(
      `https://scriptures.byu.edu/mds/api.php?citation=${encoded}&type=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.citation_display) {
        return {
          tradition: 'mormon',
          ref: data.citation_display || ref,
          text: data.text || '',
          source: 'Book of Mormon'
        };
      }
    }
  } catch {}

  // Fallback — key passages
  const mormonTexts = {
    '2 Nephi 25:26': 'And we talk of Christ, we rejoice in Christ, we preach of Christ, we prophesy of Christ, and we write according to our prophecies, that our children may know to what source they may look for a remission of their sins.',
    'Moroni 10:4':   'And when ye shall receive these things, I would exhort you that ye would ask God, the Eternal Father, in the name of Christ, if these things are not true; and if ye shall ask with a sincere heart, with real intent, having faith in Christ, he will manifest the truth of it unto you, by the power of the Holy Ghost.',
    '3 Nephi 11:10': 'Behold, I am Jesus Christ, whom the prophets testified shall come into the world.',
    'Alma 32:21':    'And now as I said concerning faith — faith is not to have a perfect knowledge of things; therefore if ye have faith ye hope for things which are not seen, which are true.',
    'Mosiah 3:17':   'And moreover, I say unto you, that there shall be no other name given nor any other way nor means whereby salvation can come unto the children of men, only in and through the name of Christ, the Lord Omnipotent.',
  };

  const text = mormonTexts[ref];
  return {
    tradition: 'mormon',
    ref,
    text: text || `[Book of Mormon — ${ref}. Text not in local index.]`,
    source: 'Book of Mormon (LDS Church)'
  };
}

// ── NEW WORLD TRANSLATION ─────────────────────────────────────────────────────
// The NWT is a translation of biblical texts with documented theological alterations.
// We serve the standard text via Sefaria and note where the NWT departs significantly.
// Key alterations are flagged in the response — the framework examines the coherence implications.
async function fetchNWT(ref) {
  // Route through Sefaria for the base text
  const base = await fetchSefaria(ref);

  // Key NWT alterations to flag
  const nwtAlterations = {
    'John 1:1':    'NWT renders "the Word was a god" (indefinite article added). Standard Greek text: "the Word was God" (θεὸς ἦν ὁ λόγος). The article insertion is theologically motivated and not supported by standard Greek grammar.',
    'John 8:58':   'NWT renders "I have been" rather than "I am" (ἐγώ εἰμι). The present tense construction echoes Exodus 3:14 directly.',
    'Colossians 1:16': 'NWT inserts "[other]" four times — "all [other] things" — to suggest Christ is a created being among creation. The word "other" does not appear in the Greek text.',
    'Colossians 1:17': 'NWT inserts "[other]" — "he is before all [other] things." Same insertion pattern with no Greek basis.',
    'Philippians 2:9': 'NWT renders "Jehovah" where the Greek has "Lord" (Κύριος). The divine name substitution is applied throughout.',
    'Romans 10:13': 'NWT substitutes "Jehovah" for "Lord" (Κύριος) — which in context refers to Jesus (see v.9), eliminating the Christological implication.',
  };

  const alteration = nwtAlterations[ref];

  return {
    tradition: 'nwt',
    ref: base?.ref || ref,
    text: base?.text || `[${ref} — standard text not retrieved]`,
    source: 'Standard text via Sefaria' + (alteration ? ' | NWT Note below' : ''),
    nwtNote: alteration || null
  };
}

// ── BUDDHIST / PALI CANON ─────────────────────────────────────────────────────
// API: SuttaCentral (free, no key)
// Ref format: "DN 1", "MN 36", "SN 56.11", "AN 3.65", "Dhp 1"
async function fetchBuddhist(ref) {
  // Normalize ref for SuttaCentral API
  const normalized = ref.toLowerCase().replace(/\s+/g, '').replace('dhammapada', 'dhp');

  try {
    const res = await fetch(
      `https://suttacentral.net/api/suttas/${encodeURIComponent(normalized)}/sujato?lang=en`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.translation) {
        // Extract opening lines
        const text = typeof data.translation === 'string'
          ? data.translation.slice(0, 600).trim()
          : JSON.stringify(data.translation).slice(0, 600);
        return {
          tradition: 'buddhist',
          ref: ref,
          text,
          source: 'Bhikkhu Sujato translation, SuttaCentral'
        };
      }
    }
  } catch {}

  // Fallback — key Pali Canon passages
  const buddhistTexts = {
    'Dhp 1':     'Mind is the forerunner of all actions. All deeds are led by mind, created by mind. If one speaks or acts with a corrupt mind, suffering follows, as the wheel follows the hoof of an ox.',
    'Dhp 183':   'Not to do any evil, to cultivate good, to purify one\'s mind — this is the teaching of the Buddhas.',
    'SN 56.11':  'These two extremes, monks, are not to be practiced by one who has gone forth from the world. There is an addiction to indulgence of sense-pleasure, which is low, coarse, the way of the worldling, ignoble, and unprofitable; and there is an addiction to self-mortification, which is painful, ignoble, and unprofitable. Without veering towards either of these extremes, the Tathagata has awakened to the middle way.',
    'MN 26':     'I have penetrated this Dhamma which is deep, hard to see, hard to realize, peaceful, refined, beyond the scope of conjecture, subtle, to be experienced by the wise.',
    'DN 16':     'Behold now, brethren, I exhort you: all component things must pass away. Strive on untiringly.',
    'AN 3.65':   'Do not go by oral tradition, by lineage of teaching, by hearsay, by a collection of texts, by logic, by inferential reasoning, by reasoned cogitation, by the acceptance of a view after pondering it, by the seeming competence of a speaker, or by the thought "This ascetic is our teacher."',
  };

  const text = buddhistTexts[ref];
  return {
    tradition: 'buddhist',
    ref,
    text: text || `[${ref} — Pali Canon. Text not in local index. See Access to Insight or SuttaCentral for full text.]`,
    source: 'Various translations'
  };
}
