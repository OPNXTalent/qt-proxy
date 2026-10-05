-- Additive owner dashboard tables. Apply only to isolated Preview until release approval.
begin;
create table public.prism_finance_owners (
 user_id uuid primary key references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table public.prism_finance_usage (
 attempt_id uuid primary key, request_id uuid not null, application_id text,
 completion_key text, thread_id uuid, stage text not null, turn_type text not null,
 model text not null, provider text, provider_request_id text, environment text not null,
 state text not null check(state in ('dispatching','completed','failed')),
 usage_known boolean not null default false,
 input_tokens bigint check(input_tokens>=0), output_tokens bigint check(output_tokens>=0),
 cached_tokens bigint check(cached_tokens>=0), cache_write_tokens bigint check(cache_write_tokens>=0),
 reasoning_tokens bigint check(reasoning_tokens>=0), latency_ms integer check(latency_ms>=0),
 cost_usd numeric(20,9) check(cost_usd>=0), price_version text,
 cost_status text not null default 'unknown' check(cost_status in ('unknown','usage_derived','invoice_reconciled')),
 created_at timestamptz not null default now(),
 check(cost_usd is null or usage_known)
);
create index prism_finance_usage_time_idx on public.prism_finance_usage(created_at);
create index prism_finance_usage_request_idx on public.prism_finance_usage(request_id);
create index prism_finance_usage_completion_idx on public.prism_finance_usage(completion_key);
create table public.prism_finance_payments (
 payment_key text primary key, event_id text not null, amount_usd numeric(20,2) not null,
 credits_granted integer not null check(credits_granted>=0), fee_usd numeric(20,2) check(fee_usd>=0),
 fee_reference text, fee_recorded_by uuid references auth.users(id),
 source text not null, test_mode boolean not null, occurred_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index prism_finance_payments_time_idx on public.prism_finance_payments(occurred_at);
create table public.prism_finance_expenses (
 expense_id uuid primary key, kind text not null check(kind in ('expense','coverage')),
 category text not null check(category in ('hosting','database','processing','other','payments')),
 amount_usd numeric(20,2) not null, reference text not null check(length(reference)<=160),
 occurred_at timestamptz not null, period_start timestamptz not null, period_end timestamptz not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 check(period_end>period_start),check(kind<>'coverage' or amount_usd=0)
);
create index prism_finance_expenses_time_idx on public.prism_finance_expenses(occurred_at);
create table public.prism_finance_settings (
 id integer primary key check(id=1), capture_started_at timestamptz not null default now(),
 daily_alert_usd numeric(20,2) not null default 1 check(daily_alert_usd>0)
);
insert into public.prism_finance_settings(id) values(1);
create table public.prism_finance_price_drafts (
 draft_id uuid primary key, products jsonb not null, free_credits integer not null check(free_credits between 0 and 100),
 status text not null check(status='draft'),created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
-- No owner is inferred from the first signup or editable JWT metadata.
-- Add only a verified owner auth.users UUID through an authorized server-side operation.
alter table public.prism_finance_owners enable row level security;
alter table public.prism_finance_usage enable row level security;
alter table public.prism_finance_payments enable row level security;
alter table public.prism_finance_expenses enable row level security;
alter table public.prism_finance_settings enable row level security;
alter table public.prism_finance_price_drafts enable row level security;
revoke all on public.prism_finance_owners,public.prism_finance_usage,public.prism_finance_payments,
 public.prism_finance_expenses,public.prism_finance_settings,public.prism_finance_price_drafts from public,anon,authenticated;
grant select on public.prism_finance_owners to service_role;
grant select,insert,update on public.prism_finance_usage,public.prism_finance_payments to service_role;
grant select,insert on public.prism_finance_expenses,public.prism_finance_price_drafts to service_role;
grant select,update on public.prism_finance_settings to service_role;
commit;
