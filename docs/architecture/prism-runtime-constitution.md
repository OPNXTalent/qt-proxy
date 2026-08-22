# The Prism Runtime Constitution v1.0

**Status:** Frozen governing runtime specification  
**Version:** 1.0  
**Governs:** Prism Runtime v1.0 and every conforming client  
**Subordinate to:** The Prism Epistemic Contract (PEC) and its governing authorities

## 1. Purpose

This Constitution answers one software question: **What is an Interpretation Artifact?**

It defines the durable product boundary, lifecycle, delivery protocol, completion states, and client capabilities of a Prism inquiry. It does not prescribe model prompts, private reasoning procedures, storage technology, visual design, or model provider.

Runtime and client implementations may change. Observable semantics defined here may not change without a versioned constitutional amendment. Track 2 and later clients must express this contract rather than invent alternative response lifecycles.

Normative terms have their conventional meanings: **MUST** is required, **SHOULD** is presumed unless a documented constraint prevents it, and **MAY** is optional.

## 2. Interpretation Artifact

### 2.1 Definition

An **Interpretation Artifact** is the server-authoritative, sealed software product of one completed Prism inquiry revision.

It is not the transcript, a prompt, hidden chain-of-thought, a stream of model deltas, or the collection of every enrichment ever generated. It is the compact interpretive backbone from which the user-facing response and attached analysis derive.

An artifact MUST contain or reference:

- stable artifact and inquiry identifiers;
- its immutable revision number;
- the submitted query and relevant established inquiry ground;
- the proposition or question actually interpreted;
- applicable scope, jurisdiction, and governing authority;
- material observations, inferences, assumptions, and epistemic boundaries;
- the canonical thesis, conclusions, qualifications, and unresolved matters;
- provenance sufficient to inspect material retrieved ground without exposing secrets or private reasoning;
- creation and sealing timestamps;
- ownership and authorization references, kept separate from epistemic content;
- schema and Constitution versions;
- integrity metadata sufficient to detect corruption or incompatible replacement.

The artifact MAY contain structured constraint findings, confidence metadata, retrieval references, and presentation hints. Those are replaceable strategies rather than constitutional requirements.

### 2.2 Required properties

Every Interpretation Artifact is:

- **Immutable by revision.** A sealed revision is never edited in place.
- **Server authoritative.** Clients can request, cache, and acknowledge it but cannot create authority by changing local values.
- **Versioned.** Its identity and revision are explicit in every projection and mutation request.
- **Inspectable.** Authorized users can inspect the canonical response, attached analysis, material provenance, and revision history without receiving hidden chain-of-thought.
- **Shareable.** Once durably completed, it can become the canonical subject of a share or Circle of Trust relationship.
- **Recoverable.** The server can restore it independently of browser cache, installation state, or an interrupted delivery.

### 2.3 Lifecycle

The server MAY allocate an artifact identity while interpretation is underway, but the object remains an internal **artifact candidate**. It MUST NOT be described as a completed Interpretation Artifact, charged as a completed response, shared, archived as complete, or used as canonical inquiry ground until it is sealed.

Sealing requires:

1. sufficient interpretive ground for a standalone answer;
2. a canonical thesis and response projection;
3. the required epistemic audit;
4. successful durable commit of the artifact revision;
5. an idempotent completion record.

Later enrichments attach to the sealed artifact. They do not reopen or mutate it.

## 3. Artifact Revision

### 3.1 Revision identity

An artifact is addressed by `(artifactId, artifactRevision)`. The artifact ID preserves lineage; the revision identifies one immutable interpretation.

### 3.2 A new revision MUST be created when

- a follow-up materially changes the proposition, accepted ground, conclusion, qualification, or unresolved state;
- the user corrects a material representation of the user's position;
- new evidence or governing authority changes the canonical interpretation;
- The Prism discovers a material error or contradiction in the canonical response;
- an ownership-safe canonical copy intentionally continues the inquiry as a distinct lineage branch.

### 3.3 A new revision MUST NOT be created for

- delivery retries;
- duplicate packets or acknowledgments;
- regeneration of a failed enrichment packet from the same sealed artifact;
- changes in formatting, layout, device, installation mode, or accessibility presentation;
- opening, closing, refreshing, restoring, archiving, printing, or sharing;
- permission changes that do not alter epistemic content;
- additional Framework, Context, Key Terms, or Concept Card packets that only deepen the sealed interpretation;
- provider substitution that produces semantically equivalent projections of the same artifact.

