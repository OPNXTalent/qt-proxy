# Prism model qualification — Phase One

Status: offline foundation plus evaluation-only OpenAI execution adapters implemented. A five-question smoke pilot does not certify any candidate.
Production baseline inspected at commit `3b5abc2a40986a42f5acfffb27dd76cadabe9eab`.

## Baseline and candidates

The current primary canonical generation model is `claude-sonnet-4-6`, not Sol.
Supporting reduction/audit/repair paths include `claude-haiku-4-5-20251001`.
Compare Sonnet against GPT-5.6 Luna, GPT-6 Luna, GPT-5.6 Terra, GPT-6 Sol and GPT-6.1 Sol.
Candidate roles are hypotheses. Production routing stays disabled.

Official documentation checked October 4, 2026:
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/models/gpt-6.1-sol

GPT-6 Luna's model page lists $0.10 input/$0.50 output per million tokens for standard processing; the previously discussed $0.05/$0.25 figures are Batch rates. Do not compare rates from different service tiers. Recheck prices and account access at execution. Terra may cost more than a newer Sol; tier names do not establish cost order.

## What is implemented

- 50 primary-query regression cases across Scripture, covenant, Trinity, salvation, theodicy, hiddenness, Shroud, quantum principles, voice and boundaries.
- An offline prompt-capture export uses the source's real base prompt, canonical contract and conditional gates. It accepts frozen RAG and approved-learning text, in the same order as primary production generation.
- Run manifest records source commit, tracked source diff hash, corpus hash, registry, prompt hashes and qualification eligibility.
- Blinded outputs remove model identity and execution telemetry; a separate private key retains provenance.
- Review scoring requires five integer scores, reviewer and rationale. Every dimension must reach 4/5 for an acceptable case. At least 95% acceptable cases and zero critical failures are required for the offline quality gate. Missing or duplicate reviews fail closed. This is a small-set gate, not statistical proof of safety.
- Nothing switches models, writes production data, spends inquiry credits or makes provider calls.

## Run the offline preparation

```bash
node tests/test-model-qualification.mjs
node scripts/prism-model-qualification.mjs prepare /absolute/private/run-directory
```

The no-context run is explicitly a smoke test. For qualification preparation, supply a JSON map keyed by case ID with `ragContext` and `learningContext` captured once from an authorized preview retrieval run:

```bash
node scripts/prism-model-qualification.mjs prepare /absolute/private/run-directory /absolute/private/frozen-context.json
```

All candidate models must receive the exact same system text and query from each snapshot. Do not regenerate retrieval per model. Preserve full prompts and generation configurations privately. Never commit user conversations, live outputs, identity keys, tokens or account data into this public repository.

The corpus contains authored cases, not 50 approved historical exchanges. PQ-031 preserves the exact query from the October 4 01:56 Shroud PDF (`libfile_f6d194ea3dd481918673a851f3606696`); its saved answer is not labeled approved. Review expectations against current governance and approved examples before changing `approval` to `approved`. No-context manifests and unreviewed corpora cannot qualify a model.

## Live evaluation next

### Five-question OpenAI pilot

`scripts/prism-execution-adapters.mjs` implements the OpenAI Responses adapter for every registered OpenAI candidate. It is not imported by production handlers. Run locally with an explicitly selected evaluation key file; the runner never falls back to a process or production key:

```bash
node tests/test-prism-execution-adapters.mjs
node scripts/prism-model-qualification.mjs prepare .qualification-runs/pilot
node scripts/prism-model-pilot.mjs .qualification-runs/pilot/manifest.json /absolute/private/evaluation.env .qualification-runs/pilot-execution
node scripts/prism-model-qualification.mjs blind .qualification-runs/pilot-execution/outputs.json .qualification-runs/pilot-review
```

The pilot selects PQ-002, PQ-008, PQ-021, PQ-031 and PQ-048 to cover lexical interpretation, covenant inference, suffering, disputed historical evidence and a fabrication request. It sends the captured canonical prompt unchanged. It queries account model availability and counts each input with `/v1/responses/input_tokens` before generation. Missing models are reported without substituting aliases. All five questions must pass token-count preflight before a candidate runs.

Budget is capped at $2, with a planned worst-case reserve of $1.90. The runner uses verified Standard prices in `pilot-pricing.json`, adds 1,024 input tokens of allowance per request, assumes the highest input/cache-write rate without relying on cache hits, and reserves the entire output cap before dispatch. The common output cap is calculated to fit the full pilot and must be at least 1,800 tokens. Reasoning is `low`, service tier is `default`, storage is disabled, no tools are enabled, and there are no automatic retries. This reduced output budget is a pilot condition, not the production generation configuration.

