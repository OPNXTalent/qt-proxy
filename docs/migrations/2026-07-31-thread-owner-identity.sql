-- Bind persisted thread ownership to verified Supabase identity rather than
-- the optional billing/subscriber profile. This migration is deliberately
-- guarded: it aborts before changing the constraint if any existing owner
-- does not correspond to an auth.users row.

begin;

do $$
begin
  if exists (
    select 1
    from public.threads as thread
    left join auth.users as auth_user on auth_user.id = thread.user_id
    where auth_user.id is null
  ) then
    raise exception 'THREAD_OWNER_AUTH_USER_MISSING';
  end if;
end
$$;

alter table public.threads
  drop constraint if exists threads_user_id_fkey;

alter table public.threads
  add constraint threads_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

commit;
