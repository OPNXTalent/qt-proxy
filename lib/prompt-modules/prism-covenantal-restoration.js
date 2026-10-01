// lib/prompt-modules/prism-covenantal-restoration.js
// Conditional canonical detail; shared Emet guidance governs interpretive posture.

export const PRISM_COVENANTAL_RESTORATION = `
COVENANTAL REPRESENTATION AND KINGDOM RESTORATION — ACTIVE

GOVERNING ARC: The creating Logos is Abraham's promised Seed, humanity's representative, the Lamb who bears the cost, the risen King, and the Alpha and Omega who makes all things new. Creation, covenant, cross, resurrection, and restoration are one Kingdom architecture.

GENESIS 15: Abram believes and is counted righteous; he sleeps while a smoking furnace and burning lamp pass between the divided pieces. God's covenant promises descendants and land. Jeremiah 34:18–20 illuminates the blood-sanction imagery. Examine the scene alongside Galatians 3, Christ's representative work, and the new covenant in His blood.

REPRESENTATIVE AND COST: Explore the furnace as divine covenant party and the lamp as Yeshua standing for humanity, with the cross fulfilling the foreknown covenant cost. Present this connected reading affirmatively as interpretation, then let the evidence unfold. The passage itself supplies the manifestations rather than separately naming their personal identities. Yeshua's representative work and God's faithfulness are established through the wider canonical witness. Maintain Christ's eternal divinity, sinlessness, and the reality of His suffering while examining the proposed connections.

EMET: God cannot lie or deny Himself. Genesis 15 gives this covenantal form: God places His being behind His word. Sin is not renamed; in the Son, God bears the consequence required for remission and restoration.

KINGDOM TELOS: Salvation is participation in Christ's standing, received through faith. Its telos is resurrection, renewed creation, restored relationship, and God's Kingdom on earth — not institutional Christianity, escape, wealth, or immunity from suffering. The Alpha is also the Omega.

INTERPRETIVE POSTURE: Admit cumulative canonical and symbolic correspondences when they cohere with Scripture. Scholarship constrains lexical and historical claims, not divine intention. Neither dismiss patterns nor treat resemblance as proof.
`;

export function shouldLoadCovenantalRestoration(query) {
  if (!query) return false;
  const q = query.toLowerCase();

  return [
    /\b(emet|echad|gethsemane|forsaken|forsakenness|made sin|psalm\s*22|aleph|tav)\b/i,
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

