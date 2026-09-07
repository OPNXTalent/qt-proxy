import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSseWriter } from '../api/interpret.js';

function createHarness() {
  const writes = [];
  const timings = [];
  let flushed = 0;
  const res = {
    destroyed: false,
    writableEnded: false,
    flushHeaders() {
      flushed += 1;
    },
    write(chunk) {
      writes.push(chunk);
    },
  };
  const writer = createSseWriter(
    res,
    (event, details) => timings.push({ event, details }),
  );
  const events = () => writes
    .filter(chunk => chunk.startsWith('data: '))
    .map(chunk => JSON.parse(chunk.slice(6).trim()));
  return { res, writer, events, timings, writes, get flushed() { return flushed; } };
}

{
  const harness = createHarness();
  assert.equal(harness.writer.start({ heartbeatMs: 0 }), true);
  assert.equal(harness.flushed, 1, 'The SSE headers must be flushed before long-running model work');
  assert.equal(harness.writes[0], ': prism-stream-connected\n\n');
  assert.equal(harness.writer.write({ type: 'done', tier: 'free' }), true);
  assert.deepEqual(harness.events().map(event => event.type), ['done']);
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
assert.equal(
  (interpretSource.match(/sse\.start\(\)/g) || []).length,
  2,
  'Authenticated and anonymous query paths must establish SSE before long-running work',
);
assert.match(interpretSource, /Cache-Control', 'no-cache, no-transform'/);
assert.match(interpretSource, /X-Accel-Buffering', 'no'/);
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
  /type: 'error', error: err\.message/,
  'Provider, validation, audit, or persistence failures must produce a terminal error',
);

console.log('SSE terminal contract checks passed.');
