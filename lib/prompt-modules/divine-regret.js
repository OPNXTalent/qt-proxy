// Contextual support for divine regret, relenting, and foreknowledge.
export const PRISM_DIVINE_REGRET = `
DIVINE REGRET AND RELATIONAL FAITHFULNESS
Use only the distinctions relevant to the present inquiry. Scripture governs; this is contextual support, not a mandatory answer or a six-step format.

FOREKNOWN GRIEF: Knowing an event beforehand need not make grief at its occurrence unreal. Preserve God's complete knowledge alongside genuine relational engagement and creaturely responsibility. This is a coherent interpretive distinction, not a demonstration that every philosophical problem about foreknowledge and freedom is resolved. Do not equate knowledge with causal determination or reduce prayer and response to staged appearances.

READ THE WHOLE SCENE: In 1 Samuel 15:11 and 35 God regrets making Saul king; in 15:28-29 Samuel declares Saul's removal and says God will not lie or relent. Read the refusal to relent in relation to that verdict rather than erasing the grief surrounding it. The same chapter deliberately presents both. Genesis 6:6 also presents divine grief; do not rewrite it as surprise, ignorance, or an unreal emotion.

LEXICAL PRECISION: Nacham (נחם) occurs in 1 Samuel 15:11, 29, 35. Context and grammatical form determine whether grief, regret, relenting, or comfort is appropriate. A root's semantic range does not put every sense into every occurrence, and etymology cannot establish a doctrine. Isaiah 40:1 uses the root in a comfort context; it is not Isaiah 41. The chapter-closing regret over Saul is 1 Samuel 15:35, not verse 39. Samuel's response in 15:11 is rendered anger or distress across translations; do not insist it excludes anger or claim exhaustive access to Saul's motives.

CONDITIONALITY AND OATH: Jeremiah 18:7-10 explicitly describes responses to a nation's changed conduct. Jonah 3:10 and Exodus 32:9-14 supply narrative cases of relenting and intercession. Consistent character can yield different actions as relationships and conduct change. Distinguish these scenes from the explicit oath of Psalm 110:4 and the settled verdict in 1 Samuel 15:28-29. Determine conditions from the actual passage; never declare every warning conditional or every promise unconditional.

COVENANTAL CONTINUITY: Malachi 3:6 concerns God's constancy in covenant context. Romans 11:28-29 concerns Israel and God's calling; it is not a blanket guarantee that every individual promise is unconditional. Hebrews 6:13-20 discusses God's oath to Abraham. Preserve the scope of each passage, real consequences, and genuine appeals to repentance. Present canonical connections as interpretation supported by the texts, allowing the user to test them.
`;

export function shouldLoadDivineRegret(query) {
  if (typeof query !== 'string' || !query.trim()) return false;
  return [
    /\b(?:1|i|first)\s*sam(?:uel)?\.?\s*15\b/i,
    /\b(?:nacham|naḥam|nicham)\b/i,
    /\b(?:god|lord|yhwh|yahweh)\b[^.!?\n]{0,100}\b(?:regret\w*|repent\w*|relent\w*|griev\w*|chang\w*\s+(?:his|their|the)\s+mind)\b/i,
    /\b(?:regret\w*|repent\w*|relent\w*|griev\w*)\b[^.!?\n]{0,100}\b(?:god|lord|yhwh|yahweh|divine)\b/i,
    /\bdivine\s+(?:regret|grief|relenting|repentance)\b/i,
    /\bforeknow\w*\b[^.!?\n]{0,100}\b(?:grief|regret|prayer|relent\w*)\b/i,
  ].some(pattern => pattern.test(query));
}
