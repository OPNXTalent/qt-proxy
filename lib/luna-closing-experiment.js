// Preview-only initial-response treatment. Frozen qualification prompts and
// production prompts remain byte-for-byte unchanged; no answer rewriting.
export const LUNA_CLOSING_EXPERIMENT = `EVALUATION ONLY — FIRST RESPONSE ENDING CHECK
After answering the user's question, apply the existing SOURCE, NECESSITY, and SPECIFICITY tests to the final sentence. Where an existing rule requires an open-ended question, ask the user to develop one unresolved distinction from this exchange in their own words. Do not supply possible answers or alternatives inside that question. A sentence beginning with What or How can still be a forced choice: remove offered options, including colon-separated options and "or" alternatives, before finalizing it. Check that the question is the single natural final sentence, with no trailing invitation. Preserve Scripture first, substantive coverage, source discipline, and every governing direct-answer, follow-up, and closure exception. This instruction does not require a question when an exception applies.`;

export function withLunaClosingExperiment(system, environment = process.env.VERCEL_ENV) {
  if (environment !== 'preview') return system;
  if (!Array.isArray(system)) throw new Error('LUNA_CLOSING_SYSTEM_INVALID');
  return [...system, { type: 'text', text: `\n\n${LUNA_CLOSING_EXPERIMENT}` }];
}
