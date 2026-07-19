// test-relational-salvation-gate.mjs
// CLI regression test for shouldLoadRelationalSalvation()
// Run: node test-relational-salvation-gate.mjs

// ── Inline gate function (mirrors interpret.js exactly) ───────────────────────
function shouldLoadRelationalSalvation(query) {
  if (!query) return false;
  const q = query.toLowerCase();

  const directSalvationSignal = [
    /\b(hell|hades|gehenna|lake of fire|eternal fire)\b/i,
    /\b(damned|damnation|condemned|condemnation)\b/i,
    /\bperish(es|ed|ing)?\b/i,
    /never (heard|knew) (about|of) (jesus|god|christ|the gospel)/i,
    /(born|raised|grew up) (in|as) (india|africa|china|a muslim|a buddhist|a hindu|another religion)/i,
    /geographic(al)? (exposure|access|accident|lottery)/i,
    /what (about|happens to) (people|someone|those) who never/i,
    /(raised|born|grew up) (as|in) a? ?(christian|muslim|buddhist|hindu|jewish|religious|secular)/i,
    /raised (christian|muslim|buddhist|hindu|jewish|catholic|protestant)/i,
    /only because (i was born|of where i was born|of my birthplace|of my upbringing|my family)/i,
    /(racist|immoral|wicked) christian.*(saved|heaven)/i,
    /(compassionate|good|moral|kind) (hindu|buddhist|muslim|atheist).*(condemned|hell|perish)/i,
    /romans 2.*(gentile|conscience|heart|law)/i,
    /gentiles?.*(law|heart|conscience|judged)/i,
    /god (send|sent|throw|cast|condemn).*(hell|perish|away)/i,
    /send(s|ing)? people to hell/i,
    /god (create|created|made).*(knowing|knew).*(hell|condemn|perish|burn)/i,
    /not willing (that any|anyone) should perish/i,
    /why (does|would|did) anyone perish/i,
    /salvation.*(fair|fairness|just|equal|geography|culture|religion|birth)/i,
    /who (can be|is|gets) saved/i,
  ].some(p => p.test(q));

  if (directSalvationSignal) return true;

  const godSignal = [
    'god', 'jesus', 'christ', 'yhwh', 'lord', 'holy spirit', 'calvinist', 'calvinism', 'arminian', 'arminianism',
    'scripture', 'bible', 'biblical', 'theological', 'theology',
    'christian', 'faith', 'covenant', 'divine',
  ].some(t => q.includes(t));

  const agencySignal = [
    /\bforeknowledge\b/i,
    /\bpredestination\b/i,
    /\bpredestined\b/i,
    /\bdeterminism\b/i,
    /\bdetermined\b/i,
    /\bprovidence\b/i,
    /free will/i,
    /\belect(ion|ed)?\b/i,
    /if (god|he) knows (every|all|my|our|future)/i,
    /does (god|he) control (every|all)/i,
    /how can (prophecy|god's plan) (be certain|succeed|fail)/i,
    /(caused|cause) (every|all) (decision|choice|action)/i,
    /control (every|all) (decision|choice|action|event)/i,
  ].some(p => p.test(q));

  return godSignal && agencySignal;
}

// ── Test cases ────────────────────────────────────────────────────────────────
const LOAD    = true;
const NO_LOAD = false;

const cases = [
  // ── Required: should trigger ──────────────────────────────────────────────
  { q: "Why does God send people to hell if He loves them?",
    expected: LOAD,    note: "Direct hell + God sends" },
  { q: "God created people knowing they would burn forever. That makes Him evil.",
    expected: LOAD,    note: "God created knowing + burn" },
  { q: "What happens to someone born in India who never hears about Jesus?",
    expected: LOAD,    note: "Never heard + geographic" },
  { q: "I was raised Christian only because I was born in the South.",
    expected: LOAD,    note: "Geographic exposure framing" },
  { q: "Can a racist Christian be saved while a compassionate Hindu is condemned?",
    expected: LOAD,    note: "Comparative salvation fairness" },
  { q: "Romans 2 says Gentiles have the law written on their hearts. What does that mean?",
    expected: LOAD,    note: "Romans 2 + Gentiles + law/heart" },
  { q: "If God does not want anyone to perish, why does anyone perish?",
    expected: LOAD,    note: "Perish + not willing" },
  { q: "If God knows every future choice, are my choices really free?",
    expected: LOAD,    note: "God + foreknowledge + free will" },
  { q: "Doesn't foreknowledge make free will impossible?",
    expected: NO_LOAD, note: "Foreknowledge + free will but no god signal" },
  { q: "Does God's foreknowledge make free will impossible?",
    expected: LOAD,    note: "God + foreknowledge + free will" },
  { q: "If God created reality, then He caused every decision.",
    expected: LOAD,    note: "God + determinism implied" },
  { q: "How can biblical prophecy be certain if God doesn't control every decision?",
    expected: LOAD,    note: "God + prophecy + providence/control" },
  { q: "How can hell be morally just?",
    expected: LOAD,    note: "Hell direct" },
  { q: "What about people who never heard the gospel?",
    expected: LOAD,    note: "Never heard" },
  { q: "Is eternal damnation fair?",
    expected: LOAD,    note: "Damnation direct" },
  { q: "Christian predestination and free will — are they compatible?",
    expected: LOAD,    note: "Christian + predestination + free will" },

  // ── Required: should NOT trigger (control queries) ────────────────────────
  { q: "Did Augustine believe in free will?",
    expected: NO_LOAD, note: "Historical — no salvation/judgment signal" },
  { q: "Explain determinism.",
    expected: NO_LOAD, note: "Philosophical — no god signal" },
  { q: "What is conscience in psychology?",
    expected: NO_LOAD, note: "Psychology — no god or salvation signal" },
  { q: "What is faith?",
    expected: NO_LOAD, note: "Simple theological — no agency or salvation signal" },
  { q: "Did God harden Pharaoh's heart?",
    expected: NO_LOAD, note: "Textual — no hell/salvation/foreknowledge signal" },
  { q: "What does John 3:16 mean?",
    expected: NO_LOAD, note: "Exegesis — no salvation fairness pattern" },
  { q: "How should a Christian respond to workplace conflict?",
    expected: NO_LOAD, note: "Practical — no matching signal" },
  { q: "What is the Emet Test?",
    expected: NO_LOAD, note: "Framework definitional — no matching signal" },
  { q: "Compare Calvinism and Arminianism on election.",
    expected: LOAD,    note: "Theological + election signal" },
];

// ── Run ───────────────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures = [];

console.log('\nRELATIONAL SALVATION GATE — REGRESSION TEST\n' + '─'.repeat(65));

for (const c of cases) {
  const result = shouldLoadRelationalSalvation(c.q);
  const ok = result === c.expected;
  if (ok) pass++; else { fail++; failures.push(c); }
  const label = ok ? 'PASS' : 'FAIL';
  const action = result ? 'LOAD  ' : 'SKIP  ';
  console.log(`${label}  ${action}  ${c.note}`);
  if (!ok) {
    console.log(`       Query: "${c.q.slice(0, 70)}"`);
    console.log(`       Expected: ${c.expected ? 'LOAD' : 'SKIP'}, got: ${result ? 'LOAD' : 'SKIP'}`);
  }
}

console.log('\n' + '─'.repeat(65));
console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) { failures.forEach(f => console.log(`  FAIL: ${f.note}`)); process.exit(1); }
else { console.log('All tests passed.'); process.exit(0); }
