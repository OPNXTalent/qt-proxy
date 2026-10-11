begin;
create table public.prism_pricing_versions(version_id uuid primary key,products jsonb not null,stripe jsonb not null,active boolean not null default false,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create unique index prism_pricing_one_active on public.prism_pricing_versions(active) where active;
alter table public.prism_pricing_versions enable row level security;
revoke all on public.prism_pricing_versions from public,anon,authenticated;
grant select,insert,update on public.prism_pricing_versions to service_role;
create function public.publish_prism_pricing(p_version_id uuid,p_expected_version uuid,p_products jsonb,p_stripe jsonb,p_owner_id uuid) returns boolean language plpgsql security invoker set search_path=public as $$
declare v_current uuid;
begin
 perform pg_advisory_xact_lock(410811,1);
 if not exists(select 1 from public.prism_finance_owners where user_id=p_owner_id) then raise exception 'OWNER_REQUIRED';end if;
 select version_id into v_current from public.prism_pricing_versions where active;
 if v_current=p_version_id then return true;end if;
 if v_current is distinct from p_expected_version then raise exception 'PRICING_VERSION_CONFLICT';end if;
 if jsonb_array_length(p_products)<>2 then raise exception 'INVALID_PRODUCTS';end if;
 update public.prism_pricing_versions set active=false where active;
 insert into public.prism_pricing_versions(version_id,products,stripe,active,created_by) values(p_version_id,p_products,p_stripe,true,p_owner_id);
 return true;
end;$$;
revoke all on function public.publish_prism_pricing(uuid,uuid,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.publish_prism_pricing(uuid,uuid,jsonb,jsonb,uuid) to service_role;
alter table public.prism_fulfillment_events drop constraint prism_fulfillment_events_quantity_check;
alter table public.prism_fulfillment_events add constraint prism_fulfillment_events_quantity_check check(quantity between 1 and 10000);
do $$ declare f record; definition text; begin
 for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace and proname in ('credit_prism_bank_by_email','apply_prism_subscription_by_email') loop
 definition:=pg_get_functiondef(f.oid);
 if f.proname='credit_prism_bank_by_email' then
 definition:=replace(definition,'p_queries <> 125','(p_queries is null or p_queries < 1 or p_queries > 10000)');
 else
 definition:=replace(definition,'p_credits not in (0, 350)','(p_credits is null or p_credits < 0 or p_credits > 10000)');
 end if;
 execute definition;
 end loop;
end $$;
commit;
