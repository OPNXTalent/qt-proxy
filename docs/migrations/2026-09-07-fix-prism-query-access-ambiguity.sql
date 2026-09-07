-- Issue #13 deployment correction: qualify ledger columns that overlap the
-- table-returning function's PL/pgSQL output variable names.

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
    select count(*) into v_used from public.prism_query_ledger l
      where l.user_id = p_user_id and l.entitlement_source = 'preview';
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
  select count(*) into v_used from public.prism_query_ledger l
    where ((p_guest_id is not null and l.guest_id = p_guest_id) or (p_user_id is not null and l.user_id = p_user_id))
      and l.entitlement_source = 'explorer' and l.created_at > v_reset;
  return query select v_used < 1, 'explorer'::text, greatest(1 - v_used, 0),
    (select min(l.created_at) + interval '24 hours' from public.prism_query_ledger l
      where ((p_guest_id is not null and l.guest_id = p_guest_id) or (p_user_id is not null and l.user_id = p_user_id))
        and l.entitlement_source = 'explorer' and l.created_at > v_reset);
end;
$$;

revoke all on function public.prism_query_access(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.prism_query_access(uuid, uuid, integer) to service_role;
