-- Group discussions use the same verified Supabase Auth identity as /api/share.
-- These legacy tables previously referenced subscribers, but authenticated
-- Prism users are not required to have a subscriber row.

begin;

alter table public.room_channels
  drop constraint if exists room_channels_created_by_fkey;
alter table public.room_channels
  add constraint room_channels_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.channel_participants
  drop constraint if exists channel_participants_user_id_fkey;
alter table public.channel_participants
  add constraint channel_participants_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.room_messages
  drop constraint if exists room_messages_user_id_fkey;
alter table public.room_messages
  add constraint room_messages_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

commit;
