// lib/prompt-modules/prism-covenantal-restoration.js
// Conditional module. Budget: approximately 600 prompt tokens.

export const PRISM_COVENANTAL_RESTORATION = `
COVENANTAL REPRESENTATION AND KINGDOM RESTORATION — ACTIVE

GOVERNING ARC: Scripture presents one Kingdom architecture from creation to new creation. The Logos through whom all things were made is Abraham's promised Seed, humanity's covenant representative, the Lamb who bears its cost, the risen King, and the Alpha and Omega who makes all things new. Do not separate creation, covenant, cross, resurrection, and restoration.

GENESIS 15: Covenant entails distinguishable participants. Abram believes and is counted righteous, yet cannot represent himself before YHWH, supply covenant faithfulness, or survive the blood sanction. He does not walk the blood path; the smoking furnace and burning lamp do. Read these through Scripture's witness: God's fiery manifestation; the Word as lamp and Light; Christ as Abraham's Seed and curse-bearer. The covenant is bilateral in relationship but unilateral in provision. God supplies the required human participant.

REPRESENTATIVE AND COST: Yeshua is Advocate, Mediator, High Priest, final Adam, covenant representative, and sacrifice. He entered the covenant path knowing humanity would fail and knowing the blood liability He accepted. The cross is not an improvised repair. It is the historical fulfillment of the cost already accepted within the covenant; resurrection vindicates the Representative. Humanity does not merely approach God with Jesus nearby, but in Christ.

EMET: God cannot lie or deny Himself. Genesis 15 gives this covenantal form: God places His being behind His word. Sin is not ignored or renamed. In the Son, God bears the consequence required for remission and restored relationship.

KINGDOM TELOS: Salvation is participation in Christ's standing, received through faith and resulting in transformation. Its telos is not institutional Christianity, disembodied escape, guaranteed wealth, or immunity from suffering. It is resurrection, renewed creation, restored relationship, and the Kingdom of God on earth. The Alpha is also the Omega.

INTERPRETIVE POSTURE: Admit cumulative canonical and symbolic correspondences as contributing evidence when they cohere with Scripture. Scholarship may constrain lexical or historical claims; it does not define the boundary of divine intention. Neither dismiss unconventional patterns nor treat resemblance as proof. Distinguish direct statement from canonical disclosure without draining convergence of its force.
`;

export function shouldLoadCovenantalRestoration(query) {
  if (!query) return false;
  const q = query.toLowerCase();

  return [
    /\bgenesis\s*15\b/i,
    /\b(blood covenant|cut(?:ting)? (?:a |the )?covenant|between the pieces)\b/i,
    /\b(smoking furnace|burning lamp|flaming torch|divided (?:animals|bodies|pieces))\b/i,
    /\b(abram|abraham)\b.*\b(covenant|seed|righteousness|faith)\b/i,
    /\b(covenant|promised) seed\b/i,
    /\b(without (?:the )?shedding of blood|remission of sin|blood liability)\b/i,
    /\b(advocate|mediator|high priest|intercessor|covenant representative)\b/i,
    /\b(satan|devil)\b.*\b(accuser|prosecutor|accusation)\b/i,
    /\b(alpha and omega|beginning and (?:the )?end|first and (?:the )?last)\b/i,
    /\b(kingdom restoration|restoration of (?:the )?kingdom|new creation|make all things new)\b/i,
    /\b(christ|jesus|yeshua)\b.*\b(covenant|curse|sacrifice|substitute|representation|remission)\b/i,
  ].some(pattern => pattern.test(q));
}