### 3.4 Correction

A material correction creates a superseding revision. The prior revision remains recoverable and is marked superseded, not erased. Every correction MUST identify what changed and which downstream packets are no longer current.

No enrichment packet may silently correct a canonical response.

## 4. Progressive Inquiry Delivery

Packets are typed, server-issued projections associated with one artifact revision. Their delivery order is canonical even when transport retries occur.

### Packet 1 — Inquiry Orientation

Contains:

- recognition of the proposition or question being addressed;
- relevant inquiry scope or jurisdiction;
- a concise orientation toward the interpretive issue;
- only qualifications necessary to prevent a misleading first impression.

Orientation is not an authoritative answer and MUST NOT announce a conclusion absent from the sealed artifact. It exists to establish meaningful contact early.

### Packet 2 — Canonical Response

Contains:

- a direct, standalone answer to the submitted query;
- the canonical thesis and material reasoning necessary to understand it;
- warranted qualifications, uncertainty, and unresolved limits;
- the artifact identity, revision, and durable-completion status.

Packet 2 is the minimum sufficient Prism product. It MUST pass the required audit before release. Framework generation and other enrichment MUST NOT block its completion.

### Packet 3 — Interpretive Context

Contains only context relevant to the sealed interpretation, such as:

- textual, historical, scientific, philosophical, legal, or practical context;
- material source references and provenance;
- domain-specific distinctions;
- boundaries showing what the context establishes and what remains inferred.

Context MUST NOT become an unrelated source dump or silently expand the canonical claim.

### Packet 4 — Prism Analysis

Contains inspectable analysis of how the interpretation stands under relevant constraints. It MAY include:

- Framework or Constraint Quadrant findings;
- observations and inference boundaries;
- logical tensions and closure;
- relational implications;
- key terms and material distinctions;
- confidence or unresolved-state metadata.

This packet supplies inspection, not hidden chain-of-thought.

### Packet 5+ — Future enrichments

Future packet types MAY include Concept Cards, multimodal evidence, comparative readings, source expansions, or other bounded enrichments. A new packet type must preserve this Constitution and declare its schema, dependencies, permissions, and retry semantics.

### 4.1 Packet envelope

Every packet MUST include:

```text
constitutionVersion
packetSchemaVersion
inquiryId
artifactId
artifactRevision
packetId
packetType
sequence
status
dependencies
createdAt
content
```

Material provenance and integrity metadata MUST be included or referenced where applicable. Authorization data MUST remain outside user-visible epistemic content.

## 5. Packet Invariants

For one sealed artifact revision, every packet MUST:

1. derive from that Interpretation Artifact;
2. deepen, clarify, evidence, or expose the interpretation rather than replace it;
3. never materially contradict the canonical thesis, conclusions, qualifications, or epistemic boundaries;
4. remain idempotent under delivery, acknowledgment, and retry;
5. preserve its declared sequence and dependencies;
6. remain attributable to exactly one artifact revision;
7. observe the artifact's ownership, privacy, and sharing authorization;
8. preserve PEC requirements, including epistemic type integrity, proportional warrant, symmetry, continuity, and corrigibility.

“Never contradict” applies within one artifact revision. Corrigibility is preserved through an explicit superseding revision, never through silent packet drift.

A packet failing an invariant MUST be rejected or marked failed. It MUST NOT mutate the artifact or become accepted inquiry ground.

## 6. Completion Semantics

### 6.1 Canonical lifecycle

The logical lifecycle is:

```text
Query accepted
→ Interpretation Artifact constructed and audited
→ Canonical Response finalized
→ Artifact and completion record durably persisted
→ Credit settled idempotently
→ Canonical completion emitted
→ Sharing, archiving, continuation, and recovery enabled
→ Progressive analysis continues
```

Persistence and credit settlement MUST form one idempotent completion boundary. They MAY use one transaction or a recoverable server-side workflow, but the system MUST NOT double-charge, lose a paid artifact, or expose a client-controlled charging bypass.

If quota reservation is necessary at submission, it is not a charge. The reservation MUST be released when canonical completion fails.

