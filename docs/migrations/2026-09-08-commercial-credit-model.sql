-- Forward-only pre-release commercial credit model.
-- Preserves durable artifact-completion charging and historical balances.

begin;

create table if not exists public.prism_credit_allocations (
  allocation_key text primary key,
  allocation_type text not null check (allocation_type in (
    'guest_remainder', 'final_trial', 'welcome', 'purchase',
    'membership', 'legacy_subscription_opening'
  )),
  user_id uuid null references auth.users(id) on delete restrict,
  guest_id uuid null references public.prism_guests(guest_id) on delete restrict,
  email text null,
  credits integer not null check (credits > 0),
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_id is not null or email is not null)
);

alter table public.prism_credit_allocations enable row level security;
revoke all on table public.prism_credit_allocations from public, anon, authenticated;
grant select, insert on table public.prism_credit_allocations to service_role;

alter table public.prism_query_ledger
  drop constraint if exists prism_query_ledger_query_cost_check;
alter table public.prism_query_ledger
  add constraint prism_query_ledger_query_cost_check check (query_cost in (1, 2));

alter table public.interpretation_artifacts
  drop constraint if exists interpretation_artifacts_customer_query_cost_check;
alter table public.interpretation_artifacts
  add constraint interpretation_artifacts_customer_query_cost_check
  check (customer_query_cost in (0, 1, 2));
alter table public.interpretation_artifacts alter column customer_query_cost set default 2;

alter table public.prism_fulfillment_events
  drop constraint if exists prism_fulfillment_events_fulfillment_type_check;
alter table public.prism_fulfillment_events
  add constraint prism_fulfillment_events_fulfillment_type_check
  check (fulfillment_type in ('query_bank', 'membership'));
alter table public.prism_fulfillment_events
  drop constraint if exists prism_fulfillment_events_quantity_check;
alter table public.prism_fulfillment_events
  add constraint prism_fulfillment_events_quantity_check
  check (quantity in (10, 25, 125, 350)); -- retain valid historical fulfillment rows

-- Preserve an active legacy period's unused allowance as opening banked credits.
with candidates as (
  select user_id,
    greatest(subscription_allowance - subscription_used, 0) as credits,
    'legacy-subscription-opening:' || user_id::text || ':' ||
      coalesce(subscription_period_start::text, 'unknown') as allocation_key
  from public.prism_entitlements
  where subscription_status = 'active'
    and greatest(subscription_allowance - subscription_used, 0) > 0
), inserted as (
  insert into public.prism_credit_allocations(
    allocation_key, allocation_type, user_id, credits
  )
  select allocation_key, 'legacy_subscription_opening', user_id, credits
  from candidates
  on conflict (allocation_key) do nothing
  returning user_id, credits
), totals as (
  select user_id, sum(credits)::integer as credits from inserted group by user_id
)
update public.prism_entitlements e
set bank_balance = e.bank_balance + totals.credits,
    subscription_used = e.subscription_allowance,
    updated_at = now()
from totals where totals.user_id = e.user_id;

with candidates as (
  select email, 35 as credits,
    'legacy-subscription-opening-email:' || lower(email) || ':' ||
      coalesce(subscription_period_start::text, 'unknown') as allocation_key
  from public.prism_pending_entitlements
  where subscription_status = 'active'
), inserted as (
  insert into public.prism_credit_allocations(
    allocation_key, allocation_type, email, credits
  )
  select allocation_key, 'legacy_subscription_opening', lower(email), credits
  from candidates
  on conflict (allocation_key) do nothing
  returning email, credits
), totals as (
  select email, sum(credits)::integer as credits from inserted group by email
)
update public.prism_pending_entitlements p
set bank_balance = p.bank_balance + totals.credits, updated_at = now()
from totals where lower(totals.email) = lower(p.email);

