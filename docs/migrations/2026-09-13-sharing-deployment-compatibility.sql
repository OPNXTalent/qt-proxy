-- Temporary compatibility window for the currently deployed client.
-- Apply the policy-removal block from personal-sharing-connections again
-- immediately after the replacement frontend/API deployment is promoted.

grant all on table public.shares to anon, authenticated;
grant all on table public.follow_ups to anon, authenticated;
grant all on table public.share_chat_messages to anon, authenticated;
grant all on table public.refraction_notes to anon, authenticated;

create policy "allow_insert_shares"
  on public.shares for insert to public
  with check (true);

create policy "allow_select_shares"
  on public.shares for select to public
  using (true);

create policy "Allow realtime for follow_ups"
  on public.follow_ups for select to anon
  using (true);

create policy "Realtime broadcast for follow_ups"
  on public.follow_ups for all to anon
  using (true) with check (true);

create policy "allow_all_share_chat"
  on public.share_chat_messages for all to public
  using (true) with check (true);
