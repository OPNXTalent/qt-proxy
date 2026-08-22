-- Bind persisted thread ownership to verified Supabase identity rather than
-- the optional billing/subscriber profile. This migration is deliberately
-- guarded: legacy subscriber IDs are mapped by normalized email only when
-- exactly one verified auth.users identity exists. Any missing or ambiguous
-- mapping aborts the transaction before ownership or constraints change.

begin;

do $$
begin
  if exists (
    select 1
    from (
      select distinct thread.user_id
      from public.threads as thread
      left join auth.users as current_auth_user
        on current_auth_user.id = thread.user_id
      where current_auth_user.id is null
    ) as legacy_owner
    where (
      select count(*)
      from public.subscribers as subscriber
      join auth.users as mapped_auth_user
        on lower(mapped_auth_user.email) = lower(subscriber.email)
      where subscriber.id = legacy_owner.user_id
    ) <> 1
  ) then
    raise exception 'THREAD_OWNER_AUTH_MAPPING_NOT_UNIQUE';
  end if;
end
$$;

alter table public.threads
  drop constraint if exists threads_user_id_fkey;

update public.threads as thread
set user_id = mapped_auth_user.id
from public.subscribers as subscriber
join auth.users as mapped_auth_user
  on lower(mapped_auth_user.email) = lower(subscriber.email)
where thread.user_id = subscriber.id
  and not exists (
    select 1
    from auth.users as current_auth_user
    where current_auth_user.id = thread.user_id
  );

do $$
begin
  if exists (
    select 1
    from public.threads as thread
    left join auth.users as auth_user on auth_user.id = thread.user_id
    where auth_user.id is null
  ) then
    raise exception 'THREAD_OWNER_AUTH_MIGRATION_INCOMPLETE';
  end if;
end
$$;

alter table public.threads
  add constraint threads_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

commit;
