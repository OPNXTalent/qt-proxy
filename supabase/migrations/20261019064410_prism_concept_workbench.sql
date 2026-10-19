begin;
create table public.prism_concepts (
 id uuid primary key, title text not null check (char_length(title) between 4 and 160),
 status text not null default 'draft' check (status in ('draft','reviewed','approved','hold','rejected')),
 revision integer not null default 1, active_release integer,
 document jsonb not null check (octet_length(document::text)<1600000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.prism_concept_history (
 concept_id uuid not null references public.prism_concepts(id), revision integer not null,
 action text not null, document jsonb not null, actor uuid not null,
 created_at timestamptz not null default now(), primary key(concept_id,revision)
);
create table public.prism_concept_releases (
 concept_id uuid not null references public.prism_concepts(id), version integer not null,
 title text not null, treatment text not null check(treatment in ('foundational','explanation','exploratory','reference')),
 document jsonb not null, created_at timestamptz not null default now(),
 search_document tsvector generated always as (
   setweight(to_tsvector('english',title),'A') ||
   setweight(to_tsvector('english',coalesce(document->'proposal'->>'tags','')),'A') ||
   setweight(to_tsvector('english',coalesce(document->'proposal'->>'guidance','')),'B') ||
   setweight(to_tsvector('english',coalesce(document->'proposal'->>'applicability','')),'C')
 ) stored, primary key(concept_id,version)
);
create index prism_concept_releases_search on public.prism_concept_releases using gin(search_document);
create index prism_concepts_updated on public.prism_concepts(updated_at desc,id);
alter table public.prism_concepts enable row level security;
alter table public.prism_concept_history enable row level security;
alter table public.prism_concept_releases enable row level security;
revoke all on public.prism_concepts, public.prism_concept_history, public.prism_concept_releases from public,anon,authenticated;
grant select,insert,update on public.prism_concepts to service_role;
grant select,insert on public.prism_concept_history,public.prism_concept_releases to service_role;

create function public.prism_mutate_concept(p_id uuid,p_expected_revision integer,p_action text,p_document jsonb,p_actor uuid,p_restore_version integer default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c public.prism_concepts; d jsonb; next_revision integer; new_status text; active integer;
begin
 if not exists(select 1 from public.prism_finance_owners where user_id=p_actor) then raise exception 'Owner required'; end if;
 if p_action not in ('save','review','proposal','preview','approve','hold','reject','restore') then raise exception 'Invalid action'; end if;
 -- Serialize creation as well as updates; a retry cannot overwrite a newer edit.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into c from public.prism_concepts where id=p_id for update;
 if coalesce(c.revision,0)<>p_expected_revision then return jsonb_build_object('conflict',true); end if;
 if c.id is null and (p_action<>'save' or p_expected_revision<>0) then raise exception 'Not found'; end if;
 next_revision:=p_expected_revision+1; active:=c.active_release; d:=p_document;
 new_status:=coalesce(c.status,'draft');
 if p_action='save' then new_status:='draft'; end if;
 if p_action in ('review','proposal','preview') then new_status:='reviewed'; end if;
 if p_action='approve' then
   if d->'review' is null or d->'proposal' is null or (d->'preview'->>'revision')::integer is distinct from p_expected_revision then raise exception 'Current preview required'; end if;
   active:=next_revision; new_status:='approved';
 end if;
 if p_action in ('hold','reject') then active:=null; new_status:=case when p_action='hold' then 'hold' else 'rejected' end; end if;
 if p_action='restore' then
   select document into d from public.prism_concept_releases where concept_id=p_id and version=p_restore_version;
   if d is null then raise exception 'Release not found'; end if;
   active:=p_restore_version; new_status:='approved';
 end if;
 insert into public.prism_concepts(id,title,status,revision,active_release,document)
 values(p_id,d->'submission'->>'title',new_status,next_revision,active,d)
 on conflict(id) do update set title=excluded.title,status=excluded.status,revision=excluded.revision,active_release=excluded.active_release,document=excluded.document,updated_at=now();
 if p_action='approve' then
   insert into public.prism_concept_releases(concept_id,version,title,treatment,document)
   values(p_id,next_revision,d->'submission'->>'title',d->'proposal'->>'treatment',d);
 end if;
 insert into public.prism_concept_history(concept_id,revision,action,document,actor) values(p_id,next_revision,p_action,d,p_actor);
 return jsonb_build_object('saved',true,'id',p_id,'revision',next_revision,'status',new_status,'activeRelease',active);
end $$;
revoke all on function public.prism_mutate_concept(uuid,integer,text,jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.prism_mutate_concept(uuid,integer,text,jsonb,uuid,integer) to service_role;

create function public.match_prism_concepts(search_text text,match_count integer default 3)
returns table(id uuid,title text,treatment text,guidance text,applicability text,boundaries text,source_url text,review_date text,rank real)
language sql stable security invoker set search_path=public as $$
 with terms as (
   select to_tsquery('english', string_agg(quote_literal(word), ' | ')) query
   from (select distinct unnest(tsvector_to_array(to_tsvector('english',left(search_text,1800)))) word) w
 )
 select c.id,r.title,r.treatment,r.document->'proposal'->>'guidance',r.document->'proposal'->>'applicability',r.document->'proposal'->>'boundaries',
 r.document->'submission'->>'sourceUrl',r.document->'proposal'->>'reviewDate',ts_rank(r.search_document,terms.query)
 from public.prism_concepts c join public.prism_concept_releases r on r.concept_id=c.id and r.version=c.active_release cross join terms
 where r.treatment<>'reference' and r.search_document @@ terms.query
 order by ts_rank(r.search_document,terms.query) desc,r.created_at desc limit least(greatest(match_count,1),3)
$$;
revoke all on function public.match_prism_concepts(text,integer) from public,anon,authenticated;
grant execute on function public.match_prism_concepts(text,integer) to service_role;
commit;