Client receipt acknowledgment confirms transport only. It MUST NOT authorize charging or determine whether the artifact exists.

### 6.2 Exact activation points

| Capability or event | Activation point |
|---|---|
| Charge | Once, at durable canonical completion; never for enrichment retry |
| Core persistence | Before canonical completion is announced |
| Inquiry continuation | After durable canonical completion |
| Archive | After durable canonical completion |
| Share creation | After durable canonical completion and ownership/authorization validation |
| Circle of Trust invitation | After a durable canonical share subject exists |
| Circle of Trust participation | After server-authorized acceptance or access establishment, according to permission policy |
| Canonical-response notification | After durable completion and only under recipient authorization/preferences |
| Enrichment notification | After that enrichment packet is durably attached and only when explicitly supported and authorized |
| Recovery | Immediately after durable completion, regardless of enrichment state |

Sharing an artifact does not mutate it. Joining a Circle of Trust changes relationships and permissions, not canonical epistemic content.

### 6.3 Completion states

- **Response pending:** no sealed artifact exists.
- **Response complete:** the artifact and canonical response are durable, the completion boundary has settled, and canonical capabilities are enabled.
- **Analysis pending:** one or more optional packets are expected.
- **Analysis complete:** all currently requested packets are durably attached.
- **Analysis incomplete:** the canonical response succeeded, but at least one requested packet failed or was interrupted.

“Complete Response” means Orientation plus Canonical Response at durable completion. It does not mean all optional analysis is complete.

## 7. Failure Semantics

Failures are isolated to the smallest valid boundary.

| Failure | Required behavior |
|---|---|
| Artifact construction or canonical audit fails | No completed response, no completion charge, no share/archive activation; retry the response |
| Durable completion is uncertain | Recover or reconcile by idempotency key before reporting success or charging again |
| Canonical packet delivery is interrupted after completion | Restore the existing artifact and packet; do not regenerate or recharge |
| Interpretive Context fails | Mark Context incomplete; retry only Context against the same artifact revision |
| Framework/Prism Analysis fails | Mark Analysis incomplete; retry only Analysis against the same artifact revision |
| Future enrichment fails | Mark only that enrichment incomplete; preserve all successful packets |
| Packet arrives twice | Detect the same packet ID/idempotency key and ignore the duplicate after acknowledging it |
| Packet arrives out of order | Hold it until dependencies exist or request missing packets; do not attach it incorrectly |
| Packet contradicts the artifact | Reject it, record the failure, and retry; create a new revision only if the artifact itself is wrong |
| Authorization changes during generation | Re-evaluate authorization before attachment or delivery; never leak the packet |
| Client closes, refreshes, or changes platform | Preserve server work; restore completed packets and resume eligible pending enrichment |

The canonical user message after an enrichment failure is:

> Response succeeded. Prism Analysis is incomplete. Retry Analysis.

The message SHOULD name the failed packet rather than imply the entire response failed.

Retries MUST be idempotent, bounded, authorized server-side, and free of additional completion charges.

## 8. UX Contract

The client may present stages differently, but capabilities are fixed:

| Stage reached | User capabilities |
|---|---|
| Query accepted | Cancel the pending request where supported; cannot share, archive as complete, or continue from canonical ground |
| Orientation visible | Read Orientation; cannot yet share, archive as complete, or submit a canonical follow-up |
| Canonical Response durable | Read, continue the conversation, share if authorized, archive, print/copy, refresh, close, and recover |
| Context attached | Inspect or collapse Context; canonical capabilities remain available |
| Prism Analysis attached | Inspect or collapse Framework and analysis; canonical capabilities remain available |
| Analysis incomplete | Continue using the response; retry only failed packets |

The query composer becomes available for a follow-up after durable canonical completion. It MUST NOT wait for enrichment.

If a follow-up begins while prior enrichment continues, the follow-up creates a new artifact revision. Prior jobs MUST either remain strictly attached to the prior revision or be cancelled. They MUST NOT contaminate the new revision.

Clients MUST distinguish clearly among:

- Orienting;
- Responding;
- Response complete;
- Prism Analysis in progress;
- Prism Analysis incomplete;
- Prism Analysis complete.

Raw model deltas, malformed structured output, unaudited drafts, and hidden reasoning MUST NOT be exposed as canonical content.

