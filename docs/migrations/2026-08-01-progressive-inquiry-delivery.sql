-- Runtime Constitution v1.0: immutable Interpretation Artifacts and packets.
-- Additive and backend-only. Apply to Preview before enabling progressive delivery.

create table if not exists public.interpretation_artifacts (
  artifact_id uuid not null,
  artifact_revision integer not null check (artifact_revision >= 1),
  inquiry_id text not null,
  inquiry_key text not null,
  thread_id uuid null references public.threads(id) on delete set null,
  owner_user_id uuid null references auth.users(id) on delete set null,
  completion_key text not null unique,
  constitution_version text not null,
  schema_version integer not null,
  query text not null,
  artifact jsonb not null,
  canonical_response text not null,
  status text not null default 'sealed' check (status = 'sealed'),
  created_at timestamptz not null default now(),
  sealed_at timestamptz not null default now(),
  primary key (artifact_id, artifact_revision)
);

create table if not exists public.interpretation_packets (
  packet_id text primary key,
  artifact_id uuid not null,
  artifact_revision integer not null,
  packet_type text not null,
  sequence integer not null check (sequence >= 1),
  status text not null check (status in ('complete', 'failed')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (artifact_id, artifact_revision, sequence),
  foreign key (artifact_id, artifact_revision)
    references public.interpretation_artifacts(artifact_id, artifact_revision)
    on delete cascade
);

create index if not exists interpretation_artifacts_inquiry_idx
  on public.interpretation_artifacts(inquiry_key, artifact_revision desc);
create index if not exists interpretation_artifacts_thread_idx
  on public.interpretation_artifacts(thread_id, artifact_revision desc);

alter table public.interpretation_artifacts enable row level security;
alter table public.interpretation_packets enable row level security;
revoke all on table public.interpretation_artifacts from anon, authenticated;
revoke all on table public.interpretation_packets from anon, authenticated;
grant select, insert on table public.interpretation_artifacts to service_role;
grant select, insert, update on table public.interpretation_packets to service_role;

-- The insert is the canonical idempotency boundary. Usage is recorded only for
-- the first successful completion. query_log remains the authoritative quota
-- source; subscriber counters are intentionally outside this transaction.
create or replace function public.complete_interpretation_artifact(
  p_artifact_id uuid,
  p_artifact_revision integer,
  p_inquiry_id text,
  p_inquiry_key text,
  p_thread_id uuid,
  p_owner_user_id uuid,
  p_completion_key text,
  p_constitution_version text,
  p_schema_version integer,
  p_query text,
  p_artifact jsonb,
  p_canonical_response text,
  p_orientation_packet jsonb,
  p_canonical_packet jsonb,
  p_charge boolean default false,
  p_usage_query_type text default null,
  p_usage_credit_source text default null,
  p_usage_channel_context text default 'solo',
  p_thread_payload jsonb default null
) returns table(completed boolean, already_completed boolean, thread_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
  v_credit_drawn boolean;
  v_thread_id uuid := p_thread_id;
begin
  if p_artifact_revision < 1
    or p_inquiry_id is null
    or p_inquiry_key is null
    or p_completion_key is null
    or p_artifact is null
    or p_canonical_response is null then
    raise exception 'invalid artifact completion';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_completion_key));

  if exists (
    select 1 from public.interpretation_artifacts a
    where a.completion_key = p_completion_key
  ) then
    return query
      select true, true, a.thread_id
      from public.interpretation_artifacts a
      where a.completion_key = p_completion_key;
    return;
  end if;

  if v_thread_id is null and p_owner_user_id is not null and p_thread_payload is not null then
    insert into public.threads(
      user_id, title, query, response, query_type, tier_at_creation,
      retention_days, expires_at, grace_ends_at
    ) values (
      p_owner_user_id,
      p_thread_payload->>'title',
      p_query,
      coalesce(p_thread_payload->'response', '{}'::jsonb),
      coalesce(p_thread_payload->>'query_type', 'free_text'),
      coalesce(p_thread_payload->>'tier_at_creation', 'free'),
      coalesce((p_thread_payload->>'retention_days')::integer, 7),
      (p_thread_payload->>'expires_at')::timestamptz,
      (p_thread_payload->>'grace_ends_at')::timestamptz
    ) returning id into v_thread_id;
  end if;

  insert into public.interpretation_artifacts(
    artifact_id, artifact_revision, inquiry_id, inquiry_key, thread_id,
    owner_user_id, completion_key, constitution_version, schema_version,
    query, artifact, canonical_response
  ) values (
    p_artifact_id, p_artifact_revision, p_inquiry_id, p_inquiry_key, v_thread_id,
    p_owner_user_id, p_completion_key, p_constitution_version, p_schema_version,
    p_query, p_artifact, p_canonical_response
  ) on conflict (completion_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return query
      select true, true, a.thread_id
      from public.interpretation_artifacts a
      where a.completion_key = p_completion_key;
    return;
  end if;

  insert into public.interpretation_packets(
    packet_id, artifact_id, artifact_revision, packet_type, sequence, status, content
  ) values
    (p_orientation_packet->>'packetId', p_artifact_id, p_artifact_revision,
      p_orientation_packet->>'packetType', 1, 'complete', p_orientation_packet->'content'),
    (p_canonical_packet->>'packetId', p_artifact_id, p_artifact_revision,
      p_canonical_packet->>'packetType', 2, 'complete', p_canonical_packet->'content');

  if p_charge then
    if p_usage_credit_source = 'signal_credit' then
      select public.draw_signal_credit(p_owner_user_id) into v_credit_drawn;
      if not coalesce(v_credit_drawn, false) then
        raise exception 'signal credit unavailable at completion';
      end if;
    end if;
    insert into public.query_log(
      user_id, thread_id, query_type, credit_source, cost, channel_context
    ) values (
      p_owner_user_id, v_thread_id, p_usage_query_type,
      p_usage_credit_source, 1, p_usage_channel_context
    );
  end if;

  return query select true, false, v_thread_id;
end;
$$;

revoke all on function public.complete_interpretation_artifact(
  uuid, integer, text, text, uuid, uuid, text, text, integer, text, jsonb,
  text, jsonb, jsonb, boolean, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_interpretation_artifact(
  uuid, integer, text, text, uuid, uuid, text, text, integer, text, jsonb,
  text, jsonb, jsonb, boolean, text, text, text, jsonb
) to service_role;

create or replace function public.attach_interpretation_packet(
  p_packet_id text,
  p_artifact_id uuid,
  p_artifact_revision integer,
  p_packet_type text,
  p_sequence integer,
  p_status text,
  p_content jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.interpretation_packets(
    packet_id, artifact_id, artifact_revision, packet_type, sequence, status, content
  ) values (
    p_packet_id, p_artifact_id, p_artifact_revision, p_packet_type,
    p_sequence, p_status, p_content
  ) on conflict (packet_id) do nothing;

  return (
    select jsonb_build_object(
      'packetId', p.packet_id,
      'artifactId', p.artifact_id,
      'artifactRevision', p.artifact_revision,
      'packetType', p.packet_type,
      'sequence', p.sequence,
      'status', p.status,
      'content', p.content
    )
    from public.interpretation_packets p
    where p.packet_id = p_packet_id
  );
end;
$$;

revoke all on function public.attach_interpretation_packet(
  text, uuid, integer, text, integer, text, jsonb
) from public, anon, authenticated;
grant execute on function public.attach_interpretation_packet(
  text, uuid, integer, text, integer, text, jsonb
) to service_role;

-- Follow-up completion binds the inquiry-state revision and artifact revision
-- in one transaction. A stale state conflict creates no artifact or charge.
create or replace function public.complete_followup_interpretation_artifact(
  p_expected_state_version integer,
  p_inquiry_state jsonb,
  p_request_id text,
  p_artifact_id uuid,
  p_artifact_revision integer,
  p_inquiry_id text,
  p_inquiry_key text,
  p_thread_id uuid,
  p_owner_user_id uuid,
  p_completion_key text,
  p_constitution_version text,
  p_schema_version integer,
  p_query text,
  p_artifact jsonb,
  p_canonical_response text,
  p_orientation_packet jsonb,
  p_canonical_packet jsonb
) returns table(
  completed boolean,
  conflict boolean,
  state_version integer,
  canonical_state jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state record;
  v_artifact record;
begin
  select * into v_state from public.commit_inquiry_state(
    p_inquiry_key, p_expected_state_version, p_inquiry_state,
    p_thread_id, p_owner_user_id, p_request_id
  );
  if not v_state.committed then
    return query select false, true, v_state.current_version, v_state.current_state;
    return;
  end if;

  select * into v_artifact from public.complete_interpretation_artifact(
    p_artifact_id, p_artifact_revision, p_inquiry_id, p_inquiry_key,
    p_thread_id, p_owner_user_id, p_completion_key,
    p_constitution_version, p_schema_version, p_query, p_artifact,
    p_canonical_response, p_orientation_packet, p_canonical_packet,
    false, null, null, 'solo', null
  );
  if not v_artifact.completed then
    raise exception 'artifact completion failed';
  end if;
  return query select true, false, v_state.current_version, v_state.current_state;
end;
$$;

revoke all on function public.complete_followup_interpretation_artifact(
  integer, jsonb, text, uuid, integer, text, text, uuid, uuid, text,
  text, integer, text, jsonb, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_followup_interpretation_artifact(
  integer, jsonb, text, uuid, integer, text, text, uuid, uuid, text,
  text, integer, text, jsonb, text, jsonb, jsonb
) to service_role;
