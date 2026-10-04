// Evaluation-only. Never imported by API handlers or production routing.
export const OPENAI_ENDPOINT = 'https://api.openai.com/v1';

export function responsesRequest(snapshot, model, maxOutputTokens = 2400) {
  if (!snapshot?.system || !snapshot?.input || !model || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1)
    throw new Error('INVALID_EXECUTION_INPUT');
  return { model, instructions: snapshot.system, input: snapshot.input,
    reasoning: { effort: 'low' }, max_output_tokens: maxOutputTokens,
    service_tier: 'default', store: false };
}

export function costFromUsage(usage, rate) {
  if (!usage || !rate || !Number.isInteger(usage.input_tokens) || !Number.isInteger(usage.output_tokens))
    throw new Error('USAGE_REQUIRED');
  const input = usage.input_tokens, output = usage.output_tokens;
  const cached = usage.input_tokens_details?.cached_tokens || 0;
  const details = usage.input_tokens_details || {};
  if (details.cache_write_tokens !== undefined && details.cache_creation_tokens !== undefined
    && details.cache_write_tokens !== details.cache_creation_tokens) throw new Error('INVALID_USAGE');
  const writes = details.cache_write_tokens ?? details.cache_creation_tokens ?? 0;
  if ([input, output, cached, writes].some(n => !Number.isInteger(n) || n < 0) || cached + writes > input)
    throw new Error('INVALID_USAGE');
  return ((input - cached - writes) * rate.input + cached * rate.cachedInput
    + writes * rate.cacheWrite + output * rate.output) / 1e6;
}

// Charge the worst cache-write rate for every input token and the full output
// cap. Do not rely on cache hits to keep this pilot within its spending cap.
export function reserveCost(inputTokens, maxOutputTokens, rate) {
  if (!Number.isInteger(inputTokens) || inputTokens < 0 || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1)
    throw new Error('INVALID_TOKEN_BOUND');
  return ((inputTokens + 1024) * Math.max(rate.input, rate.cacheWrite) + maxOutputTokens * rate.output) / 1e6;
}

export class SpendLedger {
  constructor(limit = 2) {
    if (!Number.isFinite(limit) || limit <= 0 || limit > 2) throw new Error('INVALID_BUDGET');
    this.limit = limit; this.committed = 0; this.usageCost = 0;
  }
  reserve(amount) {
    if (!Number.isFinite(amount) || amount < 0 || this.committed + amount > this.limit)
      throw new Error('SPENDING_CAP');
    this.committed += amount;
  }
  settle(reserved, actual) {
    if (!Number.isFinite(actual) || actual < 0 || actual > reserved) throw new Error('COST_BOUND_EXCEEDED');
    this.committed += actual - reserved; this.usageCost += actual;
  }
}

export function openAIAdapter(apiKey, fetchImpl = fetch, timeoutMs = 90000) {
  if (!apiKey) throw new Error('EVALUATION_KEY_REQUIRED');
  async function request(path, body) {
    const start = performance.now();
    let response, data;
    try {
      response = await fetchImpl(`${OPENAI_ENDPOINT}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs),
      });
      data = await response.json();
    } catch {
      return { ok: false, error: 'NETWORK_OR_TIMEOUT', latencyMs: performance.now() - start, uncertainCharge: true };
    }
    const telemetry = { httpStatus: response.status, latencyMs: performance.now() - start,
      requestId: response.headers.get('x-request-id') };
    if (!response.ok) {
      // Never return raw provider messages: they may echo credentials or inputs.
      const safeCode = /^[a-z0-9_]{1,80}$/i.test(data.error?.code || '') ? data.error.code : 'PROVIDER_ERROR';
      return { ok: false, error: safeCode, ...telemetry, uncertainCharge: response.status >= 500 };
    }
    return { ok: true, data, ...telemetry };
  }
  return {
    listModels: () => request('/models'),
    count: body => request('/responses/input_tokens', { model: body.model, instructions: body.instructions, input: body.input }),
    async execute(body) {
      const result = await request('/responses', body);
      if (!result.ok) return result;
      const data = result.data;
      const response = (data.output || []).filter(x => x.type === 'message')
        .flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
      return { ok: true, response, usage: data.usage, resolvedModel: data.model,
        status: data.status, incompleteDetails: data.incomplete_details,
        serviceTier: data.service_tier, responseId: data.id,
        latencyMs: result.latencyMs, requestId: result.requestId, httpStatus: result.httpStatus };
    },
  };
}
