-- Persistent Inquiry Runtime: additive, versioned canonical state.
-- Existing threads, responses, and follow_ups are intentionally untouched.

create table if not exists public.inquiry_states (
  inquiry_key text primary key,
  thread_id uuid null references public.threads(id) on delete cascade,
  owner_user_id uuid null references public.subscribers(id) on delete cascade,
  version integer not null default 0 check (version >= 0),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.inquiry_state_versions (
  inquiry_key text not null,
  version integer not null check (version >= 1),
  state jsonb not null,
  request_id text null,
  created_at timestamptz not null default now(),
  primary key (inquiry_key, version)
);

create index if not exists inquiry_states_thread_id_idx
  on public.inquiry_states(thread_id);

alter table public.inquiry_states enable row level security;
alter table public.inquiry_state_versions enable row level security;

-- Atomic optimistic commit. The immutable versions table preserves the last
-- valid committed representation if a stream is interrupted or tabs race.
create or replace function public.commit_inquiry_state(
  p_inquiry_key text,
  p_expected_version integer,
  p_state jsonb,
  p_thread_id uuid default null,
  p_owner_user_id uuid default null,
  p_request_id text default null
) returns table(committed boolean, current_version integer, current_state jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current inquiry_states%rowtype;
  v_next_version integer;
  v_committed_state jsonb;
begin
  if p_inquiry_key is null or length(p_inquiry_key) < 12 or p_state is null then
    raise exception 'invalid inquiry state commit';
  end if;

  -- Serializes first commits as well as updates for the same inquiry key.
  perform pg_advisory_xact_lock(hashtext(p_inquiry_key));

  select * into v_current
  from inquiry_states
  where inquiry_key = p_inquiry_key
  for update;

  if found and v_current.version <> p_expected_version then
    return query select false, v_current.version, v_current.state;
    return;
  end if;

  if not found and p_expected_version <> 0 then
    return query select false, 0, null::jsonb;
    return;
  end if;

  v_next_version := p_expected_version + 1;
  v_committed_state := jsonb_set(
    p_state,
    '{version}',
    to_jsonb(v_next_version),
    true
  );
  insert into inquiry_state_versions(inquiry_key, version, state, request_id)
  values (p_inquiry_key, v_next_version, v_committed_state, p_request_id);

  insert into inquiry_states(
    inquiry_key, thread_id, owner_user_id, version, state, updated_at
  ) values (
    p_inquiry_key, p_thread_id, p_owner_user_id, v_next_version, v_committed_state, now()
  )
  on conflict (inquiry_key) do update set
    thread_id = coalesce(inquiry_states.thread_id, excluded.thread_id),
    owner_user_id = coalesce(inquiry_states.owner_user_id, excluded.owner_user_id),
    version = excluded.version,
    state = excluded.state,
    updated_at = now();

  return query select true, v_next_version, v_committed_state;
end;
$$;

revoke all on function public.commit_inquiry_state(
  text, integer, jsonb, uuid, uuid, text
) from public;
