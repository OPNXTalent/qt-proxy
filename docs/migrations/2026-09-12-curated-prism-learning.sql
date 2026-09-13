-- Curated, de-identified learning layer for The Prism.
-- No account, user, thread, note, share, or message identifiers are stored.

begin;

create table if not exists public.prism_learning_candidates (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique check (fingerprint ~ '^[0-9a-f]{64}$'),
  topic text not null check (char_length(topic) between 4 and 160),
  lesson text not null check (char_length(lesson) between 20 and 1200),
  rationale text not null check (char_length(rationale) between 10 and 800),
  applicability text not null default '' check (char_length(applicability) <= 500),
  boundaries text not null default '' check (char_length(boundaries) <= 500),
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text not null default '' check (char_length(review_notes) <= 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.prism_approved_learning (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.prism_learning_candidates(id) on delete restrict,
  topic text not null check (char_length(topic) between 4 and 160),
  lesson text not null check (char_length(lesson) between 20 and 1200),
  applicability text not null default '' check (char_length(applicability) <= 500),
  boundaries text not null default '' check (char_length(boundaries) <= 500),
  tags text[] not null default '{}',
  active boolean not null default true,
  approved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(topic, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(lesson, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(applicability, '')), 'C')
  ) stored
);

create index if not exists prism_approved_learning_search_idx
  on public.prism_approved_learning using gin (search_document);

alter table public.prism_learning_candidates enable row level security;
alter table public.prism_approved_learning enable row level security;
revoke all on table public.prism_learning_candidates from public, anon, authenticated;
revoke all on table public.prism_approved_learning from public, anon, authenticated;
grant select, insert, update on table public.prism_learning_candidates to service_role;
grant select, insert, update on table public.prism_approved_learning to service_role;

create or replace function public.promote_prism_learning_candidate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    new.reviewed_at := now();
  end if;
  if new.status = 'approved' then
    insert into public.prism_approved_learning (
      candidate_id, topic, lesson, applicability, boundaries, tags, active, updated_at
    ) values (
      new.id, new.topic, new.lesson, new.applicability, new.boundaries, new.tags, true, now()
    )
    on conflict (candidate_id) do update set
      topic = excluded.topic,
      lesson = excluded.lesson,
      applicability = excluded.applicability,
      boundaries = excluded.boundaries,
      tags = excluded.tags,
      active = true,
      updated_at = now();
  elsif new.status = 'rejected' then
    update public.prism_approved_learning
      set active = false, updated_at = now()
      where candidate_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists prism_learning_candidate_reviewed
  on public.prism_learning_candidates;
create trigger prism_learning_candidate_reviewed
before update on public.prism_learning_candidates
for each row execute function public.promote_prism_learning_candidate();

revoke all on function public.promote_prism_learning_candidate() from public, anon, authenticated;

create or replace function public.match_prism_learning(
  search_text text,
  match_count integer default 3
) returns table (
  id uuid,
  topic text,
  lesson text,
  applicability text,
  boundaries text,
  tags text[],
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    learning.id,
    learning.topic,
    learning.lesson,
    learning.applicability,
    learning.boundaries,
    learning.tags,
    ts_rank(learning.search_document, websearch_to_tsquery('english', search_text)) as rank
  from public.prism_approved_learning as learning
  where learning.active
    and learning.search_document @@ websearch_to_tsquery('english', search_text)
  order by rank desc, learning.approved_at desc
  limit least(greatest(match_count, 1), 5);
$$;

revoke all on function public.match_prism_learning(text, integer) from public, anon, authenticated;
grant execute on function public.match_prism_learning(text, integer) to service_role;

-- First approved lesson: the general response-quality correction established
-- during Prism evaluation. It contains no quotation or conversation identity.
insert into public.prism_learning_candidates (
  fingerprint, topic, lesson, rationale, applicability, boundaries, tags
) values (
  'c6ba0b9696cb7cc7232cd1ab35734f55bdd18d577f91854ba99ea72982be9d75',
  'Analogy restraint',
  'Use an analogy only when it advances the argument; do not force the author-and-story analogy.',
  'A forced analogy can add length without adding explanatory value.',
  'Long-form answers that introduce a comparison.',
  'Concrete examples remain appropriate when they perform necessary reasoning work.',
  array['analogy', 'response quality', 'explanatory discipline']
)
on conflict (fingerprint) do update set
  topic = excluded.topic,
  lesson = excluded.lesson,
  rationale = excluded.rationale,
  applicability = excluded.applicability,
  boundaries = excluded.boundaries,
  tags = excluded.tags,
  updated_at = now();

update public.prism_learning_candidates
set status = 'approved'
where fingerprint = 'c6ba0b9696cb7cc7232cd1ab35734f55bdd18d577f91854ba99ea72982be9d75';

comment on table public.prism_learning_candidates is
  'De-identified, model-distilled candidate lessons awaiting owner review. Contains no user or conversation identifiers.';
comment on table public.prism_approved_learning is
  'Owner-approved lessons available to the Prism retrieval layer.';

commit;