An exclusive run lock prevents accidental replays. Timeouts or unknown charges retain their full reservation. Execution stops on provider failures, missing usage or a model/service-tier mismatch. Record usage, cached input, reasoning tokens, provider model ID, request ID, status, incomplete-output details, full response latency and rate-derived cost privately. Rate-derived costs are not invoice reconciliation; cache-write charges absent from reported usage are covered by the conservative reserve. Refresh rates before a later run. The pilot performs no Anthropic baseline calls and cannot establish relative quality versus Sonnet.

Full frozen requests, outputs and review identity mappings remain in ignored private run directories. Commit only adapter source, tests, pricing configuration and documentation. Reviews remain provisional until a qualified human checks the corpus, factual sources, framework fidelity and blinded output provenance. Incomplete outputs must not count as acceptable. The existing full-corpus score command continues to require all 50 reviews; five-question pilot scores never authorize promotion.

Prices checked October 4, 2026 against each official model page:
- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/models/gpt-6-sol
- https://developers.openai.com/api/docs/models/gpt-6.1-sol

### Remaining qualification prerequisites

1. Enable the OpenAI Developers plugin to obtain authorized API access; verify actual account availability for each candidate. Reuse authorized Anthropic access for the incumbent comparator. Never move keys into the client or corpus.
2. Add provider-specific execution adapters on this experiment branch. Primary generation currently uses Anthropic Messages; OpenAI candidates need a Responses adapter. Preserve endpoint, reasoning, output cap, service tier, caching and timeout settings in every run. Record provider-resolved model ID; use dated snapshots when offered. An alias is not an immutable version.
3. Freeze retrieval, approved-learning context and governance revision. Compare candidates against newly generated Sonnet answers, rather than presuming old PDFs use the same prompt revision.
4. Record input, cached-input, output and reasoning token counts, actual latency, timeout/error rate and full request cost, including tool and cache-write charges. Repeat difficult cases to expose variability. Reconcile billed costs rather than infer cost from visible prose length.
5. Export results as an array with `runId`, `caseId`, `model`, `promptHash`, `sourceCommit`, `response` and telemetry. Use `blind RESULTS_JSON PRIVATE_REVIEW_DIRECTORY`; reviewer receives only `blind-review.json` plus the corpus criteria. Unblind after judgments are final. Group completed reviews by model and use `score REVIEWS_FOR_ONE_MODEL_JSON`.
6. Validate every output's run/prompt provenance against the frozen manifest before accepting scores. The score command computes a quality gate only; it does not certify run provenance or eligibility and cannot promote production.

## Promotion and upgrades

Require approved corpus, eligible frozen prompts, complete blinded review, zero critical errors, acceptable quality, measured economics and latency, and end-to-end preview verification. Low price alone never promotes a model.

Future production configuration should map `PRISM_FAST`, `PRISM_CORE`, `PRISM_DEEP`, `PRISM_VALIDATOR` and `PRISM_FALLBACK` to certified provider/model/configuration records. Keep a last-known-good configuration, explicit upgrade status and one-change rollback. Do not use automatic latest-model aliases as upgrades. Canary 5%, then 20%, only after offline and preview gates pass; promote manually with monitored abort criteria. Separate governance upgrades from model upgrades.

## Scope still to qualify

This foundation prepares the primary canonical answer stage only. Persistent follow-ups use reducer, draft and audit prompts with state and their own retrieval; they need separate captured fixtures and qualification. Also test extraction/repair independently. Model quality scores do not verify Scripture-first UI ordering, stream event order, disconnect/retry behavior, durable completion, authorization or one-charge accounting. Test these in preview before any live routing change.

An automated validator is another fallible model, not a doctrinal or factual guarantee. Keep source verification and human review for disputed scientific evidence and scriptural interpretation. Framework analogies, explicit Scripture and empirical claims must remain distinguishable.

## Validation of Phase One

45 existing/new test scripts run: 43 passed, including the new qualification tests. Two failures reproduced independently on the unchanged production commit: query intake still expects a 4,000-character UI limit despite the shipped 12,000 limit; theodicy composition expects a superseded heading and smaller token budget. They are existing contract drift, not introduced by this branch. They remain unresolved and must be reconciled before a production routing rollout. A 50-case offline smoke manifest was generated and correctly marked ineligible for qualification.