create or replace function public.prism_query_access(
  p_guest_id uuid default null,
  p_user_id uuid default null,
  p_preview_allowance integer default null
) returns table(allowed boolean, entitlement_source text, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_entitlement public.prism_entitlements%rowtype;
  v_used integer := 0;
  v_reset timestamptz;
begin
  if (p_guest_id is null) = (p_user_id is null) then raise exception 'PRISM_PRINCIPAL_INVALID'; end if;
  if p_preview_allowance is not null then
    select coalesce(sum(query_cost), 0)::integer into v_used
    from public.prism_query_ledger
    where user_id = p_user_id and entitlement_source = 'preview';
    return query select v_used < p_preview_allowance, 'preview'::text,
      greatest(p_preview_allowance - v_used, 0), null::timestamptz;
    return;
  end if;
  if p_user_id is not null then
    select * into v_entitlement from public.prism_entitlements where user_id = p_user_id;
    return query select coalesce(v_entitlement.bank_balance, 0) > 0, 'bank'::text,
      coalesce(v_entitlement.bank_balance, 0), null::timestamptz;
    return;
  end if;
  v_reset := now() - interval '24 hours';
  select coalesce(sum(l.query_cost), 0)::integer into v_used
  from public.prism_query_ledger l
  where l.guest_id = p_guest_id and l.entitlement_source = 'explorer'
    and l.created_at > v_reset;
  return query select v_used < 5, 'explorer'::text, greatest(5 - v_used, 0),
    (select min(l.created_at) + interval '24 hours'
     from public.prism_query_ledger l
     where l.guest_id = p_guest_id and l.entitlement_source = 'explorer'
       and l.created_at > v_reset);
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
  v_cost integer;
begin
  if p_completion_key is null or p_submission_type not in ('primary', 'follow_up') then
    raise exception 'PRISM_QUERY_USAGE_INVALID';
  end if;
  v_cost := case when p_submission_type = 'primary' then 2 else 1 end;
  if (p_guest_id is null) = (p_user_id is null) then raise exception 'PRISM_PRINCIPAL_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext(p_completion_key));
  if exists (select 1 from public.prism_query_ledger where completion_key = p_completion_key) then
    return query select true, true, l.entitlement_source,
      case when l.principal_type = 'user' then coalesce(e.bank_balance, 0)
           else greatest(5 - coalesce((select sum(x.query_cost)::integer
             from public.prism_query_ledger x where x.guest_id = l.guest_id
               and x.entitlement_source = 'explorer'
               and x.created_at > now() - interval '24 hours'), 0), 0) end
    from public.prism_query_ledger l
    left join public.prism_entitlements e on e.user_id = l.user_id
    where l.completion_key = p_completion_key;
    return;
  end if;
  if p_user_id is not null then perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  else perform pg_advisory_xact_lock(hashtext(p_guest_id::text)); end if;
  select * into v_access from public.prism_query_access(p_guest_id, p_user_id, p_preview_allowance);
  if not coalesce(v_access.allowed, false) or coalesce(v_access.remaining, 0) < v_cost then
    raise exception 'PRISM_QUERY_UNAVAILABLE';
  end if;
  v_source := v_access.entitlement_source;
  if p_user_id is not null and v_source = 'bank' then
    update public.prism_entitlements
    set bank_balance = bank_balance - v_cost, updated_at = now()
    where user_id = p_user_id and bank_balance >= v_cost
    returning bank_balance into v_remaining;
    if not found then raise exception 'PRISM_QUERY_UNAVAILABLE'; end if;
  else
    v_remaining := greatest(coalesce(v_access.remaining, 0) - v_cost, 0);
  end if;
  insert into public.prism_query_ledger(
    completion_key, principal_type, guest_id, user_id, thread_id, artifact_id,
    artifact_revision, submission_type, entitlement_source, query_cost
  ) values (
    p_completion_key, case when p_user_id is null then 'guest' else 'user' end,
    p_guest_id, p_user_id, p_thread_id, p_artifact_id, p_artifact_revision,
    p_submission_type, v_source, v_cost
  );
  return query select true, false, v_source, v_remaining;
end;
$$;

drop function if exists public.prepare_prism_inquiry(text, uuid, uuid, integer);
create function public.prepare_prism_inquiry(
  p_inquiry_key text,
  p_guest_id uuid default null,
  p_user_id uuid default null,
  p_preview_allowance integer default null,
  p_query_cost integer default 2
) returns table(allowed boolean, entitlement_source text, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_access record;
begin
  if p_inquiry_key is null or length(p_inquiry_key) < 12 then raise exception 'PRISM_INQUIRY_KEY_INVALID'; end if;
  if p_query_cost not in (1, 2) then raise exception 'PRISM_QUERY_COST_INVALID'; end if;
  select * into v_access from public.prism_query_access(p_guest_id, p_user_id, p_preview_allowance);
  if not coalesce(v_access.allowed, false) or coalesce(v_access.remaining, 0) < p_query_cost then
    return query select false, v_access.entitlement_source, v_access.remaining, v_access.reset_at;
    return;
  end if;
  insert into public.prism_inquiry_principals(inquiry_key, principal_type, guest_id, user_id, preview_allowance)
  values (p_inquiry_key, case when p_user_id is null then 'guest' else 'user' end,
    p_guest_id, p_user_id, p_preview_allowance)
  on conflict (inquiry_key) do update set
    principal_type = excluded.principal_type, guest_id = excluded.guest_id,
    user_id = excluded.user_id, preview_allowance = excluded.preview_allowance
  where public.prism_inquiry_principals.principal_type = excluded.principal_type
    and coalesce(public.prism_inquiry_principals.guest_id, public.prism_inquiry_principals.user_id)
      = coalesce(excluded.guest_id, excluded.user_id);
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_CONFLICT'; end if;
  return query select true, v_access.entitlement_source, v_access.remaining, v_access.reset_at;
end;
$$;

create or replace function public.classify_prism_artifact_cost()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.customer_query_cost <> 0 then
    new.customer_query_cost := case when new.artifact_revision = 1 then 2 else 1 end;
  end if;
  return new;
end;
$$;

drop trigger if exists classify_prism_artifact_cost on public.interpretation_artifacts;
create trigger classify_prism_artifact_cost
before insert on public.interpretation_artifacts
for each row execute function public.classify_prism_artifact_cost();

create or replace function public.claim_prism_guest(p_guest_id uuid, p_user_id uuid)
returns table(claimed boolean, already_claimed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_guest public.prism_guests%rowtype;
  v_email text;
  v_pending public.prism_pending_entitlements%rowtype;
  v_remaining integer := 0;
  v_first_registration boolean := false;
  v_added integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select * into v_guest from public.prism_guests where guest_id = p_guest_id for update;
  if not found then raise exception 'PRISM_GUEST_NOT_FOUND'; end if;
  if v_guest.claimed_by is not null then
    if v_guest.claimed_by <> p_user_id then raise exception 'PRISM_GUEST_ALREADY_CLAIMED'; end if;
    return query select true, true; return;
  end if;
  v_first_registration := not exists (
    select 1 from public.prism_credit_allocations
    where allocation_key = 'registration:' || p_user_id::text || ':welcome'
  );
  if v_first_registration then
    select greatest(5 - coalesce(sum(query_cost), 0), 0)::integer into v_remaining
    from public.prism_query_ledger
    where guest_id = p_guest_id and entitlement_source = 'explorer'
      and created_at > now() - interval '24 hours';
    if v_remaining > 0 then
      insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, guest_id, credits)
      values ('registration:' || p_user_id::text || ':guest-remainder', 'guest_remainder', p_user_id, p_guest_id, v_remaining);
      v_added := v_added + v_remaining;
    end if;
    insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, guest_id, credits)
    values ('registration:' || p_user_id::text || ':final-trial', 'final_trial', p_user_id, p_guest_id, 5);
    insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, guest_id, credits)
    values ('registration:' || p_user_id::text || ':welcome', 'welcome', p_user_id, p_guest_id, 3);
    v_added := v_added + 8;
  end if;
  insert into public.prism_entitlements(user_id, bank_balance)
  values (p_user_id, v_added)
  on conflict (user_id) do update set
    bank_balance = public.prism_entitlements.bank_balance + excluded.bank_balance,
    updated_at = now();
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
    update public.prism_entitlements set
      bank_balance = bank_balance + v_pending.bank_balance,
      subscription_status = v_pending.subscription_status,
      subscription_period_start = v_pending.subscription_period_start,
      subscription_period_end = v_pending.subscription_period_end,
      updated_at = now()
    where user_id = p_user_id;
    delete from public.prism_pending_entitlements where email = v_email;
  end if;
  return query select true, false;
