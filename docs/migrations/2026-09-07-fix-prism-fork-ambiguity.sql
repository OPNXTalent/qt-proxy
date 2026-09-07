-- Issue #13 deployment correction: qualify artifact columns that overlap the
-- table-returning function's PL/pgSQL output variable names.

create or replace function public.fork_shared_prism_inquiry(p_share_id uuid, p_user_id uuid)
returns table(fork_thread_id uuid, fork_artifact_id uuid, artifact_revision integer, already_forked boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_share public.shares%rowtype;
  v_source public.interpretation_artifacts%rowtype;
  v_source_thread public.threads%rowtype;
  v_existing public.prism_inquiry_forks%rowtype;
  v_thread_id uuid := gen_random_uuid();
  v_artifact_id uuid := gen_random_uuid();
  v_inquiry_key text := 'server:fork:' || gen_random_uuid()::text;
begin
  select * into v_existing from public.prism_inquiry_forks
    where share_id = p_share_id and owner_user_id = p_user_id;
  if found then
    return query select v_existing.fork_thread_id, v_existing.fork_artifact_id, 1, true;
    return;
  end if;
  select * into v_share from public.shares where id = p_share_id and status = 'active' and revoked_at is null for share;
  if not found then raise exception 'PRISM_SHARE_UNAVAILABLE'; end if;
  select * into v_source from public.interpretation_artifacts a
    where a.artifact_id = v_share.artifact_id and a.artifact_revision = v_share.artifact_revision;
  if not found then raise exception 'PRISM_SOURCE_ARTIFACT_MISSING'; end if;
  select * into v_source_thread from public.threads where id = v_source.thread_id;
  if not found then raise exception 'PRISM_SOURCE_THREAD_MISSING'; end if;

  insert into public.threads(id, user_id, guest_id, title, query, response, query_type,
    tier_at_creation, retention_days, expires_at, grace_ends_at)
  values (v_thread_id, p_user_id, null, v_source_thread.title, v_source.query,
    v_source_thread.response, v_source_thread.query_type, v_source_thread.tier_at_creation,
    v_source_thread.retention_days, v_source_thread.expires_at, v_source_thread.grace_ends_at);

  insert into public.prism_inquiry_principals(inquiry_key, principal_type, user_id)
    values (v_inquiry_key, 'user', p_user_id);
  insert into public.interpretation_artifacts(
    artifact_id, artifact_revision, inquiry_id, inquiry_key, thread_id, owner_user_id,
    guest_id, completion_key, constitution_version, schema_version, query, artifact,
    canonical_response, customer_query_cost
  ) values (
    v_artifact_id, 1, 'fork:' || v_artifact_id::text, v_inquiry_key, v_thread_id, p_user_id,
    null, 'fork:' || p_share_id::text || ':' || p_user_id::text,
    v_source.constitution_version, v_source.schema_version, v_source.query, v_source.artifact,
    v_source.canonical_response, 0
  );
  insert into public.interpretation_packets(packet_id, artifact_id, artifact_revision,
    packet_type, sequence, status, content)
    select gen_random_uuid()::text, v_artifact_id, 1, p.packet_type, p.sequence, p.status, p.content
    from public.interpretation_packets p
    where p.artifact_id = v_source.artifact_id and p.artifact_revision = v_source.artifact_revision;
  insert into public.prism_inquiry_forks(share_id, source_thread_id, source_artifact_id,
    source_artifact_revision, fork_thread_id, fork_artifact_id, owner_user_id)
  values (p_share_id, v_source.thread_id, v_source.artifact_id, v_source.artifact_revision,
    v_thread_id, v_artifact_id, p_user_id);
  return query select v_thread_id, v_artifact_id, 1, false;
end;
$$;

revoke all on function public.fork_shared_prism_inquiry(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fork_shared_prism_inquiry(uuid, uuid) to service_role;
