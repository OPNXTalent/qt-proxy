import assert from 'node:assert/strict';
import fs from 'node:fs';
import { callInquiryModel } from '../lib/inquiry-model.js';

const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = 'unit-test-placeholder';
let request;
const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] };
const result = { status: 'completed', output: [{ type: 'function_call', name: 'emit_result', arguments: '{"answer":"ok"}' }], usage: { input_tokens: 10, output_tokens: 8 } };
try {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    request = JSON.parse(options.body);
    return Response.json(result);
  };
  assert.deepEqual(await callInquiryModel({ maxTokens: 100, prompt: 'question',
    system: [{ type: 'text', text: 'stable', cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'context' }],
    structuredOutputSchema: schema, structuredOutputName: 'emit_result' }), { answer: 'ok' });
  assert.equal(request.model, 'gpt-6-luna');
  assert.equal(request.store, false);
  assert.equal(request.instructions, 'stable\ncontext');
  assert.deepEqual(request.reasoning, { effort: 'low' });
  assert.equal(request.temperature, undefined);
  assert.deepEqual(request.tool_choice, { type: 'function', name: 'emit_result' });
  assert.deepEqual(request.tools[0].parameters, schema);
  await callInquiryModel({prompt:'Review the attached source.', inputFiles:[{name:'source.pdf',data:'JVBERi0x'}], structuredOutputSchema:schema, structuredOutputName:'emit_result'});
  assert.deepEqual(request.input[0].content,[{type:'input_text',text:'Review the attached source.'},{type:'input_file',filename:'source.pdf',file_data:'data:application/pdf;base64,JVBERi0x'}]);
  const encoder = new TextEncoder();
  const stream = events => new Response(new ReadableStream({ start(controller) {
    const data = encoder.encode(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''));
    // Fragment inside SSE lines to exercise the provider transport boundary.
    for (let i = 0; i < data.length; i += 13) controller.enqueue(data.slice(i, i + 13));
    controller.close();
  } }));
  const progress = [];
  global.fetch = async () => stream([
    { type: 'response.output_item.added', item: { id: 'call_1', type: 'function_call', name: 'emit_result' } },
    { type: 'response.function_call_arguments.delta', item_id: 'call_1', output_index: 0, delta: '{"answer":' },
    { type: 'response.function_call_arguments.delta', item_id: 'call_1', output_index: 0, delta: '"ok"}' },
    { type: 'response.completed', response: result },
  ]);
  assert.deepEqual(await callInquiryModel({ maxTokens: 100, prompt: 'question', structuredOutputSchema: schema,
    structuredOutputName: 'emit_result', onStructuredInputProgress: value => progress.push(value) }), { answer: 'ok' });
  assert.equal(progress.at(-1).partialJson, '{"answer":"ok"}');
  global.fetch = async () => stream([{ type: 'response.output_text.delta', delta: 'partial' }]);
  await assert.rejects(callInquiryModel({ prompt: 'question', onTextDelta: () => {} }), /STREAM_INCOMPLETE/);
  global.fetch = async () => Response.json({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } });
  await assert.rejects(callInquiryModel({ prompt: 'question' }), /OUTPUT_TRUNCATED/);
  global.fetch = async () => Response.json({ error: { code: 'invalid_api_key', message: 'sensitive provider detail' } }, { status: 401 });
  await assert.rejects(callInquiryModel({ prompt: 'question' }), error => error.message === 'INQUIRY_MODEL_401:invalid_api_key');
  const api = fs.readFileSync(new URL('../api/interpret.js', import.meta.url), 'utf8');
  assert.doesNotMatch(api, /api\.anthropic\.com|ANTHROPIC_API_KEY|claude-sonnet|claude-haiku/);
  console.log('Luna request, structured output, fragmented stream, truncation and error checks passed.');
} finally {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
}