end;
$$;

create or replace function public.credit_prism_bank_by_email(
  p_email text, p_queries integer, p_fulfillment_key text
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_user_id uuid; v_email text := lower(trim(p_email));
begin
  if p_queries <> 125 then raise exception 'PRISM_BANK_PRODUCT_INVALID'; end if;
  if nullif(trim(p_fulfillment_key), '') is null then raise exception 'PRISM_FULFILLMENT_KEY_INVALID'; end if;
  insert into public.prism_fulfillment_events(fulfillment_key, fulfillment_type, email, quantity)
  values (p_fulfillment_key, 'query_bank', v_email, p_queries)
  on conflict (fulfillment_key) do nothing;
  if not found then return false; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, email, credits)
  values ('purchase:' || p_fulfillment_key, 'purchase', v_user_id, v_email, p_queries);
  if v_user_id is null then
    insert into public.prism_pending_entitlements(email, bank_balance) values (v_email, p_queries)
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

drop function if exists public.apply_prism_subscription_by_email(text, text, timestamptz, timestamptz);
create function public.apply_prism_subscription_by_email(
  p_email text, p_status text, p_period_start timestamptz, p_period_end timestamptz,
  p_fulfillment_key text default null, p_credits integer default 0
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_email text := lower(trim(p_email));
  v_apply_credits boolean := false;
begin
  if p_status not in ('inactive', 'active', 'past_due', 'canceled') then raise exception 'PRISM_SUBSCRIPTION_STATUS_INVALID'; end if;
  if p_credits not in (0, 350) then raise exception 'PRISM_MEMBERSHIP_PRODUCT_INVALID'; end if;
  if p_credits > 0 and nullif(trim(p_fulfillment_key), '') is null then raise exception 'PRISM_FULFILLMENT_KEY_INVALID'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if p_credits > 0 then
    insert into public.prism_fulfillment_events(fulfillment_key, fulfillment_type, email, quantity)
    values (p_fulfillment_key, 'membership', v_email, p_credits)
    on conflict (fulfillment_key) do nothing;
    v_apply_credits := found;
    if v_apply_credits then
      insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, email, credits)
      values ('membership:' || p_fulfillment_key, 'membership', v_user_id, v_email, p_credits);
    end if;
  end if;
  if v_user_id is null then
    insert into public.prism_pending_entitlements(
      email, bank_balance, subscription_status, subscription_period_start, subscription_period_end
    ) values (
      v_email, case when v_apply_credits then p_credits else 0 end,
      p_status, p_period_start, p_period_end
    ) on conflict (email) do update set
      bank_balance = public.prism_pending_entitlements.bank_balance +
        case when v_apply_credits then p_credits else 0 end,
      subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end, updated_at = now();
  else
    insert into public.prism_entitlements(
      user_id, bank_balance, subscription_status, subscription_period_start, subscription_period_end
    ) values (
      v_user_id, case when v_apply_credits then p_credits else 0 end,
      p_status, p_period_start, p_period_end
    ) on conflict (user_id) do update set
      bank_balance = public.prism_entitlements.bank_balance +
        case when v_apply_credits then p_credits else 0 end,
      subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end,
      updated_at = now();
  end if;
  return v_apply_credits;
end;
$$;

revoke all on function public.prism_query_access(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.consume_prism_query(text, uuid, uuid, uuid, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.prepare_prism_inquiry(text, uuid, uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_prism_guest(uuid, uuid) from public, anon, authenticated;
revoke all on function public.credit_prism_bank_by_email(text, integer, text) from public, anon, authenticated;
revoke all on function public.apply_prism_subscription_by_email(text, text, timestamptz, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.prism_query_access(uuid, uuid, integer) to service_role;
grant execute on function public.consume_prism_query(text, uuid, uuid, uuid, uuid, integer, text, integer) to service_role;
grant execute on function public.prepare_prism_inquiry(text, uuid, uuid, integer, integer) to service_role;
grant execute on function public.claim_prism_guest(uuid, uuid) to service_role;
grant execute on function public.credit_prism_bank_by_email(text, integer, text) to service_role;
grant execute on function public.apply_prism_subscription_by_email(text, text, timestamptz, timestamptz, text, integer) to service_role;

commit;