## 9. Mobile and Platform Contract

Desktop browser, installed PWA, mobile browser, and native applications MUST implement the same artifact, packet, completion, charging, authorization, and failure semantics.

Platforms MAY differ in presentation:

- Desktop MAY show Context and Analysis beside or below the response.
- Mobile and PWA MAY collapse enrichments behind **Continue Reading** or expandable cards.
- Native clients MAY use background delivery and authorized notifications.
- Any client MAY defer downloading optional heavy packets until requested.

Platforms MUST NOT differ in:

- canonical reasoning quality;
- packet meaning or order;
- artifact identity and revision;
- charge timing;
- share and Circle of Trust identity;
- recovery source of truth;
- anonymous versus registered epistemic behavior.

Service workers and local caches are delivery accelerators only. They MUST NOT override a newer server revision, manufacture completion, activate entitlement, or become canonical inquiry state.

Native and PWA background execution MAY continue enrichment after the interface closes. Reopening on any platform MUST restore the same canonical artifact and the latest authorized attached packets.

## 10. Identity, Ownership, and Circle of Trust

Identity, session, inquiry, artifact, and ownership are separate concepts.

- Authentication establishes a verified identity.
- A session carries current authorization but is not the artifact.
- An inquiry supplies lineage across artifact revisions.
- An artifact revision supplies immutable epistemic content.
- Ownership and Circle of Trust relationships govern permitted actions around that content.

Anonymous and registered users MUST receive the same core artifact quality, progression, packet meanings, and epistemic behavior. Identity may change retention, ownership, subscription allowance, restoration, sharing, and participation rights only where authorization requires it.

A share MUST reference canonical artifact identity, not a copied screen or platform-local transcript. Circle of Trust activity MUST preserve lineage and permission boundaries across browser, PWA, and future native clients.

## 11. Conformance

A runtime or client conforms to Constitution v1.0 only when observable behavior satisfies all MUST requirements.

Conformance MUST be tested through behavior, including:

- canonical completion and exactly-once charging;
- refresh and cross-platform recovery;
- duplicate, missing, failed, and out-of-order packets;
- enrichment retry without canonical mutation or recharge;
- correction through a superseding revision;
- concurrent follow-up while enrichment is pending;
- anonymous and registered experience parity;
- share and Circle of Trust lineage and authorization;
- stale cache and interrupted transport behavior.

Possessing matching prompt language or rendering similarly named sections does not establish conformance.

## 12. Frozen Boundary

Runtime Constitution v1.0 freezes these architectural semantics:

1. The Interpretation Artifact is the immutable, server-authoritative product boundary.
2. One sealed artifact revision is the source of truth for every packet attached to it.
3. Canonical Response completion is independent of optional analysis completion.
4. Charging and durable canonical persistence share one idempotent server-controlled completion boundary.
5. Enrichment failures are isolated and retryable without invalidating or recharging the response.
6. Material correction occurs through explicit revision, preserving history and corrigibility.
7. Sharing and Circle of Trust preserve canonical artifact identity and lineage.
8. Platform and identity differences may alter capabilities, not epistemic semantics.

The following remain freely replaceable: model provider, prompt architecture, reducer, Constraint Gate implementation, audit mechanism, retrieval system, database, queue, stream transport, packet presentation, cache implementation, and client framework.

Any proposed change to a frozen semantic requires:

- a named constitutional amendment;
- the defect or incompatibility requiring it;
- the exact affected invariant;
- migration and backward-compatibility consequences;
- evidence that a subordinate implementation change cannot solve the problem.

New features MUST conform to this Constitution. They MUST NOT redefine it implicitly.

## 13. Governance Relationship

This Constitution implements runtime semantics beneath the PEC. It does not replace The Prism Constitution, PEC, Runtime release specifications, or source code responsibilities.

The governing direction is:

**Governing authority in its proper domain → The Prism Constitution → PEC → Runtime Constitution → release specifications → implementation and clients.**

If this Runtime Constitution conflicts with PEC, PEC governs. If implementation conflicts with this Constitution, implementation must relent or pursue an explicit constitutional amendment.

---

**Freeze declaration:** Runtime Constitution v1.0 is the final architectural baseline for Prism Runtime v1.0. Phase II work after approval is engineering and verification against this contract, not architectural invention.
