# Prism Runtime Reconstruction v1.1

This approved reconstruction supersedes the mandatory delivery strategy in Runtime Constitution v1.0 without replacing the Prism Epistemic Contract. The Prism Response is the primary customer product. Governing Prism reasoning, epistemic restraint, authoritative identity, ownership, lineage, durable completion, idempotency, and failure-safe accounting remain unchanged.

## Runtime sequence

1. Verify the actor and entitlement without consuming credit.
2. Retrieve inquiry-specific resources and assemble the cached governing prompt.
3. Stream provisional Prism prose through `response_delta`.
4. Perform one bounded canonical audit.
5. Construct a deterministic compatibility artifact and atomically persist it.
6. Emit `canonical_complete`; the client may now continue the inquiry.
7. Emit `done` immediately after durable canonical completion.

Provisional prose is neither canonical nor billable. The server-authoritative credit cost is consumed only by durable artifact completion. Context operations, restoration, sharing, and rendering never create an independent charge.

## Retired new-inquiry behavior

New inquiries do not generate the seven-card Prism Analysis, mandatory Key Terms, or their audit, repair, and retry ladders. Historical `prism_analysis` packets remain immutable and readable.

## Archived context compatibility

Interpretive Context and Explore Context are retired for new inquiries. Previously stored context packets remain immutable and readable so existing archives continue to render correctly.

## Client event contract

The active delivery events are `response_delta`, `canonical_complete`, and `done`, plus explicit terminal failure states. The browser retains backward-compatible rendering for context packets already stored in archived sessions, but new inquiries do not generate or attach them. The browser renders server state and does not initiate generation during hydration, navigation, reconnect, or rendering.
