# Curated Prism Learning

The Prism improves through a private, owner-reviewed retrieval layer. This is not foundation-model training.

## Flow

1. The existing follow-up reducer determines whether an exchange produced a durable, generally applicable lesson.
2. Eligible lessons are de-identified before they leave the request process. The candidate contains no user, account, thread, share, note, or message identifiers and no conversation quotation.
3. The candidate is written to `public.prism_learning_candidates` with `pending` status. Pending candidates never enter a response prompt.
4. The owner reviews the candidate in the Supabase Table Editor. The owner may edit its topic, lesson, applicability, boundaries, or tags, then sets `status` to `approved` or `rejected`.
5. Approval copies the reviewed content into `public.prism_approved_learning`. Rejection disables any previously approved version.
6. Relevant approved lessons are retrieved in parallel with corpus retrieval and included as bounded, secondary guidance.

## Exclusions

- Private Notes
- Circle of Trust and all other shared or collaborative exchanges
- Names, emails, account IDs, thread IDs, or source-conversation links
- Personal events, inferred religious affiliation, and user profiles
- Mere disagreement or preference without a reusable reasoning lesson

## Authority Boundary

Approved lessons can refine reasoning and presentation. They cannot override Scripture, the governing Prism framework, retrieved source material, or the evidence before the present inquiry.

## Review Procedure

In Supabase, open `prism_learning_candidates` and filter `status = pending`. Review the lesson as a stand-alone rule. Confirm that it is generalizable, de-identified, accurate, and bounded. Edit if needed, then change `status` to `approved`. No application-side permission prompt or user-facing review control is part of this flow.
