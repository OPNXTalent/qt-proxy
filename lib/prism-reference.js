// Owner-curated reference notes, not a canned response or authoritative corpus.
// Local retrieval adds no model call and never writes user queries to storage.
const source = (title, url, kind) => ({ title, url, kind });

export const PRISM_REFERENCE_ENTRIES = [
  {
    id: 'common-ancestry', topic: 'Genetics and common ancestry', reviewed: '2026-10-13',
    triggers: [/\b(common (?:ancestry|descent)|endogenous retrovirus(?:es)?|retroviral insertions?|human.{0,30}chimp|chimp.{0,30}human)\b/i],
    evidence: 'Corresponding endogenous retroviral insertion sites and sequence relationships provide evidence of inherited ancestry. This is a more specific argument than superficial resemblance.',
    limits: 'Assess the pattern and competing mechanisms, not similarity alone. Common ancestry does not itself establish the absence of a Creator, ultimate purpose, or a complete origin-of-life explanation. Shared design is not an equally predictive alternative unless it explains the specific distribution.',
    sources: [source('Johnson and Coffin (1999), Constructing primate phylogenies from ancient retrovirus sequences', 'https://pubmed.ncbi.nlm.nih.gov/10468595/', 'primary research')],
  },
  {
    id: 'ancient-floods', topic: 'Ancient floods and narrative traditions', reviewed: '2026-10-13',
    triggers: [/\b(global flood|worldwide flood|noah(?:\x27s)? flood|flood (?:geology|accounts|traditions)|mesopotamian floods?|shuruppak|gilgamesh|ark)\b/i],
    evidence: 'Excavations at Ur, Kish, and Shuruppak uncovered substantial ancient flood deposits. These warrant consideration as evidence of real disasters potentially underlying narratives.',
    limits: 'Deposits differ in date and do not establish one simultaneous planet-wide flood. Narrative convergence requires evaluation of chronology, independence, transmission, and separate disasters. Evidence of great regional floods and evidence of a recent global flood are different claims. Archaeological corroboration is not automatically a novel prediction.',
    sources: [source('Penn Museum, Reflections on the Mesopotamian Flood', 'https://www.penn.museum/sites/expedition/reflections-on-the-mesopotamian-flood/', 'archaeological synthesis; historical source'), source('Penn Museum, The Thrill of Discovery', 'https://www.penn.museum/sites/expedition/the-thrill-of-discovery/', 'institutional excavation account')],
  },
  {
    id: 'irreducible-complexity', topic: 'Irreducible complexity and historical pathways', reviewed: '2026-10-13',
    triggers: [/\b(irreducibl\w* complex\w*|flagell(?:um|a|ar)|intelligent design)\b/i],
    evidence: 'A present system can require multiple interacting components for its current function. Comparative research on flagellar genes supports duplication and modification in their history.',
    limits: 'Present dependence does not alone establish historical impossibility: earlier components may have served other functions. Distinguish observed homologies from inferred ancestral sequences and proposed pathways. A reconstruction need not directly observe every past event to be evidence, but it is not an experimental replay of the complete history. An incomplete account does not prove design; a plausible pathway does not settle every detail.',
    sources: [source('Liu and Ochman (2007), Stepwise formation of the bacterial flagellar system', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1852327/', 'primary comparative research')],
  },
  {
    id: 'origin-of-life', topic: 'Abiogenesis and critiques of origin-of-life research', reviewed: '2026-10-13',
    triggers: [/\b(abiogen\w*|origin(?:s)?[ -]of[ -]life|life(?:\x27s)? origin|first liv(?:ing|e)|prebiotic|james tour)\b/i],
    evidence: 'NASA acknowledges that the actual origin of life is unresolved. Relevant processes, including spontaneous lipid compartments, have been demonstrated; partial chemistry and a complete integrated historical pathway are different achievements.',
    limits: 'Evaluate early-Earth plausibility, investigator intervention, integration, replication, and what an experiment actually demonstrated. James Tour raises chemical and assembly objections: attribute them as critiques, examine specific experiments and researchers\x27 responses, and do not treat his authority as a verdict of impossibility. His own statement says his chemical tools do not prove intelligent design. Uncertainty about first life neither erases evidence about subsequent evolution nor establishes a particular creation mechanism.',
    sources: [source('NASA, How did life first emerge on Earth?', 'https://science.nasa.gov/astrobiology/learning-resources/alp/how-did-life-first-emerge-on-earth/', 'institutional research overview'), source('James Tour, Evolution/Creation (statement updated August 2019)', 'https://jmtour.com/evolution-creation/', 'critic\x27s own position; not consensus or experimental proof')],
  },
  {
    id: 'eye-evolution', topic: 'Darwin and the evolution of eyes', reviewed: '2026-10-13',
    triggers: [/\b(eye evolution|evolution of (?:the )?eyes?|darwin.{0,45}eye|eye.{0,45}darwin|photoreceptors?)\b/i],
    evidence: 'Darwin acknowledged the apparent difficulty of explaining the eye and then argued that useful inherited gradations could address it. Comparative work documents simpler visual systems and shared genetic components; functional analyses propose sequences of increasing visual capability.',
    limits: 'Read Darwin\x27s complete argument rather than extracting his statement of difficulty as a concession. Existing simpler eyes are not automatically direct ancestors. Distinguish measured anatomy and genetics, modeled feasibility, and inferred historical steps. Complexity alone does not refute evolution, and a model is not a complete historical record.',
    sources: [source('Darwin, Origin of Species, organs of extreme perfection (complete passage)', 'https://darwin-online.org.uk/Variorum/1860/1860-186-c-1859.html', 'primary historical text'), source('Nilsson (2013), Eye evolution and its functional basis', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3632888/', 'research and functional modeling')],
  },
  {
    id: 'prediction-and-dna', topic: 'Creationist predictions and noncoding DNA', reviewed: '2026-10-13',
    triggers: [/\b(junk dna|noncoding dna|non-coding dna|encode|creationist predictions?|successful predictions?)\b/i],
    evidence: 'Linda Walkup\x27s 2000 creationist article anticipated useful roles for apparently useless DNA while already citing discoveries of functions. ENCODE subsequently mapped extensive activity and regulatory elements in noncoding DNA.',
    limits: 'Distinguish a prospectively specified prediction, an expectation partly based on existing findings, and retrospective accommodation. Noncoding is not synonymous with nonfunctional, and biochemical activity is not automatically organism-level function. A prediction can succeed without being unique; differential support over alternatives requires discrimination. These findings do not establish that all DNA is useful or that evolution requires all noncoding DNA to be useless. Do not assert successful predictions without a concrete example and a qualified account of its timing and scope.',
    sources: [source('Walkup (2000), Junk DNA: evolutionary discards or God\x27s tools?', 'https://old.creation.com/index.php?id=1631&option=com_content&view=article', 'creationist proposal; primary evidence of the author\x27s expectation'), source('NHGRI, ENCODE: Deciphering Function in the Human Genome', 'https://www.genome.gov/27551473/genome-advance-of-the-month-encode-deciphering-function-in-the-human-genome', 'institutional research overview'), source('Kellis et al. (2014), Defining functional DNA elements in the human genome', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4035993/', 'ENCODE researchers\x27 methodological analysis')],
  },
  {
    id: 'psr-and-uncertainty', topic: 'Sufficient reason, ultimate explanation, and symmetric uncertainty', reviewed: '2026-10-13',
    triggers: [/\b(psr|sufficient reason|supported reason|god[ -]of[ -]the[ -]gaps|idk[ -]of[ -]the[ -]gaps|why (?:does )?(?:anything|something) exist|why is there something|ultimate explanation|contingency argument)\b/i],
    evidence: 'The Principle of Sufficient Reason asks for a sufficient explanation or ground; its scope is philosophically disputed. Leibniz\x27s Monadology sections 31-32 formulate a reasoning principle, not merely an appeal to missing laboratory knowledge. Explaining mechanisms within a reality does not automatically explain why that reality and its laws exist.',
    limits: 'Evaluate contingency arguments on their premises, including the justification of PSR and the inference to a necessary ground and its attributes. Compare necessity, brute facts, and proposed regress rather than declaring the debate settled. Rejecting a God-of-the-gaps inference does not establish God\x27s absence. IDK of the gaps here means using uncertainty asymmetrically as a conclusive dismissal, not criticizing honest suspension of judgment. Neither we do not know therefore God did it nor we do not know therefore God was absent follows without further argument. Future natural explanations are not guaranteed by present ignorance; scientific method and metaphysical naturalism are distinct.',
    sources: [source('Leibniz, Monadology sections 31-32, reproduced and discussed in the Stanford Encyclopedia of Philosophy PSR entry', 'https://plato.stanford.edu/archives/spr2022/entries/sufficient-reason/index.html', 'primary philosophical formulation reproduced in scholarly reference')],
  },
];

const broadDebate = /\b(creationis\w*|young[ -]earth|evolution.{0,30}creation|creation.{0,30}evolution)\b/i;

export function selectPrismReferences(query, { maxEntries = 4 } = {}) {
  const text = typeof query === 'string' ? query.slice(0, 24000) : '';
  if (!text.trim()) return [];
  const explicit = PRISM_REFERENCE_ENTRIES.filter(entry => entry.triggers.some(re => re.test(text)));
  // A broad origins comparison gets orientation, not the entire collection.
  const fallback = broadDebate.test(text)
    ? PRISM_REFERENCE_ENTRIES.filter(entry => ['common-ancestry', 'prediction-and-dna'].includes(entry.id))
    : [];
  return [...new Set([...explicit, ...fallback])].slice(0, Math.max(0, Math.min(4, maxEntries)));
}

export function getPrismReferenceContext(query) {
  const entries = selectPrismReferences(query);
  if (!entries.length) return '';
  return `\n\nCURATED REFERENCE NOTES — OPTIONAL, TOPIC-SELECTED RESOURCE\nThese are paraphrased reference notes and source pointers, not a preset answer, verbatim source passages, or governing authority. Use only what directly bears on the current question; do not print this collection, its headings, or a standard verdict. Distinguish observations, historical inferences, models, critiques, and metaphysical claims. Apply equal scrutiny without forcing equal evidential support. Critique propositions rather than intelligence or identity; one poster does not speak for all science. Keep conclusions within their premises. Do not substitute this layer for Scripture or the governing framework. Cite relevant sources accurately when using these notes, preserve qualifications, and do not imply live source verification. Check newer sources when recency matters and retrieval is available; otherwise acknowledge the review date where material.\n\n${entries.map(entry => `[${entry.topic}; reviewed ${entry.reviewed}]\nEvidence/argument: ${entry.evidence}\nLimits and alternative interpretations: ${entry.limits}\nSources:\n${entry.sources.map(item => `- ${item.title} (${item.kind}): ${item.url}`).join('\n')}`).join('\n\n')}\nEND CURATED REFERENCE NOTES\n`;
}
