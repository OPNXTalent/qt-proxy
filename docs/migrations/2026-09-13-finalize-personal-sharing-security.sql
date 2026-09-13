-- Promote with the replacement sharing frontend/API. This closes the brief
-- compatibility window left for the previously deployed browser client.

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
