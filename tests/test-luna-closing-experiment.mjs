import test from 'node:test';
import assert from 'node:assert/strict';
import { withLunaClosingExperiment, LUNA_CLOSING_EXPERIMENT } from '../lib/luna-closing-experiment.js';
import { captureQualificationPrompt } from '../api/interpret.js';

test('treatment appends only in preview and never mutates canonical text', () => {
  const system = [{ type: 'text', text: 'canonical bytes\n', cache_control: { type: 'ephemeral' } }];
  const saved = JSON.stringify(system);
  for (const environment of ['production', 'development', 'test', undefined]) {
    assert.equal(withLunaClosingExperiment(system, environment), system);
  }
  const variant = withLunaClosingExperiment(system, 'preview');
  assert.equal(variant[0], system[0]);
  assert.equal(variant[1].text, `\n\n${LUNA_CLOSING_EXPERIMENT}`);
  assert.equal(JSON.stringify(system), saved);
});

test('qualification captures do not acquire the live preview treatment', () => {
  const original = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = 'test';
    const baseline = captureQualificationPrompt({ query: 'What does echad mean in Deuteronomy 6:4?' });
    process.env.VERCEL_ENV = 'preview';
    const variant = captureQualificationPrompt({ query: 'What does echad mean in Deuteronomy 6:4?' });
    assert.deepEqual(variant, baseline);
    assert.doesNotMatch(variant.system, /EVALUATION ONLY — FIRST RESPONSE ENDING CHECK/);
  } finally {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
  }
});
