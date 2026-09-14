-- Selected-invitee group discussions.
--
-- Personal share links remain the credential boundary. A channel participant
-- is either an authenticated account (the originator) or one specific share
-- credential (an invitee), never both. All access is mediated by /api/share;
-- the browser receives no direct table privileges.

begin;

alter table public.channel_participants
  alter column user_id drop not null;
alter table public.channel_participants
  add column if not exists share_id uuid null references public.shares(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'channel_participants_identity_exactly_one'
      and conrelid = 'public.channel_participants'::regclass
  ) then
    alter table public.channel_participants
      add constraint channel_participants_identity_exactly_one
      check (((user_id is not null)::integer + (share_id is not null)::integer) = 1)
      not valid;
  end if;
end $$;

alter table public.channel_participants
  validate constraint channel_participants_identity_exactly_one;

create unique index if not exists channel_participants_share_unique_idx
  on public.channel_participants(share_id)
  where share_id is not null;
create index if not exists channel_participants_share_active_idx
  on public.channel_participants(share_id, status, channel_id)
  where share_id is not null;

alter table public.room_messages
  alter column user_id drop not null;
alter table public.room_messages
  add column if not exists share_id uuid null references public.shares(id) on delete cascade;
alter table public.room_messages
  add column if not exists node_id text not null default 'root';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'room_messages_author_exactly_one'
      and conrelid = 'public.room_messages'::regclass
  ) then
    alter table public.room_messages
      add constraint room_messages_author_exactly_one
      check (((user_id is not null)::integer + (share_id is not null)::integer) = 1)
      not valid;
  end if;
end $$;

alter table public.room_messages
  validate constraint room_messages_author_exactly_one;

create index if not exists room_messages_channel_created_idx
  on public.room_messages(channel_id, created_at);
create index if not exists room_messages_share_idx
  on public.room_messages(share_id)
  where share_id is not null;

alter table public.room_channels enable row level security;
alter table public.channel_participants enable row level security;
alter table public.room_messages enable row level security;

revoke all on table public.room_channels from public, anon, authenticated;
revoke all on table public.channel_participants from public, anon, authenticated;
revoke all on table public.room_messages from public, anon, authenticated;

grant select, insert, update, delete on table public.room_channels to service_role;
grant select, insert, update, delete on table public.channel_participants to service_role;
grant select, insert, update, delete on table public.room_messages to service_role;

commit;
