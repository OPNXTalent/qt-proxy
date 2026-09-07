-- Issue #13: server-authoritative Query accounting and secure guest ownership.
-- The Supabase CLI is unavailable in this workspace; this repository's
-- established docs/migrations convention is used for the reviewed migration.

begin;

create table if not exists public.prism_guests (
  guest_id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique check (length(secret_hash) = 64),
  claimed_by uuid null references auth.users(id) on delete set null,
  claimed_at timestamptz null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.prism_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'past_due', 'canceled')),
  subscription_period_start timestamptz null,
  subscription_period_end timestamptz null,
  subscription_allowance integer not null default 35 check (subscription_allowance >= 0),
  subscription_used integer not null default 0 check (subscription_used >= 0),
  bank_balance integer not null default 0 check (bank_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.prism_pending_entitlements (
  email text primary key,
  bank_balance integer not null default 0 check (bank_balance >= 0),
  subscription_status text not null default 'inactive',
  subscription_period_start timestamptz null,
  subscription_period_end timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.prism_fulfillment_events (
  fulfillment_key text primary key,
  fulfillment_type text not null check (fulfillment_type in ('query_bank')),
  email text not null,
  quantity integer not null check (quantity in (10, 25)),
  created_at timestamptz not null default now()
);

create table if not exists public.prism_query_ledger (
  usage_id uuid primary key default gen_random_uuid(),
  completion_key text not null unique,
  principal_type text not null check (principal_type in ('guest', 'user')),
  guest_id uuid null references public.prism_guests(guest_id) on delete restrict,
  user_id uuid null references auth.users(id) on delete restrict,
  thread_id uuid null references public.threads(id) on delete set null,
  artifact_id uuid not null,
  artifact_revision integer not null check (artifact_revision >= 1),
  submission_type text not null check (submission_type in ('primary', 'follow_up')),
  entitlement_source text not null check (entitlement_source in ('explorer', 'subscription', 'bank', 'preview')),
  query_cost integer not null default 1 check (query_cost = 1),
  created_at timestamptz not null default now(),
  check (
    (principal_type = 'guest' and guest_id is not null and user_id is null)
    or (principal_type = 'user' and user_id is not null and guest_id is null)
  )
);

create table if not exists public.prism_inquiry_principals (
  inquiry_key text primary key,
  principal_type text not null check (principal_type in ('guest', 'user')),
  guest_id uuid null references public.prism_guests(guest_id) on delete restrict,
  user_id uuid null references auth.users(id) on delete restrict,
  preview_allowance integer null check (preview_allowance between 1 and 200),
  created_at timestamptz not null default now(),
  check (
    (principal_type = 'guest' and guest_id is not null and user_id is null)
    or (principal_type = 'user' and user_id is not null and guest_id is null)
  )
);

create index if not exists prism_query_ledger_guest_time_idx
  on public.prism_query_ledger(guest_id, created_at desc) where guest_id is not null;
create index if not exists prism_query_ledger_user_time_idx
  on public.prism_query_ledger(user_id, created_at desc) where user_id is not null;

alter table public.threads alter column user_id drop not null;
alter table public.threads add column if not exists guest_id uuid null references public.prism_guests(guest_id) on delete set null;
alter table public.threads drop constraint if exists threads_owner_exactly_one;
alter table public.threads add constraint threads_owner_exactly_one check (
  (user_id is not null and guest_id is null) or (user_id is null and guest_id is not null)
) not valid;
alter table public.interpretation_artifacts add column if not exists guest_id uuid null references public.prism_guests(guest_id) on delete set null;
alter table public.interpretation_artifacts add column if not exists customer_query_cost integer not null default 1
  check (customer_query_cost in (0, 1));

alter table public.shares add column if not exists owner_user_id uuid null references auth.users(id) on delete cascade;
alter table public.shares add column if not exists artifact_id uuid null;
alter table public.shares add column if not exists artifact_revision integer null check (artifact_revision >= 1);
alter table public.shares add column if not exists permission text not null default 'viewer'
  check (permission in ('viewer', 'contributor'));
alter table public.shares add column if not exists revoked_at timestamptz null;
update public.shares s set owner_user_id = u.id
  from auth.users u where s.owner_user_id is null and lower(s.sender_email) = lower(u.email);

create table if not exists public.trust_circle_members (
  membership_id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  guest_id uuid null references public.prism_guests(guest_id) on delete set null,
  display_name text null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check ((user_id is not null)::integer + (guest_id is not null)::integer = 1)
);
create table if not exists public.prism_inquiry_forks (
  fork_id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete restrict,
  source_thread_id uuid not null references public.threads(id) on delete restrict,
  source_artifact_id uuid not null,
  source_artifact_revision integer not null check (source_artifact_revision >= 1),
  fork_thread_id uuid not null unique references public.threads(id) on delete restrict,
  fork_artifact_id uuid not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (share_id, owner_user_id)
);
create unique index if not exists trust_circle_members_share_user_idx
  on public.trust_circle_members(share_id, user_id) where user_id is not null;
create unique index if not exists trust_circle_members_share_guest_idx
  on public.trust_circle_members(share_id, guest_id) where guest_id is not null;

alter table public.prism_guests enable row level security;
alter table public.prism_entitlements enable row level security;
alter table public.prism_query_ledger enable row level security;
alter table public.prism_inquiry_principals enable row level security;
alter table public.prism_pending_entitlements enable row level security;
alter table public.prism_fulfillment_events enable row level security;
alter table public.trust_circle_members enable row level security;
alter table public.prism_inquiry_forks enable row level security;
revoke all on table public.prism_guests, public.prism_entitlements, public.prism_pending_entitlements, public.prism_fulfillment_events, public.prism_query_ledger, public.prism_inquiry_principals from public, anon, authenticated;
revoke all on table public.trust_circle_members from public, anon, authenticated;
revoke all on table public.prism_inquiry_forks from public, anon, authenticated;
grant select, insert, update on table public.prism_guests, public.prism_entitlements, public.prism_pending_entitlements, public.prism_fulfillment_events, public.prism_query_ledger, public.prism_inquiry_principals, public.trust_circle_members, public.prism_inquiry_forks to service_role;

create or replace function public.prism_query_access(
  p_guest_id uuid default null,
  p_user_id uuid default null,
  p_preview_allowance integer default null
) returns table(allowed boolean, entitlement_source text, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_entitlement public.prism_entitlements%rowtype;
  v_used integer;
  v_reset timestamptz;
begin
  if (p_guest_id is null) = (p_user_id is null) then raise exception 'PRISM_PRINCIPAL_INVALID'; end if;
  if p_preview_allowance is not null then
    select count(*) into v_used from public.prism_query_ledger
      where user_id = p_user_id and entitlement_source = 'preview';
    return query select v_used < p_preview_allowance, 'preview'::text,
      greatest(p_preview_allowance - v_used, 0), null::timestamptz;
    return;
  end if;
  if p_user_id is not null then
    select * into v_entitlement from public.prism_entitlements where user_id = p_user_id;
    if found and v_entitlement.subscription_status = 'active'
      and now() >= v_entitlement.subscription_period_start
      and now() < v_entitlement.subscription_period_end
      and v_entitlement.subscription_used < v_entitlement.subscription_allowance then
      return query select true, 'subscription'::text,
        v_entitlement.subscription_allowance - v_entitlement.subscription_used,
        v_entitlement.subscription_period_end;
      return;
    end if;
    if found and v_entitlement.bank_balance > 0 then
      return query select true, 'bank'::text, v_entitlement.bank_balance, null::timestamptz;
      return;
    end if;
  end if;
  v_reset := now() - interval '24 hours';
  select count(*) into v_used from public.prism_query_ledger
    where ((p_guest_id is not null and guest_id = p_guest_id) or (p_user_id is not null and user_id = p_user_id))
      and entitlement_source = 'explorer' and created_at > v_reset;
  return query select v_used < 1, 'explorer'::text, greatest(1 - v_used, 0),
    (select min(created_at) + interval '24 hours' from public.prism_query_ledger
      where ((p_guest_id is not null and guest_id = p_guest_id) or (p_user_id is not null and user_id = p_user_id))
        and entitlement_source = 'explorer' and created_at > v_reset);
end;
$$;

create or replace function public.consume_prism_query(
  p_completion_key text,
  p_guest_id uuid,
  p_user_id uuid,
  p_thread_id uuid,
  p_artifact_id uuid,
  p_artifact_revision integer,
  p_submission_type text,
  p_preview_allowance integer default null
) returns table(consumed boolean, already_consumed boolean, entitlement_source text, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  v_access record;
  v_source text;
  v_remaining integer;
begin
  if p_completion_key is null or p_submission_type not in ('primary', 'follow_up') then
    raise exception 'PRISM_QUERY_USAGE_INVALID';
  end if;
  if (p_guest_id is null) = (p_user_id is null) then raise exception 'PRISM_PRINCIPAL_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext(p_completion_key));
  if exists (select 1 from public.prism_query_ledger where completion_key = p_completion_key) then
    return query select true, true, l.entitlement_source,
      case when l.entitlement_source = 'bank' then coalesce(e.bank_balance, 0)
           when l.entitlement_source = 'subscription' then greatest(coalesce(e.subscription_allowance, 0) - coalesce(e.subscription_used, 0), 0)
           else 0 end
      from public.prism_query_ledger l left join public.prism_entitlements e on e.user_id = l.user_id
      where l.completion_key = p_completion_key;
    return;
  end if;
  if p_user_id is not null then perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  else perform pg_advisory_xact_lock(hashtext(p_guest_id::text)); end if;
  select * into v_access from public.prism_query_access(p_guest_id, p_user_id, p_preview_allowance);
  if not coalesce(v_access.allowed, false) then raise exception 'PRISM_QUERY_UNAVAILABLE'; end if;
  v_source := v_access.entitlement_source;
  if v_source = 'subscription' then
    update public.prism_entitlements set subscription_used = subscription_used + 1, updated_at = now()
      where user_id = p_user_id returning subscription_allowance - subscription_used into v_remaining;
  elsif v_source = 'bank' then
    update public.prism_entitlements set bank_balance = bank_balance - 1, updated_at = now()
      where user_id = p_user_id and bank_balance > 0 returning bank_balance into v_remaining;
    if not found then raise exception 'PRISM_QUERY_UNAVAILABLE'; end if;
  else v_remaining := greatest(coalesce(v_access.remaining, 1) - 1, 0);
  end if;
  insert into public.prism_query_ledger(
    completion_key, principal_type, guest_id, user_id, thread_id, artifact_id,
    artifact_revision, submission_type, entitlement_source
  ) values (
    p_completion_key, case when p_user_id is null then 'guest' else 'user' end,
    p_guest_id, p_user_id, p_thread_id, p_artifact_id, p_artifact_revision,
    p_submission_type, v_source
  );
  return query select true, false, v_source, v_remaining;
end;
$$;

create or replace function public.claim_prism_guest(p_guest_id uuid, p_user_id uuid)
returns table(claimed boolean, already_claimed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_guest public.prism_guests%rowtype;
  v_email text;
  v_pending public.prism_pending_entitlements%rowtype;
begin
  select * into v_guest from public.prism_guests where guest_id = p_guest_id for update;
  if not found then raise exception 'PRISM_GUEST_NOT_FOUND'; end if;
  if v_guest.claimed_by is not null then
    if v_guest.claimed_by <> p_user_id then raise exception 'PRISM_GUEST_ALREADY_CLAIMED'; end if;
    return query select true, true; return;
  end if;
  update public.prism_query_ledger set principal_type = 'user', user_id = p_user_id, guest_id = null
    where guest_id = p_guest_id;
  update public.prism_inquiry_principals set principal_type = 'user', user_id = p_user_id, guest_id = null
    where guest_id = p_guest_id;
  update public.threads set user_id = p_user_id, guest_id = null where guest_id = p_guest_id;
  update public.interpretation_artifacts set owner_user_id = p_user_id, guest_id = null where guest_id = p_guest_id;
  insert into public.trust_circle_members(share_id, user_id, display_name, joined_at, last_seen_at)
    select share_id, p_user_id, display_name, joined_at, last_seen_at
    from public.trust_circle_members where guest_id = p_guest_id
    on conflict (share_id, user_id) where user_id is not null do update
      set last_seen_at = greatest(public.trust_circle_members.last_seen_at, excluded.last_seen_at);
  delete from public.trust_circle_members where guest_id = p_guest_id;
  update public.inquiry_states set owner_user_id = p_user_id where owner_user_id is null
    and inquiry_key in (select inquiry_key from public.interpretation_artifacts where owner_user_id = p_user_id);
  update public.prism_guests set claimed_by = p_user_id, claimed_at = now(), last_seen_at = now()
    where guest_id = p_guest_id;
  select lower(email) into v_email from auth.users where id = p_user_id;
  select * into v_pending from public.prism_pending_entitlements where email = v_email for update;
  if found then
    insert into public.prism_entitlements(
      user_id, bank_balance, subscription_status, subscription_period_start, subscription_period_end
    ) values (
      p_user_id, v_pending.bank_balance, v_pending.subscription_status,
      v_pending.subscription_period_start, v_pending.subscription_period_end
    ) on conflict (user_id) do update set
      bank_balance = public.prism_entitlements.bank_balance + excluded.bank_balance,
      subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end,
      subscription_used = case
        when public.prism_entitlements.subscription_period_start is distinct from excluded.subscription_period_start then 0
        else public.prism_entitlements.subscription_used end,
      updated_at = now();
    delete from public.prism_pending_entitlements where email = v_email;
  end if;
  return query select true, false;
end;
$$;

create or replace function public.credit_prism_bank_by_email(
  p_email text, p_queries integer, p_fulfillment_key text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_user_id uuid;
begin
  if p_queries not in (10, 25) then raise exception 'PRISM_BANK_PRODUCT_INVALID'; end if;
  if nullif(trim(p_fulfillment_key), '') is null then raise exception 'PRISM_FULFILLMENT_KEY_INVALID'; end if;
  insert into public.prism_fulfillment_events(fulfillment_key, fulfillment_type, email, quantity)
  values (p_fulfillment_key, 'query_bank', lower(trim(p_email)), p_queries)
  on conflict (fulfillment_key) do nothing;
  if not found then return false; end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then
    insert into public.prism_pending_entitlements(email, bank_balance)
    values (lower(trim(p_email)), p_queries)
    on conflict (email) do update set bank_balance = public.prism_pending_entitlements.bank_balance + excluded.bank_balance,
      updated_at = now();
  else
    insert into public.prism_entitlements(user_id, bank_balance) values (v_user_id, p_queries)
    on conflict (user_id) do update set bank_balance = public.prism_entitlements.bank_balance + excluded.bank_balance,
      updated_at = now();
  end if;
  return true;
end;
$$;

create or replace function public.apply_prism_subscription_by_email(
  p_email text, p_status text, p_period_start timestamptz, p_period_end timestamptz
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_user_id uuid;
begin
  if p_status not in ('inactive', 'active', 'past_due', 'canceled') then raise exception 'PRISM_SUBSCRIPTION_STATUS_INVALID'; end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then
    insert into public.prism_pending_entitlements(email, subscription_status, subscription_period_start, subscription_period_end)
    values (lower(trim(p_email)), p_status, p_period_start, p_period_end)
    on conflict (email) do update set subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end, updated_at = now();
  else
    insert into public.prism_entitlements(user_id, subscription_status, subscription_period_start, subscription_period_end)
    values (v_user_id, p_status, p_period_start, p_period_end)
    on conflict (user_id) do update set subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end,
      subscription_used = case when public.prism_entitlements.subscription_period_start is distinct from excluded.subscription_period_start
        then 0 else public.prism_entitlements.subscription_used end,
      updated_at = now();
  end if;
  return true;
end;
$$;

create or replace function public.prepare_prism_inquiry(
  p_inquiry_key text,
  p_guest_id uuid default null,
  p_user_id uuid default null,
  p_preview_allowance integer default null
) returns table(allowed boolean, entitlement_source text, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_access record;
begin
  if p_inquiry_key is null or length(p_inquiry_key) < 12 then raise exception 'PRISM_INQUIRY_KEY_INVALID'; end if;
  select * into v_access from public.prism_query_access(p_guest_id, p_user_id, p_preview_allowance);
  if not coalesce(v_access.allowed, false) then
    return query select false, v_access.entitlement_source, v_access.remaining, v_access.reset_at;
    return;
  end if;
  insert into public.prism_inquiry_principals(inquiry_key, principal_type, guest_id, user_id, preview_allowance)
  values (p_inquiry_key, case when p_user_id is null then 'guest' else 'user' end,
    p_guest_id, p_user_id, p_preview_allowance)
  on conflict (inquiry_key) do update set
    principal_type = excluded.principal_type,
    guest_id = excluded.guest_id,
    user_id = excluded.user_id,
    preview_allowance = excluded.preview_allowance
  where public.prism_inquiry_principals.principal_type = excluded.principal_type
    and coalesce(public.prism_inquiry_principals.guest_id, public.prism_inquiry_principals.user_id)
      = coalesce(excluded.guest_id, excluded.user_id);
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_CONFLICT'; end if;
  return query select true, v_access.entitlement_source, v_access.remaining, v_access.reset_at;
end;
$$;

create or replace function public.charge_prism_artifact_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_principal public.prism_inquiry_principals%rowtype;
begin
  if new.customer_query_cost = 0 then return new; end if;
  select * into v_principal from public.prism_inquiry_principals where inquiry_key = new.inquiry_key;
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_MISSING'; end if;
  perform public.consume_prism_query(
    new.completion_key, v_principal.guest_id, v_principal.user_id, new.thread_id,
    new.artifact_id, new.artifact_revision,
    case when new.artifact_revision = 1 then 'primary' else 'follow_up' end,
    v_principal.preview_allowance
  );
  return new;
end;
$$;

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
  select * into v_source from public.interpretation_artifacts
    where artifact_id = v_share.artifact_id and artifact_revision = v_share.artifact_revision;
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
    select gen_random_uuid()::text, v_artifact_id, 1, packet_type, sequence, status, content
    from public.interpretation_packets
    where artifact_id = v_source.artifact_id and artifact_revision = v_source.artifact_revision;
  insert into public.prism_inquiry_forks(share_id, source_thread_id, source_artifact_id,
    source_artifact_revision, fork_thread_id, fork_artifact_id, owner_user_id)
  values (p_share_id, v_source.thread_id, v_source.artifact_id, v_source.artifact_revision,
    v_thread_id, v_artifact_id, p_user_id);
  return query select v_thread_id, v_artifact_id, 1, false;
end;
$$;

drop trigger if exists charge_prism_artifact_completion on public.interpretation_artifacts;
create trigger charge_prism_artifact_completion
after insert on public.interpretation_artifacts
for each row execute function public.charge_prism_artifact_completion();

-- Preserve the existing RPC signature while deriving ownership and charging
-- from the prepared server-side principal. This supports guest persistence
-- without accepting a guest owner identifier from the client.
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
  p_usage_user_id uuid default null,
  p_usage_query_type text default null,
  p_usage_credit_source text default null,
  p_usage_channel_context text default 'solo',
  p_thread_payload jsonb default null
) returns table(completed boolean, already_completed boolean, thread_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_inserted integer;
  v_thread_id uuid := p_thread_id;
  v_principal public.prism_inquiry_principals%rowtype;
begin
  if p_artifact_revision < 1 or p_inquiry_id is null or p_inquiry_key is null
    or p_completion_key is null or p_artifact is null or p_canonical_response is null then
    raise exception 'invalid artifact completion';
  end if;
  select * into v_principal from public.prism_inquiry_principals where inquiry_key = p_inquiry_key;
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_MISSING'; end if;
  if p_owner_user_id is not null and p_owner_user_id is distinct from v_principal.user_id then
    raise exception 'PRISM_ARTIFACT_OWNER_MISMATCH';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_completion_key));
  if exists (select 1 from public.interpretation_artifacts where completion_key = p_completion_key) then
    return query select true, true, a.thread_id from public.interpretation_artifacts a
      where a.completion_key = p_completion_key;
    return;
  end if;
  if v_thread_id is not null and not exists (
    select 1 from public.threads t where t.id = v_thread_id
      and ((v_principal.user_id is not null and t.user_id = v_principal.user_id)
        or (v_principal.guest_id is not null and t.guest_id = v_principal.guest_id))
  ) then raise exception 'PRISM_THREAD_OWNER_MISMATCH'; end if;
  if v_thread_id is null and p_thread_payload is not null then
    insert into public.threads(
      user_id, guest_id, title, query, response, query_type, tier_at_creation,
      retention_days, expires_at, grace_ends_at
    ) values (
      v_principal.user_id, v_principal.guest_id, p_thread_payload->>'title', p_query,
      coalesce(p_thread_payload->'response', '{}'::jsonb),
      coalesce(p_thread_payload->>'query_type', 'free_text'),
      coalesce(p_thread_payload->>'tier_at_creation', 'free'),
      coalesce((p_thread_payload->>'retention_days')::integer, 30),
      (p_thread_payload->>'expires_at')::timestamptz,
      (p_thread_payload->>'grace_ends_at')::timestamptz
    ) returning id into v_thread_id;
  end if;
  insert into public.interpretation_artifacts(
    artifact_id, artifact_revision, inquiry_id, inquiry_key, thread_id,
    owner_user_id, guest_id, completion_key, constitution_version, schema_version,
    query, artifact, canonical_response
  ) values (
    p_artifact_id, p_artifact_revision, p_inquiry_id, p_inquiry_key, v_thread_id,
    v_principal.user_id, v_principal.guest_id, p_completion_key,
    p_constitution_version, p_schema_version, p_query, p_artifact, p_canonical_response
  ) on conflict (completion_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return query select true, true, a.thread_id from public.interpretation_artifacts a
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
  return query select true, false, v_thread_id;
end;
$$;

revoke all on function public.prism_query_access(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.consume_prism_query(text, uuid, uuid, uuid, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.claim_prism_guest(uuid, uuid) from public, anon, authenticated;
revoke all on function public.prepare_prism_inquiry(text, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.credit_prism_bank_by_email(text, integer, text) from public, anon, authenticated;
revoke all on function public.apply_prism_subscription_by_email(text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.fork_shared_prism_inquiry(uuid, uuid) from public, anon, authenticated;
grant execute on function public.prism_query_access(uuid, uuid, integer) to service_role;
grant execute on function public.consume_prism_query(text, uuid, uuid, uuid, uuid, integer, text, integer) to service_role;
grant execute on function public.claim_prism_guest(uuid, uuid) to service_role;
grant execute on function public.prepare_prism_inquiry(text, uuid, uuid, integer) to service_role;
grant execute on function public.credit_prism_bank_by_email(text, integer, text) to service_role;
grant execute on function public.apply_prism_subscription_by_email(text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.fork_shared_prism_inquiry(uuid, uuid) to service_role;

commit;
