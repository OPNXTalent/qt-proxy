// One embedding request, no retry. Logs metadata only, never input or vectors.
export async function callEmbedding({ input, model = 'text-embedding-3-small',
  requestId = null, turnType = 'unknown', timeoutMs = 15000, onTelemetry = null },
{ fetchImpl = globalThis.fetch, apiKey = process.env.OPENAI_API_KEY, log = console.log } = {}) {
  if (!apiKey) throw new Error('EMBEDDING_KEY_REQUIRED');
  if (typeof input !== 'string' || !input.trim() || model !== 'text-embedding-3-small'
    || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('EMBEDDING_REQUEST_INVALID');
  const startedAt = Date.now(), controller = new AbortController();
  let response, data, succeeded = false, failure = null, providerRequestId = null;
  let inputTokens = null;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let abortListener;
  const aborted = new Promise((_, reject) => {
    abortListener = () => reject(new Error('EMBEDDING_TIMEOUT'));
    controller.signal.addEventListener('abort', abortListener, { once: true });
  });
  try {
    response = await Promise.race([fetchImpl('https://api.openai.com/v1/embeddings', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input }),
    }), aborted]);
    providerRequestId = response.headers.get('x-request-id');
    if (!response.ok) throw new Error(`EMBEDDING_HTTP_${response.status}`);
    data = await Promise.race([response.json(), aborted]);
    const prompt = data?.usage?.prompt_tokens, total = data?.usage?.total_tokens;
    if (!Number.isSafeInteger(prompt) || prompt < 1 || prompt > 8192
      || total !== prompt) throw new Error('EMBEDDING_USAGE_INVALID');
    inputTokens = prompt;
    const vector = data?.data?.[0]?.embedding;
    if (data.model !== model || data.data?.length !== 1 || data.data[0].index !== 0
      || !Array.isArray(vector) || vector.length !== 1536
      || vector.some(value => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('EMBEDDING_RESPONSE_INVALID');
    }
    succeeded = true;
    return vector;
  } catch (error) {
    failure = controller.signal.aborted ? 'EMBEDDING_TIMEOUT'
      : /^EMBEDDING_[A-Z0-9_]+$/.test(error.message) ? error.message : 'EMBEDDING_TRANSPORT_ERROR';
    throw new Error(failure);
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', abortListener);
    const telemetry = { provider: 'openai', stage: 'retrieval_embedding', requestId, turnType,
      model, providerRequestId, inputTokens, totalTokens: inputTokens,
      usageKnown: inputTokens !== null, providerStatus: response?.status ?? null,
      stopReason: succeeded ? 'completed' : failure, latencyMs: Date.now() - startedAt,
      retryOrdinal: 0, succeeded };
    log('[prism-provider-cogs]', telemetry);
    onTelemetry?.(telemetry);
  }
}
