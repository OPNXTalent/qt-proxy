# Owner concept workbench

Open `/owner-concepts` from the existing owner finance dashboard's **Introduce a Concept** link. The existing Prism account must be in `prism_finance_owners`; client metadata never grants access.

Capture a title, source text/link, perspective and optional PDFs (3 / 1 MB total). Text and Markdown uploads are incorporated into the source text (60,000 characters). Links are attribution only and are not fetched. Reviews state that constraint explicitly; paste the relevant transcript/excerpt or attach its PDF to examine the actual material.

The existing OpenAI inquiry provider and deployed key generate a structured review: claims, evidence, contextual Scripture, counterarguments, framework fit and uncertainties. Related approved concepts inform conflict checking; this is not an exhaustive review of every historical module. Review and sample calls use owner-only rate admission and existing finance capture. They do not deduct subscriber query credits.

The owner edits treatment (foundational within scope / offered explanation / exploratory perspective / reference only), guidance, applicability, boundaries, tags and review date. An illustrative sample must match the saved revision before approval. It is not a production-pipeline test. Source edits clear the working review; guidance edits clear the sample. These edits preserve an earlier active release until replacement approval or explicit hold/rejection.

Approval creates an immutable release and atomically points the active version to it. Hold and reject deactivate it. Restore selects a previously approved release; every mutation appends a revision snapshot, timestamp and actor to private audit history. Optimistic revision checking plus an advisory transaction lock prevents concurrent overwrites. Retrying a committed write receives a conflict rather than duplicating an approval.

`match_prism_concepts` retrieves at most three relevant active approved releases alongside existing curated learning. Reference-only material is excluded by SQL and JavaScript. Sources/attachments, owner perspective, raw reviews and audit identities never enter public response prompts. Only approved bounded guidance, applicability, uncertainty, source URL and review date do. Guidance remains secondary to Scripture, the governing framework, primary sources and present evidence. Review dates are reminders visible in the workbench and context, not a scheduled re-review system.

All three new tables have RLS enabled and no public/member grants. Both RPCs use SECURITY INVOKER, a fixed search path and service-role-only execution. The API verifies identity against Supabase Auth before checking the server-managed owner allowlist. No server credentials are delivered to the browser. API routing shares the existing transcription function, retaining the current function-count constraint. No new OpenAI key or runtime secret is needed.

Validation: `node tests/test-concept-workbench.mjs`; existing curated-learning/provider/finance tests; transaction-rolled-back service-role integration covering draft isolation, approval, stale version rejection, editing while an approved release remains active, hold, restore, reference exclusion and audit history. Database ACL checks confirm ordinary members and anonymous callers cannot select these records or execute the RPCs.
