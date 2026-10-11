alter table public.prism_finance_usage add column actor_user_id uuid;
create index prism_finance_usage_actor_time_idx on public.prism_finance_usage(actor_user_id,created_at);
