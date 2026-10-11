import { beginFinanceAttempt, finishFinanceAttempt } from './finance-store.js';
// Production inquiry provider. Prompts and persistence remain owned by interpret.js.
export const PRISM_INQUIRY_MODEL = 'gpt-6-luna';

export async function callInquiryModel({
  maxTokens, prompt, system, timeoutMs = 15000, maxTotalMs = null,
  structuredOutputSchema = null, structuredOutputName = 'emit_structured_output',
  structuredOutputDiagnostic = null, onTextDelta = null,
  onStructuredInputProgress = null, telemetryStage = 'unspecified',
  telemetryTurnType = 'unknown', telemetryRetryOrdinal = 0,
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('INQUIRY_MODEL_CREDENTIAL_UNAVAILABLE');
  const started = Date.now();
  const controller = new AbortController();
  const streaming = typeof onTextDelta === 'function' || typeof onStructuredInputProgress === 'function';
  let timer, totalTimer, response, finalResponse, requestId = null;
  let succeeded = false, stopReason = 'transport_error';
  const armTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort('MODEL_TIMEOUT'), timeoutMs);
  };
  const diagnostic = (outcome, extra = {}) => structuredOutputDiagnostic?.({
    outcome, providerStatus: response?.status || null, providerErrorCode: null,
    toolUseReturned: outcome === 'tool_use_returned', ...extra,
  });
  const instructions = Array.isArray(system)
    ? system.map(block => block.text || '').join('\n') : String(system || '');
  const financeAttempt = await beginFinanceAttempt({model:PRISM_INQUIRY_MODEL,stage:telemetryStage,turnType:telemetryTurnType});
  armTimeout();
  if (maxTotalMs > 0) totalTimer = setTimeout(() => controller.abort('MODEL_STREAM_TOTAL_TIMEOUT'), maxTotalMs);
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: PRISM_INQUIRY_MODEL, store: false, reasoning: { effort: 'low' },
        service_tier: 'default', instructions,
        input: [{ role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }],
        // Responses includes reasoning in the output budget. Preserve room for the visible answer.
        max_output_tokens: Math.max(2048, Number(maxTokens || 3600) + 4096),
        ...(streaming ? { stream: true } : {}),
        ...(structuredOutputSchema ? {
          tools: [{ type: 'function', name: structuredOutputName,
            description: 'Return the requested structured result without commentary.',
            parameters: structuredOutputSchema, strict: false }],
          tool_choice: { type: 'function', name: structuredOutputName }, parallel_tool_calls: false,
        } : {}),
      }),
    });
    requestId = response.headers.get('x-request-id');
    if (!response.ok) {
      stopReason = `provider_${response.status}`;
      const detail = await response.json().catch(() => ({}));
      if (structuredOutputSchema) diagnostic('provider_rejection', { providerErrorCode: detail.error?.code || null });
      throw new Error(`INQUIRY_MODEL_${response.status}:${detail.error?.code || 'provider_rejection'}`);
    }
    let text = '';
    if (streaming) {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('INQUIRY_MODEL_STREAM_UNAVAILABLE');
      const decoder = new TextDecoder();
      let buffer = '';
      const toolBlocks = new Map();
      const consume = line => {
        if (!line.startsWith('data:')) return;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') return;
        let event;
        try { event = JSON.parse(payload); } catch { return; }
        armTimeout();
        if (event.type === 'response.output_text.delta') {
          text += event.delta || '';
          onTextDelta?.(event.delta || '');
        } else if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
          toolBlocks.set(event.item.id, { name: event.item.name, partialJson: '' });
        } else if (event.type === 'response.function_call_arguments.delta') {
          const block = toolBlocks.get(event.item_id);
          if (block) {
            block.partialJson += event.delta || '';
            onStructuredInputProgress?.({ index: event.output_index, name: block.name, partialJson: block.partialJson });
          }
        } else if (event.type === 'response.completed' || event.type === 'response.incomplete') {
          finalResponse = event.response;
        } else if (event.type === 'response.failed' || event.type === 'error') {
          throw new Error(`INQUIRY_MODEL_STREAM_ERROR:${event.code || event.response?.error?.code || 'provider_error'}`);
        }
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) consume(line);
        }
        buffer += decoder.decode();
        for (const line of buffer.split('\n')) consume(line);
      } finally {
        await reader.cancel().catch(() => {});
      }
      // Do not save a partial answer if the transport ends before provider completion.
      if (!finalResponse) throw new Error('INQUIRY_MODEL_STREAM_INCOMPLETE');
    } else {
      finalResponse = await response.json();
    }
    stopReason = finalResponse.status || 'unknown';
    if (finalResponse.status === 'incomplete') throw new Error('INQUIRY_MODEL_OUTPUT_TRUNCATED');
    if (finalResponse.status !== 'completed') throw new Error('INQUIRY_MODEL_RESPONSE_INCOMPLETE');
    if (structuredOutputSchema) {
      const block = finalResponse.output?.find(item => item.type === 'function_call' && item.name === structuredOutputName);
      let parsed;
      try { parsed = JSON.parse(block?.arguments || ''); } catch { /* Report below. */ }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        diagnostic('tool_use_missing', { errorCode: 'INQUIRY_MODEL_STRUCTURED_OUTPUT_MISSING' });
        throw new Error('INQUIRY_MODEL_STRUCTURED_OUTPUT_MISSING');
      }
      diagnostic('tool_use_returned');
      succeeded = true;
      return parsed;
    }
    if (!text) text = (finalResponse.output || []).flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text').map(item => item.text).join('\n');
    if (!text.trim()) throw new Error('INQUIRY_MODEL_TEXT_MISSING');
    succeeded = true;
    return text.trim();
  } catch (error) {
    if (controller.signal.aborted) {
      stopReason = 'application_timeout';
      throw new Error('INQUIRY_MODEL_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    clearTimeout(totalTimer);
    const usage = finalResponse?.usage || {};
    const cached = Number(usage.input_tokens_details?.cached_tokens || 0);
    const telemetry = {
      provider: 'openai', stage: telemetryStage, turnType: telemetryTurnType, model: PRISM_INQUIRY_MODEL,
      providerRequestId: requestId || finalResponse?.id || null,
      inputTokens: Math.max(0, Number(usage.input_tokens || 0) - cached),
      outputTokens: Number(usage.output_tokens || 0), reasoningTokens: Number(usage.output_tokens_details?.reasoning_tokens || 0),
      cacheCreationInputTokens: 0, cacheReadInputTokens: cached, stopReason,
      latencyMs: Date.now() - started, retryOrdinal: telemetryRetryOrdinal, succeeded,
      usageKnown: Number.isSafeInteger(usage.input_tokens) && Number.isSafeInteger(usage.output_tokens), serviceTier: 'default',
    };
    console.log('[prism-provider-cogs]', telemetry);
    await finishFinanceAttempt(financeAttempt,{...telemetry,inputTokens:Number(usage.input_tokens || 0)});
  }
}
