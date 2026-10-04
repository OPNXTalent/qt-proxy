# Prism Luna preview: first live browser test

October 4, 2026. Testing authorized by the user. Status: partial verification; further paid requests paused. This does not qualify Luna for production.

The tested story was a guest submitting an initial inquiry, receiving the streamed answer, saving it in the isolated Supabase database, debiting credits once, and reopening it after reload.

Deployment: `dpl_8Ayuhk9HuAdMuWH4REX6y24FXmj7`, commit `93524c08f39c64dd09dc82730e285a663c83353e`. Database: test branch `prism-luna-evaluation`, reference `pftfhbzrxfkdqmmburjp`. Question: “What does echad mean in Deuteronomy 6:4?”

| Boundary | Result | Evidence |
| --- | --- | --- |
| Preview access and guest identity | Passed | Vercel sign-in completed; preview rendered and issued a guest identity. |
| Initial submission | Passed | One initial inquiry completed; no retry. |
| Provider transport | Passed for this request | GPT-6 Luna completed with reported usage, default tier and low reasoning. Provider latency 5,568 ms; route duration 7,171 ms. |
| Rendering | Passed for final layout | Scripture appeared before prose in the completed answer. The UI displayed generation progress. Early first-verse stream timing was not independently captured. |
| Persistence and reload | Passed | One thread and one artifact saved; the archived answer reopened after reload without regeneration. |
| Credit completion | Passed | Displayed balance fell from five to three. Read-only database verification found exactly one completion ledger row totaling two credits for the artifact. Reload kept the balance at three. |
| Required closing question | Failed | The response ended with a forced choice between the meaning of “one” and exclusive allegiance. This reproduces an existing delivery defect. No formal five-dimension rescoring is asserted. |
| Complete cost telemetry | Failed | The supporting embedding request succeeded, but embedQuery did not record its returned usage. Its exact charge is unknown. |

Additional observations: two guest identities appeared during parallel initial browser preflight requests; a guest-creation race/orphan remains a possibility to investigate. The new thread initially displayed one day remaining, while its stored retention was 30 days and reload displayed 30 days. Neither observation has been fixed or fully diagnosed.

## Budget and dispatch control

Prior cumulative evaluation spending was $1.463676510. Before submission, $0.266 was reserved under the original $2 cap. The reservation used the model's full context capacity at the higher long-context cache-write rate, the full 3,600-token output ceiling, and up to two maximum-size embeddings, without cache savings. This conservative application smoke-test reservation was not an exact prompt token-count preflight.

The single Luna generation reported 33,339 input tokens, zero cached input, 33,336 cache-write tokens and 354 output tokens, including 171 reasoning tokens. Reasoning is included once. Known usage-derived Luna cost is $0.004344300. Known cumulative spending is $1.468020810, excluding the unresolved embedding charge and database compute. Invoice reconciliation is unavailable.

Retain $0.261655700 of the reservation for unresolved charges. Known cumulative spending plus retained reservation remains $1.729676510. This is deliberately conservative; it is not a claim that the embedding cost that amount. No further generation, follow-up, retry or expanded case was dispatched.

Provider identifiers: request `req_45d8066d3db64a8eb5bc5d3bb73f5691`; response `resp_0efab230b77ba681016ac2b8d7929c87d281ce6843a476d364`; application request `67f74de6-16dd-4e2a-9a8a-ade21b0bcaef`. Raw answers and screenshots remain in ignored private evaluation storage. Credentials were neither exposed nor committed.

## Required next work

Record and validate embedding usage with request/stage attribution; distinguish unknown charges from zero and reconcile the retained reservation before further paid dispatch. Separately address the first-response open-ended closing requirement without changing canonical doctrine or masking content regressions. Then resume controlled guest follow-up and supporting-stage verification within the remaining budget.

Authenticated subscriber flows, follow-up drafting/auditing, closure, nonempty retrieval, suffering, Shroud and fabrication cases remain untested in this live preview. Existing offline tests do not establish those live flows.

Production remains on the restored Sonnet deployment `dpl_DKR8bJQZ6EubkHgvS27uhaaWA7AC`. This test made no production database writes, promotion, merge or credential revocation. PR #22 remains draft and unmerged. Previously restored production runtime was verified separately; a future deployment still requires environment validation.
