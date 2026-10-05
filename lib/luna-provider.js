import { beginFinanceAttempt, finishFinanceAttempt } from './finance-store.js';
// Server-only Responses transport. No provider fallback or automatic retries.
export const PRISM_LUNA_MODEL = 'gpt-6-luna';
const ENDPOINT = 'https://api.openai.com/v1/responses';
const safeCode = value => /^[A-Za-z0-9_.:-]{1,80}$/.test(value || '') ? value : 'provider_error';

export function flattenSystem(system) {
  if (system === undefined || system === null) return '';
  if (typeof system === 'string') return system;
  if (!Array.isArray(system) || system.some(block => block?.type !== 'text' || typeof block.text !== 'string')) {
    throw new Error('INQUIRY_MODEL_SYSTEM_INVALID');
  }
  // Existing canonical blocks are contiguous prompt segments. Cache annotations
  // are provider-specific metadata, not prompt text; OpenAI caches the prefix.
  return system.map(block => block.text).join('');
}

export function buildLunaRequest({
  model = PRISM_LUNA_MODEL, maxTokens, prompt, system,
  structuredOutputSchema = null, structuredOutputName = 'emit_structured_output',
  stream = false, reasoningEffort = 'low',
}) {
  if (model !== PRISM_LUNA_MODEL) throw new Error('INQUIRY_MODEL_UNSUPPORTED');
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 128000
    || typeof prompt !== 'string' || !prompt.trim()
    || !['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(reasoningEffort)) {
    throw new Error('INQUIRY_MODEL_REQUEST_INVALID');
  }
  const instructions = flattenSystem(system);
  return {
    model, ...(instructions ? { instructions } : {}), input: prompt,
    max_output_tokens: maxTokens, reasoning: { effort: reasoningEffort },
    service_tier: 'default', store: false,
    ...(stream ? { stream: true } : {}),
    ...(structuredOutputSchema ? {
      tools: [{ type: 'function', name: structuredOutputName,
        description: 'Return the requested structured result without commentary.',
        parameters: structuredOutputSchema, strict: false }],
      tool_choice: { type: 'function', name: structuredOutputName },
      parallel_tool_calls: false,
    } : {}),
  };
}

function textFromResponse(data) {
  return (data.output || []).filter(item => item.type === 'message')
    .flatMap(item => item.content || []).filter(part => part.type === 'output_text')
    .map(part => part.text).join('\n');
}

function assertCompleted(data) {
  if (data.status === 'incomplete' && data.incomplete_details?.reason === 'max_output_tokens') {
    throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
  }
  if (data.status !== 'completed') throw new Error('INQUIRY_MODEL_INCOMPLETE');
  if ((data.output || []).some(item => item.type === 'message'
    && (item.content || []).some(part => part.type === 'refusal'))) {
    throw new Error('INQUIRY_MODEL_REFUSED');
  }
}

function usageFields(data) {
  const usage = data?.usage;
  const input = usage?.input_tokens, output = usage?.output_tokens;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  const details = usage?.input_tokens_details || {};
  const writes = details.cache_write_tokens ?? details.cache_creation_tokens ?? 0;
  const reasoning = usage?.output_tokens_details?.reasoning_tokens ?? 0;
  if ([input, output, cached, writes, reasoning].some(n => !Number.isInteger(n) || n < 0)
    || cached + writes > input || reasoning > output
    || (details.cache_write_tokens !== undefined && details.cache_creation_tokens !== undefined
      && details.cache_write_tokens !== details.cache_creation_tokens)) {
    throw new Error('INQUIRY_MODEL_USAGE_INVALID');
  }
  return { inputTokens: input, outputTokens: output,
    cacheReadInputTokens: cached, cacheCreationInputTokens: writes, reasoningTokens: reasoning };
}

// Race body reads with abort too, so idle/total deadlines cover headers, JSON
// decoding and stalled SSE streams (including custom/test ReadableStreams).
async function withAbort(promise, signal) {
  if (signal.aborted) throw new Error('INQUIRY_MODEL_TIMEOUT');
  let listener;
  const aborted = new Promise((_, reject) => {
    listener = () => reject(new Error('INQUIRY_MODEL_TIMEOUT'));
    signal.addEventListener('abort', listener, { once: true });
  });
  try { return await Promise.race([promise, aborted]); }
  finally { signal.removeEventListener('abort', listener); }
}

