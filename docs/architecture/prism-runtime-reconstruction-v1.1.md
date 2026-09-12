# Prism Runtime Reconstruction v1.1

This approved reconstruction supersedes the mandatory delivery strategy in Runtime Constitution v1.0 without replacing the Prism Epistemic Contract. The Prism Response is the primary customer product. Governing Prism reasoning, epistemic restraint, authoritative identity, ownership, lineage, durable completion, idempotency, and failure-safe accounting remain unchanged.

## Runtime sequence

1. Verify the actor and entitlement without consuming credit.
2. Retrieve inquiry-specific resources and assemble the cached governing prompt.
3. Stream provisional Prism prose through `response_delta`.
4. Perform one bounded canonical audit.
5. Construct a deterministic compatibility artifact and atomically persist it.
6. Emit `canonical_complete`; the client may now continue the inquiry.
7. Optionally generate and persist Interpretive Context and select approved concept-library nodes.
8. Emit `interpretive_context`, `explore_context`, then `done`.

Provisional prose is neither canonical nor billable. The server-authoritative credit cost is consumed only by durable artifact completion. Context operations, restoration, sharing, and rendering never create an independent charge.

## Retired new-inquiry behavior

New inquiries do not generate the seven-card Prism Analysis, mandatory Key Terms, or their audit, repair, and retry ladders. Historical `prism_analysis` packets remain immutable and readable.

## Context contract

Interpretive Context is optional, inquiry-specific material that adds understanding instead of restating the response. Explore Context contains only server-validated references to the approved static concept library; models may select identifiers but may not generate library content.

## Client event contract

The active delivery events are `response_delta`, `canonical_complete`, `interpretive_context`, `explore_context`, and `done`, plus explicit terminal failure states. The browser renders server state and does not initiate generation during hydration, navigation, reconnect, or rendering.
