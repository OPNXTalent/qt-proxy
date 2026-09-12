import assert from 'node:assert/strict';
import { collapseRepeatedTerminalParagraphs } from '../lib/response-normalization.js';

const repeatedQuestion = `The image is both origin and destination.

What part of that lands differently than you expected?

What part of that lands differently than you expected?`;

assert.equal(
  collapseRepeatedTerminalParagraphs(repeatedQuestion),
  `The image is both origin and destination.\n\nWhat part of that lands differently than you expected?`,
);

assert.equal(
  collapseRepeatedTerminalParagraphs('First claim.\n\nFirst claim.\n\nA distinct conclusion.'),
  'First claim.\n\nFirst claim.\n\nA distinct conclusion.',
  'Only repeated terminal paragraphs may be collapsed',
);

assert.equal(
  collapseRepeatedTerminalParagraphs('Answer.\r\n\r\nWHAT ARE YOUR THOUGHTS?\r\n\r\n What   are your thoughts? '),
  'Answer.\n\nWHAT ARE YOUR THOUGHTS?',
  'Terminal comparison should ignore case and whitespace variation',
);

console.log('Terminal response duplication checks passed.');