export async function callLunaModel({
  model = PRISM_LUNA_MODEL, maxTokens, prompt, system,
  timeoutMs = 15000, maxTotalMs = null,
  structuredOutputSchema = null, structuredOutputName = 'emit_structured_output',
  structuredOutputDiagnostic = null, onTextDelta = null, onStructuredInputProgress = null,
  telemetryStage = 'unspecified', telemetryTurnType = 'unknown', telemetryRetryOrdinal = 0,
  reasoningEffort = 'low',
}, { fetchImpl = globalThis.fetch, apiKey = process.env.OPENAI_API_KEY, log = console.log } = {}) {
  if (!apiKey) throw new Error('INQUIRY_MODEL_KEY_REQUIRED');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0
    || (maxTotalMs !== null && (!Number.isFinite(maxTotalMs) || maxTotalMs <= 0))) {
    throw new Error('INQUIRY_MODEL_TIMEOUT_INVALID');
  }
  const streaming = typeof onTextDelta === 'function' || typeof onStructuredInputProgress === 'function';
  const body = buildLunaRequest({ model, maxTokens, prompt, system, structuredOutputSchema,
    structuredOutputName, stream: streaming, reasoningEffort });
  const startedAt = Date.now(), controller = new AbortController();
  let idleTimer, totalTimer, reader, response, data, requestId = null, providerErrorCode = null;
  let streamedText = '', succeeded = false, failure = null;
  const toolBlocks = new Map();
  const armTimeout = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort('MODEL_TIMEOUT'), timeoutMs);
  };
  const diagnostic = outcome => structuredOutputDiagnostic?.({
    outcome, providerStatus: response?.status ?? null, providerErrorCode,
    toolUseReturned: outcome === 'tool_use_returned',
    ...(outcome === 'tool_use_missing' ? { errorCode: 'INQUIRY_MODEL_STRUCTURED_OUTPUT_MISSING' } : {}),
  });
  armTimeout();
  // A stream can emit heartbeat/progress events forever; always bound total time.
  if (streaming) totalTimer = setTimeout(() => controller.abort('MODEL_STREAM_TOTAL_TIMEOUT'), maxTotalMs ?? 240000);
  let financeAttempt = null;
  try {
    financeAttempt = await beginFinanceAttempt({model,stage:telemetryStage,turnType:telemetryTurnType});
    response = await withAbort(fetchImpl(ENDPOINT, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    }), controller.signal);
    requestId = response.headers.get('x-request-id');
    if (!response.ok) {
      // Raw provider error messages can contain prompts or credentials.
      const errorBody = await withAbort(response.json().catch(() => null), controller.signal);
      providerErrorCode = safeCode(errorBody?.error?.code || errorBody?.error?.type);
      if (structuredOutputSchema) diagnostic('provider_rejection');
      throw new Error(`INQUIRY_MODEL_${response.status}:${providerErrorCode}`);
    }
    if (streaming) {
      reader = response.body?.getReader();
      if (!reader) throw new Error('INQUIRY_MODEL_STREAM_UNAVAILABLE');
      const decoder = new TextDecoder();
      let buffer = '';
      const consumeFrame = frame => {
        const payload = frame.split(/\r?\n/).filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart()).join('\n');
        if (!payload || payload === '[DONE]') return;
        let event;
        try { event = JSON.parse(payload); } catch { throw new Error('INQUIRY_MODEL_STREAM_INVALID'); }
        armTimeout();
        if (event.type === 'response.output_text.delta' && !structuredOutputSchema) {
          const delta = String(event.delta || '');
          streamedText += delta;
          if (delta) onTextDelta?.(delta);
        } else if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
          toolBlocks.set(event.item.id, { name: event.item.name, index: event.output_index, partialJson: '' });
        } else if (event.type === 'response.function_call_arguments.delta') {
          const block = toolBlocks.get(event.item_id);
          if (!block) throw new Error('INQUIRY_MODEL_STREAM_INVALID');
          block.partialJson += String(event.delta || '');
          onStructuredInputProgress?.({ index: block.index, name: block.name, partialJson: block.partialJson });
        } else if (event.type === 'response.completed' || event.type === 'response.incomplete'
          || event.type === 'response.failed') {
          data = event.response;
          if (!data) throw new Error('INQUIRY_MODEL_STREAM_INVALID');
          assertCompleted(data);
        } else if (event.type === 'response.refusal.delta' || event.type === 'response.refusal.done') {
          throw new Error('INQUIRY_MODEL_REFUSED');
        } else if (event.type === 'error') {
          throw new Error(`INQUIRY_MODEL_STREAM_ERROR:${safeCode(event.code)}`);
        }
        // Reasoning and other internal deltas are never forwarded to the client.
      };
      while (!data) {
        const { done, value } = await withAbort(reader.read(), controller.signal);
        if (done) {
          buffer += decoder.decode();
          if (buffer.trim()) consumeFrame(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let match;
        while ((match = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          consumeFrame(frame);
          if (data) break;
        }
      }
      if (!data) throw new Error('INQUIRY_MODEL_STREAM_INCOMPLETE');
    } else {
      data = await withAbort(response.json(), controller.signal);
      assertCompleted(data);
    }
    // A completed response without valid usage is not treated as a success.
    usageFields(data);
    let result;
    if (structuredOutputSchema) {
      const calls = (data.output || []).filter(item => item.type === 'function_call');
      if (calls.length !== 1 || calls[0].name !== structuredOutputName) {
        diagnostic('tool_use_missing');
        throw new Error('INQUIRY_MODEL_STRUCTURED_OUTPUT_MISSING');
      }
      try { result = JSON.parse(calls[0].arguments); } catch { result = null; }
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        diagnostic('tool_use_missing');
        throw new Error('INQUIRY_MODEL_STRUCTURED_OUTPUT_MISSING');
      }
      diagnostic('tool_use_returned');
    } else {
      result = textFromResponse(data).trim();
      if (!result) throw new Error('INQUIRY_MODEL_RESPONSE_EMPTY');
      // Final response is authoritative; incomplete/malformed streams must not
      // silently persist different text from what was shown provisionally.
      if (streaming && streamedText.trim() !== result) throw new Error('INQUIRY_MODEL_STREAM_MISMATCH');
    }
    succeeded = true;
    return result;
  } catch (error) {
    failure = controller.signal.aborted ? 'INQUIRY_MODEL_TIMEOUT' : error.message;
    if (controller.signal.aborted) throw new Error('INQUIRY_MODEL_TIMEOUT');
    if (!String(error.message).startsWith('INQUIRY_MODEL_')) throw new Error('INQUIRY_MODEL_TRANSPORT_ERROR');
    throw error;
  } finally {
    clearTimeout(idleTimer); clearTimeout(totalTimer);
    if (reader) { reader.cancel().catch(() => {}); reader.releaseLock(); }
    let usage = { inputTokens: null, outputTokens: null, cacheReadInputTokens: null,
      cacheCreationInputTokens: null, reasoningTokens: null };
    try { if (data?.usage) usage = usageFields(data); } catch { /* unknown charge */ }
    const financeTelemetry = {
      provider: 'openai', stage: telemetryStage, turnType: telemetryTurnType,
      model: data?.model || model, providerRequestId: requestId, responseId: data?.id || null,
      ...usage, usageKnown: usage.inputTokens !== null, serviceTier: data?.service_tier || null,
      stopReason: succeeded ? 'completed' : (failure?.startsWith('INQUIRY_MODEL_') ? failure : 'transport_error'),
      latencyMs: Date.now() - startedAt, retryOrdinal: telemetryRetryOrdinal, succeeded,
    };
    log('[prism-provider-cogs]', financeTelemetry);
    await finishFinanceAttempt(financeAttempt, financeTelemetry);
  }
}
