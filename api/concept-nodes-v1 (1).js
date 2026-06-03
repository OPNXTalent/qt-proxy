/**
 * THE PRISM — Foundational Concept Nodes (v1.0)
 *
 * 15 nodes. Canonical schema throughout.
 * Nodes 1–5:  Existing nodes upgraded to full schema
 * Nodes 6–10: Biblical / Second Temple (new)
 * Nodes 11–15: Prism Five Properties (new)
 *
 * Usage: paste into qt.html to replace current conceptNodes object,
 *        or export as JSON for Supabase/RAG integration.
 */

const conceptNodes = {

  // ── 01 ─────────────────────────────────────────────────────────────────────

  shamayim: {
    id: 'shamayim',
    title: 'Shamayim',
    subtitle: 'The Layered Heavenly Realms',
    category: 'Second Temple Cosmology',
    primarySourceLabel: '1 Enoch · Hebrew Bible',

    shortSummary: 'A multi-tiered cosmic architecture of heavenly domains inhabited by divine beings, spiritual powers, and the throne of God — not a single undifferentiated "sky" but a structured hierarchy whose logic interpenetrates earthly reality.',

    historicalContext: 'In Second Temple Judaism, shamayim was not a simple location but a structured hierarchy of heavenly domains. 1 Enoch describes multiple heavens, each populated with distinct classes of divine beings — watchers, archangels, luminaries governed by celestial laws. The Third Heaven of 2 Enoch contained both a paradise of the righteous and a place of judgment. Paul\'s reference in 2 Corinthians 12 assumes this framework without explanation, suggesting it was common currency among first-century Jewish-Christian audiences.\n\nThis layered cosmology shaped how first-century hearers understood phrases like "the Kingdom of Heaven" — not as a distant realm but as a present domain whose logic was already interpenetrating earthly reality. The shamayim was not where God retreated from creation but where the governance of creation was administered.',

    scripturalFoundation: [
      {
        reference: 'Genesis 1:1',
        relevance: 'Heaven (shamayim) is named before earth — establishing the heavenly domain as the first-order structure of created reality, not its ceiling.'
      },
      {
        reference: 'Daniel 10:12–14',
        relevance: 'The angelic messenger delayed by the "prince of Persia" demonstrates that heavenly domains and earthly geopolitical history are causally entangled — events in one domain directly condition events in the other.'
      },
      {
        reference: 'Psalm 82:1',
        relevance: '"God stands in the divine assembly; he renders judgment in the midst of the gods." The shamayim functions as an active governance jurisdiction, not ceremonial backdrop.'
      },
      {
        reference: '1 Kings 22:19–22',
        relevance: 'Micaiah\'s vision of the heavenly host deliberating over earthly outcomes confirms that the shamayim is a realm of agency, not observation.'
      },
      {
        reference: '2 Corinthians 12:2',
        relevance: 'Paul\'s reference to "the third heaven" as a destination assumed rather than explained signals that the layered cosmology of Second Temple Judaism was still operative in New Testament thought.'
      }
    ],

    prismReflection: {
      summary: 'Shamayim offers one of the richest points of entry into the Prism\'s reading of Scripture. The concept resists the modern tendency to flatten "heaven" into either a metaphor or a spatial location. It suggests instead that reality has a layered architecture — and that the governance of earthly history runs through that architecture.',
      fiveProperties: [
        {
          property: 'Holism',
          explanation: 'The Prism uses shamayim to consider how heavenly and earthly domains function as nested, mutually conditioned aspects of a single reality rather than separate systems. This offers a conceptual bridge to why ancient writers described events in both domains as aspects of one coherent order — not two stories running in parallel.'
        },
        {
          property: 'Relationality',
          explanation: 'The angelic figures of Daniel 10 and Psalm 82 hold identity and authority through relational position within the divine assembly, not through intrinsic substance. This may help modern readers imagine why the Hebrew Bible describes governance as a relational structure — not a hierarchy of essences but a hierarchy of relations.'
        },
        {
          property: 'Non-Locality',
          explanation: 'The simultaneous operation of heavenly council decisions and earthly geopolitical outcomes suggests causal influence operating across apparent spatial separation. The Prism uses this as a structural analogy only — not a claim that quantum entanglement explains angelic governance.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'The ordered structure of the heavenly realms — distinct offices, governing jurisdictions, accountability before YHWH — suggests a cosmos operating under binding relational constraints rather than arbitrary will. This provides a conceptual bridge to the Prism\'s claim that reality is governed by structure at every level.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'divine_council', label: 'Divine Council', relationshipType: 'context'     },
      { id: 'watchers',       label: 'Watchers',       relationshipType: 'context'     },
      { id: 'olam_haba',      label: 'Olam HaBa',      relationshipType: 'correlates'  },
      { id: 'non_locality',   label: 'Non-Locality',   relationshipType: 'illustrates' }
    ],

    architectureHints: [
      'unseen realm',
      'heaven-earth interaction',
      'hierarchical order',
      'governance',
      'layered reality'
    ],

    sourceHierarchy: {
      authority:   ['Genesis 1:1', 'Daniel 10', 'Psalm 82', '1 Kings 22', '2 Corinthians 12'],
      context:     ['1 Enoch', '2 Enoch', '3 Baruch', 'Dead Sea Scrolls', 'Jubilees'],
      comparative: [],
      reflection:  ['The Prism', 'Michael Heiser — The Unseen Realm', 'RCT']
    },

    comparativeNotes: 'Islamic cosmology also describes multiple heavens (sab\' samawat — seven heavens), each populated with angelic beings and associated with distinct prophets. The structural parallel is significant: both traditions locate governance of creation in a layered non-terrestrial domain. The distinction is that Islamic cosmology is less concerned with the political entanglement of heavenly domains with earthly history that characterizes the Second Temple Jewish picture — the interaction in Islam is primarily through revelation (wahy) rather than delegated governance.',

    ragMetadata: {
      aliases: ['Heaven', 'Heavens', 'Heavenly Realms', 'The Heavens', 'heaven', 'heavens', 'heavenly realms', 'the heavens', 'shamayim'],
      detectionTerms: ['Shamayim', 'shamayim', 'Heaven', 'Heavens', 'Heavenly Realm', 'Heavenly Realms', 'heavenly realms', 'layered heaven', 'unseen realm', 'third heaven', 'the heavens'],
      tags: ['heaven', 'angels', 'unseen realm', 'layered reality', 'divine beings', 'cosmology', 'Second Temple', 'governance']
    }
  },

  // ── 02 ─────────────────────────────────────────────────────────────────────

  olam_haba: {
    id: 'olam_haba',
    title: 'Olam HaBa',
    subtitle: 'The Age to Come',
    category: 'Hebraic Eschatology',
    primarySourceLabel: 'Talmud · Second Temple Literature',

    shortSummary: 'The coming age of full divine governance — not a disembodied afterlife but the next epoch in history, when heaven and earth are finally integrated under YHWH\'s uncontested rule and the dead are raised to embodied life.',

    historicalContext: 'Olam HaBa (עוֹלָם הַבָּא) is inseparable from its counterpart Olam HaZeh. The two-age framework was the standard cosmological architecture of Second Temple Judaism and is assumed — not introduced — by Jesus and Paul. The rabbis used it to organize their teaching on Torah observance, reward, and judgment. The Mishnah speaks of those who have a "portion in Olam HaBa" as those who affirm resurrection and the divine origin of Torah.\n\nCritically, Olam HaBa was never understood as the soul\'s escape from material existence. It was the arrival of a new epoch in history — one in which God\'s sovereign governance, currently contested, would be fully established. This is why resurrection was central: the body mattered because the coming age was a bodily, historical, renewed-creation reality.',

    scripturalFoundation: [
      {
        reference: 'Isaiah 65:17–25',
        relevance: 'Describes Olam HaBa in concrete, historical terms — renewed creation, no premature death, labor bearing fruit. Not destruction but comprehensive renewal.'
      },
      {
        reference: 'Daniel 12:2',
        relevance: 'The resurrection of the dead following the great distress is the pivotal event of Olam HaBa — bodily, historical, and differentiating.'
      },
      {
        reference: 'Matthew 12:32',
        relevance: 'Jesus distinguishes between "this age" and "the age to come" without explanation — the framework was common currency for his audience.'
      },
      {
        reference: 'Romans 8:19–23',
        relevance: 'Paul frames creation\'s liberation from bondage as the arrival of Olam HaBa — the scope is cosmic, not merely personal or spiritual.'
      },
      {
        reference: 'Revelation 21:1–5',
        relevance: '"Behold, I make all things new" — the new creation is the consummation of Olam HaBa: heaven and earth united, death abolished, God dwelling directly with humanity.'
      }
    ],

    prismReflection: {
      summary: 'Olam HaBa is one of the Prism\'s most significant temporal anchors. It reshapes how every text must be read — as words written within a particular epoch, by people who knew they were not at the end of the story. The concept challenges modern readers to recognize that their own interpretive position is similarly embedded in historical time.',
      fiveProperties: [
        {
          property: 'Law-Like Structure',
          explanation: 'Olam HaBa insists on a genuine historical sequence — this age, then the age to come — that cannot be shortcut or spiritualized away. The Prism uses this to consider how covenantal logic operates across time with the regularity of law: not as mechanical necessity but as binding structural commitment.'
        },
        {
          property: 'Context-Sensitivity',
          explanation: 'The meaning of covenant promises, suffering, and delayed justice changes dramatically depending on which age the reader locates themselves within. The Prism uses this to suggest that interpretive position is not merely preference but a condition that shapes what can be seen in a text.'
        },
        {
          property: 'Holism',
          explanation: 'The final resolution in Olam HaBa is the integration of all domains — heaven and earth, body and spirit, present and future — into a single renewed creation. This offers a conceptual bridge to the Prism\'s claim that reality cannot be understood by examining its parts in isolation from the whole toward which they move.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'olam_hazeh',     label: 'Olam HaZeh',      relationshipType: 'contrasts'  },
      { id: 'resurrection',   label: 'Resurrection',    relationshipType: 'defines'    },
      { id: 'kingdom_of_god', label: 'Kingdom of God',  relationshipType: 'correlates' },
      { id: 'shamayim',       label: 'Shamayim',        relationshipType: 'correlates' }
    ],

    architectureHints: [
      'future restoration',
      'renewal',
      'temporal sequence',
      'completion',
      'embodied hope'
    ],

    sourceHierarchy: {
      authority:   ['Isaiah 65', 'Daniel 12', 'Matthew 12', 'Romans 8', 'Revelation 21'],
      context:     ['Talmud — Sanhedrin 10', '1 Enoch', 'Jubilees', '4 Ezra', 'Dead Sea Scrolls — Community Rule'],
      comparative: ['Jannah (Islamic paradise)', 'Moksha (Hindu liberation)', 'Nirvana (Buddhist release)'],
      reflection:  ['The Prism', 'N.T. Wright — Surprised by Hope', 'RCT']
    },

    comparativeNotes: 'The Islamic concept of Jannah shares Olam HaBa\'s insistence on embodied, sensory existence in the coming state — both resist purely spiritual or abstract conceptions of the afterlife. The distinction is structural: Olam HaBa is a renewal of the present creation following a historical judgment, whereas Jannah is a distinct eternal domain prepared for the righteous rather than a transformation of the current world. Hindu moksha and Buddhist nirvana share the element of liberation from present conditions but move in an opposite direction — toward the dissolution of individual identity and the escape from historical existence rather than its renewal. Olam HaBa is fundamentally a historical concept, not a transcendence concept.',

    ragMetadata: {
      aliases: ['World to Come', 'Age to Come', 'world to come', 'age to come', 'the coming age', 'olam haba', 'olam ha-ba'],
      detectionTerms: ['Olam HaBa', 'olam haba', "olam ha'ba", 'olam ha-ba', 'World to Come', 'world to come', 'Age to Come', 'age to come', 'the coming age', 'new creation', 'renewed creation'],
      tags: ['eschatology', 'age to come', 'resurrection', 'new creation', 'kingdom', 'two-age framework', 'renewal']
    }
  },

  // ── 03 ─────────────────────────────────────────────────────────────────────

  olam_hazeh: {
    id: 'olam_hazeh',
    title: 'Olam HaZeh',
    subtitle: 'This Present Age',
    category: 'Hebraic Eschatology',
    primarySourceLabel: 'Talmud · Second Temple Literature',

    shortSummary: 'The current epoch characterized by contested divine governance and the coexistence of covenant faithfulness with apparent disorder — not a world to be escaped but a precise temporal marker for where we are in the larger story.',

    historicalContext: 'Olam HaZeh (עוֹלָם הַזֶּה) is the defining temporal context for every biblical writer. It describes not the world\'s material composition but the world\'s current governance condition — the age in which divine sovereignty is real but not yet universally acknowledged, in which death still operates, in which the nations remain under contested spiritual administration.\n\nSecond Temple writers experienced themselves as living in the overlap between the ages — the powers of Olam HaZeh still active, the powers of Olam HaBa beginning to break through. This is exactly the eschatological framework the New Testament inherits. Paul\'s ethics, his theology of the Spirit, and his account of suffering all presuppose that the age has not yet fully turned — but that its turning is already underway.',

    scripturalFoundation: [
      {
        reference: 'Galatians 1:4',
        relevance: 'Paul describes the present age as "evil" — not cosmologically defective but structurally disordered, requiring rescue rather than mere improvement.'
      },
      {
        reference: 'Matthew 13:39–40',
        relevance: 'The Parable of the Weeds names "the end of the age" as the moment of final separation — confirming that the present age has a defined terminus.'
      },
      {
        reference: 'Romans 12:2',
        relevance: '"Do not conform to this age" — the present age exerts a formative pressure with a distinct structural logic that must be actively resisted, not merely avoided.'
      },
      {
        reference: 'Ecclesiastes 1:2–4',
        relevance: 'Hebel (vapor, mist) is the experiential texture of Olam HaZeh — not nihilism but the felt dissonance of living before the age turns, when labor\'s meaning is obscured by its apparent futility.'
      }
    ],

    prismReflection: {
      summary: 'Olam HaZeh functions as the Prism\'s present-tense interpretive frame. Every biblical text was written from within this age — by writers who knew they were not at the end of the story. Recognizing this changes how the Prism reads everything: theodicy, lament, prophecy, and promise all acquire different meaning when read as words spoken within Olam HaZeh rather than as timeless truths floating free of historical position.',
      fiveProperties: [
        {
          property: 'Context-Sensitivity',
          explanation: 'The meaning of suffering, delayed justice, and unanswered prayer shifts entirely depending on which age the interpreter occupies. The Prism uses Olam HaZeh to suggest that interpretive position is a structural condition — not an optional perspective — that shapes what can honestly be seen in a text.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'Covenantal logic continues operating within Olam HaZeh even when outcomes appear contradictory. The tension between divine faithfulness and observable disorder is a feature of the present age\'s structure — not a refutation of the covenant. This provides a conceptual bridge to the idea that structure can be real and binding even when its full expression is not yet visible.'
        },
        {
          property: 'Relationality',
          explanation: 'The "already but not yet" of early Christian thought is a dynamic relational condition: the age to come has already arrived in Christ\'s resurrection but has not yet fully displaced the present age. This offers a way to consider how identity and meaning can be constituted by a future that is not yet fully present but is already relationally determinative.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'olam_haba',      label: 'Olam HaBa',      relationshipType: 'telos'    },
      { id: 'covenant',       label: 'Covenant',        relationshipType: 'context'  },
      { id: 'kingdom_of_god', label: 'Kingdom of God',  relationshipType: 'telos'    },
      { id: 'emet',           label: 'Emet',            relationshipType: 'context'  }
    ],

    architectureHints: [
      'temporal sequence',
      'contested governance',
      'decoherence condition',
      'already-not-yet',
      'historical position'
    ],

    sourceHierarchy: {
      authority:   ['Galatians 1:4', 'Matthew 13', 'Romans 12', 'Ecclesiastes 1'],
      context:     ['Talmud', '4 Ezra', 'Dead Sea Scrolls', '2 Baruch'],
      comparative: [],
      reflection:  ['The Prism', 'N.T. Wright — Paul and the Faithfulness of God', 'RCT']
    },

    comparativeNotes: '',

    ragMetadata: {
      aliases: ['Present Age', 'This World', 'this age', 'present age', 'present evil age', 'this world', 'olam hazeh', 'olam ha-zeh'],
      detectionTerms: ['Olam HaZeh', 'olam hazeh', "olam ha'zeh", 'olam ha-zeh', 'Present Age', 'present age', 'This World', 'this present age', 'this evil age', 'already but not yet'],
      tags: ['eschatology', 'present age', 'two-age framework', 'already-not-yet', 'hebel', 'contested governance']
    }
  },

  // ── 04 ─────────────────────────────────────────────────────────────────────

  divine_council: {
    id: 'divine_council',
    title: 'Divine Council',
    subtitle: 'The Heavenly Governing Assembly',
    category: 'Second Temple Cosmology',
    primarySourceLabel: 'Psalm 82 · Deuteronomy 32 · 1 Enoch',

    shortSummary: 'The heavenly assembly through which YHWH administers creation — a council of divine beings assigned jurisdictional authority over the nations, whose failure is the structural background for Israel\'s election and the New Testament\'s proclamation of Christ\'s universal lordship.',

    historicalContext: 'The Divine Council is not a marginal feature of the Hebrew Bible — it is structural to its worldview. Psalm 82 opens with God presiding over an assembly of elohim who are judged for corrupt governance of the nations. Deuteronomy 32:8 in the Dead Sea Scrolls reads "according to the number of the sons of God" — divine beings were assigned jurisdictional governance over the nations at the Table of Nations event, while Israel was kept as YHWH\'s direct inheritance.\n\nThis framework was assumed, not argued, by Second Temple writers. The "princes" of Daniel 10 — the Prince of Persia, the Prince of Greece — are council members governing geopolitical domains in the heavenly realm whose operations directly condition earthly politics. The New Testament\'s proclamation that Christ is exalted "far above all principality and power and might and dominion" (Ephesians 1:21) makes no structural sense without this background. The resurrection is, in part, a cosmic reconstitution of the council.',

    scripturalFoundation: [
      {
        reference: 'Psalm 82',
        relevance: 'The clearest council text in the Hebrew Bible: YHWH convenes the divine assembly, indicts the elohim for unjust governance of the nations, and pronounces their mortality. The call to "arise and judge the earth" frames the present age as one of delegated and failed administration.'
      },
      {
        reference: 'Deuteronomy 32:8–9',
        relevance: 'In the Dead Sea Scrolls reading, the nations are distributed "according to the number of the sons of God" — divine beings receive jurisdictional governance at Babel. Israel is YHWH\'s direct portion, which explains the theological significance of Israel\'s election.'
      },
      {
        reference: 'Daniel 10:13,20',
        relevance: 'The Prince of Persia and Prince of Greece are heavenly council members whose resistance to the angelic messenger directly affects the timing of prophetic revelation — council activity and earthly history are causally linked.'
      },
      {
        reference: 'Colossians 1:16',
        relevance: 'Paul\'s catalog of "thrones, dominions, principalities, authorities" names council members created through and for Christ — implying that Christ\'s lordship reorganizes the entire governance structure of creation.'
      },
      {
        reference: 'Revelation 4–5',
        relevance: 'The throne room scene is a council assembly reordered around the risen Lamb. The council structure is preserved but reconstituted under Christ\'s authority — confirming that the cosmic governance system was not abolished but transformed.'
      }
    ],

    prismReflection: {
      summary: 'The Divine Council is arguably the concept that most directly reveals the Hebrew Bible\'s relational ontology. In the council, identity, authority, and agency are constituted by relational position within the assembly — not by intrinsic properties. The Prism finds in this structure a coherent alternative to the substance-ontology that Greek philosophical reading often projects onto the text.',
      fiveProperties: [
        {
          property: 'Relationality',
          explanation: 'In the council, a "son of God" is not a category of being but a role within a relational structure. Identity and authority are constituted by position within the assembly. This provides a conceptual bridge to the Prism\'s claim that the Hebrew Bible may be operating with a relational ontology that is structurally distinct from Greek substance categories.'
        },
        {
          property: 'Non-Locality',
          explanation: 'The simultaneous operation of heavenly council decisions and earthly geopolitical outcomes suggests causal influence operating across apparent spatial separation. The Prism uses this as a structural analogy for why ancient writers described heaven and earth as a single causally integrated system, not two independent domains.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'Governance of creation operates through binding delegated authority — council members are given jurisdictions and are accountable for how they exercise them. This suggests a cosmos governed by law-like relational constraint rather than arbitrary divine micromanagement.'
        },
        {
          property: 'Context-Sensitivity',
          explanation: 'The authority structure of the council changes by covenantal epoch: pre-Babel, post-Babel, post-resurrection. Who governs, and how, is not fixed but determined by covenantal position. The Prism uses this to suggest that governance itself is context-sensitive — not eternal and immutable but responsive to historical development.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'shamayim',     label: 'Shamayim',     relationshipType: 'context'    },
      { id: 'watchers',     label: 'Watchers',     relationshipType: 'instance'   },
      { id: 'covenant',     label: 'Covenant',     relationshipType: 'grounds'    },
      { id: 'non_locality', label: 'Non-Locality', relationshipType: 'illustrates' }
    ],

    architectureHints: [
      'governance',
      'delegated authority',
      'relational identity',
      'heaven-earth interaction',
      'cosmic reconstitution'
    ],

    sourceHierarchy: {
      authority:   ['Psalm 82', 'Deuteronomy 32', 'Daniel 10', 'Colossians 1', 'Ephesians 1', 'Revelation 4–5'],
      context:     ['1 Enoch 6–16', 'Dead Sea Scrolls — Songs of the Sabbath Sacrifice', 'Jubilees', 'Philo'],
      comparative: [],
      reflection:  ['Michael Heiser — The Unseen Realm', 'The Prism', 'RCT']
    },

    comparativeNotes: 'The Mesopotamian divine assembly (the Anunnaki in Sumerian tradition, the divine council in Ugaritic texts including the "council of El") provides the closest structural parallel — a chief deity presiding over lesser divine beings who administer domains of creation. The critical distinction is that in the biblical tradition the council members are created beings accountable to YHWH, and their corrupt governance is subject to judgment and reversal. The Prism treats the biblical council not as borrowed mythology but as a distinctive theological development: governance structured by accountability, not merely by power.',

    ragMetadata: {
      aliases: ['Heavenly Council', 'Divine Assembly', 'heavenly council', 'divine assembly', 'council of God', 'sons of God', 'elohim assembly'],
      detectionTerms: ['Divine Council', 'divine council', 'Heavenly Council', 'heavenly council', 'Divine Assembly', 'divine assembly', 'sons of god', 'bene elohim', 'principalities and powers', 'prince of persia', 'sons of God'],
      tags: ['divine council', 'elohim', 'sons of God', 'governance', 'watchers', 'principalities', 'powers', 'nations', 'heavenly assembly', 'cosmic hierarchy']
    }
  },

  // ── 05 ─────────────────────────────────────────────────────────────────────

  non_locality: {
    id: 'non_locality',
    title: 'Non-Locality',
    subtitle: 'Relational Coherence Across Distance',
    category: 'Prism Framework · Physics',
    primarySourceLabel: "Bell's Theorem · Quantum Mechanics",

    shortSummary: 'The quantum mechanical property by which entangled particles exhibit correlated states regardless of spatial separation — used in the Prism as a structural analogy for why ancient writers described heaven and earth as a single relational system rather than two independent domains.',

    historicalContext: "Non-locality as a formally established property of nature emerges from Bell's theorem (1964) and its experimental confirmation by Alain Aspect (1982). Bell demonstrated mathematically that if quantum mechanics is correct, the correlations between entangled particles cannot be explained by any local hidden variable theory — the particles do not carry pre-existing states that simply become revealed on measurement. Aspect's experiments confirmed the quantum mechanical prediction.\n\nThis is not a claim that information travels faster than light. It is a claim that certain physical systems cannot be correctly described as collections of independent parts. The system must be understood as a whole. The Prism's use of non-locality is strictly analogical — it does not claim that quantum entanglement explains divine action or proves theological propositions. It uses the structural feature as a bridge concept: if physical systems can exhibit genuine, lawful correlation across spatial separation, the ancient intuition that heaven and earth are mutually determining aspects of one reality becomes structurally imaginable rather than merely poetic.",

    scripturalFoundation: [
      {
        reference: 'Colossians 1:17',
        relevance: '"In him all things hold together" — the Greek synestēken implies continuous relational coherence as an active, present-tense property of creation, not merely an initial creative act.'
      },
      {
        reference: 'Hebrews 1:3',
        relevance: 'Christ "sustaining all things by his powerful word" — the ongoing integrity of creation is framed as relational upholding, not mechanical self-continuation.'
      },
      {
        reference: 'Acts 17:28',
        relevance: '"In him we live and move and have our being" — creaturely existence is constitutively relational, not independently self-grounded.'
      },
      {
        reference: 'John 17:21',
        relevance: 'The Father-Son relational unity proposed as the model and ground for human relational coherence — ontological participation, not metaphor.'
      }
    ],

    prismReflection: {
      summary: 'Non-Locality is one of the five foundational properties the Prism uses to read Scripture, which makes this node self-referential — an entry point into the framework\'s own structure. The Prism is explicit that non-locality does not prove theology. It offers a structural analogy that helps modern readers imagine why the ancient intuition of a relationally integrated cosmos is not incoherent.',
      fiveProperties: [
        {
          property: 'Non-Locality',
          explanation: 'This node is itself a Prism property. As a structural analogy, non-locality challenges the assumption that divine action must be spatially local to be causally real. If physical systems can exhibit lawful correlation across spatial separation, the ancient intuition that events in heaven and earth are mutually determining becomes structurally coherent rather than merely metaphorical.'
        },
        {
          property: 'Holism',
          explanation: 'Non-locality is a direct expression of holism: an entangled system cannot be correctly understood by analyzing its parts independently. The Prism uses this to offer a conceptual bridge to why ancient cosmology treated heaven-and-earth as a single system whose parts cannot be meaningfully isolated from one another.'
        },
        {
          property: 'Relationality',
          explanation: 'In quantum entanglement, state is not intrinsic to a particle but emerges through its relation to the whole system. This provides a structural analogy for the Hebraic intuition that identity and reality are constituted relationally — not by independent essence but by relation within a larger whole.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'holism',             label: 'Holism',          relationshipType: 'grounds'    },
      { id: 'relationality',      label: 'Relationality',   relationshipType: 'instance'   },
      { id: 'law_like_structure', label: 'Law-Like Structure', relationshipType: 'correlates' },
      { id: 'shamayim',           label: 'Shamayim',        relationshipType: 'analogizes' },
      { id: 'divine_council',     label: 'Divine Council',  relationshipType: 'analogizes' }
    ],

    architectureHints: [
      'relational coherence',
      'heaven-earth integration',
      'structural analogy',
      'non-separability',
      'framework property'
    ],

    sourceHierarchy: {
      authority:   ['Colossians 1:17', 'Hebrews 1:3', 'Acts 17:28', 'John 17:21'],
      context:     [],
      comparative: [],
      reflection:  ['Bell\'s Theorem (1964)', 'Aspect et al. (1982)', 'Carlo Rovelli — Relational Quantum Mechanics', 'The Prism', 'RCT']
    },

    comparativeNotes: 'The concept of non-locality finds loose structural parallels in several traditions\' descriptions of the divine as the ground or field within which all things exist and interact — Brahman in Advaita Vedanta, the Tao in Chinese philosophy, and the Buddhist concept of pratītyasamutpāda (dependent origination). Each describes reality as constitutively relational and resistant to reduction into independent parts. The distinction is that the Prism uses non-locality as a structural analogy grounded in a specific physical discovery, not as a metaphysical claim about the nature of ultimate reality. The analogy points to coherence, not identity.',

    ragMetadata: {
      aliases: ['Non Locality', 'Nonlocal Influence', 'non locality', 'nonlocal influence', 'quantum non-locality', 'entanglement', 'non-local', 'nonlocal correlation'],
      detectionTerms: ['Non-Locality', 'non-locality', 'Non Locality', 'non locality', 'nonlocality', 'Nonlocal Influence', 'nonlocal influence', 'entanglement', 'quantum entangle', "Bell's theorem", 'non-local', 'bell theorem'],
      tags: ['non-locality', 'entanglement', 'quantum mechanics', 'relational ontology', 'holism', 'structural analogy', 'Bell theorem']
    }
  },

  // ── 06 ─────────────────────────────────────────────────────────────────────

  watchers: {
    id: 'watchers',
    title: 'Watchers',
    subtitle: 'The Fallen Members of the Divine Council',
    category: 'Second Temple Cosmology',
    primarySourceLabel: '1 Enoch · Genesis 6',

    shortSummary: 'A class of divine beings from the heavenly council assigned to watch over humanity who abandoned their station, entered illicit relations with human women, and introduced corruption into creation — the Second Temple explanation for the persistence of evil within a cosmos governed by YHWH.',

    historicalContext: '1 Enoch 1–36 (the Book of the Watchers) provides the most developed account. The Watchers (Aramaic: עִירִין, irin) were divine council members — "sons of God" — assigned a supervisory role over humanity. Under the leadership of Shemihazah and Azazel, 200 of them descended on Mount Hermon, took human wives, and fathered the Nephilim. They also transmitted forbidden knowledge: metallurgy for weapons, cosmetics, sorcery, and astronomy used for divination. Their offspring, the Nephilim, were giants who devoured humanity\'s resources and then turned on humans themselves.\n\nThis tradition was not marginal. Jude 6 and 2 Peter 2:4 reference imprisoned angels who sinned. Genesis 6:1–4 is its scriptural anchor. The Watchers narrative solved a critical theological problem: how does a world governed by YHWH come to contain persistent, organized evil? The answer: divine beings abandoned their proper station and introduced disorder from within the heavenly hierarchy itself.',

    scripturalFoundation: [
      {
        reference: 'Genesis 6:1–4',
        relevance: 'The "sons of God" taking human wives and producing the Nephilim is the scriptural anchor for the Watcher tradition — the text that Second Temple interpreters developed into the full Enochic account.'
      },
      {
        reference: 'Jude 6',
        relevance: '"Angels who did not keep their own domain but abandoned their proper abode" — a direct New Testament reference to the Watcher tradition, using language that echoes 1 Enoch and confirms the tradition\'s currency in early Christian thought.'
      },
      {
        reference: '2 Peter 2:4',
        relevance: '"God did not spare angels when they sinned, but cast them into Tartarus and committed them to chains of gloomy darkness to be kept until judgment" — confirms the tradition of imprisoned divine beings awaiting final judgment.'
      },
      {
        reference: 'Psalm 82:6–7',
        relevance: 'YHWH\'s pronouncement that the elohim "will die like men" is the divine council\'s response to the Watchers\' failure — mortality as the sentence for abandoning proper governance.'
      }
    ],

    prismReflection: {
      summary: 'The Watchers tradition addresses a question the Prism considers structurally important: how does disorder arise within a cosmos governed by law-like structure? The answer is not chaos from without but defection from within — a governance failure at the highest level of the heavenly hierarchy. This is consistent with the Prism\'s reading of Olam HaZeh as a present-age condition of contested, not absent, divine governance.',
      fiveProperties: [
        {
          property: 'Law-Like Structure',
          explanation: 'The Watchers had a proper station and abandoned it — their sin is precisely the violation of the structural ordering of the divine council. The tradition offers a conceptual bridge to the idea that disorder is not the absence of structure but its active transgression from within.'
        },
        {
          property: 'Relationality',
          explanation: 'The Watchers\' sin was a relational violation: abandoning their assigned position within the council disrupted the relational coherence of the entire governance system. The consequences — Nephilim, forbidden knowledge, corruption — flowed from a structural failure in the relational order, not merely a moral one.'
        },
        {
          property: 'Holism',
          explanation: 'The Watchers narrative illustrates why the Prism insists that the parts of the governance system cannot be considered in isolation. The defection of a subset of council members produced corruption across the whole of creation — the system\'s integrity depends on each part maintaining its proper relation.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'divine_council', label: 'Divine Council', relationshipType: 'instance'  },
      { id: 'shamayim',       label: 'Shamayim',       relationshipType: 'context'   },
      { id: 'olam_hazeh',     label: 'Olam HaZeh',     relationshipType: 'mechanism' },
      { id: 'covenant',       label: 'Covenant',       relationshipType: 'context'   }
    ],

    architectureHints: [
      'divine defection',
      'contested governance',
      'corruption origin',
      'law-violation',
      'heaven-earth interaction'
    ],

    sourceHierarchy: {
      authority:   ['Genesis 6:1–4', 'Jude 6', '2 Peter 2:4', 'Psalm 82'],
      context:     ['1 Enoch 1–36 (Book of the Watchers)', 'Jubilees 4–5', 'Dead Sea Scrolls — Book of Giants', 'Damascus Document'],
      comparative: ['Fallen angel traditions in Islamic theology (Harut and Marut, Quran 2:102)'],
      reflection:  ['Michael Heiser — Reversing Hermon', 'The Prism', 'RCT']
    },

    comparativeNotes: 'The Quran\'s account of Harut and Marut (2:102) is the closest Abrahamic parallel — two angels sent to Babylon who taught sorcery to humans, though in Islamic tradition they were sent as a test rather than having fallen through lust. The structural element is shared: divine beings as intermediaries of forbidden knowledge that produces human harm. The distinction is that the Enochic tradition ties the Watchers to a specific cosmic disruption — the Nephilim, the corruption of the pre-flood world — that establishes the theological backstory for why YHWH must reconstitute creation through covenant with Israel.',

    ragMetadata: {
      aliases: ['Fallen Angels', 'Sons of God', 'Irin', 'Watchers', 'fallen angels', 'sons of god', 'nephilim fathers'],
      detectionTerms: ['Watchers', 'watchers', 'Irin', 'irin', 'fallen angels', 'sons of God taking wives', 'Nephilim', 'nephilim', 'Shemihazah', 'Azazel', 'Book of Watchers'],
      tags: ['watchers', 'fallen angels', 'Nephilim', 'divine defection', 'Second Temple', '1 Enoch', 'governance failure', 'corruption']
    }
  },

  // ── 07 ─────────────────────────────────────────────────────────────────────

  resurrection: {
    id: 'resurrection',
    title: 'Resurrection',
    subtitle: 'Bodily Restoration at the Age\'s Turn',
    category: 'Hebraic Eschatology',
    primarySourceLabel: 'Hebrew Bible · New Testament',

    shortSummary: 'The restoration of embodied human life at the turn of the age — not the soul\'s immortal survival but the defeat of death itself and the vindication of the righteous in a renewed creation. The bodily resurrection of Jesus is its first occurrence, establishing the pattern for all who follow.',

    historicalContext: 'Resurrection in Second Temple Judaism was not a universal belief. Pharisees affirmed it; Sadducees denied it (Mark 12:18). It was emphatically not a Greek concept — the Greek philosophical tradition generally regarded escape from the body as the goal of the soul, not its re-embodiment. Resurrection was a distinctly Jewish hope arising from the covenantal logic of Olam HaBa: if YHWH is faithful to his covenant, then those who died in faithfulness cannot remain permanently dead. The covenant requires their vindication.\n\nThe New Testament frames the resurrection of Jesus not as a resuscitation but as the inauguration of Olam HaBa — the first instance of the new creation breaking into the present age. Paul\'s argument in 1 Corinthians 15 is architecturally significant: if Christ has not been raised, the entire framework collapses. The resurrection is the hinge event of the two-age structure.',

    scripturalFoundation: [
      {
        reference: 'Daniel 12:2',
        relevance: 'The first unambiguous statement of general resurrection in the Hebrew Bible — bodily awakening from the dust of the earth to either everlasting life or everlasting contempt.'
      },
      {
        reference: '1 Corinthians 15:20–23',
        relevance: 'Paul frames Christ\'s resurrection as the "firstfruits" — the beginning of the harvest that guarantees the rest. The resurrection of the dead is a sequential, ordered event, not a simultaneous spiritual event.'
      },
      {
        reference: 'Romans 8:11',
        relevance: '"The Spirit of him who raised Jesus from the dead... will also give life to your mortal bodies" — resurrection is the Spirit\'s work applied to bodies, not merely souls.'
      },
      {
        reference: 'Ezekiel 37:1–14',
        relevance: 'The valley of dry bones — resurrection as national restoration and covenant renewal, establishing that resurrection language carried both literal and corporate dimensions in the Hebrew prophets.'
      },
      {
        reference: 'Isaiah 26:19',
        relevance: '"Your dead will live; their bodies will rise. Awake and shout for joy, you who dwell in the dust" — one of the earliest resurrection texts, embedded in the context of YHWH\'s ultimate victory over death and enemies.'
      }
    ],

    prismReflection: {
      summary: 'Resurrection is the concept that most directly challenges the Prism\'s readers to take the Hebraic framework on its own terms. It cannot be spiritualized into immortality of the soul without losing its essential claim: that death is an enemy to be defeated, not a doorway to be welcomed. The Prism reads resurrection as the decisive event in the two-age structure — the turn of the age breaking into the present.',
      fiveProperties: [
        {
          property: 'Law-Like Structure',
          explanation: 'The resurrection follows a lawful sequence — firstfruits, then the full harvest at the end. It is not random or arbitrary but follows the structural logic of the two-age covenant framework. This provides a conceptual bridge to the Prism\'s claim that covenantal faithfulness operates with the binding regularity of structural law.'
        },
        {
          property: 'Holism',
          explanation: 'Resurrection insists on the integrity of the whole person — body and spirit together, not the soul\'s escape from matter. This offers a way to consider why the Hebraic tradition resisted every spiritualizing move that separated the inner from the outer, the spiritual from the material.'
        },
        {
          property: 'Relationality',
          explanation: 'The resurrection is a relational vindication — YHWH\'s faithfulness expressed toward covenant partners who trusted him through death. Identity is preserved and restored within the relational covenant, not dissolved into an undifferentiated spiritual state.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'olam_haba',      label: 'Olam HaBa',      relationshipType: 'defines'    },
      { id: 'olam_hazeh',     label: 'Olam HaZeh',     relationshipType: 'contrasts'  },
      { id: 'sheol',          label: 'Sheol',          relationshipType: 'contrasts'  },
      { id: 'kingdom_of_god', label: 'Kingdom of God', relationshipType: 'mechanism'  },
      { id: 'covenant',       label: 'Covenant',       relationshipType: 'defines'    }
    ],

    architectureHints: [
      'bodily restoration',
      'death defeated',
      'age-turn event',
      'covenant vindication',
      'embodied hope'
    ],

    sourceHierarchy: {
      authority:   ['Daniel 12:2', '1 Corinthians 15', 'Romans 8', 'Ezekiel 37', 'Isaiah 26:19'],
      context:     ['2 Maccabees 7', '4 Maccabees', '1 Enoch 51', 'Josephus — Antiquities 18'],
      comparative: ['Reincarnation (Hindu/Buddhist)', 'Islamic resurrection (Ba\'th)', 'Zoroastrian resurrection (frashokereti)'],
      reflection:  ['N.T. Wright — The Resurrection of the Son of God', 'The Prism', 'RCT']
    },

    comparativeNotes: 'Islamic tradition affirms a bodily resurrection (ba\'th) and final judgment closely parallel in structure to the Jewish-Christian account — individual bodies restored, deeds evaluated, eternal destinations assigned. The structural similarity reflects shared Abrahamic eschatological architecture. The Hindu and Buddhist traditions present a contrast: reincarnation moves in the opposite direction — the soul continues through successive embodiments rather than awaiting a single definitive restoration. Zoroastrian frashokereti (making wonderful) is structurally closer to the Jewish-Christian resurrection: a final, universal restoration of creation in which the dead are raised and evil is permanently eliminated. Scholars debate the degree of Zoroastrian influence on Second Temple Jewish eschatology.',

    ragMetadata: {
      aliases: ['Resurrection of the Dead', 'Bodily Resurrection', 'resurrection', 'raised from the dead', 'firstfruits'],
      detectionTerms: ['resurrection', 'Resurrection', 'raised from the dead', 'bodily resurrection', 'resurrection of the dead', 'firstfruits', 'anastasis', 'resurrected'],
      tags: ['resurrection', 'eschatology', 'body', 'new creation', 'death defeated', 'vindication', 'covenant', 'age-turn']
    }
  },

  // ── 08 ─────────────────────────────────────────────────────────────────────

  sheol: {
    id: 'sheol',
    title: 'Sheol',
    subtitle: 'The Realm of the Dead',
    category: 'Hebrew Bible · Death Theology',
    primarySourceLabel: 'Hebrew Bible',

    shortSummary: 'The Hebrew realm of the dead — a shadowy underworld where the dead exist in diminished, non-embodied form, cut off from the praise of YHWH. Not hell in the Christian sense, not heaven, but the temporary condition of the dead before resurrection.',

    historicalContext: 'Sheol (שְׁאוֹל) is the Hebrew Bible\'s primary term for the realm of the dead. It is depicted as a place beneath the earth (Psalm 88:6, Isaiah 14:9), a land of darkness and silence (Psalm 94:17, Job 10:21–22), and a domain from which the dead do not return under normal circumstances. The dead in Sheol are described as rephaim — shadows or shades — who exist in a weakened, diminished state.\n\nCritically, Sheol is a pre-resurrection concept. It describes the condition of the dead before the age to come rather than the final destination of either the righteous or the wicked. The New Testament introduces further distinctions — Hades, Gehenna, paradise, Abraham\'s bosom — that develop the Sheol framework without abandoning its basic structure. Understanding Sheol correctly prevents the anachronistic reading of Old Testament death texts through New Testament afterlife categories.',

    scripturalFoundation: [
      {
        reference: 'Psalm 88:3–6',
        relevance: 'One of the most vivid Sheol texts — the psalmist describes the dead as cut off from YHWH\'s hand, dwelling in darkness, counted among those who go down to the pit. Sheol is not punishment but absence.'
      },
      {
        reference: 'Isaiah 14:9–11',
        relevance: 'The king of Babylon descends to Sheol and is greeted by the shades of former kings — Sheol is populated, conscious to a degree, and aware of earthly events, but without vitality or power.'
      },
      {
        reference: 'Job 10:21–22',
        relevance: '"Before I go — and I shall not return — to the land of darkness and deep shadow... the land of gloom like thick darkness" — Sheol as a place of irreversibility and diminishment.'
      },
      {
        reference: 'Psalm 16:10',
        relevance: '"You will not abandon my soul to Sheol, nor let your holy one see corruption" — cited in Acts 2:27 as a resurrection prophecy, showing that Sheol could be defeated by YHWH\'s faithfulness.'
      }
    ],

    prismReflection: {
      summary: 'Sheol is important for the Prism primarily as a conceptual boundary: it marks where the Hebrew Bible\'s death theology ends before resurrection arrives. Understanding Sheol prevents the flattening of the Old Testament\'s eschatology into New Testament categories and preserves the genuine historical development of Israel\'s hope.',
      fiveProperties: [
        {
          property: 'Context-Sensitivity',
          explanation: 'The meaning of death in the Hebrew Bible changes depending on whether the reader locates the text before or after the full development of resurrection hope. Sheol texts read through Olam HaBa categories look different than they do on their own terms. The Prism uses this as a way to consider why the interpretive position of the reader is a structural condition that shapes what can be seen.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'Sheol operates by a kind of law-like necessity within Olam HaZeh: all the dead go there, regardless of covenant status, which is why the psalmists sometimes experience Sheol as a threat to covenant faithfulness. YHWH\'s power to deliver from Sheol is a demonstration of divine sovereignty over the present age\'s most basic structure.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'resurrection',   label: 'Resurrection',   relationshipType: 'contrasts'  },
      { id: 'olam_haba',      label: 'Olam HaBa',      relationshipType: 'contrasts'  },
      { id: 'olam_hazeh',     label: 'Olam HaZeh',     relationshipType: 'instance'   },
      { id: 'divine_council', label: 'Divine Council', relationshipType: 'correlates' }
    ],

    architectureHints: [
      'death and afterlife',
      'pre-resurrection state',
      'diminishment',
      'boundary condition',
      'underworld'
    ],

    sourceHierarchy: {
      authority:   ['Psalm 88', 'Isaiah 14', 'Job 10', 'Psalm 16', 'Ecclesiastes 9:10'],
      context:     ['1 Enoch 22 (divisions within Sheol)', 'Josephus — Jewish War 2.8', 'Philo'],
      comparative: ['Hades (Greek)', 'Duat (Egyptian)', 'Jahannam (Islamic)', 'Yomi (Japanese Shinto)'],
      reflection:  ['The Prism', 'Philip Johnston — Shades of Sheol', 'RCT']
    },

    comparativeNotes: 'Sheol shares structural features with several ancient underworld concepts: the Greek Hades (a shadowy realm of the dead beneath the earth), the Mesopotamian "Land of No Return," and the Egyptian Duat. The common feature is a realm of diminished existence that receives all the dead. The critical distinction from Greek philosophy is that Sheol does not assume the soul\'s immortality — it assumes the body\'s death. The Hebrew framework requires resurrection because Sheol is a genuine ending of life, not a continuation of it in different form. Islamic Jahannam is more narrowly defined as a punishment domain, not a general holding place for all the dead.',

    ragMetadata: {
      aliases: ['Hades', 'Underworld', 'Realm of the Dead', 'sheol', 'the pit', 'place of the dead'],
      detectionTerms: ['Sheol', 'sheol', 'realm of the dead', 'land of the dead', 'the pit', 'Hades', 'shades of the dead', 'rephaim'],
      tags: ['sheol', 'death', 'underworld', 'afterlife', 'pre-resurrection', 'realm of dead', 'Hebrew Bible', 'Hades']
    }
  },

  // ── 09 ─────────────────────────────────────────────────────────────────────

  kingdom_of_god: {
    id: 'kingdom_of_god',
    title: 'Kingdom of God',
    subtitle: 'The Reign of YHWH Breaking into History',
    category: 'New Testament Theology · Hebraic Eschatology',
    primarySourceLabel: 'Gospels · Hebrew Prophets',

    shortSummary: 'The active, present reign of YHWH — not a place but a dynamic assertion of divine sovereignty that is already breaking into the present age through Jesus while still awaiting its full consummation. The organizing center of Jesus\'s teaching.',

    historicalContext: 'The Kingdom of God (malkuth shamayim in Aramaic — "the kingdom of the heavens") was not a new concept when Jesus announced it. It drew on the prophetic tradition of YHWH\'s coming universal sovereignty (Isaiah 52:7, Daniel 2:44, Zechariah 14) and the Psalms\' proclamation that YHWH reigns (Psalms 93, 95–99). Within Second Temple Judaism, the Kingdom of God was the expected resolution of the present age — the moment when divine sovereignty, currently contested by the nations and their divine administrators, would be fully established.\n\nJesus\'s announcement was not that the Kingdom would come but that it was already arriving — in his healings, exorcisms, and the gathering of a renewed Israel around himself. The tension between "the Kingdom has come near" and "your Kingdom come" is not a contradiction but the two-age structure in miniature: the Kingdom inaugurated but not yet consummated, Olam HaBa breaking into Olam HaZeh.',

    scripturalFoundation: [
      {
        reference: 'Mark 1:14–15',
        relevance: '"The time is fulfilled, and the kingdom of God is at hand" — Jesus\'s inaugural announcement using the language of eschatological arrival, not merely future expectation.'
      },
      {
        reference: 'Daniel 2:44',
        relevance: 'The God of heaven will set up a kingdom that will never be destroyed — the prophetic anchor for Jesus\'s Kingdom announcement in the context of the succession of human empires.'
      },
      {
        reference: 'Matthew 6:10',
        relevance: '"Your kingdom come, your will be done, on earth as it is in heaven" — the Kingdom\'s arrival is the alignment of earthly conditions with heavenly reality, confirming the heaven-earth integration framework.'
      },
      {
        reference: 'Luke 17:20–21',
        relevance: '"The kingdom of God is not coming with signs to be observed... the kingdom of God is in your midst" — the Kingdom is a present reality, not only a future hope.'
      },
      {
        reference: 'Revelation 11:15',
        relevance: '"The kingdom of the world has become the kingdom of our Lord and of his Christ, and he shall reign forever and ever" — the consummation of the Kingdom as the final displacement of all competing governance.'
      }
    ],

    prismReflection: {
      summary: 'The Kingdom of God is perhaps the concept that most directly connects the Prism\'s reading of Scripture to the Divine Council worldview. The Kingdom is not a spiritual interior state but the replacement of corrupt divine and human governance with YHWH\'s direct, uncontested reign. Every other concept in the framework takes its orientation from this center.',
      fiveProperties: [
        {
          property: 'Context-Sensitivity',
          explanation: 'The Kingdom of God means something different depending on the hearer\'s covenantal position. For Second Temple Jews expecting military liberation, for Pharisees expecting Torah-obedience, for Gentiles outside the covenant — the announcement lands differently. The Prism uses this to suggest that the Kingdom is an inherently relational announcement whose meaning is determined by the relational context into which it is spoken.'
        },
        {
          property: 'Holism',
          explanation: 'The Kingdom is not the salvation of souls extracted from a doomed creation but the renewal of creation itself. The prayer "on earth as it is in heaven" is the Kingdom\'s definition: earthly reality brought into alignment with heavenly reality. This offers a conceptual bridge to the Prism\'s insistence that salvation is a whole-creation concept, not a piece-rescue concept.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'The Kingdom arrives through a lawful sequence: prophetic announcement, inaugural presence in Jesus, death and resurrection, Spirit-empowered witness, consummation. It does not break in arbitrarily but follows the structural logic of the covenantal narrative.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'olam_haba',      label: 'Olam HaBa',      relationshipType: 'correlates' },
      { id: 'olam_hazeh',     label: 'Olam HaZeh',     relationshipType: 'contrasts'  },
      { id: 'divine_council', label: 'Divine Council', relationshipType: 'telos'      },
      { id: 'covenant',       label: 'Covenant',       relationshipType: 'grounds'    },
      { id: 'resurrection',   label: 'Resurrection',   relationshipType: 'mechanism'  }
    ],

    architectureHints: [
      'divine governance',
      'sovereignty',
      'heaven-earth integration',
      'already-not-yet',
      'restoration'
    ],

    sourceHierarchy: {
      authority:   ['Mark 1:14–15', 'Daniel 2:44', 'Matthew 6:10', 'Luke 17:20–21', 'Revelation 11:15', 'Isaiah 52:7'],
      context:     ['Psalms of Solomon 17', '1 Enoch', 'Qumran — Community Rule', 'Josephus'],
      comparative: ['Islamic Ummah and divine sovereignty', 'Buddhist Pure Land', 'Tao (Taoism)'],
      reflection:  ['N.T. Wright — Jesus and the Victory of God', 'The Prism', 'RCT']
    },

    comparativeNotes: 'The Tao in Chinese thought shares the Kingdom\'s structural role as the ultimate ordering principle of reality — what things conform to when they are as they should be. The distinction is that the Kingdom of God is a historical event with a specific narrative trajectory (announcement, inauguration, consummation), while the Tao is a timeless structural reality that does not arrive but must be aligned with. The Buddhist concept of the Pure Land shares the Kingdom\'s spatial imagination of a renewed domain where suffering is absent, but lacks the Hebrew Bible\'s emphasis on the defeat of an active enemy and the vindication of historical justice.',

    ragMetadata: {
      aliases: ['Kingdom of Heaven', 'Kingdom of YHWH', 'God\'s Kingdom', 'the Kingdom', 'kingdom of god', 'kingdom of heaven'],
      detectionTerms: ['Kingdom of God', 'kingdom of god', 'Kingdom of Heaven', 'kingdom of heaven', 'God\'s kingdom', 'malkuth', 'reign of God', 'divine reign', 'the Kingdom'],
      tags: ['kingdom', 'sovereignty', 'divine reign', 'eschatology', 'heaven-earth', 'governance', 'already-not-yet', 'Jesus']
    }
  },

  // ── 10 ─────────────────────────────────────────────────────────────────────

  covenant: {
    id: 'covenant',
    title: 'Covenant',
    subtitle: 'The Binding Structure of Divine-Human Relationship',
    category: 'Hebrew Bible · Theology',
    primarySourceLabel: 'Hebrew Bible · Ancient Near East',

    shortSummary: 'The formal, binding relational structure through which YHWH commits to and governs his relationship with creation and humanity — not a contract between equals but a sovereignly imposed relationship that both defines identity and creates obligation.',

    historicalContext: 'Covenant (berith, בְּרִית) is the organizing relational structure of the Hebrew Bible. YHWH\'s relationship with creation, Noah, Abraham, Israel, and David is each constituted by covenant — a formal binding relationship with terms, obligations, signs, and consequences. Ancient Near Eastern parallels, particularly the Hittite suzerainty treaties, illuminate the form: a great king imposes covenant terms on a vassal people, providing protection in exchange for exclusive loyalty.\n\nThe significance of covenant for the Prism is ontological: it means that the divine-human relationship is not incidental or contractual but constitutive. Israel is Israel because of the covenant, not the other way around. This is why covenant violations are described in such catastrophic terms — they are not mere infractions but threats to the relational reality that makes the people who they are.',

    scripturalFoundation: [
      {
        reference: 'Genesis 15:1–21',
        relevance: 'YHWH ratifies the Abrahamic covenant by passing between the divided animals alone — an act that signals YHWH takes the full covenant obligation on himself, not merely half of it.'
      },
      {
        reference: 'Exodus 24:3–8',
        relevance: 'The Mosaic covenant ratified with blood — "the blood of the covenant which YHWH has made with you" — establishing the covenant as a life-and-death relational bond, not merely a legal agreement.'
      },
      {
        reference: 'Jeremiah 31:31–34',
        relevance: 'The promise of a new covenant written on the heart rather than stone — not the abolition of covenant but its internalization and eschatological completion.'
      },
      {
        reference: 'Hebrews 9:15',
        relevance: 'Christ as the mediator of a new covenant — the covenant structure is preserved and fulfilled, not replaced. The blood of the new covenant is continuous with the covenant logic of the entire biblical narrative.'
      },
      {
        reference: 'Deuteronomy 7:6–9',
        relevance: 'YHWH\'s love and faithfulness to the covenant as the ground of Israel\'s election — the covenant is not earned but sovereignly initiated and maintained by divine hesed (loving faithfulness).'
      }
    ],

    prismReflection: {
      summary: 'Covenant is the most foundational structural concept in the Prism\'s engagement with Scripture. It establishes that the divine-human relationship is relational in the deepest sense: constitutive, binding, and identity-forming. Every other concept in the framework — Kingdom, Resurrection, Olam HaBa, Emet — operates within or assumes the covenant structure.',
      fiveProperties: [
        {
          property: 'Relationality',
          explanation: 'Covenant is the definition of constitutive relation in the Hebrew Bible. The parties are not independent entities who enter a contract; they are defined by the covenant relationship. Israel is Israel in relation to YHWH through the covenant — identity is covenantally constituted. This provides the Prism\'s strongest conceptual bridge to the claim that the Hebrew Bible operates with a relational, not substance, ontology.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'The covenant operates with the binding regularity of structural law — blessings and curses, faithfulness and judgment, follow a structured logic that YHWH does not override arbitrarily. The prophets appeal to this structure: Israel can trust that the covenant consequences they experience are what the covenant structure requires, not random divine anger.'
        },
        {
          property: 'Context-Sensitivity',
          explanation: 'The meaning of any particular covenant obligation or promise changes depending on which covenant epoch the reader is within — Abrahamic, Mosaic, Davidic, New. The Prism uses this to suggest that covenant is inherently a temporal, context-sensitive structure whose terms must be read from within the specific epoch that gives them meaning.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'emet',           label: 'Emet',           relationshipType: 'grounds'   },
      { id: 'kingdom_of_god', label: 'Kingdom of God', relationshipType: 'telos'     },
      { id: 'resurrection',   label: 'Resurrection',   relationshipType: 'telos'     },
      { id: 'olam_hazeh',     label: 'Olam HaZeh',     relationshipType: 'context'   },
      { id: 'divine_council', label: 'Divine Council', relationshipType: 'context'   }
    ],

    architectureHints: [
      'relational structure',
      'binding obligation',
      'identity constitution',
      'divine faithfulness',
      'foundation concept'
    ],

    sourceHierarchy: {
      authority:   ['Genesis 15', 'Exodus 24', 'Deuteronomy 7', 'Jeremiah 31', 'Hebrews 9'],
      context:     ['Hittite Suzerainty Treaties', 'Josephus', 'Dead Sea Scrolls — Damascus Document', 'Philo'],
      comparative: ['Islamic concept of \'ahd (covenant/pledge)', 'Buddhist precepts as relational commitments'],
      reflection:  ['The Prism', 'N.T. Wright — Pauline Perspectives', 'RCT', 'Meredith Kline — Treaty of the Great King']
    },

    comparativeNotes: 'The Islamic concept of \'ahd (covenant/pledge) captures a similar structure: formal binding commitment between God and humanity, with obligations on both sides. The Quranic emphasis on the pre-eternal covenant (mithaq) in which all souls acknowledge Allah\'s lordship has structural resonance with the Hebraic concept of YHWH initiating covenant relationship with creation. The primary distinction is that the biblical covenant is historically enacted and progressively developed through specific events (Abraham, Sinai, David, the New Covenant), whereas the Quranic covenant is pre-temporal and universal.',

    ragMetadata: {
      aliases: ['Berith', 'Covenant relationship', 'New Covenant', 'Mosaic Covenant', 'Abrahamic Covenant', 'covenant', 'berith'],
      detectionTerms: ['covenant', 'Covenant', 'berith', 'new covenant', 'Mosaic covenant', 'covenant faithfulness', 'covenant people', 'hesed'],
      tags: ['covenant', 'berith', 'relational structure', 'identity', 'obligation', 'faithfulness', 'hesed', 'election', 'foundation']
    }
  },

  // ── 11 ─────────────────────────────────────────────────────────────────────

  emet: {
    id: 'emet',
    title: 'Emet',
    subtitle: 'Truth as Faithfulness and Structural Integrity',
    category: 'Hebrew Bible · Epistemology',
    primarySourceLabel: 'Hebrew Bible',

    shortSummary: 'The Hebrew concept of truth — not primarily a propositional correspondence claim ("this statement matches reality") but a relational and structural quality: faithfulness, reliability, integrity, the quality of a thing that remains what it is over time and under pressure.',

    historicalContext: 'Emet (אֱמֶת) comes from the same root as amen and emunah (faith/faithfulness). It carries the semantic weight of firmness, reliability, and structural soundness — a beam that holds, a word that keeps, a person who remains what they claim to be. In the Greek translation of the Hebrew Bible (the Septuagint), emet is often rendered as aletheia (truth) — but the two concepts are not equivalent. Greek aletheia means "unconcealedness" or propositional accuracy; Hebrew emet means faithfulness-that-holds.\n\nThe theological significance is profound: when YHWH is described as the God of emet, the claim is not primarily that YHWH states accurate propositions but that YHWH is structurally reliable — a covenant partner who remains what he has committed to being. This relocates the ground of theological confidence from epistemological certainty to relational trust.',

    scripturalFoundation: [
      {
        reference: 'Psalm 31:5',
        relevance: '"You have redeemed me, O YHWH, God of emet" — emet as the divine quality that grounds the psalmist\'s trust in extremity, not primarily propositional truth but reliable divine character.'
      },
      {
        reference: 'John 14:6',
        relevance: 'Jesus\'s claim to be "the way, the truth, and the life" — read against the Hebraic background, this is not primarily an epistemological claim but an identity claim: Jesus as emet, the one whose life is structurally faithful to what he has committed to being.'
      },
      {
        reference: 'Exodus 34:6',
        relevance: 'YHWH self-revealed as "abounding in hesed and emet" — the paired qualities of loving faithfulness and structural reliability as the defining characteristics of the divine character.'
      },
      {
        reference: 'Psalm 86:15',
        relevance: '"You, O Lord, are a God merciful and gracious, slow to anger and abounding in steadfast love and faithfulness (hesed ve-emet)" — the hesed-emet pairing as the canonical description of YHWH\'s relational character.'
      }
    ],

    prismReflection: {
      summary: 'Emet is one of the Prism\'s most important epistemological pivots. The shift from Greek propositional truth to Hebrew relational-structural truth reframes how the Prism understands knowledge, testimony, and trust. The question shifts from "Is this proposition accurate?" to "Is this a structurally reliable witness?"',
      fiveProperties: [
        {
          property: 'Relationality',
          explanation: 'Emet is intrinsically relational — it describes how a person or thing holds itself in relation to others over time. Truth as emet is not a property of propositions but a property of agents in relationship. This provides a conceptual bridge to the Prism\'s claim that the Hebrew Bible is operating with a relational rather than substance ontology at the level of its epistemology as well as its metaphysics.'
        },
        {
          property: 'Law-Like Structure',
          explanation: 'Emet has a structural dimension: a thing that is emet remains what it is under pressure. This may help modern readers imagine why the Prism treats covenantal faithfulness as a form of structural law — not arbitrary rule-following but the expression of a nature that holds its own shape across time.'
        },
        {
          property: 'Context-Sensitivity',
          explanation: 'What constitutes faithful witness (emet) varies with the relational context — emet in covenant requires different expressions than emet in legal testimony or emet in prophetic announcement. The Prism uses this to suggest that truth in the Hebrew sense is not context-independent but always expressed within a specific relational frame.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'covenant',       label: 'Covenant',       relationshipType: 'grounds'    },
      { id: 'holism',         label: 'Holism',         relationshipType: 'correlates' },
      { id: 'relationality',  label: 'Relationality',  relationshipType: 'instance'   },
      { id: 'kingdom_of_god', label: 'Kingdom of God', relationshipType: 'telos'      }
    ],

    architectureHints: [
      'relational truth',
      'faithfulness',
      'structural integrity',
      'epistemology',
      'divine character'
    ],

    sourceHierarchy: {
      authority:   ['Psalm 31:5', 'John 14:6', 'Exodus 34:6', 'Psalm 86:15', 'Proverbs 12:17'],
      context:     ['Septuagint translation history', 'Philo', 'Targums'],
      comparative: ['Dharma (Hindu/Buddhist)', 'Haqq (Islamic truth/reality)', 'Tao (Taoist alignment with reality)'],
      reflection:  ['The Prism', 'RCT', 'Abraham Heschel — God in Search of Man']
    },

    comparativeNotes: 'The Islamic concept of Haqq (truth/reality/right) carries structural resonance with emet: it describes both factual truth and what is right, just, and real — truth as alignment with how things actually are in their deepest structure. The Buddhist concept of Dharma also captures the structural dimension: truth as the way things are, the law of existence, the reliable pattern underlying appearance. The Hindu Satya (truth) emphasizes permanence and correspondence with ultimate reality. The key distinction for the Prism is that emet is always relational and historical — it is expressed by agents in relationship, not as an abstract feature of reality independent of its witnesses.',

    ragMetadata: {
      aliases: ['Truth', 'Faithfulness', 'Reliability', 'emet', 'emeth', 'divine faithfulness'],
      detectionTerms: ['emet', 'Emet', 'emeth', 'truth and faithfulness', 'hesed ve-emet', 'abounding in truth', 'God of truth', 'faithful and true'],
      tags: ['emet', 'truth', 'faithfulness', 'reliability', 'epistemology', 'covenant', 'divine character', 'Hebraic truth']
    }
  },

  // ── 12 ─────────────────────────────────────────────────────────────────────

  relationality: {
    id: 'relationality',
    title: 'Relationality',
    subtitle: 'Identity Constituted Through Relation',
    category: 'Prism Framework Property',
    primarySourceLabel: 'The Prism · Relational Quantum Mechanics',

    shortSummary: 'One of the five foundational properties of the Prism — the claim that identity, meaning, and reality are not intrinsic properties of isolated entities but emerge from and are constituted by relations. The Prism uses this property to read Scripture against Greek substance categories.',

    historicalContext: 'Greek substance ontology — from Aristotle through scholasticism — treats reality as composed of substances with intrinsic properties. Things are what they are independently of their relations; relations are accidents added to a pre-existing substance. This framework has profoundly shaped Western biblical interpretation: God is defined by divine attributes (omniscience, omnipotence) rather than by covenantal relationships; the soul is an independent substance that survives the body; sin is a violation of natural law rather than a relational rupture.\n\nRelational ontology — found in process philosophy, Relational Quantum Mechanics (Rovelli), and implicitly in the Hebrew Bible — holds that things are what they are through their relations. Identity is not prior to relation but constituted by it. The Prism uses this as a hermeneutical key: when it reads the Hebrew Bible through relational rather than substance categories, it finds a coherent framework that does not require Greek philosophical overlay.',

    scripturalFoundation: [
      {
        reference: 'Exodus 3:14',
        relevance: '"I AM WHO I AM" — YHWH\'s self-definition is relational and dynamic, not a list of attributes. The divine name is an event of self-revealing relation, not a substance description.'
      },
      {
        reference: 'John 15:1–5',
        relevance: '"I am the vine; you are the branches" — identity, vitality, and fruit-bearing are constituted by relational connection, not independent capability. Cut off from the vine, the branch is nothing.'
      },
      {
        reference: 'Genesis 2:18',
        relevance: '"It is not good for the man to be alone" — the first negative judgment in creation is the absence of appropriate relation. Human identity requires relational completion.'
      },
      {
        reference: 'Romans 8:38–39',
        relevance: 'Nothing can separate believers from the love of God — the relational bond is the ultimate ontological anchor, more stable than anything in creation.'
      }
    ],

    prismReflection: {
      summary: 'Relationality is not a conclusion the Prism imposes on Scripture but a pattern it finds there when Greek philosophical overlay is removed. The Hebrew Bible consistently describes identity, meaning, and agency as relational — constituted by relationship to YHWH, to covenant community, to creation. The Prism\'s use of Relational Quantum Mechanics as a structural analogy suggests that the relational ontology embedded in Scripture may be more structurally coherent than the substance ontology that has often been used to interpret it.',
      fiveProperties: [
        {
          property: 'Relationality',
          explanation: 'This node is itself a Prism property. As a framework concept, it challenges readers to examine whether their reading of any biblical text has imported Greek substance categories that the text itself does not use. The Prism uses Relational Quantum Mechanics (in which the state of a system is only defined relative to other systems) as a structural analogy for why a relational reading of Scripture may be more accurate to its own framework than a substance reading.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'non_locality',        label: 'Non-Locality',       relationshipType: 'grounds'    },
      { id: 'holism',              label: 'Holism',             relationshipType: 'grounds'    },
      { id: 'context_sensitivity', label: 'Context-Sensitivity', relationshipType: 'grounds'   },
      { id: 'covenant',            label: 'Covenant',           relationshipType: 'illustrates' },
      { id: 'emet',                label: 'Emet',               relationshipType: 'illustrates' }
    ],

    architectureHints: [
      'relational ontology',
      'identity through relation',
      'framework property',
      'anti-substance',
      'hermeneutical key'
    ],

    sourceHierarchy: {
      authority:   ['Exodus 3:14', 'John 15:1–5', 'Genesis 2:18', 'Romans 8:38–39'],
      context:     [],
      comparative: ['Pratītyasamutpāda — Buddhist dependent origination', 'Tao — relational ordering principle'],
      reflection:  ['Carlo Rovelli — Relational Quantum Mechanics', 'The Prism', 'RCT', 'Alfred North Whitehead — Process and Reality']
    },

    comparativeNotes: 'Buddhist pratītyasamutpāda (dependent co-arising) is perhaps the closest structural parallel in another tradition: all phenomena arise in dependence on conditions and have no intrinsic self-existence. The parallel to Prism relationality is significant — both deny that identity is a pre-relational given. The distinction is that for the Prism, relational identity is always grounded in a specific covenantal relationship to a personal God, not in the impersonal web of dependent arising.',

    ragMetadata: {
      aliases: ['Relational Ontology', 'Relationality', 'relational identity', 'relation', 'relational'],
      detectionTerms: ['relationality', 'Relationality', 'relational ontology', 'identity through relation', 'constituted by relation', 'relational reality'],
      tags: ['relationality', 'ontology', 'identity', 'framework property', 'hermeneutics', 'relational quantum mechanics', 'RQM']
    }
  },

  // ── 13 ─────────────────────────────────────────────────────────────────────

  context_sensitivity: {
    id: 'context_sensitivity',
    title: 'Context-Sensitivity',
    subtitle: 'Meaning Resolves Under Interpretive Conditions',
    category: 'Prism Framework Property',
    primarySourceLabel: 'The Prism · Quantum Mechanics',

    shortSummary: 'One of the five foundational properties of the Prism — the observation that meaning is not fixed and independent but resolves differently depending on the interpretive context, covenantal position, and relational situation of the reader.',

    historicalContext: 'In quantum mechanics, the measurement problem reveals that the state of a quantum system is not fully determined prior to measurement — what is observed depends on the measurement basis chosen, the relational context of observation. This is not relativism; it is the recognition that certain realities are indeterminate until a relational context is established in which they can resolve.\n\nThe Prism uses this as a structural analogy for hermeneutics: the meaning of Scripture is not simply "there" independent of the reader\'s covenantal position, historical location, and interpretive framework. This does not mean all readings are equally valid. It means that the conditions under which reading occurs are not external noise but structural contributors to what can be seen. The Prism\'s claim is that reading Scripture from within the Hebraic two-age framework, with the Divine Council worldview operative, and with relational rather than substance categories active, allows certain things to come into focus that Greek philosophical reading systematically obscures.',

    scripturalFoundation: [
      {
        reference: '2 Corinthians 3:14–16',
        relevance: '"When one turns to the Lord, the veil is removed" — Paul\'s account of the veil over Moses\'s face as a hermeneutical condition: context of relation to Christ determines what can be seen in the text.'
      },
      {
        reference: 'Luke 24:44–45',
        relevance: '"Then he opened their minds to understand the Scriptures" — the risen Christ is the interpretive context that makes the Scriptures coherent. Understanding is not merely cognitive but relationally enabled.'
      },
      {
        reference: 'Proverbs 9:10',
        relevance: '"The fear of YHWH is the beginning of wisdom" — wisdom (the capacity to interpret reality correctly) begins with a covenantal relational posture, not with neutral epistemological method.'
      },
      {
        reference: '1 Corinthians 2:14',
        relevance: '"The natural person does not accept the things of the Spirit of God, for they are folly to him, and he is not able to understand them because they are spiritually discerned" — interpretive capacity is a relational condition, not merely an intellectual one.'
      }
    ],

    prismReflection: {
      summary: 'Context-Sensitivity is the Prism\'s most hermeneutically challenging property. It insists that where the reader stands — historically, covenantally, relationally — is not incidental to what they can see in a text. This is the structural basis for the Prism\'s claim that Greek philosophical overlay has systematically prevented modern Western readers from seeing what the Hebrew Bible\'s own framework makes visible.',
      fiveProperties: [
        {
          property: 'Context-Sensitivity',
          explanation: 'This node is itself a Prism property. The quantum measurement analogy — state resolves under observational context — provides a structural bridge to the hermeneutical claim: meaning resolves under interpretive conditions. This does not reduce Scripture to subjectivity; it recognizes that the conditions of reading are structural contributors to what can be seen, just as the measurement basis is a structural contributor to what quantum state is observed.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'relationality',      label: 'Relationality',    relationshipType: 'instance'   },
      { id: 'holism',             label: 'Holism',           relationshipType: 'correlates' },
      { id: 'law_like_structure', label: 'Law-Like Structure', relationshipType: 'correlates' },
      { id: 'olam_hazeh',         label: 'Olam HaZeh',       relationshipType: 'illustrates' },
      { id: 'emet',               label: 'Emet',             relationshipType: 'correlates' }
    ],

    architectureHints: [
      'hermeneutics',
      'interpretive position',
      'framework property',
      'covenantal reading',
      'meaning-resolution'
    ],

    sourceHierarchy: {
      authority:   ['2 Corinthians 3:14–16', 'Luke 24:44–45', 'Proverbs 9:10', '1 Corinthians 2:14'],
      context:     [],
      comparative: [],
      reflection:  ['Quantum measurement problem', 'The Prism', 'RCT', 'Hans-Georg Gadamer — Truth and Method']
    },

    comparativeNotes: '',

    ragMetadata: {
      aliases: ['Context Sensitivity', 'interpretive context', 'context-dependent meaning', 'hermeneutical context'],
      detectionTerms: ['context-sensitivity', 'Context-Sensitivity', 'context sensitivity', 'interpretive context', 'meaning resolves', 'covenantal reading'],
      tags: ['context-sensitivity', 'hermeneutics', 'interpretation', 'framework property', 'measurement', 'covenantal reading']
    }
  },

  // ── 14 ─────────────────────────────────────────────────────────────────────

  holism: {
    id: 'holism',
    title: 'Holism',
    subtitle: 'The Whole Cannot Be Reduced to Its Parts',
    category: 'Prism Framework Property',
    primarySourceLabel: 'The Prism · Systems Theory',

    shortSummary: 'One of the five foundational properties of the Prism — the observation that certain realities cannot be correctly understood by analyzing their isolated components. The whole determines the meaning of the parts, and parts understood in isolation from the whole yield systematic distortion.',

    historicalContext: 'Holism as a formal principle emerged in 20th century systems theory, quantum mechanics, and philosophy of biology — though its intuition is ancient. In quantum mechanics, entangled systems genuinely cannot be described by independent state vectors for each particle; only the whole system has a definite state. In ecology, organisms cannot be understood apart from their ecosystems. In biblical interpretation, the holistic principle suggests that texts cannot be correctly understood in isolation from the canonical whole, the historical context, and the framework within which they were written.\n\nThe Prism\'s holism is specifically hermeneutical: the Hebrew Bible\'s worldview — Divine Council, two-age structure, covenant, shamayim — forms an integrated conceptual whole. When parts of this whole (such as Psalm 82 or Genesis 6) are read in isolation from the larger framework, they appear anomalous or embarrassing. Read within the whole, they are structurally central.',

    scripturalFoundation: [
      {
        reference: 'Colossians 1:15–20',
        relevance: '"In him all things hold together" — the cosmic Christ as the integrating principle of reality, the one in whom the whole is held in coherent relation.'
      },
      {
        reference: 'Romans 11:33–36',
        relevance: 'Paul\'s doxology over the unsearchable whole of divine wisdom and knowledge — the whole of the divine plan exceeds the capacity of any part to comprehend from within it.'
      },
      {
        reference: 'Isaiah 46:9–10',
        relevance: '"I am God, and there is no other... declaring the end from the beginning" — divine knowledge of the whole that encompasses and gives meaning to every part.'
      },
      {
        reference: 'Ephesians 1:9–10',
        relevance: 'The "mystery of his will" as the summing up of all things in Christ — the telos of history as the integration of the whole, not the survival of selected parts.'
      }
    ],

    prismReflection: {
      summary: 'Holism is the Prism\'s structural defense against proof-texting. Isolated verses read without their literary, canonical, historical, and conceptual context do not yield the meaning they carry within the whole. The Prism uses holism not as a license to ignore detail but as a demand that detail be read within its integrating context.',
      fiveProperties: [
        {
          property: 'Holism',
          explanation: 'This node is itself a Prism property. As a framework concept, it insists that the Prism\'s own five properties must be read as an integrated system, not as independent analytical tools applied mechanically. The properties illuminate each other — Non-Locality implies Holism, Holism grounds Relationality, Relationality enables Context-Sensitivity. Applying one in isolation from the others produces distortion.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'non_locality',       label: 'Non-Locality',   relationshipType: 'instance'    },
      { id: 'relationality',      label: 'Relationality',  relationshipType: 'instance'    },
      { id: 'law_like_structure', label: 'Law-Like Structure', relationshipType: 'correlates' },
      { id: 'covenant',           label: 'Covenant',       relationshipType: 'illustrates' },
      { id: 'shamayim',           label: 'Shamayim',       relationshipType: 'illustrates' }
    ],

    architectureHints: [
      'whole-part relation',
      'integration',
      'framework property',
      'anti-reductionism',
      'canonical reading'
    ],

    sourceHierarchy: {
      authority:   ['Colossians 1:15–20', 'Romans 11:33–36', 'Isaiah 46:9–10', 'Ephesians 1:9–10'],
      context:     [],
      comparative: ['Indra\'s Net (Buddhist)', 'Pratītyasamutpāda', 'Tao as whole'],
      reflection:  ['Systems theory', 'Quantum holism', 'The Prism', 'RCT']
    },

    comparativeNotes: 'The Buddhist image of Indra\'s Net — a vast net in which every node contains a jewel reflecting all other jewels — is perhaps the most vivid structural parallel to the Prism\'s holism: each part reflects the whole, and the whole is only visible in and through its parts. The Prism uses holism within a specifically biblical narrative structure — the whole toward which the parts move is not a timeless totality but a historical telos.',

    ragMetadata: {
      aliases: ['Holism', 'Wholeness', 'Whole-Part', 'holistic', 'integration', 'holism'],
      detectionTerms: ['holism', 'Holism', 'wholeness', 'integrated whole', 'cannot be reduced', 'whole and parts', 'systemic'],
      tags: ['holism', 'systems', 'integration', 'framework property', 'anti-reductionism', 'canonical', 'whole']
    }
  },

  // ── 15 ─────────────────────────────────────────────────────────────────────

  law_like_structure: {
    id: 'law_like_structure',
    title: 'Law-Like Structure',
    subtitle: 'The Binding Regularity of Relational Order',
    category: 'Prism Framework Property',
    primarySourceLabel: 'The Prism · Philosophy of Science',

    shortSummary: 'One of the five foundational properties of the Prism — the observation that reality operates according to binding structural regularities that are not arbitrary but reflect the coherent, consistent character of the One who governs it. In the Prism, this applies equally to physical law and covenantal law.',

    historicalContext: 'The concept of law-like structure comes from philosophy of science, where it describes the regularities governing physical systems — not the occasional or probable but the binding and consistent. David Hume identified the problem: we observe regularity but cannot deduce necessity from observation alone. The Prism\'s use of law-like structure is not a naive claim that covenant operates with the mechanical necessity of physical law but that it operates with analogous binding consistency.\n\nIn the Hebrew Bible, the parallel concept is the faithfulness of YHWH\'s character expressed through creation order (the regularities of seed-time and harvest, the fixed courses of the stars, the binding force of covenant). The prophets assume that YHWH\'s responses to covenant faithfulness and covenant violation follow a structured, consistent logic — not arbitrary divine caprice but the reliable expression of a character that cannot deny itself.',

    scripturalFoundation: [
      {
        reference: 'Jeremiah 33:25',
        relevance: '"If my covenant with day and night fails, if I have not established the fixed patterns of heaven and earth..." — YHWH\'s covenantal faithfulness is as structurally reliable as the regularities of nature itself.'
      },
      {
        reference: 'Psalm 19:1–4',
        relevance: '"The heavens declare the glory of God... Day after day they pour out speech" — creation\'s regular structure as a mode of divine self-revelation; law-like regularity as expressive, not merely mechanical.'
      },
      {
        reference: 'Galatians 6:7',
        relevance: '"God is not mocked; a man reaps what he sows" — the seed-harvest metaphor applied to moral/covenantal reality, asserting that the same structural consistency governs both physical and covenantal domains.'
      },
      {
        reference: 'Lamentations 3:22–23',
        relevance: '"His mercies never come to an end; they are new every morning: great is your faithfulness" — YHWH\'s hesed as structurally reliable, not contingent or variable.'
      }
    ],

    prismReflection: {
      summary: 'Law-Like Structure is the Prism\'s resistance to the idea that divine action is arbitrary or that covenant consequences are unpredictable. The consistent character of YHWH — expressed in both natural regularities and covenantal faithfulness — is the ground of the Prism\'s claim that reality is interpretable. If YHWH were unpredictable, neither creation nor Scripture would be legible.',
      fiveProperties: [
        {
          property: 'Law-Like Structure',
          explanation: 'This node is itself a Prism property. As a framework concept, it establishes that the Prism\'s reading of Scripture is not arbitrary — it assumes that the patterns discerned in the text (covenantal logic, two-age structure, governance through the divine council) are structurally real regularities, not interpretive impositions. The property provides the conceptual bridge to the claim that rigorous engagement with Scripture can yield knowledge, not merely preference.'
        }
      ]
    },

    relatedConcepts: [
      { id: 'relationality',       label: 'Relationality',    relationshipType: 'instance'    },
      { id: 'context_sensitivity', label: 'Context-Sensitivity', relationshipType: 'correlates' },
      { id: 'holism',              label: 'Holism',           relationshipType: 'correlates'  },
      { id: 'covenant',            label: 'Covenant',         relationshipType: 'illustrates' },
      { id: 'emet',                label: 'Emet',             relationshipType: 'grounds'     }
    ],

    architectureHints: [
      'structural regularity',
      'covenantal logic',
      'framework property',
      'divine faithfulness',
      'interpretability of reality'
    ],

    sourceHierarchy: {
      authority:   ['Jeremiah 33:25', 'Psalm 19:1–4', 'Galatians 6:7', 'Lamentations 3:22–23'],
      context:     [],
      comparative: ['Dharma — Buddhist/Hindu structural law', 'Logos — Greek rational order', 'Tao — structural way of things'],
      reflection:  ['Philosophy of science — nomological necessity', 'The Prism', 'RCT', 'Einstein on the comprehensibility of the universe']
    },

    comparativeNotes: 'The Hindu-Buddhist concept of Dharma is perhaps the closest structural parallel — both describe a binding law-like ordering of reality that is not arbitrary but expressive of the deepest structure of things. The Greek Logos carries similar weight: the rational principle through which all things are ordered and made intelligible. The Prism\'s distinction is that Law-Like Structure is grounded in the consistent character of a personal covenant God, not in an impersonal rational principle or a natural law independent of its source.',

    ragMetadata: {
      aliases: ['Law-Like Structure', 'Structural Regularity', 'Nomic Necessity', 'law-like', 'covenantal regularity'],
      detectionTerms: ['law-like structure', 'Law-Like Structure', 'structural regularity', 'covenantal logic', 'binding structure', 'divine faithfulness', 'regularity of creation'],
      tags: ['law-like structure', 'regularity', 'covenant', 'faithfulness', 'framework property', 'creation order', 'nomological']
    }
  }

}; // end conceptNodes
