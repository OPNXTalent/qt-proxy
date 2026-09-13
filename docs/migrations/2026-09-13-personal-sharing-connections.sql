-- Personal, individually managed sharing connections.
-- All guest access is mediated by the server APIs; no shared table is
-- directly readable or writable with the browser's anon key.

alter table public.shares
  add column if not exists recipient_name text,
  add column if not exists invite_note text;

alter table public.shares
  drop constraint if exists shares_recipient_name_length,
  add constraint shares_recipient_name_length
    check (recipient_name is null or char_length(recipient_name) between 1 and 80),
  drop constraint if exists shares_invite_note_length,
  add constraint shares_invite_note_length
    check (invite_note is null or char_length(invite_note) <= 500);

alter table public.follow_ups
  add column if not exists display_name text;

alter table public.follow_ups
  drop constraint if exists follow_ups_display_name_length,
  add constraint follow_ups_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80);

create index if not exists shares_owner_thread_active_idx
  on public.shares (owner_user_id, thread_id, created_at desc)
  where status = 'active' and revoked_at is null;

drop policy if exists "allow_insert_shares" on public.shares;
drop policy if exists "allow_select_shares" on public.shares;
drop policy if exists "Allow realtime for follow_ups" on public.follow_ups;
drop policy if exists "Realtime broadcast for follow_ups" on public.follow_ups;
drop policy if exists "allow_all_share_chat" on public.share_chat_messages;

revoke all on table public.shares from anon, authenticated;
revoke all on table public.follow_ups from anon, authenticated;
revoke all on table public.share_chat_messages from anon, authenticated;
revoke all on table public.refraction_notes from anon, authenticated;

grant all on table public.shares to service_role;
grant all on table public.follow_ups to service_role;
grant all on table public.share_chat_messages to service_role;
grant all on table public.refraction_notes to service_role;
