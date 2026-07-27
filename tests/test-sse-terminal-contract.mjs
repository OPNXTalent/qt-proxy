import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSseWriter } from '../api/interpret.js';

function createHarness() {
  const writes = [];
  const timings = [];
  const res = {
    destroyed: false,
    writableEnded: false,
    write(chunk) {
      writes.push(chunk);
    },
  };
  const writer = createSseWriter(
    res,
    (event, details) => timings.push({ event, details }),
  );
  const events = () => writes.map(chunk => JSON.parse(chunk.slice(6).trim()));
  return { res, writer, events, timings };
}

{
  const harness = createHarness();
  assert.equal(harness.writer.write({ type: 'delta', text: 'draft' }), true);
  assert.equal(harness.writer.write({ type: 'corrected', text: 'final' }), true);
  assert.equal(
    harness.writer.write({ type: 'done', tier: 'subscriber' }, { source: 'post_coherence' }),
    true,
  );
  assert.equal(harness.writer.write({ type: 'done', tier: 'subscriber' }), false);
  assert.equal(harness.writer.write({ type: 'error', error: 'late failure' }), false);
  assert.equal(harness.writer.write({ type: 'delta', text: 'late delta' }), false);

  assert.deepEqual(
    harness.events().map(event => event.type),
    ['delta', 'corrected', 'done'],
    'Success must emit one final done event and nothing afterward',
  );
  assert.equal(harness.writer.terminalType, 'done');
  assert.equal(harness.timings.filter(entry => entry.event === 'done_sent').length, 1);
}

{
  const harness = createHarness();
  assert.equal(harness.writer.write({ type: 'delta', text: 'partial' }), true);
  assert.equal(
    harness.writer.write({ type: 'error', error: 'UPSTREAM_STREAM_INCOMPLETE' }),
    true,
  );
  assert.equal(harness.writer.write({ type: 'done', tier: 'free' }), false);
  assert.equal(harness.writer.write({ type: 'error', error: 'duplicate' }), false);

  assert.deepEqual(
    harness.events().map(event => event.type),
    ['delta', 'error'],
    'Failure must emit one error event, no done event, and nothing afterward',
  );
  assert.equal(harness.writer.terminalType, 'error');
  assert.equal(harness.timings.filter(entry => entry.event === 'error_sent').length, 1);
}

{
  const writes = [];
  const writer = createSseWriter(
    {
      destroyed: false,
      writableEnded: false,
      write(chunk) {
        writes.push(chunk);
      },
    },
    () => {},
    () => true,
  );

  assert.equal(writer.write({ type: 'delta', text: 'blocked' }), false);
  assert.equal(writer.write({ type: 'done', tier: 'free' }), false);
  assert.equal(writer.write({ type: 'error', error: 'blocked' }), false);
  assert.equal(writes.length, 0, 'An aborted request must not receive SSE writes');
}

const interpretSource = readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
assert.equal(
  (interpretSource.match(/res\.write\(/g) || []).length,
  1,
  'All SSE writes must pass through createSseWriter',
);
assert.doesNotMatch(
  interpretSource,
  /parsed\.type === 'message_stop'[\s\S]{0,200}type: 'done'/,
  'Upstream message_stop must not send a premature done event',
);
assert.match(
  interpretSource,
  /source: 'subscriber_path_exception'/,
  'Subscriber streaming failures must terminate instead of falling through',
);
assert.match(
  interpretSource,
  /source: 'upstream_stream_incomplete'/,
  'Incomplete upstream streams must produce a terminal error',
);

console.log('SSE terminal contract checks passed.');
