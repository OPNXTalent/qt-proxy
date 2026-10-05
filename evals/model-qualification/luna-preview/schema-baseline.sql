-- Refuse to apply this snapshot over an existing application database.
DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname = 'public') THEN
    RAISE EXCEPTION 'TEST_BASELINE_REQUIRES_EMPTY_PUBLIC_SCHEMA';
  END IF;
END $guard$;

-- Evaluation branch baseline; schema only, no production rows or sequence positions.

-- Source: fgngixbhpilefmyyeldr; target must be pftfhbzrxfkdqmmburjp.

SET LOCAL check_function_bodies = off;

SET LOCAL search_path = public, extensions, pg_catalog;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public VERSION '0.8.0';

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SEQUENCE public."scripture_embeddings_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public."corpus_embeddings_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE public."access_codes" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "max_redemptions" integer DEFAULT 500,
  "redemption_count" integer DEFAULT 0,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "credits" integer DEFAULT 0 NOT NULL
);

CREATE TABLE public."channel_invitations" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "invited_by" uuid NOT NULL,
  "invited_user_id" uuid NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "responded_at" timestamp with time zone
);

CREATE TABLE public."channel_participants" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "user_id" uuid,
  "status" text DEFAULT 'active'::text NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "share_id" uuid
);

CREATE TABLE public."code_redemptions" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "code" text NOT NULL,
  "email" text NOT NULL,
  "query_count" integer DEFAULT 0 NOT NULL,
  "redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "access_expires_at" timestamp with time zone
);

CREATE TABLE public."corpus_embeddings" (
  "id" bigint DEFAULT nextval('public.corpus_embeddings_id_seq'::regclass) NOT NULL,
  "source" text NOT NULL,
  "section" text NOT NULL,
  "text" text NOT NULL,
  "tier" integer DEFAULT 1 NOT NULL,
  "embedding" public.vector(1536)
);

CREATE TABLE public."follow_ups" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "user_id" uuid,
  "query" text NOT NULL,
  "response" jsonb NOT NULL,
  "query_cost" integer DEFAULT 1 NOT NULL,
  "submitted_in" text DEFAULT 'solo'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source" text DEFAULT 'owner'::text NOT NULL,
  "share_id" uuid,
  "visibility" text DEFAULT 'private'::text NOT NULL,
  "anon_session_id" text,
  "display_name" text
);

CREATE TABLE public."inquiry_state_versions" (
  "inquiry_key" text NOT NULL,
  "version" integer NOT NULL,
  "state" jsonb NOT NULL,
  "request_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."inquiry_states" (
  "inquiry_key" text NOT NULL,
  "thread_id" uuid,
  "owner_user_id" uuid,
  "version" integer DEFAULT 0 NOT NULL,
  "state" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."interpretation_artifacts" (
  "artifact_id" uuid NOT NULL,
  "artifact_revision" integer NOT NULL,
  "inquiry_id" text NOT NULL,
  "inquiry_key" text NOT NULL,
  "thread_id" uuid,
  "owner_user_id" uuid,
  "completion_key" text NOT NULL,
  "constitution_version" text NOT NULL,
  "schema_version" integer NOT NULL,
  "query" text NOT NULL,
  "artifact" jsonb NOT NULL,
  "canonical_response" text NOT NULL,
  "status" text DEFAULT 'sealed'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sealed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "guest_id" uuid,
  "customer_query_cost" integer DEFAULT 2 NOT NULL
);

CREATE TABLE public."interpretation_packets" (
  "packet_id" text NOT NULL,
  "artifact_id" uuid NOT NULL,
  "artifact_revision" integer NOT NULL,
  "packet_type" text NOT NULL,
  "sequence" integer NOT NULL,
  "status" text NOT NULL,
  "content" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."migration_sessions" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "device_hint" text,
  "threads_found" integer DEFAULT 0 NOT NULL,
  "threads_imported" integer DEFAULT 0 NOT NULL,
  "threads_skipped" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE TABLE public."notifications" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "reference_id" uuid,
  "reference_type" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "email_sent" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "read_at" timestamp with time zone
);

CREATE TABLE public."prism_approved_learning" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL,
  "topic" text NOT NULL,
  "lesson" text NOT NULL,
  "applicability" text DEFAULT ''::text NOT NULL,
  "boundaries" text DEFAULT ''::text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "approved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "search_document" tsvector GENERATED ALWAYS AS (((setweight(to_tsvector('english'::regconfig, COALESCE(topic, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(lesson, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(applicability, ''::text)), 'C'::"char"))) STORED
);

CREATE TABLE public."prism_credit_allocations" (
  "allocation_key" text NOT NULL,
  "allocation_type" text NOT NULL,
  "user_id" uuid,
  "guest_id" uuid,
  "email" text,
  "credits" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_entitlements" (
  "user_id" uuid NOT NULL,
  "subscription_status" text DEFAULT 'inactive'::text NOT NULL,
  "subscription_period_start" timestamp with time zone,
  "subscription_period_end" timestamp with time zone,
  "subscription_allowance" integer DEFAULT 35 NOT NULL,
  "subscription_used" integer DEFAULT 0 NOT NULL,
  "bank_balance" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_fulfillment_events" (
  "fulfillment_key" text NOT NULL,
  "fulfillment_type" text NOT NULL,
  "email" text NOT NULL,
  "quantity" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_guests" (
  "guest_id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "secret_hash" text NOT NULL,
  "claimed_by" uuid,
  "claimed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_inquiry_forks" (
  "fork_id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "share_id" uuid NOT NULL,
  "source_thread_id" uuid NOT NULL,
  "source_artifact_id" uuid NOT NULL,
  "source_artifact_revision" integer NOT NULL,
  "fork_thread_id" uuid NOT NULL,
  "fork_artifact_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_inquiry_principals" (
  "inquiry_key" text NOT NULL,
  "principal_type" text NOT NULL,
  "guest_id" uuid,
  "user_id" uuid,
  "preview_allowance" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_learning_candidates" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "fingerprint" text NOT NULL,
  "topic" text NOT NULL,
  "lesson" text NOT NULL,
  "rationale" text NOT NULL,
  "applicability" text DEFAULT ''::text NOT NULL,
  "boundaries" text DEFAULT ''::text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "review_notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_pending_entitlements" (
  "email" text NOT NULL,
  "bank_balance" integer DEFAULT 0 NOT NULL,
  "subscription_status" text DEFAULT 'inactive'::text NOT NULL,
  "subscription_period_start" timestamp with time zone,
  "subscription_period_end" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."prism_query_ledger" (
  "usage_id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "completion_key" text NOT NULL,
  "principal_type" text NOT NULL,
  "guest_id" uuid,
  "user_id" uuid,
  "thread_id" uuid,
  "artifact_id" uuid NOT NULL,
  "artifact_revision" integer NOT NULL,
  "submission_type" text NOT NULL,
  "entitlement_source" text NOT NULL,
  "query_cost" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."query_log" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "thread_id" uuid,
  "query_type" text NOT NULL,
  "credit_source" text DEFAULT 'monthly'::text NOT NULL,
  "cost" integer DEFAULT 1 NOT NULL,
  "channel_context" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."query_tips" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "from_user_id" uuid NOT NULL,
  "to_user_id" uuid NOT NULL,
  "thread_id" uuid,
  "amount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."referrals" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "share_token" text,
  "sender_email" text NOT NULL,
  "recipient_email" text NOT NULL,
  "credited_at" timestamp with time zone DEFAULT now(),
  "credit_type" text DEFAULT 'thread_reset'::text
);

CREATE TABLE public."refraction_notes" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "thread_id" uuid NOT NULL,
  "node_id" text DEFAULT 'root'::text NOT NULL,
  "quote" text,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "edited_at" timestamp with time zone,
  "title" text,
  "anon_session_id" text
);

CREATE TABLE public."room_channels" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "room_id" uuid,
  "channel_type" text DEFAULT 'main'::text NOT NULL,
  "created_by" uuid NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "dissolved_at" timestamp with time zone,
  "share_id" uuid
);

CREATE TABLE public."room_messages" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "user_id" uuid,
  "content" text NOT NULL,
  "message_type" text DEFAULT 'text'::text NOT NULL,
  "prism_thread_id" uuid,
  "shared_to_channel_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "display_name" text,
  "share_id" uuid,
  "node_id" text DEFAULT 'root'::text NOT NULL
);

CREATE TABLE public."scripture_embeddings" (
  "id" bigint DEFAULT nextval('public.scripture_embeddings_id_seq'::regclass) NOT NULL,
  "book" text NOT NULL,
  "reference" text NOT NULL,
  "text" text NOT NULL,
  "tier" integer DEFAULT 1,
  "embedding" public.vector(1536)
);

CREATE TABLE public."session_surveys" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "respondent_id" uuid NOT NULL,
  "q1_score" integer NOT NULL,
  "q2_score" integer NOT NULL,
  "q3_score" integer NOT NULL,
  "would_return" boolean NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."share_chat_messages" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "share_id" uuid NOT NULL,
  "display_name" text,
  "message_type" text DEFAULT 'sender'::text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "session_token" text,
  "node_id" text DEFAULT 'root'::text,
  "user_id" uuid,
  "visibility" text DEFAULT 'private'::text NOT NULL,
  "edited_at" timestamp with time zone
);

CREATE TABLE public."shared_threads" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "shared_by" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "host_highlighted" boolean DEFAULT false NOT NULL,
  "highlighted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."shares" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "token" text,
  "sender_email" text,
  "recipient_email" text,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "subject" text,
  "thread_id" uuid,
  "status" text DEFAULT 'active'::text NOT NULL,
  "collaboration_open" boolean DEFAULT false NOT NULL,
  "last_viewed_at" timestamp with time zone,
  "referral_credited" boolean DEFAULT false NOT NULL,
  "last_engagement_notified_at" timestamp with time zone,
  "owner_user_id" uuid,
  "artifact_id" uuid,
  "artifact_revision" integer,
  "permission" text DEFAULT 'viewer'::text NOT NULL,
  "revoked_at" timestamp with time zone,
  "recipient_name" text,
  "invite_note" text
);

CREATE TABLE public."subscribers" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "tier" text,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "query_count" integer DEFAULT 0 NOT NULL,
  "query_reset_at" timestamp with time zone,
  "purchased_credits" integer DEFAULT 0 NOT NULL,
  "auto_credit_drawdown" boolean DEFAULT false NOT NULL,
  "trust_score" numeric(4,2) DEFAULT 5.00 NOT NULL,
  "flag_count" integer DEFAULT 0 NOT NULL,
  "ban_status" text DEFAULT 'none'::text NOT NULL,
  "can_initiate_collab" boolean DEFAULT false NOT NULL,
  "referral_trial" boolean DEFAULT false NOT NULL,
  "referral_queries_remaining" integer DEFAULT 0 NOT NULL,
  "display_name" text,
  "display_name_updated_at" timestamp with time zone
);

CREATE TABLE public."thread_collaborators" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "owner_id" uuid NOT NULL,
  "participant_id" uuid NOT NULL,
  "permission_level" text DEFAULT 'contributor'::text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "invited_by" uuid NOT NULL,
  "invite_method" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE TABLE public."thread_highlights" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "selected_text" text NOT NULL,
  "note" text,
  "section_key" text NOT NULL,
  "start_offset" integer NOT NULL,
  "end_offset" integer NOT NULL,
  "color" text DEFAULT 'yellow'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "shared_to_room" boolean DEFAULT false NOT NULL,
  "room_channel_id" uuid
);

CREATE TABLE public."thread_mutes" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "muter_user_id" uuid NOT NULL,
  "muted_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."thread_participants" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."thread_resets" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "reset_type" text NOT NULL,
  "cost" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."threads" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "title" text,
  "query" text NOT NULL,
  "response" jsonb NOT NULL,
  "query_type" text DEFAULT 'verse_reference'::text NOT NULL,
  "tier_at_creation" text NOT NULL,
  "retention_days" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "grace_ends_at" timestamp with time zone NOT NULL,
  "extended_at" timestamp with time zone,
  "extension_count" integer DEFAULT 0 NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "lock_reason" text,
  "shared_to_room" boolean DEFAULT false NOT NULL,
  "host_highlighted" boolean DEFAULT false NOT NULL,
  "migrated_from_local" boolean DEFAULT false NOT NULL,
  "local_id" text,
  "migration_session_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "visibility" text DEFAULT 'private'::text NOT NULL,
  "guest_id" uuid
);

CREATE TABLE public."trust_circle_members" (
  "membership_id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "share_id" uuid NOT NULL,
  "user_id" uuid,
  "guest_id" uuid,
  "display_name" text,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."user_flags" (
  "id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
  "flagged_user_id" uuid NOT NULL,
  "flagging_user_id" uuid NOT NULL,
  "thread_id" uuid,
  "contribution_id" uuid,
  "reason" text NOT NULL,
  "weight" numeric(4,2) DEFAULT 1.00 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION public.fork_shared_prism_inquiry(p_share_id uuid, p_user_id uuid)
 RETURNS TABLE(fork_thread_id uuid, fork_artifact_id uuid, artifact_revision integer, already_forked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_share public.shares%rowtype;
  v_source public.interpretation_artifacts%rowtype;
  v_source_thread public.threads%rowtype;
  v_existing public.prism_inquiry_forks%rowtype;
  v_thread_id uuid := gen_random_uuid();
  v_artifact_id uuid := gen_random_uuid();
  v_inquiry_key text := 'server:fork:' || gen_random_uuid()::text;
begin
  select * into v_existing from public.prism_inquiry_forks
    where share_id = p_share_id and owner_user_id = p_user_id;
  if found then
    return query select v_existing.fork_thread_id, v_existing.fork_artifact_id, 1, true;
    return;
  end if;
  select * into v_share from public.shares where id = p_share_id and status = 'active' and revoked_at is null for share;
  if not found then raise exception 'PRISM_SHARE_UNAVAILABLE'; end if;
  select * into v_source from public.interpretation_artifacts a
    where a.artifact_id = v_share.artifact_id and a.artifact_revision = v_share.artifact_revision;
  if not found then raise exception 'PRISM_SOURCE_ARTIFACT_MISSING'; end if;
  select * into v_source_thread from public.threads where id = v_source.thread_id;
  if not found then raise exception 'PRISM_SOURCE_THREAD_MISSING'; end if;

  insert into public.threads(id, user_id, guest_id, title, query, response, query_type,
    tier_at_creation, retention_days, expires_at, grace_ends_at)
  values (v_thread_id, p_user_id, null, v_source_thread.title, v_source.query,
    v_source_thread.response, v_source_thread.query_type, v_source_thread.tier_at_creation,
    v_source_thread.retention_days, v_source_thread.expires_at, v_source_thread.grace_ends_at);

  insert into public.prism_inquiry_principals(inquiry_key, principal_type, user_id)
    values (v_inquiry_key, 'user', p_user_id);
  insert into public.interpretation_artifacts(
    artifact_id, artifact_revision, inquiry_id, inquiry_key, thread_id, owner_user_id,
    guest_id, completion_key, constitution_version, schema_version, query, artifact,
    canonical_response, customer_query_cost
  ) values (
    v_artifact_id, 1, 'fork:' || v_artifact_id::text, v_inquiry_key, v_thread_id, p_user_id,
    null, 'fork:' || p_share_id::text || ':' || p_user_id::text,
    v_source.constitution_version, v_source.schema_version, v_source.query, v_source.artifact,
    v_source.canonical_response, 0
  );
  insert into public.interpretation_packets(packet_id, artifact_id, artifact_revision,
    packet_type, sequence, status, content)
    select gen_random_uuid()::text, v_artifact_id, 1, p.packet_type, p.sequence, p.status, p.content
    from public.interpretation_packets p
    where p.artifact_id = v_source.artifact_id and p.artifact_revision = v_source.artifact_revision;
  insert into public.prism_inquiry_forks(share_id, source_thread_id, source_artifact_id,
    source_artifact_revision, fork_thread_id, fork_artifact_id, owner_user_id)
  values (p_share_id, v_source.thread_id, v_source.artifact_id, v_source.artifact_revision,
    v_thread_id, v_artifact_id, p_user_id);
  return query select v_thread_id, v_artifact_id, 1, false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.add_signup_bonus(p_email text, p_credits integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE subscribers
  SET purchased_credits = COALESCE(purchased_credits, 0) + p_credits
  WHERE email = p_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.classify_prism_artifact_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.customer_query_cost <> 0 then
    new.customer_query_cost := case when new.artifact_revision = 1 then 2 else 1 end;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.commit_inquiry_state(p_inquiry_key text, p_expected_version integer, p_state jsonb, p_thread_id uuid DEFAULT NULL::uuid, p_owner_user_id uuid DEFAULT NULL::uuid, p_request_id text DEFAULT NULL::text)
 RETURNS TABLE(committed boolean, current_version integer, current_state jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_current public.inquiry_states%rowtype;
 v_next_version integer;
 v_committed_state jsonb;
begin
 if p_inquiry_key is null or length(p_inquiry_key) < 12 or p_state is null then
  raise exception 'invalid inquiry state commit';
 end if;
 perform pg_advisory_xact_lock(hashtext(p_inquiry_key));
 select * into v_current from public.inquiry_states where inquiry_key = p_inquiry_key for update;
 if found and v_current.version <> p_expected_version then
  return query select false, v_current.version, v_current.state;
  return;
 end if;
 if not found and p_expected_version <> 0 then
  return query select false, 0, null::jsonb;
  return;
 end if;
 v_next_version := p_expected_version + 1;
 v_committed_state := jsonb_set(p_state, '{version}', to_jsonb(v_next_version), true);
 insert into public.inquiry_state_versions(inquiry_key, version, state, request_id)
 values (p_inquiry_key, v_next_version, v_committed_state, p_request_id);
 insert into public.inquiry_states as current_inquiry(inquiry_key, thread_id, owner_user_id, version, state, updated_at)
 values (p_inquiry_key, p_thread_id, p_owner_user_id, v_next_version, v_committed_state, now())
 on conflict (inquiry_key) do update set
  thread_id = coalesce(current_inquiry.thread_id, excluded.thread_id),
  owner_user_id = coalesce(current_inquiry.owner_user_id, excluded.owner_user_id),
  version = excluded.version,
  state = excluded.state,
  updated_at = now();
 return query select true, v_next_version, v_committed_state;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prepare_prism_inquiry(p_inquiry_key text, p_guest_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_preview_allowance integer DEFAULT NULL::integer, p_query_cost integer DEFAULT 2)
 RETURNS TABLE(allowed boolean, entitlement_source text, remaining integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_access record;
begin
  if p_inquiry_key is null or length(p_inquiry_key) < 12 then raise exception 'PRISM_INQUIRY_KEY_INVALID'; end if;
  if p_query_cost not in (1, 2) then raise exception 'PRISM_QUERY_COST_INVALID'; end if;
  select * into v_access from public.prism_query_access(p_guest_id, p_user_id, p_preview_allowance);
  if not coalesce(v_access.allowed, false) or coalesce(v_access.remaining, 0) < p_query_cost then
    return query select false, v_access.entitlement_source, v_access.remaining, v_access.reset_at;
    return;
  end if;
  insert into public.prism_inquiry_principals(inquiry_key, principal_type, guest_id, user_id, preview_allowance)
  values (p_inquiry_key, case when p_user_id is null then 'guest' else 'user' end,
    p_guest_id, p_user_id, p_preview_allowance)
  on conflict (inquiry_key) do update set
    principal_type = excluded.principal_type, guest_id = excluded.guest_id,
    user_id = excluded.user_id, preview_allowance = excluded.preview_allowance
  where public.prism_inquiry_principals.principal_type = excluded.principal_type
    and coalesce(public.prism_inquiry_principals.guest_id, public.prism_inquiry_principals.user_id)
      = coalesce(excluded.guest_id, excluded.user_id);
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_CONFLICT'; end if;
  return query select true, v_access.entitlement_source, v_access.remaining, v_access.reset_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.draw_query(p_user_id uuid, p_cost integer DEFAULT 1)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$declare
  v_sub    public.subscribers%rowtype;
  v_limit  integer;
  v_source text;
begin
  select * into v_sub
  from public.subscribers
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Subscriber not found';
  end if;

  v_limit := case v_sub.tier
    when 'scholar'       then 100
    when 'refraction'    then 100
    when 'theologian'    then 250
    when 'full_spectrum' then 250
    when 'companion'     then 500
    when 'free'          then 3
    else 3
  end;

  -- Step 1: Monthly allocation
  if v_sub.query_count + p_cost <= v_limit then
    update public.subscribers
    set query_count = query_count + p_cost,
        updated_at  = now()
    where id = p_user_id;
    v_source := 'monthly';

  -- Step 2: Purchased credits
  elsif v_sub.auto_credit_drawdown
    and v_sub.purchased_credits >= p_cost then
    update public.subscribers
    set purchased_credits = purchased_credits - p_cost,
        updated_at        = now()
    where id = p_user_id;
    v_source := 'purchased';

  else
    raise exception 'INSUFFICIENT_QUERIES';
  end if;

  -- Log the query
  insert into public.query_log (user_id, query_type, credit_source, cost)
  values (p_user_id, 'prism', v_source, p_cost);

  return v_source;
end;$function$;

CREATE OR REPLACE FUNCTION public.transfer_credits(p_from_user_id uuid, p_to_user_id uuid, p_amount integer, p_thread_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.subscribers
  set purchased_credits = purchased_credits - p_amount,
      updated_at        = now()
  where id = p_from_user_id
    and purchased_credits >= p_amount;

  if not found then
    raise exception 'INSUFFICIENT_PURCHASED_CREDITS';
  end if;

  update public.subscribers
  set purchased_credits = purchased_credits + p_amount,
      updated_at        = now()
  where id = p_to_user_id;

  insert into public.query_tips (from_user_id, to_user_id, thread_id, amount)
  values (p_from_user_id, p_to_user_id, p_thread_id, p_amount);
end;
$function$;

CREATE OR REPLACE FUNCTION public.reset_monthly_queries(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.subscribers
  set query_count    = 0,
      query_reset_at = now() + interval '1 month',
      updated_at     = now()
  where id = p_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_trust_score(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_avg_score   numeric;
  v_flag_weight numeric;
begin
  select avg((q1_score + q2_score + q3_score)::numeric / 3)
  into v_avg_score
  from public.session_surveys s
  join public.thread_collaborators tc
    on tc.thread_id = s.thread_id
  where tc.participant_id = p_user_id
     or tc.owner_id = p_user_id;

  select coalesce(sum(weight), 0)
  into v_flag_weight
  from public.user_flags
  where flagged_user_id = p_user_id;

  update public.subscribers
  set trust_score = greatest(0, least(5,
        coalesce(v_avg_score, 5.0) - (v_flag_weight * 0.1)
      )),
      updated_at  = now()
  where id = p_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.migrate_local_threads(p_user_id uuid, p_device_hint text, p_threads jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_session_id    uuid := gen_random_uuid();
  v_thread        jsonb;
  v_found         integer := 0;
  v_imported      integer := 0;
  v_skipped       integer := 0;
  v_local_id      text;
  v_tier          text;
  v_retention     integer;
  v_created_at    timestamptz;
  v_expires_at    timestamptz;
begin
  -- One migration per account lifetime
  if exists (
    select 1 from public.migration_sessions
    where user_id = p_user_id and status = 'complete'
  ) then
    return jsonb_build_object(
      'status',  'already_migrated',
      'message', 'Migration already ran for this account. Supabase is authoritative.'
    );
  end if;

  select tier into v_tier
  from public.subscribers where id = p_user_id;

  v_retention := case v_tier
    when 'scholar'    then 90
    when 'theologian' then 180
    when 'free'       then 1
    else 30
  end;

  v_found := jsonb_array_length(p_threads);

  insert into public.migration_sessions
    (id, user_id, device_hint, threads_found, status)
  values
    (v_session_id, p_user_id, p_device_hint, v_found, 'pending');

  for v_thread in select * from jsonb_array_elements(p_threads)
  loop
    v_local_id := v_thread->>'id';

    if exists (
      select 1 from public.threads
      where user_id = p_user_id and local_id = v_local_id
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    begin
      v_created_at := coalesce(
        (v_thread->>'created_at')::timestamptz, now()
      );
    exception when others then
      v_created_at := now();
    end;

    v_expires_at := v_created_at + (v_retention || ' days')::interval;

    insert into public.threads (
      user_id, title, query, response, query_type,
      tier_at_creation, retention_days,
      expires_at, grace_ends_at,
      migrated_from_local, local_id, migration_session_id,
      created_at, updated_at
    ) values (
      p_user_id,
      coalesce(v_thread->>'title', left(v_thread->>'query', 60)),
      coalesce(v_thread->>'query', ''),
      coalesce(v_thread->'response', '{}'::jsonb),
      coalesce(v_thread->>'query_type', 'free_text'),
      v_tier,
      v_retention,
      v_expires_at,
      v_expires_at + interval '30 days',
      true,
      v_local_id,
      v_session_id,
      v_created_at,
      now()
    );

    v_imported := v_imported + 1;
  end loop;

  update public.migration_sessions
  set threads_imported = v_imported,
      threads_skipped  = v_skipped,
      status           = 'complete',
      completed_at     = now()
  where id = v_session_id;

  return jsonb_build_object(
    'status',           'complete',
    'session_id',       v_session_id,
    'threads_found',    v_found,
    'threads_imported', v_imported,
    'threads_skipped',  v_skipped,
    'message',          'Migration complete. Clear localStorage and read from Supabase on all devices.'
  );

exception when others then
  update public.migration_sessions
  set status = 'failed', completed_at = now()
  where id = v_session_id;
  raise;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_thread(p_user_id uuid, p_title text, p_query text, p_response jsonb, p_query_type text, p_tier text, p_retention_days integer, p_expires_at timestamp with time zone, p_grace_ends_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_thread_id uuid;
begin
  insert into public.threads (
    user_id,
    title,
    query,
    response,
    query_type,
    tier_at_creation,
    retention_days,
    expires_at,
    grace_ends_at,
    created_at,
    updated_at
  ) values (
    p_user_id,
    p_title,
    p_query,
    p_response,
    p_query_type,
    p_tier,
    p_retention_days,
    p_expires_at,
    p_grace_ends_at,
    now(),
    now()
  )
  returning id into v_thread_id;

  return v_thread_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.attach_interpretation_packet(p_packet_id text, p_artifact_id uuid, p_artifact_revision integer, p_packet_type text, p_sequence integer, p_status text, p_content jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.interpretation_packets(
    packet_id, artifact_id, artifact_revision, packet_type, sequence, status, content
  ) values (
    p_packet_id, p_artifact_id, p_artifact_revision, p_packet_type,
    p_sequence, p_status, p_content
  ) on conflict (packet_id) do nothing;

  return (
    select jsonb_build_object(
      'packetId', p.packet_id,
      'artifactId', p.artifact_id,
      'artifactRevision', p.artifact_revision,
      'packetType', p.packet_type,
      'sequence', p.sequence,
      'status', p.status,
      'content', p.content
    )
    from public.interpretation_packets p
    where p.packet_id = p_packet_id
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.draw_signal_credit(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_credits integer;
begin
  select purchased_credits into v_credits
  from subscribers
  where id = p_user_id
  for update;

  if v_credits is null or v_credits < 1 then
    return false;
  end if;

  update subscribers
  set purchased_credits = purchased_credits - 1,
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_prism_guest(p_guest_id uuid, p_user_id uuid)
 RETURNS TABLE(claimed boolean, already_claimed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_guest public.prism_guests%rowtype;
  v_email text;
  v_pending public.prism_pending_entitlements%rowtype;
  v_remaining integer := 0;
  v_first_registration boolean := false;
  v_added integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select * into v_guest from public.prism_guests where guest_id = p_guest_id for update;
  if not found then raise exception 'PRISM_GUEST_NOT_FOUND'; end if;
  if v_guest.claimed_by is not null then
    if v_guest.claimed_by <> p_user_id then raise exception 'PRISM_GUEST_ALREADY_CLAIMED'; end if;
    return query select true, true; return;
  end if;
  v_first_registration := not exists (
    select 1 from public.prism_credit_allocations
    where allocation_key = 'registration:' || p_user_id::text || ':welcome'
  );
  if v_first_registration then
    select greatest(5 - coalesce(sum(query_cost), 0), 0)::integer into v_remaining
    from public.prism_query_ledger
    where guest_id = p_guest_id and entitlement_source = 'explorer'
      and created_at > now() - interval '24 hours';
    if v_remaining > 0 then
      insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, guest_id, credits)
      values ('registration:' || p_user_id::text || ':guest-remainder', 'guest_remainder', p_user_id, p_guest_id, v_remaining);
      v_added := v_added + v_remaining;
    end if;
    insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, guest_id, credits)
    values ('registration:' || p_user_id::text || ':final-trial', 'final_trial', p_user_id, p_guest_id, 5);
    insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, guest_id, credits)
    values ('registration:' || p_user_id::text || ':welcome', 'welcome', p_user_id, p_guest_id, 3);
    v_added := v_added + 8;
  end if;
  insert into public.prism_entitlements(user_id, bank_balance)
  values (p_user_id, v_added)
  on conflict (user_id) do update set
    bank_balance = public.prism_entitlements.bank_balance + excluded.bank_balance,
    updated_at = now();
  update public.prism_query_ledger set principal_type = 'user', user_id = p_user_id, guest_id = null
    where guest_id = p_guest_id;
  update public.prism_inquiry_principals set principal_type = 'user', user_id = p_user_id, guest_id = null
    where guest_id = p_guest_id;
  update public.threads set user_id = p_user_id, guest_id = null where guest_id = p_guest_id;
  update public.interpretation_artifacts set owner_user_id = p_user_id, guest_id = null where guest_id = p_guest_id;
  insert into public.trust_circle_members(share_id, user_id, display_name, joined_at, last_seen_at)
    select share_id, p_user_id, display_name, joined_at, last_seen_at
    from public.trust_circle_members where guest_id = p_guest_id
    on conflict (share_id, user_id) where user_id is not null do update
      set last_seen_at = greatest(public.trust_circle_members.last_seen_at, excluded.last_seen_at);
  delete from public.trust_circle_members where guest_id = p_guest_id;
  update public.inquiry_states set owner_user_id = p_user_id where owner_user_id is null
    and inquiry_key in (select inquiry_key from public.interpretation_artifacts where owner_user_id = p_user_id);
  update public.prism_guests set claimed_by = p_user_id, claimed_at = now(), last_seen_at = now()
    where guest_id = p_guest_id;
  select lower(email) into v_email from auth.users where id = p_user_id;
  select * into v_pending from public.prism_pending_entitlements where email = v_email for update;
  if found then
    update public.prism_entitlements set
      bank_balance = bank_balance + v_pending.bank_balance,
      subscription_status = v_pending.subscription_status,
      subscription_period_start = v_pending.subscription_period_start,
      subscription_period_end = v_pending.subscription_period_end,
      updated_at = now()
    where user_id = p_user_id;
    delete from public.prism_pending_entitlements where email = v_email;
  end if;
  return query select true, false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_prism_subscription_by_email(p_email text, p_status text, p_period_start timestamp with time zone, p_period_end timestamp with time zone, p_fulfillment_key text DEFAULT NULL::text, p_credits integer DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_email text := lower(trim(p_email));
  v_apply_credits boolean := false;
begin
  if p_status not in ('inactive', 'active', 'past_due', 'canceled') then raise exception 'PRISM_SUBSCRIPTION_STATUS_INVALID'; end if;
  if p_credits not in (0, 350) then raise exception 'PRISM_MEMBERSHIP_PRODUCT_INVALID'; end if;
  if p_credits > 0 and nullif(trim(p_fulfillment_key), '') is null then raise exception 'PRISM_FULFILLMENT_KEY_INVALID'; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if p_credits > 0 then
    insert into public.prism_fulfillment_events(fulfillment_key, fulfillment_type, email, quantity)
    values (p_fulfillment_key, 'membership', v_email, p_credits)
    on conflict (fulfillment_key) do nothing;
    v_apply_credits := found;
    if v_apply_credits then
      insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, email, credits)
      values ('membership:' || p_fulfillment_key, 'membership', v_user_id, v_email, p_credits);
    end if;
  end if;
  if v_user_id is null then
    insert into public.prism_pending_entitlements(
      email, bank_balance, subscription_status, subscription_period_start, subscription_period_end
    ) values (
      v_email, case when v_apply_credits then p_credits else 0 end,
      p_status, p_period_start, p_period_end
    ) on conflict (email) do update set
      bank_balance = public.prism_pending_entitlements.bank_balance +
        case when v_apply_credits then p_credits else 0 end,
      subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end, updated_at = now();
  else
    insert into public.prism_entitlements(
      user_id, bank_balance, subscription_status, subscription_period_start, subscription_period_end
    ) values (
      v_user_id, case when v_apply_credits then p_credits else 0 end,
      p_status, p_period_start, p_period_end
    ) on conflict (user_id) do update set
      bank_balance = public.prism_entitlements.bank_balance +
        case when v_apply_credits then p_credits else 0 end,
      subscription_status = excluded.subscription_status,
      subscription_period_start = excluded.subscription_period_start,
      subscription_period_end = excluded.subscription_period_end,
      updated_at = now();
  end if;
  return v_apply_credits;
end;
$function$;

CREATE OR REPLACE FUNCTION public.credit_referral_query(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sub_id uuid;
BEGIN
  -- Find the subscriber
  SELECT id INTO v_sub_id
  FROM public.subscribers
  WHERE email = p_email
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RETURN false;
  END IF;

  -- Add 1 purchased credit as referral reward
  UPDATE public.subscribers
  SET purchased_credits = COALESCE(purchased_credits, 0) + 1
  WHERE id = v_sub_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_prism_learning_candidate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.match_prism_learning(search_text text, match_count integer DEFAULT 3)
 RETURNS TABLE(id uuid, topic text, lesson text, applicability text, boundaries text, tags text[], rank real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.match_corpus(query_embedding public.vector, match_threshold double precision DEFAULT 0.3, match_count integer DEFAULT 5, filter_source text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, source text, section text, text text, tier integer, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    id,
    source,
    section,
    text,
    tier,
    1 - (embedding <=> query_embedding) as similarity
  from corpus_embeddings
  where
    (filter_source is null or source = filter_source)
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$function$;

CREATE OR REPLACE FUNCTION public.complete_interpretation_artifact(p_artifact_id uuid, p_artifact_revision integer, p_inquiry_id text, p_inquiry_key text, p_thread_id uuid, p_owner_user_id uuid, p_completion_key text, p_constitution_version text, p_schema_version integer, p_query text, p_artifact jsonb, p_canonical_response text, p_orientation_packet jsonb, p_canonical_packet jsonb, p_charge boolean DEFAULT false, p_usage_user_id uuid DEFAULT NULL::uuid, p_usage_query_type text DEFAULT NULL::text, p_usage_credit_source text DEFAULT NULL::text, p_usage_channel_context text DEFAULT 'solo'::text, p_thread_payload jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(completed boolean, already_completed boolean, thread_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted integer;
  v_thread_id uuid := p_thread_id;
  v_principal public.prism_inquiry_principals%rowtype;
begin
  if p_artifact_revision < 1 or p_inquiry_id is null or p_inquiry_key is null
    or p_completion_key is null or p_artifact is null or p_canonical_response is null then
    raise exception 'invalid artifact completion';
  end if;
  select * into v_principal from public.prism_inquiry_principals where inquiry_key = p_inquiry_key;
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_MISSING'; end if;
  if p_owner_user_id is not null and p_owner_user_id is distinct from v_principal.user_id then
    raise exception 'PRISM_ARTIFACT_OWNER_MISMATCH';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_completion_key));
  if exists (select 1 from public.interpretation_artifacts where completion_key = p_completion_key) then
    return query select true, true, a.thread_id from public.interpretation_artifacts a
      where a.completion_key = p_completion_key;
    return;
  end if;
  if v_thread_id is not null and not exists (
    select 1 from public.threads t where t.id = v_thread_id
      and ((v_principal.user_id is not null and t.user_id = v_principal.user_id)
        or (v_principal.guest_id is not null and t.guest_id = v_principal.guest_id))
  ) then raise exception 'PRISM_THREAD_OWNER_MISMATCH'; end if;
  if v_thread_id is null and p_thread_payload is not null then
    insert into public.threads(
      user_id, guest_id, title, query, response, query_type, tier_at_creation,
      retention_days, expires_at, grace_ends_at
    ) values (
      v_principal.user_id, v_principal.guest_id, p_thread_payload->>'title', p_query,
      coalesce(p_thread_payload->'response', '{}'::jsonb),
      coalesce(p_thread_payload->>'query_type', 'free_text'),
      coalesce(p_thread_payload->>'tier_at_creation', 'free'),
      coalesce((p_thread_payload->>'retention_days')::integer, 30),
      (p_thread_payload->>'expires_at')::timestamptz,
      (p_thread_payload->>'grace_ends_at')::timestamptz
    ) returning id into v_thread_id;
  end if;
  insert into public.interpretation_artifacts(
    artifact_id, artifact_revision, inquiry_id, inquiry_key, thread_id,
    owner_user_id, guest_id, completion_key, constitution_version, schema_version,
    query, artifact, canonical_response
  ) values (
    p_artifact_id, p_artifact_revision, p_inquiry_id, p_inquiry_key, v_thread_id,
    v_principal.user_id, v_principal.guest_id, p_completion_key,
    p_constitution_version, p_schema_version, p_query, p_artifact, p_canonical_response
  ) on conflict (completion_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return query select true, true, a.thread_id from public.interpretation_artifacts a
      where a.completion_key = p_completion_key;
    return;
  end if;
  insert into public.interpretation_packets(
    packet_id, artifact_id, artifact_revision, packet_type, sequence, status, content
  ) values
    (p_orientation_packet->>'packetId', p_artifact_id, p_artifact_revision,
      p_orientation_packet->>'packetType', 1, 'complete', p_orientation_packet->'content'),
    (p_canonical_packet->>'packetId', p_artifact_id, p_artifact_revision,
      p_canonical_packet->>'packetType', 2, 'complete', p_canonical_packet->'content');
  return query select true, false, v_thread_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_followup_interpretation_artifact(p_expected_state_version integer, p_inquiry_state jsonb, p_request_id text, p_artifact_id uuid, p_artifact_revision integer, p_inquiry_id text, p_inquiry_key text, p_thread_id uuid, p_owner_user_id uuid, p_completion_key text, p_constitution_version text, p_schema_version integer, p_query text, p_artifact jsonb, p_canonical_response text, p_orientation_packet jsonb, p_canonical_packet jsonb)
 RETURNS TABLE(completed boolean, conflict boolean, state_version integer, canonical_state jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_state record;
  v_artifact record;
begin
  select * into v_state from public.commit_inquiry_state(
    p_inquiry_key, p_expected_state_version, p_inquiry_state,
    p_thread_id, p_owner_user_id, p_request_id
  );
  if not v_state.committed then
    return query select false, true, v_state.current_version, v_state.current_state;
    return;
  end if;

  select * into v_artifact from public.complete_interpretation_artifact(
    p_artifact_id, p_artifact_revision, p_inquiry_id, p_inquiry_key,
    p_thread_id, p_owner_user_id, p_completion_key,
    p_constitution_version, p_schema_version, p_query, p_artifact,
    p_canonical_response, p_orientation_packet, p_canonical_packet,
    false, null, null, null, 'solo', null
  );
  if not v_artifact.completed then
    raise exception 'artifact completion failed';
  end if;
  return query select true, false, v_state.current_version, v_state.current_state;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_share_followup(p_share_id uuid)
 RETURNS void
 LANGUAGE sql
AS $function$
  SELECT 1; -- no-op: followup_count column not present on shares
$function$;

CREATE OR REPLACE FUNCTION public.prism_query_access(p_guest_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_preview_allowance integer DEFAULT NULL::integer)
 RETURNS TABLE(allowed boolean, entitlement_source text, remaining integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_entitlement public.prism_entitlements%rowtype;
  v_used integer := 0;
  v_reset timestamptz;
begin
  if (p_guest_id is null) = (p_user_id is null) then raise exception 'PRISM_PRINCIPAL_INVALID'; end if;
  if p_preview_allowance is not null then
    select coalesce(sum(query_cost), 0)::integer into v_used
    from public.prism_query_ledger
    where user_id = p_user_id and entitlement_source = 'preview';
    return query select v_used < p_preview_allowance, 'preview'::text,
      greatest(p_preview_allowance - v_used, 0), null::timestamptz;
    return;
  end if;
  if p_user_id is not null then
    select * into v_entitlement from public.prism_entitlements where user_id = p_user_id;
    return query select coalesce(v_entitlement.bank_balance, 0) > 0, 'bank'::text,
      coalesce(v_entitlement.bank_balance, 0), null::timestamptz;
    return;
  end if;
  v_reset := now() - interval '24 hours';
  select coalesce(sum(l.query_cost), 0)::integer into v_used
  from public.prism_query_ledger l
  where l.guest_id = p_guest_id and l.entitlement_source = 'explorer'
    and l.created_at > v_reset;
  return query select v_used < 5, 'explorer'::text, greatest(5 - v_used, 0),
    (select min(l.created_at) + interval '24 hours'
     from public.prism_query_ledger l
     where l.guest_id = p_guest_id and l.entitlement_source = 'explorer'
       and l.created_at > v_reset);
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_creator_is_participant()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.visibility = 'trust_circle' and (old.visibility is null or old.visibility != 'trust_circle') then
    insert into thread_participants (thread_id, user_id, active)
    values (new.id, new.user_id, true)
    on conflict (thread_id, user_id) do nothing;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.charge_prism_artifact_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_principal public.prism_inquiry_principals%rowtype;
begin
  if new.customer_query_cost = 0 then return new; end if;
  select * into v_principal from public.prism_inquiry_principals where inquiry_key = new.inquiry_key;
  if not found then raise exception 'PRISM_INQUIRY_PRINCIPAL_MISSING'; end if;
  perform public.consume_prism_query(
    new.completion_key, v_principal.guest_id, v_principal.user_id, new.thread_id,
    new.artifact_id, new.artifact_revision,
    case when new.artifact_revision = 1 then 'primary' else 'follow_up' end,
    v_principal.preview_allowance
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consume_prism_query(p_completion_key text, p_guest_id uuid, p_user_id uuid, p_thread_id uuid, p_artifact_id uuid, p_artifact_revision integer, p_submission_type text, p_preview_allowance integer DEFAULT NULL::integer)
 RETURNS TABLE(consumed boolean, already_consumed boolean, entitlement_source text, remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_access record;
  v_source text;
  v_remaining integer;
  v_cost integer;
begin
  if p_completion_key is null or p_submission_type not in ('primary', 'follow_up') then
    raise exception 'PRISM_QUERY_USAGE_INVALID';
  end if;
  v_cost := case when p_submission_type = 'primary' then 2 else 1 end;
  if (p_guest_id is null) = (p_user_id is null) then raise exception 'PRISM_PRINCIPAL_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext(p_completion_key));
  if exists (select 1 from public.prism_query_ledger where completion_key = p_completion_key) then
    return query select true, true, l.entitlement_source,
      case when l.principal_type = 'user' then coalesce(e.bank_balance, 0)
           else greatest(5 - coalesce((select sum(x.query_cost)::integer
             from public.prism_query_ledger x where x.guest_id = l.guest_id
               and x.entitlement_source = 'explorer'
               and x.created_at > now() - interval '24 hours'), 0), 0) end
    from public.prism_query_ledger l
    left join public.prism_entitlements e on e.user_id = l.user_id
    where l.completion_key = p_completion_key;
    return;
  end if;
  if p_user_id is not null then perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  else perform pg_advisory_xact_lock(hashtext(p_guest_id::text)); end if;
  select * into v_access from public.prism_query_access(p_guest_id, p_user_id, p_preview_allowance);
  if not coalesce(v_access.allowed, false) or coalesce(v_access.remaining, 0) < v_cost then
    raise exception 'PRISM_QUERY_UNAVAILABLE';
  end if;
  v_source := v_access.entitlement_source;
  if p_user_id is not null and v_source = 'bank' then
    update public.prism_entitlements
    set bank_balance = bank_balance - v_cost, updated_at = now()
    where user_id = p_user_id and bank_balance >= v_cost
    returning bank_balance into v_remaining;
    if not found then raise exception 'PRISM_QUERY_UNAVAILABLE'; end if;
  else
    v_remaining := greatest(coalesce(v_access.remaining, 0) - v_cost, 0);
  end if;
  insert into public.prism_query_ledger(
    completion_key, principal_type, guest_id, user_id, thread_id, artifact_id,
    artifact_revision, submission_type, entitlement_source, query_cost
  ) values (
    p_completion_key, case when p_user_id is null then 'guest' else 'user' end,
    p_guest_id, p_user_id, p_thread_id, p_artifact_id, p_artifact_revision,
    p_submission_type, v_source, v_cost
  );
  return query select true, false, v_source, v_remaining;
end;
$function$;

CREATE OR REPLACE FUNCTION public.credit_prism_bank_by_email(p_email text, p_queries integer, p_fulfillment_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user_id uuid; v_email text := lower(trim(p_email));
begin
  if p_queries <> 125 then raise exception 'PRISM_BANK_PRODUCT_INVALID'; end if;
  if nullif(trim(p_fulfillment_key), '') is null then raise exception 'PRISM_FULFILLMENT_KEY_INVALID'; end if;
  insert into public.prism_fulfillment_events(fulfillment_key, fulfillment_type, email, quantity)
  values (p_fulfillment_key, 'query_bank', v_email, p_queries)
  on conflict (fulfillment_key) do nothing;
  if not found then return false; end if;
  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  insert into public.prism_credit_allocations(allocation_key, allocation_type, user_id, email, credits)
  values ('purchase:' || p_fulfillment_key, 'purchase', v_user_id, v_email, p_queries);
  if v_user_id is null then
    insert into public.prism_pending_entitlements(email, bank_balance) values (v_email, p_queries)
    on conflict (email) do update set bank_balance = public.prism_pending_entitlements.bank_balance + excluded.bank_balance,
      updated_at = now();
  else
    insert into public.prism_entitlements(user_id, bank_balance) values (v_user_id, p_queries)
    on conflict (user_id) do update set bank_balance = public.prism_entitlements.bank_balance + excluded.bank_balance,
      updated_at = now();
  end if;
  return true;
end;
$function$;

ALTER TABLE public."room_channels" ADD CONSTRAINT "room_channels_channel_type_check" CHECK (channel_type = ANY (ARRAY['main'::text, 'direct'::text, 'small_group'::text]));

ALTER TABLE public."room_channels" ADD CONSTRAINT "room_channels_pkey" PRIMARY KEY (id);

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_channel_id_user_id_key" UNIQUE (channel_id, user_id);

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_identity_exactly_one" CHECK (((user_id IS NOT NULL)::integer + (share_id IS NOT NULL)::integer) = 1);

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_pkey" PRIMARY KEY (id);

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_status_check" CHECK (status = ANY (ARRAY['active'::text, 'muted'::text, 'removed'::text]));

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_author_exactly_one" CHECK (((user_id IS NOT NULL)::integer + (share_id IS NOT NULL)::integer) = 1);

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_message_type_check" CHECK (message_type = ANY (ARRAY['text'::text, 'prism_invocation'::text, 'system'::text, 'host_highlight'::text, 'share_recommendation'::text]));

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_pkey" PRIMARY KEY (id);

ALTER TABLE public."access_codes" ADD CONSTRAINT "access_codes_code_key" UNIQUE (code);

ALTER TABLE public."access_codes" ADD CONSTRAINT "access_codes_pkey" PRIMARY KEY (id);

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_pkey" PRIMARY KEY (id);

ALTER TABLE public."interpretation_packets" ADD CONSTRAINT "interpretation_packets_artifact_id_artifact_revision_sequen_key" UNIQUE (artifact_id, artifact_revision, sequence);

ALTER TABLE public."interpretation_packets" ADD CONSTRAINT "interpretation_packets_pkey" PRIMARY KEY (packet_id);

ALTER TABLE public."interpretation_packets" ADD CONSTRAINT "interpretation_packets_sequence_check" CHECK (sequence >= 1);

ALTER TABLE public."interpretation_packets" ADD CONSTRAINT "interpretation_packets_status_check" CHECK (status = ANY (ARRAY['complete'::text, 'failed'::text]));

ALTER TABLE public."prism_credit_allocations" ADD CONSTRAINT "prism_credit_allocations_allocation_type_check" CHECK (allocation_type = ANY (ARRAY['guest_remainder'::text, 'final_trial'::text, 'welcome'::text, 'purchase'::text, 'membership'::text, 'legacy_subscription_opening'::text]));

ALTER TABLE public."prism_credit_allocations" ADD CONSTRAINT "prism_credit_allocations_check" CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL OR email IS NOT NULL);

ALTER TABLE public."prism_credit_allocations" ADD CONSTRAINT "prism_credit_allocations_credits_check" CHECK (credits > 0);

ALTER TABLE public."prism_credit_allocations" ADD CONSTRAINT "prism_credit_allocations_pkey" PRIMARY KEY (allocation_key);

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_artifact_revision_check" CHECK (artifact_revision >= 1);

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_completion_key_key" UNIQUE (completion_key);

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_customer_query_cost_check" CHECK (customer_query_cost = ANY (ARRAY[0, 1, 2]));

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_pkey" PRIMARY KEY (artifact_id, artifact_revision);

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_status_check" CHECK (status = 'sealed'::text);

ALTER TABLE public."code_redemptions" ADD CONSTRAINT "code_redemptions_pkey" PRIMARY KEY (id);

ALTER TABLE public."inquiry_states" ADD CONSTRAINT "inquiry_states_pkey" PRIMARY KEY (inquiry_key);

ALTER TABLE public."inquiry_states" ADD CONSTRAINT "inquiry_states_version_check" CHECK (version >= 0);

ALTER TABLE public."thread_resets" ADD CONSTRAINT "thread_resets_pkey" PRIMARY KEY (id);

ALTER TABLE public."thread_resets" ADD CONSTRAINT "thread_resets_reset_type_check" CHECK (reset_type = ANY (ARRAY['revival'::text, 'extension'::text]));

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_invite_method_check" CHECK (invite_method = ANY (ARRAY['sms'::text, 'email'::text]));

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_permission_level_check" CHECK (permission_level = ANY (ARRAY['read_only'::text, 'contributor'::text, 'full'::text]));

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_pkey" PRIMARY KEY (id);

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_status_check" CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'revoked'::text]));

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_thread_id_participant_id_key" UNIQUE (thread_id, participant_id);

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_flagged_user_id_flagging_user_id_thread_id_key" UNIQUE (flagged_user_id, flagging_user_id, thread_id);

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_reason_check" CHECK (reason = ANY (ARRAY['behavioral'::text, 'theological_bad_faith'::text, 'harassment'::text, 'other'::text]));

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_pkey" PRIMARY KEY (id);

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_q1_score_check" CHECK (q1_score >= 1 AND q1_score <= 5);

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_q2_score_check" CHECK (q2_score >= 1 AND q2_score <= 5);

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_q3_score_check" CHECK (q3_score >= 1 AND q3_score <= 5);

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_thread_id_respondent_id_key" UNIQUE (thread_id, respondent_id);

ALTER TABLE public."query_tips" ADD CONSTRAINT "query_tips_amount_check" CHECK (amount > 0);

ALTER TABLE public."query_tips" ADD CONSTRAINT "query_tips_pkey" PRIMARY KEY (id);

ALTER TABLE public."channel_invitations" ADD CONSTRAINT "channel_invitations_channel_id_invited_user_id_key" UNIQUE (channel_id, invited_user_id);

ALTER TABLE public."channel_invitations" ADD CONSTRAINT "channel_invitations_pkey" PRIMARY KEY (id);

ALTER TABLE public."channel_invitations" ADD CONSTRAINT "channel_invitations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]));

ALTER TABLE public."shared_threads" ADD CONSTRAINT "shared_threads_pkey" PRIMARY KEY (id);

ALTER TABLE public."shared_threads" ADD CONSTRAINT "shared_threads_thread_id_channel_id_shared_by_key" UNIQUE (thread_id, channel_id, shared_by);

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_category_check" CHECK (category = ANY (ARRAY['thread_expiry'::text, 'thread_expired'::text, 'thread_grace'::text, 'thread_deleted'::text, 'thread_extended'::text, 'thread_revived'::text, 'query_low'::text, 'query_exhausted'::text, 'credits_received'::text, 'credits_low'::text, 'collab_invite'::text, 'participant_joined'::text, 'prism_invoked'::text, 'session_ended'::text, 'tip_received'::text, 'access_request'::text, 'renewal_reminder'::text, 'payment_failed'::text, 'bundle_purchased'::text, 'flag_received'::text, 'trust_score_updated'::text, 'ban_warning'::text]));

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."migration_sessions" ADD CONSTRAINT "migration_sessions_pkey" PRIMARY KEY (id);

ALTER TABLE public."migration_sessions" ADD CONSTRAINT "migration_sessions_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'complete'::text, 'failed'::text]));

ALTER TABLE public."migration_sessions" ADD CONSTRAINT "migration_sessions_user_id_key" UNIQUE (user_id);

ALTER TABLE public."query_log" ADD CONSTRAINT "query_log_channel_context_check" CHECK (channel_context = ANY (ARRAY['solo'::text, 'main_room'::text, 'direct'::text, 'small_group'::text]));

ALTER TABLE public."query_log" ADD CONSTRAINT "query_log_credit_source_check" CHECK (credit_source = ANY (ARRAY['monthly'::text, 'purchased'::text, 'free_tier'::text]));

ALTER TABLE public."query_log" ADD CONSTRAINT "query_log_pkey" PRIMARY KEY (id);

ALTER TABLE public."inquiry_state_versions" ADD CONSTRAINT "inquiry_state_versions_pkey" PRIMARY KEY (inquiry_key, version);

ALTER TABLE public."inquiry_state_versions" ADD CONSTRAINT "inquiry_state_versions_version_check" CHECK (version >= 1);

ALTER TABLE public."subscribers" ADD CONSTRAINT "subscribers_ban_status_check" CHECK (ban_status = ANY (ARRAY['none'::text, 'soft_banned'::text, 'hard_banned'::text]));

ALTER TABLE public."subscribers" ADD CONSTRAINT "subscribers_display_name_key" UNIQUE (display_name);

ALTER TABLE public."subscribers" ADD CONSTRAINT "subscribers_email_key" UNIQUE (email);

ALTER TABLE public."subscribers" ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY (id);

ALTER TABLE public."threads" ADD CONSTRAINT "threads_lock_reason_check" CHECK (lock_reason = ANY (ARRAY['cancelled'::text, 'tier_downgrade'::text, 'admin'::text]));

ALTER TABLE public."threads" ADD CONSTRAINT "threads_owner_exactly_one" CHECK (user_id IS NOT NULL AND guest_id IS NULL OR user_id IS NULL AND guest_id IS NOT NULL) NOT VALID;

ALTER TABLE public."threads" ADD CONSTRAINT "threads_pkey" PRIMARY KEY (id);

ALTER TABLE public."threads" ADD CONSTRAINT "threads_query_type_check" CHECK (query_type = ANY (ARRAY['verse_reference'::text, 'phrase'::text, 'theme'::text, 'free_text'::text]));

ALTER TABLE public."threads" ADD CONSTRAINT "threads_visibility_check" CHECK (visibility = ANY (ARRAY['private'::text, 'trust_circle'::text]));

ALTER TABLE public."thread_highlights" ADD CONSTRAINT "thread_highlights_color_check" CHECK (color = ANY (ARRAY['red'::text, 'orange'::text, 'yellow'::text, 'green'::text, 'blue'::text, 'indigo'::text, 'violet'::text]));

ALTER TABLE public."thread_highlights" ADD CONSTRAINT "thread_highlights_pkey" PRIMARY KEY (id);

ALTER TABLE public."shares" ADD CONSTRAINT "shares_artifact_revision_check" CHECK (artifact_revision >= 1);

ALTER TABLE public."shares" ADD CONSTRAINT "shares_invite_note_length" CHECK (invite_note IS NULL OR char_length(invite_note) <= 500);

ALTER TABLE public."shares" ADD CONSTRAINT "shares_permission_check" CHECK (permission = ANY (ARRAY['viewer'::text, 'contributor'::text]));

ALTER TABLE public."shares" ADD CONSTRAINT "shares_pkey" PRIMARY KEY (id);

ALTER TABLE public."shares" ADD CONSTRAINT "shares_recipient_name_length" CHECK (recipient_name IS NULL OR char_length(recipient_name) >= 1 AND char_length(recipient_name) <= 80);

ALTER TABLE public."shares" ADD CONSTRAINT "shares_token_key" UNIQUE (token);

ALTER TABLE public."share_chat_messages" ADD CONSTRAINT "share_chat_messages_pkey" PRIMARY KEY (id);

ALTER TABLE public."share_chat_messages" ADD CONSTRAINT "share_chat_messages_visibility_check" CHECK (visibility = ANY (ARRAY['private'::text, 'trust_circle'::text]));

ALTER TABLE public."scripture_embeddings" ADD CONSTRAINT "scripture_embeddings_pkey" PRIMARY KEY (id);

ALTER TABLE public."thread_participants" ADD CONSTRAINT "thread_participants_pkey" PRIMARY KEY (id);

ALTER TABLE public."thread_participants" ADD CONSTRAINT "thread_participants_thread_id_user_id_key" UNIQUE (thread_id, user_id);

ALTER TABLE public."thread_mutes" ADD CONSTRAINT "thread_mutes_check" CHECK (muter_user_id <> muted_user_id);

ALTER TABLE public."thread_mutes" ADD CONSTRAINT "thread_mutes_pkey" PRIMARY KEY (id);

ALTER TABLE public."thread_mutes" ADD CONSTRAINT "thread_mutes_thread_id_muter_user_id_muted_user_id_key" UNIQUE (thread_id, muter_user_id, muted_user_id);

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_display_name_length" CHECK (display_name IS NULL OR char_length(display_name) >= 1 AND char_length(display_name) <= 80);

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_pkey" PRIMARY KEY (id);

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_submitted_in_check" CHECK (submitted_in = ANY (ARRAY['solo'::text, 'share'::text, 'qt'::text, 'gateway'::text, 'recipient'::text, 'shared_view'::text, 'participant'::text]));

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_visibility_check" CHECK (visibility = ANY (ARRAY['private'::text, 'trust_circle'::text]));

ALTER TABLE public."corpus_embeddings" ADD CONSTRAINT "corpus_embeddings_pkey" PRIMARY KEY (id);

ALTER TABLE public."prism_entitlements" ADD CONSTRAINT "prism_entitlements_bank_balance_check" CHECK (bank_balance >= 0);

ALTER TABLE public."prism_entitlements" ADD CONSTRAINT "prism_entitlements_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."prism_entitlements" ADD CONSTRAINT "prism_entitlements_subscription_allowance_check" CHECK (subscription_allowance >= 0);

ALTER TABLE public."prism_entitlements" ADD CONSTRAINT "prism_entitlements_subscription_status_check" CHECK (subscription_status = ANY (ARRAY['inactive'::text, 'active'::text, 'past_due'::text, 'canceled'::text]));

ALTER TABLE public."prism_entitlements" ADD CONSTRAINT "prism_entitlements_subscription_used_check" CHECK (subscription_used >= 0);

ALTER TABLE public."prism_pending_entitlements" ADD CONSTRAINT "prism_pending_entitlements_bank_balance_check" CHECK (bank_balance >= 0);

ALTER TABLE public."prism_pending_entitlements" ADD CONSTRAINT "prism_pending_entitlements_pkey" PRIMARY KEY (email);

ALTER TABLE public."prism_inquiry_principals" ADD CONSTRAINT "prism_inquiry_principals_check" CHECK (principal_type = 'guest'::text AND guest_id IS NOT NULL AND user_id IS NULL OR principal_type = 'user'::text AND user_id IS NOT NULL AND guest_id IS NULL);

ALTER TABLE public."prism_inquiry_principals" ADD CONSTRAINT "prism_inquiry_principals_pkey" PRIMARY KEY (inquiry_key);

ALTER TABLE public."prism_inquiry_principals" ADD CONSTRAINT "prism_inquiry_principals_preview_allowance_check" CHECK (preview_allowance >= 1 AND preview_allowance <= 200);

ALTER TABLE public."prism_inquiry_principals" ADD CONSTRAINT "prism_inquiry_principals_principal_type_check" CHECK (principal_type = ANY (ARRAY['guest'::text, 'user'::text]));

ALTER TABLE public."trust_circle_members" ADD CONSTRAINT "trust_circle_members_check" CHECK (((user_id IS NOT NULL)::integer + (guest_id IS NOT NULL)::integer) = 1);

ALTER TABLE public."trust_circle_members" ADD CONSTRAINT "trust_circle_members_pkey" PRIMARY KEY (membership_id);

ALTER TABLE public."prism_fulfillment_events" ADD CONSTRAINT "prism_fulfillment_events_fulfillment_type_check" CHECK (fulfillment_type = ANY (ARRAY['query_bank'::text, 'membership'::text]));

ALTER TABLE public."prism_fulfillment_events" ADD CONSTRAINT "prism_fulfillment_events_pkey" PRIMARY KEY (fulfillment_key);

ALTER TABLE public."prism_fulfillment_events" ADD CONSTRAINT "prism_fulfillment_events_quantity_check" CHECK (quantity = ANY (ARRAY[10, 25, 125, 350]));

ALTER TABLE public."prism_guests" ADD CONSTRAINT "prism_guests_pkey" PRIMARY KEY (guest_id);

ALTER TABLE public."prism_guests" ADD CONSTRAINT "prism_guests_secret_hash_check" CHECK (length(secret_hash) = 64);

ALTER TABLE public."prism_guests" ADD CONSTRAINT "prism_guests_secret_hash_key" UNIQUE (secret_hash);

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_fork_artifact_id_key" UNIQUE (fork_artifact_id);

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_fork_thread_id_key" UNIQUE (fork_thread_id);

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_pkey" PRIMARY KEY (fork_id);

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_share_id_owner_user_id_key" UNIQUE (share_id, owner_user_id);

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_source_artifact_revision_check" CHECK (source_artifact_revision >= 1);

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_artifact_revision_check" CHECK (artifact_revision >= 1);

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_check" CHECK (principal_type = 'guest'::text AND guest_id IS NOT NULL AND user_id IS NULL OR principal_type = 'user'::text AND user_id IS NOT NULL AND guest_id IS NULL);

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_completion_key_key" UNIQUE (completion_key);

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_entitlement_source_check" CHECK (entitlement_source = ANY (ARRAY['explorer'::text, 'subscription'::text, 'bank'::text, 'preview'::text]));

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_pkey" PRIMARY KEY (usage_id);

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_principal_type_check" CHECK (principal_type = ANY (ARRAY['guest'::text, 'user'::text]));

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_query_cost_check" CHECK (query_cost = ANY (ARRAY[1, 2]));

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_submission_type_check" CHECK (submission_type = ANY (ARRAY['primary'::text, 'follow_up'::text]));

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_applicability_check" CHECK (char_length(applicability) <= 500);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_boundaries_check" CHECK (char_length(boundaries) <= 500);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_fingerprint_check" CHECK (fingerprint ~ '^[0-9a-f]{64}$'::text);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_fingerprint_key" UNIQUE (fingerprint);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_lesson_check" CHECK (char_length(lesson) >= 20 AND char_length(lesson) <= 1200);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_pkey" PRIMARY KEY (id);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_rationale_check" CHECK (char_length(rationale) >= 10 AND char_length(rationale) <= 800);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_review_notes_check" CHECK (char_length(review_notes) <= 1000);

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));

ALTER TABLE public."prism_learning_candidates" ADD CONSTRAINT "prism_learning_candidates_topic_check" CHECK (char_length(topic) >= 4 AND char_length(topic) <= 160);

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_applicability_check" CHECK (char_length(applicability) <= 500);

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_boundaries_check" CHECK (char_length(boundaries) <= 500);

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_candidate_id_key" UNIQUE (candidate_id);

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_lesson_check" CHECK (char_length(lesson) >= 20 AND char_length(lesson) <= 1200);

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_pkey" PRIMARY KEY (id);

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_topic_check" CHECK (char_length(topic) >= 4 AND char_length(topic) <= 160);

ALTER TABLE public."refraction_notes" ADD CONSTRAINT "refraction_notes_owner_check" CHECK (user_id IS NOT NULL AND anon_session_id IS NULL OR user_id IS NULL AND anon_session_id IS NOT NULL);

ALTER TABLE public."refraction_notes" ADD CONSTRAINT "refraction_notes_pkey" PRIMARY KEY (id);

ALTER TABLE public."room_channels" ADD CONSTRAINT "room_channels_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."room_channels" ADD CONSTRAINT "room_channels_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.room_channels(id) ON DELETE CASCADE;

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_share_id_fkey" FOREIGN KEY (share_id) REFERENCES public.shares(id) ON DELETE CASCADE;

ALTER TABLE public."channel_participants" ADD CONSTRAINT "channel_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.room_channels(id) ON DELETE CASCADE;

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_prism_thread_id_fkey" FOREIGN KEY (prism_thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_share_id_fkey" FOREIGN KEY (share_id) REFERENCES public.shares(id) ON DELETE CASCADE;

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_shared_to_channel_id_fkey" FOREIGN KEY (shared_to_channel_id) REFERENCES public.room_channels(id) ON DELETE SET NULL;

ALTER TABLE public."room_messages" ADD CONSTRAINT "room_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."referrals" ADD CONSTRAINT "referrals_share_token_fkey" FOREIGN KEY (share_token) REFERENCES public.shares(token);

ALTER TABLE public."interpretation_packets" ADD CONSTRAINT "interpretation_packets_artifact_id_artifact_revision_fkey" FOREIGN KEY (artifact_id, artifact_revision) REFERENCES public.interpretation_artifacts(artifact_id, artifact_revision) ON DELETE CASCADE;

ALTER TABLE public."prism_credit_allocations" ADD CONSTRAINT "prism_credit_allocations_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.prism_guests(guest_id) ON DELETE RESTRICT;

ALTER TABLE public."prism_credit_allocations" ADD CONSTRAINT "prism_credit_allocations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.prism_guests(guest_id) ON DELETE SET NULL;

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."interpretation_artifacts" ADD CONSTRAINT "interpretation_artifacts_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."code_redemptions" ADD CONSTRAINT "code_redemptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE SET NULL;

ALTER TABLE public."inquiry_states" ADD CONSTRAINT "inquiry_states_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."inquiry_states" ADD CONSTRAINT "inquiry_states_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."thread_resets" ADD CONSTRAINT "thread_resets_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."thread_resets" ADD CONSTRAINT "thread_resets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.subscribers(id);

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_participant_id_fkey" FOREIGN KEY (participant_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_collaborators" ADD CONSTRAINT "thread_collaborators_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_contribution_id_fkey" FOREIGN KEY (contribution_id) REFERENCES public.follow_ups(id) ON DELETE SET NULL;

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_flagged_user_id_fkey" FOREIGN KEY (flagged_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_flagging_user_id_fkey" FOREIGN KEY (flagging_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."user_flags" ADD CONSTRAINT "user_flags_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_respondent_id_fkey" FOREIGN KEY (respondent_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."session_surveys" ADD CONSTRAINT "session_surveys_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."query_tips" ADD CONSTRAINT "query_tips_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."query_tips" ADD CONSTRAINT "query_tips_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."query_tips" ADD CONSTRAINT "query_tips_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."channel_invitations" ADD CONSTRAINT "channel_invitations_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.room_channels(id) ON DELETE CASCADE;

ALTER TABLE public."channel_invitations" ADD CONSTRAINT "channel_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."channel_invitations" ADD CONSTRAINT "channel_invitations_invited_user_id_fkey" FOREIGN KEY (invited_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."shared_threads" ADD CONSTRAINT "shared_threads_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.room_channels(id) ON DELETE CASCADE;

ALTER TABLE public."shared_threads" ADD CONSTRAINT "shared_threads_shared_by_fkey" FOREIGN KEY (shared_by) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."shared_threads" ADD CONSTRAINT "shared_threads_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."migration_sessions" ADD CONSTRAINT "migration_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."query_log" ADD CONSTRAINT "query_log_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."query_log" ADD CONSTRAINT "query_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE SET NULL;

ALTER TABLE public."threads" ADD CONSTRAINT "threads_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.prism_guests(guest_id) ON DELETE SET NULL;

ALTER TABLE public."threads" ADD CONSTRAINT "threads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."thread_highlights" ADD CONSTRAINT "thread_highlights_room_channel_id_fkey" FOREIGN KEY (room_channel_id) REFERENCES public.room_channels(id) ON DELETE SET NULL;

ALTER TABLE public."thread_highlights" ADD CONSTRAINT "thread_highlights_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."thread_highlights" ADD CONSTRAINT "thread_highlights_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."shares" ADD CONSTRAINT "shares_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."shares" ADD CONSTRAINT "shares_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."share_chat_messages" ADD CONSTRAINT "share_chat_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_participants" ADD CONSTRAINT "thread_participants_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."thread_participants" ADD CONSTRAINT "thread_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_mutes" ADD CONSTRAINT "thread_mutes_muted_user_id_fkey" FOREIGN KEY (muted_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_mutes" ADD CONSTRAINT "thread_mutes_muter_user_id_fkey" FOREIGN KEY (muter_user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."thread_mutes" ADD CONSTRAINT "thread_mutes_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_share_id_fkey" FOREIGN KEY (share_id) REFERENCES public.shares(id) ON DELETE SET NULL;

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."follow_ups" ADD CONSTRAINT "follow_ups_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

ALTER TABLE public."prism_entitlements" ADD CONSTRAINT "prism_entitlements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."prism_inquiry_principals" ADD CONSTRAINT "prism_inquiry_principals_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.prism_guests(guest_id) ON DELETE RESTRICT;

ALTER TABLE public."prism_inquiry_principals" ADD CONSTRAINT "prism_inquiry_principals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."trust_circle_members" ADD CONSTRAINT "trust_circle_members_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.prism_guests(guest_id) ON DELETE SET NULL;

ALTER TABLE public."trust_circle_members" ADD CONSTRAINT "trust_circle_members_share_id_fkey" FOREIGN KEY (share_id) REFERENCES public.shares(id) ON DELETE CASCADE;

ALTER TABLE public."trust_circle_members" ADD CONSTRAINT "trust_circle_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."prism_guests" ADD CONSTRAINT "prism_guests_claimed_by_fkey" FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_fork_thread_id_fkey" FOREIGN KEY (fork_thread_id) REFERENCES public.threads(id) ON DELETE RESTRICT;

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_share_id_fkey" FOREIGN KEY (share_id) REFERENCES public.shares(id) ON DELETE RESTRICT;

ALTER TABLE public."prism_inquiry_forks" ADD CONSTRAINT "prism_inquiry_forks_source_thread_id_fkey" FOREIGN KEY (source_thread_id) REFERENCES public.threads(id) ON DELETE RESTRICT;

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.prism_guests(guest_id) ON DELETE RESTRICT;

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE SET NULL;

ALTER TABLE public."prism_query_ledger" ADD CONSTRAINT "prism_query_ledger_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."prism_approved_learning" ADD CONSTRAINT "prism_approved_learning_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES public.prism_learning_candidates(id) ON DELETE RESTRICT;

ALTER TABLE public."refraction_notes" ADD CONSTRAINT "refraction_notes_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;

ALTER TABLE public."refraction_notes" ADD CONSTRAINT "refraction_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.subscribers(id) ON DELETE CASCADE;

CREATE INDEX idx_threads_migration_session ON public.threads USING btree (migration_session_id) WHERE (migration_session_id IS NOT NULL);

CREATE INDEX idx_refraction_notes_lookup ON public.refraction_notes USING btree (thread_id, node_id, user_id);

CREATE INDEX shares_token_idx ON public.shares USING btree (token);

CREATE INDEX idx_thread_collab_owner ON public.thread_collaborators USING btree (owner_id);

CREATE INDEX idx_follow_ups_user_id ON public.follow_ups USING btree (user_id);

CREATE INDEX idx_channel_participants_channel ON public.channel_participants USING btree (channel_id);

CREATE INDEX idx_shared_threads_user ON public.shared_threads USING btree (shared_by);

CREATE INDEX idx_threads_locked ON public.threads USING btree (is_locked);

CREATE UNIQUE INDEX trust_circle_members_share_user_idx ON public.trust_circle_members USING btree (share_id, user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX shares_owner_thread_active_idx ON public.shares USING btree (owner_user_id, thread_id, created_at DESC) WHERE ((status = 'active'::text) AND (revoked_at IS NULL));

CREATE INDEX idx_room_channels_room_id ON public.room_channels USING btree (room_id);

CREATE INDEX idx_tips_to ON public.query_tips USING btree (to_user_id);

CREATE INDEX idx_subscribers_display_name ON public.subscribers USING btree (display_name);

CREATE INDEX idx_query_log_thread_id ON public.query_log USING btree (thread_id);

CREATE INDEX interpretation_artifacts_inquiry_idx ON public.interpretation_artifacts USING btree (inquiry_key, artifact_revision DESC);

CREATE INDEX room_messages_share_idx ON public.room_messages USING btree (share_id) WHERE (share_id IS NOT NULL);

CREATE INDEX idx_shared_threads_thread ON public.shared_threads USING btree (thread_id);

CREATE INDEX idx_thread_collab_participant ON public.thread_collaborators USING btree (participant_id);

CREATE INDEX idx_thread_resets_thread_id ON public.thread_resets USING btree (thread_id);

CREATE INDEX prism_approved_learning_search_idx ON public.prism_approved_learning USING gin (search_document);

CREATE INDEX idx_surveys_respondent ON public.session_surveys USING btree (respondent_id);

CREATE INDEX room_messages_channel_created_idx ON public.room_messages USING btree (channel_id, created_at);

CREATE INDEX corpus_embeddings_tier_idx ON public.corpus_embeddings USING btree (tier);

CREATE INDEX idx_room_messages_user ON public.room_messages USING btree (user_id);

CREATE INDEX idx_channel_invitations_user ON public.channel_invitations USING btree (invited_user_id);

CREATE INDEX scripture_embeddings_embedding_idx ON public.scripture_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_code_redemptions_user_id ON public.code_redemptions USING btree (user_id);

CREATE INDEX idx_tips_from ON public.query_tips USING btree (from_user_id);

CREATE INDEX idx_follow_ups_thread_id ON public.follow_ups USING btree (thread_id);

CREATE INDEX idx_highlights_user ON public.thread_highlights USING btree (user_id);

CREATE INDEX idx_refraction_notes_anon_lookup ON public.refraction_notes USING btree (anon_session_id, thread_id, node_id);

CREATE INDEX idx_shares_token ON public.shares USING btree (token);

CREATE INDEX idx_thread_resets_user_id ON public.thread_resets USING btree (user_id);

CREATE INDEX idx_user_flags_flagged ON public.user_flags USING btree (flagged_user_id);

CREATE INDEX idx_channel_participants_user ON public.channel_participants USING btree (user_id);

CREATE INDEX idx_surveys_thread ON public.session_surveys USING btree (thread_id);

CREATE INDEX idx_room_messages_channel ON public.room_messages USING btree (channel_id);

CREATE UNIQUE INDEX trust_circle_members_share_guest_idx ON public.trust_circle_members USING btree (share_id, guest_id) WHERE (guest_id IS NOT NULL);

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);

CREATE INDEX idx_threads_expires_at ON public.threads USING btree (expires_at);

CREATE INDEX idx_user_flags_flagging ON public.user_flags USING btree (flagging_user_id);

CREATE INDEX inquiry_states_thread_id_idx ON public.inquiry_states USING btree (thread_id);

CREATE INDEX idx_highlights_thread ON public.thread_highlights USING btree (thread_id);

CREATE INDEX idx_threads_grace_ends ON public.threads USING btree (grace_ends_at);

CREATE INDEX idx_threads_user_id ON public.threads USING btree (user_id);

CREATE INDEX prism_query_ledger_user_time_idx ON public.prism_query_ledger USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);

CREATE INDEX idx_threads_local_id ON public.threads USING btree (local_id) WHERE (local_id IS NOT NULL);

CREATE INDEX idx_thread_collab_thread ON public.thread_collaborators USING btree (thread_id);

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);

CREATE INDEX prism_query_ledger_guest_time_idx ON public.prism_query_ledger USING btree (guest_id, created_at DESC) WHERE (guest_id IS NOT NULL);

CREATE INDEX follow_ups_thread_id_idx ON public.follow_ups USING btree (thread_id);

CREATE INDEX idx_share_chat_share_id ON public.share_chat_messages USING btree (share_id, created_at);

CREATE INDEX idx_shared_threads_channel ON public.shared_threads USING btree (channel_id);

CREATE INDEX idx_thread_participants_user ON public.thread_participants USING btree (user_id);

CREATE INDEX idx_room_channels_share_id ON public.room_channels USING btree (share_id) WHERE (share_id IS NOT NULL);

CREATE UNIQUE INDEX channel_participants_share_unique_idx ON public.channel_participants USING btree (share_id) WHERE (share_id IS NOT NULL);

CREATE INDEX idx_share_chat_node ON public.share_chat_messages USING btree (share_id, node_id);

CREATE INDEX channel_participants_share_active_idx ON public.channel_participants USING btree (share_id, status, channel_id) WHERE (share_id IS NOT NULL);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_follow_ups_created_at ON public.follow_ups USING btree (created_at);

CREATE INDEX idx_channel_invitations_channel ON public.channel_invitations USING btree (channel_id);

CREATE INDEX corpus_embeddings_source_idx ON public.corpus_embeddings USING btree (source);

CREATE INDEX idx_query_log_user_id ON public.query_log USING btree (user_id);

CREATE INDEX interpretation_artifacts_thread_idx ON public.interpretation_artifacts USING btree (thread_id, artifact_revision DESC);

CREATE INDEX idx_thread_mutes_muter ON public.thread_mutes USING btree (thread_id, muter_user_id);

CREATE INDEX follow_ups_source_idx ON public.follow_ups USING btree (source);

CREATE INDEX idx_migration_sessions_user ON public.migration_sessions USING btree (user_id);

CREATE INDEX idx_thread_participants_thread ON public.thread_participants USING btree (thread_id);

CREATE INDEX idx_room_messages_created_at ON public.room_messages USING btree (created_at);

CREATE INDEX corpus_embeddings_embedding_idx ON public.corpus_embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_query_log_created_at ON public.query_log USING btree (created_at);

CREATE INDEX idx_room_channels_type ON public.room_channels USING btree (channel_type);

CREATE INDEX idx_code_redemptions_code ON public.code_redemptions USING btree (code);

ALTER SEQUENCE public."scripture_embeddings_id_seq" OWNED BY public."scripture_embeddings"."id";

ALTER SEQUENCE public."corpus_embeddings_id_seq" OWNED BY public."corpus_embeddings"."id";

CREATE TRIGGER set_threads_updated_at BEFORE UPDATE ON public.threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_subscribers_updated_at BEFORE UPDATE ON public.subscribers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_highlights_updated_at BEFORE UPDATE ON public.thread_highlights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ensure_creator_is_participant AFTER UPDATE OF visibility ON public.threads FOR EACH ROW EXECUTE FUNCTION public.ensure_creator_is_participant();

CREATE TRIGGER classify_prism_artifact_cost BEFORE INSERT ON public.interpretation_artifacts FOR EACH ROW EXECUTE FUNCTION public.classify_prism_artifact_cost();

CREATE TRIGGER prism_learning_candidate_reviewed BEFORE UPDATE ON public.prism_learning_candidates FOR EACH ROW EXECUTE FUNCTION public.promote_prism_learning_candidate();

CREATE TRIGGER charge_prism_artifact_completion AFTER INSERT ON public.interpretation_artifacts FOR EACH ROW EXECUTE FUNCTION public.charge_prism_artifact_completion();

CREATE POLICY "allow_anon_access" ON public."subscribers" AS PERMISSIVE FOR ALL TO "anon" USING (true) WITH CHECK (true);

CREATE POLICY "allow_anon_access" ON public."access_codes" AS PERMISSIVE FOR ALL TO "anon" USING (true) WITH CHECK (true);

CREATE POLICY "allow_insert_referrals" ON public."referrals" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "allow_select_referrals" ON public."referrals" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Users can view own subscriber record" ON public."subscribers" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = id));

CREATE POLICY "Users can update own subscriber record" ON public."subscribers" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = id));

CREATE POLICY "Users can view own threads" ON public."threads" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own threads" ON public."threads" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own threads" ON public."threads" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Collaborators can view shared threads" ON public."threads" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM public.thread_collaborators tc
  WHERE ((tc.thread_id = threads.id) AND (tc.participant_id = auth.uid()) AND (tc.status = 'active'::text)))));

CREATE POLICY "Users can view follow-ups on own threads" ON public."follow_ups" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.threads t
  WHERE ((t.id = follow_ups.thread_id) AND (t.user_id = auth.uid()))))));

CREATE POLICY "Users can insert own follow-ups" ON public."follow_ups" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Owners can manage collaborators" ON public."thread_collaborators" AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = owner_id));

CREATE POLICY "Participants can view own collaborator record" ON public."thread_collaborators" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = participant_id));

CREATE POLICY "Users can view own notifications" ON public."notifications" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own notifications" ON public."notifications" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Channel participants can view their channels" ON public."room_channels" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM public.channel_participants cp
  WHERE ((cp.channel_id = room_channels.id) AND (cp.user_id = auth.uid()) AND (cp.status = 'active'::text))))));

CREATE POLICY "Users can view own channel memberships" ON public."channel_participants" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can view invitations sent or received" ON public."channel_invitations" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = invited_by) OR (auth.uid() = invited_user_id)));

CREATE POLICY "Users can respond to own invitations" ON public."channel_invitations" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = invited_user_id));

CREATE POLICY "Channel participants can view messages" ON public."room_messages" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM public.channel_participants cp
  WHERE ((cp.channel_id = room_messages.channel_id) AND (cp.user_id = auth.uid()) AND (cp.status = 'active'::text)))));

CREATE POLICY "Channel participants can insert messages" ON public."room_messages" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.channel_participants cp
  WHERE ((cp.channel_id = room_messages.channel_id) AND (cp.user_id = auth.uid()) AND (cp.status = 'active'::text))))));

CREATE POLICY "Channel participants can view shared threads" ON public."shared_threads" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM public.channel_participants cp
  WHERE ((cp.channel_id = shared_threads.channel_id) AND (cp.user_id = auth.uid()) AND (cp.status = 'active'::text)))));

CREATE POLICY "Users can share own threads" ON public."shared_threads" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = shared_by));

CREATE POLICY "Users can view own surveys" ON public."session_surveys" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = respondent_id));

CREATE POLICY "Users can insert own surveys" ON public."session_surveys" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = respondent_id));

CREATE POLICY "Service role has full access to corpus_embeddings" ON public."corpus_embeddings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Users can view sent and received tips" ON public."query_tips" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = from_user_id) OR (auth.uid() = to_user_id)));

CREATE POLICY "Users can send tips from own account" ON public."query_tips" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = from_user_id));

CREATE POLICY "Users can view own query log" ON public."query_log" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own migration session" ON public."migration_sessions" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own redemptions" ON public."code_redemptions" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can view flags they submitted" ON public."user_flags" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = flagging_user_id));

CREATE POLICY "Users can submit flags" ON public."user_flags" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = flagging_user_id));

CREATE POLICY "Users can view own thread resets" ON public."thread_resets" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own highlights" ON public."thread_highlights" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own highlights" ON public."thread_highlights" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own highlights" ON public."thread_highlights" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete own highlights" ON public."thread_highlights" AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Service role has full access to scripture_embeddings" ON public."scripture_embeddings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Anonymous can insert own query log" ON public."query_log" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK ((user_id IS NULL));

CREATE POLICY "Anonymous can view anonymous query log" ON public."query_log" AS PERMISSIVE FOR SELECT TO "anon" USING ((user_id IS NULL));

ALTER TABLE public."room_channels" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."room_channels" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."room_channels" TO "service_role";

GRANT SELECT ON TABLE public."room_channels" TO "service_role";

GRANT UPDATE ON TABLE public."room_channels" TO "service_role";

GRANT DELETE ON TABLE public."room_channels" TO "service_role";

GRANT TRUNCATE ON TABLE public."room_channels" TO "service_role";

GRANT REFERENCES ON TABLE public."room_channels" TO "service_role";

GRANT TRIGGER ON TABLE public."room_channels" TO "service_role";

GRANT MAINTAIN ON TABLE public."room_channels" TO "service_role";

ALTER TABLE public."channel_participants" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."channel_participants" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."channel_participants" TO "service_role";

GRANT SELECT ON TABLE public."channel_participants" TO "service_role";

GRANT UPDATE ON TABLE public."channel_participants" TO "service_role";

GRANT DELETE ON TABLE public."channel_participants" TO "service_role";

GRANT TRUNCATE ON TABLE public."channel_participants" TO "service_role";

GRANT REFERENCES ON TABLE public."channel_participants" TO "service_role";

GRANT TRIGGER ON TABLE public."channel_participants" TO "service_role";

GRANT MAINTAIN ON TABLE public."channel_participants" TO "service_role";

ALTER TABLE public."room_messages" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."room_messages" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."room_messages" TO "service_role";

GRANT SELECT ON TABLE public."room_messages" TO "service_role";

GRANT UPDATE ON TABLE public."room_messages" TO "service_role";

GRANT DELETE ON TABLE public."room_messages" TO "service_role";

GRANT TRUNCATE ON TABLE public."room_messages" TO "service_role";

GRANT REFERENCES ON TABLE public."room_messages" TO "service_role";

GRANT TRIGGER ON TABLE public."room_messages" TO "service_role";

GRANT MAINTAIN ON TABLE public."room_messages" TO "service_role";

ALTER TABLE public."access_codes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."access_codes" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."access_codes" TO "anon";

GRANT SELECT ON TABLE public."access_codes" TO "anon";

GRANT UPDATE ON TABLE public."access_codes" TO "anon";

GRANT DELETE ON TABLE public."access_codes" TO "anon";

GRANT TRUNCATE ON TABLE public."access_codes" TO "anon";

GRANT REFERENCES ON TABLE public."access_codes" TO "anon";

GRANT TRIGGER ON TABLE public."access_codes" TO "anon";

GRANT MAINTAIN ON TABLE public."access_codes" TO "anon";

GRANT INSERT ON TABLE public."access_codes" TO "authenticated";

GRANT SELECT ON TABLE public."access_codes" TO "authenticated";

GRANT UPDATE ON TABLE public."access_codes" TO "authenticated";

GRANT DELETE ON TABLE public."access_codes" TO "authenticated";

GRANT TRUNCATE ON TABLE public."access_codes" TO "authenticated";

GRANT REFERENCES ON TABLE public."access_codes" TO "authenticated";

GRANT TRIGGER ON TABLE public."access_codes" TO "authenticated";

GRANT MAINTAIN ON TABLE public."access_codes" TO "authenticated";

GRANT INSERT ON TABLE public."access_codes" TO "service_role";

GRANT SELECT ON TABLE public."access_codes" TO "service_role";

GRANT UPDATE ON TABLE public."access_codes" TO "service_role";

GRANT DELETE ON TABLE public."access_codes" TO "service_role";

GRANT TRUNCATE ON TABLE public."access_codes" TO "service_role";

GRANT REFERENCES ON TABLE public."access_codes" TO "service_role";

GRANT TRIGGER ON TABLE public."access_codes" TO "service_role";

GRANT MAINTAIN ON TABLE public."access_codes" TO "service_role";

ALTER TABLE public."referrals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."referrals" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."referrals" TO "anon";

GRANT SELECT ON TABLE public."referrals" TO "anon";

GRANT UPDATE ON TABLE public."referrals" TO "anon";

GRANT DELETE ON TABLE public."referrals" TO "anon";

GRANT TRUNCATE ON TABLE public."referrals" TO "anon";

GRANT REFERENCES ON TABLE public."referrals" TO "anon";

GRANT TRIGGER ON TABLE public."referrals" TO "anon";

GRANT MAINTAIN ON TABLE public."referrals" TO "anon";

GRANT INSERT ON TABLE public."referrals" TO "authenticated";

GRANT SELECT ON TABLE public."referrals" TO "authenticated";

GRANT UPDATE ON TABLE public."referrals" TO "authenticated";

GRANT DELETE ON TABLE public."referrals" TO "authenticated";

GRANT TRUNCATE ON TABLE public."referrals" TO "authenticated";

GRANT REFERENCES ON TABLE public."referrals" TO "authenticated";

GRANT TRIGGER ON TABLE public."referrals" TO "authenticated";

GRANT MAINTAIN ON TABLE public."referrals" TO "authenticated";

GRANT INSERT ON TABLE public."referrals" TO "service_role";

GRANT SELECT ON TABLE public."referrals" TO "service_role";

GRANT UPDATE ON TABLE public."referrals" TO "service_role";

GRANT DELETE ON TABLE public."referrals" TO "service_role";

GRANT TRUNCATE ON TABLE public."referrals" TO "service_role";

GRANT REFERENCES ON TABLE public."referrals" TO "service_role";

GRANT TRIGGER ON TABLE public."referrals" TO "service_role";

GRANT MAINTAIN ON TABLE public."referrals" TO "service_role";

ALTER TABLE public."interpretation_packets" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."interpretation_packets" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."interpretation_packets" TO "service_role";

GRANT SELECT ON TABLE public."interpretation_packets" TO "service_role";

GRANT UPDATE ON TABLE public."interpretation_packets" TO "service_role";

GRANT DELETE ON TABLE public."interpretation_packets" TO "service_role";

GRANT TRUNCATE ON TABLE public."interpretation_packets" TO "service_role";

GRANT REFERENCES ON TABLE public."interpretation_packets" TO "service_role";

GRANT TRIGGER ON TABLE public."interpretation_packets" TO "service_role";

GRANT MAINTAIN ON TABLE public."interpretation_packets" TO "service_role";

ALTER TABLE public."prism_credit_allocations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_credit_allocations" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT SELECT ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT UPDATE ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT DELETE ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_credit_allocations" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_credit_allocations" TO "service_role";

ALTER TABLE public."interpretation_artifacts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."interpretation_artifacts" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT SELECT ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT UPDATE ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT DELETE ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT TRUNCATE ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT REFERENCES ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT TRIGGER ON TABLE public."interpretation_artifacts" TO "service_role";

GRANT MAINTAIN ON TABLE public."interpretation_artifacts" TO "service_role";

ALTER TABLE public."code_redemptions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."code_redemptions" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."code_redemptions" TO "anon";

GRANT SELECT ON TABLE public."code_redemptions" TO "anon";

GRANT UPDATE ON TABLE public."code_redemptions" TO "anon";

GRANT DELETE ON TABLE public."code_redemptions" TO "anon";

GRANT TRUNCATE ON TABLE public."code_redemptions" TO "anon";

GRANT REFERENCES ON TABLE public."code_redemptions" TO "anon";

GRANT TRIGGER ON TABLE public."code_redemptions" TO "anon";

GRANT MAINTAIN ON TABLE public."code_redemptions" TO "anon";

GRANT INSERT ON TABLE public."code_redemptions" TO "authenticated";

GRANT SELECT ON TABLE public."code_redemptions" TO "authenticated";

GRANT UPDATE ON TABLE public."code_redemptions" TO "authenticated";

GRANT DELETE ON TABLE public."code_redemptions" TO "authenticated";

GRANT TRUNCATE ON TABLE public."code_redemptions" TO "authenticated";

GRANT REFERENCES ON TABLE public."code_redemptions" TO "authenticated";

GRANT TRIGGER ON TABLE public."code_redemptions" TO "authenticated";

GRANT MAINTAIN ON TABLE public."code_redemptions" TO "authenticated";

GRANT INSERT ON TABLE public."code_redemptions" TO "service_role";

GRANT SELECT ON TABLE public."code_redemptions" TO "service_role";

GRANT UPDATE ON TABLE public."code_redemptions" TO "service_role";

GRANT DELETE ON TABLE public."code_redemptions" TO "service_role";

GRANT TRUNCATE ON TABLE public."code_redemptions" TO "service_role";

GRANT REFERENCES ON TABLE public."code_redemptions" TO "service_role";

GRANT TRIGGER ON TABLE public."code_redemptions" TO "service_role";

GRANT MAINTAIN ON TABLE public."code_redemptions" TO "service_role";

ALTER TABLE public."inquiry_states" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."inquiry_states" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."inquiry_states" TO "service_role";

GRANT SELECT ON TABLE public."inquiry_states" TO "service_role";

GRANT UPDATE ON TABLE public."inquiry_states" TO "service_role";

GRANT DELETE ON TABLE public."inquiry_states" TO "service_role";

GRANT TRUNCATE ON TABLE public."inquiry_states" TO "service_role";

GRANT REFERENCES ON TABLE public."inquiry_states" TO "service_role";

GRANT TRIGGER ON TABLE public."inquiry_states" TO "service_role";

GRANT MAINTAIN ON TABLE public."inquiry_states" TO "service_role";

ALTER TABLE public."thread_resets" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."thread_resets" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."thread_resets" TO "anon";

GRANT SELECT ON TABLE public."thread_resets" TO "anon";

GRANT UPDATE ON TABLE public."thread_resets" TO "anon";

GRANT DELETE ON TABLE public."thread_resets" TO "anon";

GRANT TRUNCATE ON TABLE public."thread_resets" TO "anon";

GRANT REFERENCES ON TABLE public."thread_resets" TO "anon";

GRANT TRIGGER ON TABLE public."thread_resets" TO "anon";

GRANT MAINTAIN ON TABLE public."thread_resets" TO "anon";

GRANT INSERT ON TABLE public."thread_resets" TO "authenticated";

GRANT SELECT ON TABLE public."thread_resets" TO "authenticated";

GRANT UPDATE ON TABLE public."thread_resets" TO "authenticated";

GRANT DELETE ON TABLE public."thread_resets" TO "authenticated";

GRANT TRUNCATE ON TABLE public."thread_resets" TO "authenticated";

GRANT REFERENCES ON TABLE public."thread_resets" TO "authenticated";

GRANT TRIGGER ON TABLE public."thread_resets" TO "authenticated";

GRANT MAINTAIN ON TABLE public."thread_resets" TO "authenticated";

GRANT INSERT ON TABLE public."thread_resets" TO "service_role";

GRANT SELECT ON TABLE public."thread_resets" TO "service_role";

GRANT UPDATE ON TABLE public."thread_resets" TO "service_role";

GRANT DELETE ON TABLE public."thread_resets" TO "service_role";

GRANT TRUNCATE ON TABLE public."thread_resets" TO "service_role";

GRANT REFERENCES ON TABLE public."thread_resets" TO "service_role";

GRANT TRIGGER ON TABLE public."thread_resets" TO "service_role";

GRANT MAINTAIN ON TABLE public."thread_resets" TO "service_role";

ALTER TABLE public."thread_collaborators" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."thread_collaborators" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."thread_collaborators" TO "anon";

GRANT SELECT ON TABLE public."thread_collaborators" TO "anon";

GRANT UPDATE ON TABLE public."thread_collaborators" TO "anon";

GRANT DELETE ON TABLE public."thread_collaborators" TO "anon";

GRANT TRUNCATE ON TABLE public."thread_collaborators" TO "anon";

GRANT REFERENCES ON TABLE public."thread_collaborators" TO "anon";

GRANT TRIGGER ON TABLE public."thread_collaborators" TO "anon";

GRANT MAINTAIN ON TABLE public."thread_collaborators" TO "anon";

GRANT INSERT ON TABLE public."thread_collaborators" TO "authenticated";

GRANT SELECT ON TABLE public."thread_collaborators" TO "authenticated";

GRANT UPDATE ON TABLE public."thread_collaborators" TO "authenticated";

GRANT DELETE ON TABLE public."thread_collaborators" TO "authenticated";

GRANT TRUNCATE ON TABLE public."thread_collaborators" TO "authenticated";

GRANT REFERENCES ON TABLE public."thread_collaborators" TO "authenticated";

GRANT TRIGGER ON TABLE public."thread_collaborators" TO "authenticated";

GRANT MAINTAIN ON TABLE public."thread_collaborators" TO "authenticated";

GRANT INSERT ON TABLE public."thread_collaborators" TO "service_role";

GRANT SELECT ON TABLE public."thread_collaborators" TO "service_role";

GRANT UPDATE ON TABLE public."thread_collaborators" TO "service_role";

GRANT DELETE ON TABLE public."thread_collaborators" TO "service_role";

GRANT TRUNCATE ON TABLE public."thread_collaborators" TO "service_role";

GRANT REFERENCES ON TABLE public."thread_collaborators" TO "service_role";

GRANT TRIGGER ON TABLE public."thread_collaborators" TO "service_role";

GRANT MAINTAIN ON TABLE public."thread_collaborators" TO "service_role";

ALTER TABLE public."user_flags" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."user_flags" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."user_flags" TO "anon";

GRANT SELECT ON TABLE public."user_flags" TO "anon";

GRANT UPDATE ON TABLE public."user_flags" TO "anon";

GRANT DELETE ON TABLE public."user_flags" TO "anon";

GRANT TRUNCATE ON TABLE public."user_flags" TO "anon";

GRANT REFERENCES ON TABLE public."user_flags" TO "anon";

GRANT TRIGGER ON TABLE public."user_flags" TO "anon";

GRANT MAINTAIN ON TABLE public."user_flags" TO "anon";

GRANT INSERT ON TABLE public."user_flags" TO "authenticated";

GRANT SELECT ON TABLE public."user_flags" TO "authenticated";

GRANT UPDATE ON TABLE public."user_flags" TO "authenticated";

GRANT DELETE ON TABLE public."user_flags" TO "authenticated";

GRANT TRUNCATE ON TABLE public."user_flags" TO "authenticated";

GRANT REFERENCES ON TABLE public."user_flags" TO "authenticated";

GRANT TRIGGER ON TABLE public."user_flags" TO "authenticated";

GRANT MAINTAIN ON TABLE public."user_flags" TO "authenticated";

GRANT INSERT ON TABLE public."user_flags" TO "service_role";

GRANT SELECT ON TABLE public."user_flags" TO "service_role";

GRANT UPDATE ON TABLE public."user_flags" TO "service_role";

GRANT DELETE ON TABLE public."user_flags" TO "service_role";

GRANT TRUNCATE ON TABLE public."user_flags" TO "service_role";

GRANT REFERENCES ON TABLE public."user_flags" TO "service_role";

GRANT TRIGGER ON TABLE public."user_flags" TO "service_role";

GRANT MAINTAIN ON TABLE public."user_flags" TO "service_role";

ALTER TABLE public."session_surveys" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."session_surveys" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."session_surveys" TO "anon";

GRANT SELECT ON TABLE public."session_surveys" TO "anon";

GRANT UPDATE ON TABLE public."session_surveys" TO "anon";

GRANT DELETE ON TABLE public."session_surveys" TO "anon";

GRANT TRUNCATE ON TABLE public."session_surveys" TO "anon";

GRANT REFERENCES ON TABLE public."session_surveys" TO "anon";

GRANT TRIGGER ON TABLE public."session_surveys" TO "anon";

GRANT MAINTAIN ON TABLE public."session_surveys" TO "anon";

GRANT INSERT ON TABLE public."session_surveys" TO "authenticated";

GRANT SELECT ON TABLE public."session_surveys" TO "authenticated";

GRANT UPDATE ON TABLE public."session_surveys" TO "authenticated";

GRANT DELETE ON TABLE public."session_surveys" TO "authenticated";

GRANT TRUNCATE ON TABLE public."session_surveys" TO "authenticated";

GRANT REFERENCES ON TABLE public."session_surveys" TO "authenticated";

GRANT TRIGGER ON TABLE public."session_surveys" TO "authenticated";

GRANT MAINTAIN ON TABLE public."session_surveys" TO "authenticated";

GRANT INSERT ON TABLE public."session_surveys" TO "service_role";

GRANT SELECT ON TABLE public."session_surveys" TO "service_role";

GRANT UPDATE ON TABLE public."session_surveys" TO "service_role";

GRANT DELETE ON TABLE public."session_surveys" TO "service_role";

GRANT TRUNCATE ON TABLE public."session_surveys" TO "service_role";

GRANT REFERENCES ON TABLE public."session_surveys" TO "service_role";

GRANT TRIGGER ON TABLE public."session_surveys" TO "service_role";

GRANT MAINTAIN ON TABLE public."session_surveys" TO "service_role";

ALTER TABLE public."query_tips" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."query_tips" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."query_tips" TO "anon";

GRANT SELECT ON TABLE public."query_tips" TO "anon";

GRANT UPDATE ON TABLE public."query_tips" TO "anon";

GRANT DELETE ON TABLE public."query_tips" TO "anon";

GRANT TRUNCATE ON TABLE public."query_tips" TO "anon";

GRANT REFERENCES ON TABLE public."query_tips" TO "anon";

GRANT TRIGGER ON TABLE public."query_tips" TO "anon";

GRANT MAINTAIN ON TABLE public."query_tips" TO "anon";

GRANT INSERT ON TABLE public."query_tips" TO "authenticated";

GRANT SELECT ON TABLE public."query_tips" TO "authenticated";

GRANT UPDATE ON TABLE public."query_tips" TO "authenticated";

GRANT DELETE ON TABLE public."query_tips" TO "authenticated";

GRANT TRUNCATE ON TABLE public."query_tips" TO "authenticated";

GRANT REFERENCES ON TABLE public."query_tips" TO "authenticated";

GRANT TRIGGER ON TABLE public."query_tips" TO "authenticated";

GRANT MAINTAIN ON TABLE public."query_tips" TO "authenticated";

GRANT INSERT ON TABLE public."query_tips" TO "service_role";

GRANT SELECT ON TABLE public."query_tips" TO "service_role";

GRANT UPDATE ON TABLE public."query_tips" TO "service_role";

GRANT DELETE ON TABLE public."query_tips" TO "service_role";

GRANT TRUNCATE ON TABLE public."query_tips" TO "service_role";

GRANT REFERENCES ON TABLE public."query_tips" TO "service_role";

GRANT TRIGGER ON TABLE public."query_tips" TO "service_role";

GRANT MAINTAIN ON TABLE public."query_tips" TO "service_role";

ALTER TABLE public."channel_invitations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."channel_invitations" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."channel_invitations" TO "anon";

GRANT SELECT ON TABLE public."channel_invitations" TO "anon";

GRANT UPDATE ON TABLE public."channel_invitations" TO "anon";

GRANT DELETE ON TABLE public."channel_invitations" TO "anon";

GRANT TRUNCATE ON TABLE public."channel_invitations" TO "anon";

GRANT REFERENCES ON TABLE public."channel_invitations" TO "anon";

GRANT TRIGGER ON TABLE public."channel_invitations" TO "anon";

GRANT MAINTAIN ON TABLE public."channel_invitations" TO "anon";

GRANT INSERT ON TABLE public."channel_invitations" TO "authenticated";

GRANT SELECT ON TABLE public."channel_invitations" TO "authenticated";

GRANT UPDATE ON TABLE public."channel_invitations" TO "authenticated";

GRANT DELETE ON TABLE public."channel_invitations" TO "authenticated";

GRANT TRUNCATE ON TABLE public."channel_invitations" TO "authenticated";

GRANT REFERENCES ON TABLE public."channel_invitations" TO "authenticated";

GRANT TRIGGER ON TABLE public."channel_invitations" TO "authenticated";

GRANT MAINTAIN ON TABLE public."channel_invitations" TO "authenticated";

GRANT INSERT ON TABLE public."channel_invitations" TO "service_role";

GRANT SELECT ON TABLE public."channel_invitations" TO "service_role";

GRANT UPDATE ON TABLE public."channel_invitations" TO "service_role";

GRANT DELETE ON TABLE public."channel_invitations" TO "service_role";

GRANT TRUNCATE ON TABLE public."channel_invitations" TO "service_role";

GRANT REFERENCES ON TABLE public."channel_invitations" TO "service_role";

GRANT TRIGGER ON TABLE public."channel_invitations" TO "service_role";

GRANT MAINTAIN ON TABLE public."channel_invitations" TO "service_role";

ALTER TABLE public."shared_threads" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."shared_threads" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."shared_threads" TO "anon";

GRANT SELECT ON TABLE public."shared_threads" TO "anon";

GRANT UPDATE ON TABLE public."shared_threads" TO "anon";

GRANT DELETE ON TABLE public."shared_threads" TO "anon";

GRANT TRUNCATE ON TABLE public."shared_threads" TO "anon";

GRANT REFERENCES ON TABLE public."shared_threads" TO "anon";

GRANT TRIGGER ON TABLE public."shared_threads" TO "anon";

GRANT MAINTAIN ON TABLE public."shared_threads" TO "anon";

GRANT INSERT ON TABLE public."shared_threads" TO "authenticated";

GRANT SELECT ON TABLE public."shared_threads" TO "authenticated";

GRANT UPDATE ON TABLE public."shared_threads" TO "authenticated";

GRANT DELETE ON TABLE public."shared_threads" TO "authenticated";

GRANT TRUNCATE ON TABLE public."shared_threads" TO "authenticated";

GRANT REFERENCES ON TABLE public."shared_threads" TO "authenticated";

GRANT TRIGGER ON TABLE public."shared_threads" TO "authenticated";

GRANT MAINTAIN ON TABLE public."shared_threads" TO "authenticated";

GRANT INSERT ON TABLE public."shared_threads" TO "service_role";

GRANT SELECT ON TABLE public."shared_threads" TO "service_role";

GRANT UPDATE ON TABLE public."shared_threads" TO "service_role";

GRANT DELETE ON TABLE public."shared_threads" TO "service_role";

GRANT TRUNCATE ON TABLE public."shared_threads" TO "service_role";

GRANT REFERENCES ON TABLE public."shared_threads" TO "service_role";

GRANT TRIGGER ON TABLE public."shared_threads" TO "service_role";

GRANT MAINTAIN ON TABLE public."shared_threads" TO "service_role";

ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."notifications" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."notifications" TO "anon";

GRANT SELECT ON TABLE public."notifications" TO "anon";

GRANT UPDATE ON TABLE public."notifications" TO "anon";

GRANT DELETE ON TABLE public."notifications" TO "anon";

GRANT TRUNCATE ON TABLE public."notifications" TO "anon";

GRANT REFERENCES ON TABLE public."notifications" TO "anon";

GRANT TRIGGER ON TABLE public."notifications" TO "anon";

GRANT MAINTAIN ON TABLE public."notifications" TO "anon";

GRANT INSERT ON TABLE public."notifications" TO "authenticated";

GRANT SELECT ON TABLE public."notifications" TO "authenticated";

GRANT UPDATE ON TABLE public."notifications" TO "authenticated";

GRANT DELETE ON TABLE public."notifications" TO "authenticated";

GRANT TRUNCATE ON TABLE public."notifications" TO "authenticated";

GRANT REFERENCES ON TABLE public."notifications" TO "authenticated";

GRANT TRIGGER ON TABLE public."notifications" TO "authenticated";

GRANT MAINTAIN ON TABLE public."notifications" TO "authenticated";

GRANT INSERT ON TABLE public."notifications" TO "service_role";

GRANT SELECT ON TABLE public."notifications" TO "service_role";

GRANT UPDATE ON TABLE public."notifications" TO "service_role";

GRANT DELETE ON TABLE public."notifications" TO "service_role";

GRANT TRUNCATE ON TABLE public."notifications" TO "service_role";

GRANT REFERENCES ON TABLE public."notifications" TO "service_role";

GRANT TRIGGER ON TABLE public."notifications" TO "service_role";

GRANT MAINTAIN ON TABLE public."notifications" TO "service_role";

ALTER TABLE public."migration_sessions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."migration_sessions" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."migration_sessions" TO "anon";

GRANT SELECT ON TABLE public."migration_sessions" TO "anon";

GRANT UPDATE ON TABLE public."migration_sessions" TO "anon";

GRANT DELETE ON TABLE public."migration_sessions" TO "anon";

GRANT TRUNCATE ON TABLE public."migration_sessions" TO "anon";

GRANT REFERENCES ON TABLE public."migration_sessions" TO "anon";

GRANT TRIGGER ON TABLE public."migration_sessions" TO "anon";

GRANT MAINTAIN ON TABLE public."migration_sessions" TO "anon";

GRANT INSERT ON TABLE public."migration_sessions" TO "authenticated";

GRANT SELECT ON TABLE public."migration_sessions" TO "authenticated";

GRANT UPDATE ON TABLE public."migration_sessions" TO "authenticated";

GRANT DELETE ON TABLE public."migration_sessions" TO "authenticated";

GRANT TRUNCATE ON TABLE public."migration_sessions" TO "authenticated";

GRANT REFERENCES ON TABLE public."migration_sessions" TO "authenticated";

GRANT TRIGGER ON TABLE public."migration_sessions" TO "authenticated";

GRANT MAINTAIN ON TABLE public."migration_sessions" TO "authenticated";

GRANT INSERT ON TABLE public."migration_sessions" TO "service_role";

GRANT SELECT ON TABLE public."migration_sessions" TO "service_role";

GRANT UPDATE ON TABLE public."migration_sessions" TO "service_role";

GRANT DELETE ON TABLE public."migration_sessions" TO "service_role";

GRANT TRUNCATE ON TABLE public."migration_sessions" TO "service_role";

GRANT REFERENCES ON TABLE public."migration_sessions" TO "service_role";

GRANT TRIGGER ON TABLE public."migration_sessions" TO "service_role";

GRANT MAINTAIN ON TABLE public."migration_sessions" TO "service_role";

ALTER TABLE public."query_log" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."query_log" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."query_log" TO "anon";

GRANT SELECT ON TABLE public."query_log" TO "anon";

GRANT UPDATE ON TABLE public."query_log" TO "anon";

GRANT DELETE ON TABLE public."query_log" TO "anon";

GRANT TRUNCATE ON TABLE public."query_log" TO "anon";

GRANT REFERENCES ON TABLE public."query_log" TO "anon";

GRANT TRIGGER ON TABLE public."query_log" TO "anon";

GRANT MAINTAIN ON TABLE public."query_log" TO "anon";

GRANT INSERT ON TABLE public."query_log" TO "authenticated";

GRANT SELECT ON TABLE public."query_log" TO "authenticated";

GRANT UPDATE ON TABLE public."query_log" TO "authenticated";

GRANT DELETE ON TABLE public."query_log" TO "authenticated";

GRANT TRUNCATE ON TABLE public."query_log" TO "authenticated";

GRANT REFERENCES ON TABLE public."query_log" TO "authenticated";

GRANT TRIGGER ON TABLE public."query_log" TO "authenticated";

GRANT MAINTAIN ON TABLE public."query_log" TO "authenticated";

GRANT INSERT ON TABLE public."query_log" TO "service_role";

GRANT SELECT ON TABLE public."query_log" TO "service_role";

GRANT UPDATE ON TABLE public."query_log" TO "service_role";

GRANT DELETE ON TABLE public."query_log" TO "service_role";

GRANT TRUNCATE ON TABLE public."query_log" TO "service_role";

GRANT REFERENCES ON TABLE public."query_log" TO "service_role";

GRANT TRIGGER ON TABLE public."query_log" TO "service_role";

GRANT MAINTAIN ON TABLE public."query_log" TO "service_role";

ALTER TABLE public."inquiry_state_versions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."inquiry_state_versions" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT SELECT ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT UPDATE ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT DELETE ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT TRUNCATE ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT REFERENCES ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT TRIGGER ON TABLE public."inquiry_state_versions" TO "service_role";

GRANT MAINTAIN ON TABLE public."inquiry_state_versions" TO "service_role";

ALTER TABLE public."subscribers" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."subscribers" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."subscribers" TO "anon";

GRANT SELECT ON TABLE public."subscribers" TO "anon";

GRANT UPDATE ON TABLE public."subscribers" TO "anon";

GRANT DELETE ON TABLE public."subscribers" TO "anon";

GRANT TRUNCATE ON TABLE public."subscribers" TO "anon";

GRANT REFERENCES ON TABLE public."subscribers" TO "anon";

GRANT TRIGGER ON TABLE public."subscribers" TO "anon";

GRANT MAINTAIN ON TABLE public."subscribers" TO "anon";

GRANT INSERT ON TABLE public."subscribers" TO "authenticated";

GRANT SELECT ON TABLE public."subscribers" TO "authenticated";

GRANT UPDATE ON TABLE public."subscribers" TO "authenticated";

GRANT DELETE ON TABLE public."subscribers" TO "authenticated";

GRANT TRUNCATE ON TABLE public."subscribers" TO "authenticated";

GRANT REFERENCES ON TABLE public."subscribers" TO "authenticated";

GRANT TRIGGER ON TABLE public."subscribers" TO "authenticated";

GRANT MAINTAIN ON TABLE public."subscribers" TO "authenticated";

GRANT INSERT ON TABLE public."subscribers" TO "service_role";

GRANT SELECT ON TABLE public."subscribers" TO "service_role";

GRANT UPDATE ON TABLE public."subscribers" TO "service_role";

GRANT DELETE ON TABLE public."subscribers" TO "service_role";

GRANT TRUNCATE ON TABLE public."subscribers" TO "service_role";

GRANT REFERENCES ON TABLE public."subscribers" TO "service_role";

GRANT TRIGGER ON TABLE public."subscribers" TO "service_role";

GRANT MAINTAIN ON TABLE public."subscribers" TO "service_role";

ALTER TABLE public."threads" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."threads" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."threads" TO "anon";

GRANT SELECT ON TABLE public."threads" TO "anon";

GRANT UPDATE ON TABLE public."threads" TO "anon";

GRANT DELETE ON TABLE public."threads" TO "anon";

GRANT TRUNCATE ON TABLE public."threads" TO "anon";

GRANT REFERENCES ON TABLE public."threads" TO "anon";

GRANT TRIGGER ON TABLE public."threads" TO "anon";

GRANT MAINTAIN ON TABLE public."threads" TO "anon";

GRANT INSERT ON TABLE public."threads" TO "authenticated";

GRANT SELECT ON TABLE public."threads" TO "authenticated";

GRANT UPDATE ON TABLE public."threads" TO "authenticated";

GRANT DELETE ON TABLE public."threads" TO "authenticated";

GRANT TRUNCATE ON TABLE public."threads" TO "authenticated";

GRANT REFERENCES ON TABLE public."threads" TO "authenticated";

GRANT TRIGGER ON TABLE public."threads" TO "authenticated";

GRANT MAINTAIN ON TABLE public."threads" TO "authenticated";

GRANT INSERT ON TABLE public."threads" TO "service_role";

GRANT SELECT ON TABLE public."threads" TO "service_role";

GRANT UPDATE ON TABLE public."threads" TO "service_role";

GRANT DELETE ON TABLE public."threads" TO "service_role";

GRANT TRUNCATE ON TABLE public."threads" TO "service_role";

GRANT REFERENCES ON TABLE public."threads" TO "service_role";

GRANT TRIGGER ON TABLE public."threads" TO "service_role";

GRANT MAINTAIN ON TABLE public."threads" TO "service_role";

ALTER TABLE public."thread_highlights" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."thread_highlights" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."thread_highlights" TO "anon";

GRANT SELECT ON TABLE public."thread_highlights" TO "anon";

GRANT UPDATE ON TABLE public."thread_highlights" TO "anon";

GRANT DELETE ON TABLE public."thread_highlights" TO "anon";

GRANT TRUNCATE ON TABLE public."thread_highlights" TO "anon";

GRANT REFERENCES ON TABLE public."thread_highlights" TO "anon";

GRANT TRIGGER ON TABLE public."thread_highlights" TO "anon";

GRANT MAINTAIN ON TABLE public."thread_highlights" TO "anon";

GRANT INSERT ON TABLE public."thread_highlights" TO "authenticated";

GRANT SELECT ON TABLE public."thread_highlights" TO "authenticated";

GRANT UPDATE ON TABLE public."thread_highlights" TO "authenticated";

GRANT DELETE ON TABLE public."thread_highlights" TO "authenticated";

GRANT TRUNCATE ON TABLE public."thread_highlights" TO "authenticated";

GRANT REFERENCES ON TABLE public."thread_highlights" TO "authenticated";

GRANT TRIGGER ON TABLE public."thread_highlights" TO "authenticated";

GRANT MAINTAIN ON TABLE public."thread_highlights" TO "authenticated";

GRANT INSERT ON TABLE public."thread_highlights" TO "service_role";

GRANT SELECT ON TABLE public."thread_highlights" TO "service_role";

GRANT UPDATE ON TABLE public."thread_highlights" TO "service_role";

GRANT DELETE ON TABLE public."thread_highlights" TO "service_role";

GRANT TRUNCATE ON TABLE public."thread_highlights" TO "service_role";

GRANT REFERENCES ON TABLE public."thread_highlights" TO "service_role";

GRANT TRIGGER ON TABLE public."thread_highlights" TO "service_role";

GRANT MAINTAIN ON TABLE public."thread_highlights" TO "service_role";

ALTER TABLE public."shares" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."shares" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."shares" TO "service_role";

GRANT SELECT ON TABLE public."shares" TO "service_role";

GRANT UPDATE ON TABLE public."shares" TO "service_role";

GRANT DELETE ON TABLE public."shares" TO "service_role";

GRANT TRUNCATE ON TABLE public."shares" TO "service_role";

GRANT REFERENCES ON TABLE public."shares" TO "service_role";

GRANT TRIGGER ON TABLE public."shares" TO "service_role";

GRANT MAINTAIN ON TABLE public."shares" TO "service_role";

ALTER TABLE public."share_chat_messages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."share_chat_messages" REPLICA IDENTITY FULL;

REVOKE ALL ON TABLE public."share_chat_messages" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."share_chat_messages" TO "service_role";

GRANT SELECT ON TABLE public."share_chat_messages" TO "service_role";

GRANT UPDATE ON TABLE public."share_chat_messages" TO "service_role";

GRANT DELETE ON TABLE public."share_chat_messages" TO "service_role";

GRANT TRUNCATE ON TABLE public."share_chat_messages" TO "service_role";

GRANT REFERENCES ON TABLE public."share_chat_messages" TO "service_role";

GRANT TRIGGER ON TABLE public."share_chat_messages" TO "service_role";

GRANT MAINTAIN ON TABLE public."share_chat_messages" TO "service_role";

REVOKE ALL ON SEQUENCE public."scripture_embeddings_id_seq" FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON SEQUENCE public."scripture_embeddings_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE public."scripture_embeddings_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE public."scripture_embeddings_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE public."scripture_embeddings_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE public."scripture_embeddings_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE public."scripture_embeddings_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE public."scripture_embeddings_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE public."scripture_embeddings_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE public."scripture_embeddings_id_seq" TO "service_role";

ALTER TABLE public."scripture_embeddings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."scripture_embeddings" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."scripture_embeddings" TO "anon";

GRANT SELECT ON TABLE public."scripture_embeddings" TO "anon";

GRANT UPDATE ON TABLE public."scripture_embeddings" TO "anon";

GRANT DELETE ON TABLE public."scripture_embeddings" TO "anon";

GRANT TRUNCATE ON TABLE public."scripture_embeddings" TO "anon";

GRANT REFERENCES ON TABLE public."scripture_embeddings" TO "anon";

GRANT TRIGGER ON TABLE public."scripture_embeddings" TO "anon";

GRANT MAINTAIN ON TABLE public."scripture_embeddings" TO "anon";

GRANT INSERT ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT SELECT ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT UPDATE ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT DELETE ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT TRUNCATE ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT REFERENCES ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT TRIGGER ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT MAINTAIN ON TABLE public."scripture_embeddings" TO "authenticated";

GRANT INSERT ON TABLE public."scripture_embeddings" TO "service_role";

GRANT SELECT ON TABLE public."scripture_embeddings" TO "service_role";

GRANT UPDATE ON TABLE public."scripture_embeddings" TO "service_role";

GRANT DELETE ON TABLE public."scripture_embeddings" TO "service_role";

GRANT TRUNCATE ON TABLE public."scripture_embeddings" TO "service_role";

GRANT REFERENCES ON TABLE public."scripture_embeddings" TO "service_role";

GRANT TRIGGER ON TABLE public."scripture_embeddings" TO "service_role";

GRANT MAINTAIN ON TABLE public."scripture_embeddings" TO "service_role";

ALTER TABLE public."thread_participants" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."thread_participants" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."thread_participants" TO "anon";

GRANT SELECT ON TABLE public."thread_participants" TO "anon";

GRANT UPDATE ON TABLE public."thread_participants" TO "anon";

GRANT DELETE ON TABLE public."thread_participants" TO "anon";

GRANT TRUNCATE ON TABLE public."thread_participants" TO "anon";

GRANT REFERENCES ON TABLE public."thread_participants" TO "anon";

GRANT TRIGGER ON TABLE public."thread_participants" TO "anon";

GRANT MAINTAIN ON TABLE public."thread_participants" TO "anon";

GRANT INSERT ON TABLE public."thread_participants" TO "authenticated";

GRANT SELECT ON TABLE public."thread_participants" TO "authenticated";

GRANT UPDATE ON TABLE public."thread_participants" TO "authenticated";

GRANT DELETE ON TABLE public."thread_participants" TO "authenticated";

GRANT TRUNCATE ON TABLE public."thread_participants" TO "authenticated";

GRANT REFERENCES ON TABLE public."thread_participants" TO "authenticated";

GRANT TRIGGER ON TABLE public."thread_participants" TO "authenticated";

GRANT MAINTAIN ON TABLE public."thread_participants" TO "authenticated";

GRANT INSERT ON TABLE public."thread_participants" TO "service_role";

GRANT SELECT ON TABLE public."thread_participants" TO "service_role";

GRANT UPDATE ON TABLE public."thread_participants" TO "service_role";

GRANT DELETE ON TABLE public."thread_participants" TO "service_role";

GRANT TRUNCATE ON TABLE public."thread_participants" TO "service_role";

GRANT REFERENCES ON TABLE public."thread_participants" TO "service_role";

GRANT TRIGGER ON TABLE public."thread_participants" TO "service_role";

GRANT MAINTAIN ON TABLE public."thread_participants" TO "service_role";

ALTER TABLE public."thread_mutes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."thread_mutes" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."thread_mutes" TO "anon";

GRANT SELECT ON TABLE public."thread_mutes" TO "anon";

GRANT UPDATE ON TABLE public."thread_mutes" TO "anon";

GRANT DELETE ON TABLE public."thread_mutes" TO "anon";

GRANT TRUNCATE ON TABLE public."thread_mutes" TO "anon";

GRANT REFERENCES ON TABLE public."thread_mutes" TO "anon";

GRANT TRIGGER ON TABLE public."thread_mutes" TO "anon";

GRANT MAINTAIN ON TABLE public."thread_mutes" TO "anon";

GRANT INSERT ON TABLE public."thread_mutes" TO "authenticated";

GRANT SELECT ON TABLE public."thread_mutes" TO "authenticated";

GRANT UPDATE ON TABLE public."thread_mutes" TO "authenticated";

GRANT DELETE ON TABLE public."thread_mutes" TO "authenticated";

GRANT TRUNCATE ON TABLE public."thread_mutes" TO "authenticated";

GRANT REFERENCES ON TABLE public."thread_mutes" TO "authenticated";

GRANT TRIGGER ON TABLE public."thread_mutes" TO "authenticated";

GRANT MAINTAIN ON TABLE public."thread_mutes" TO "authenticated";

GRANT INSERT ON TABLE public."thread_mutes" TO "service_role";

GRANT SELECT ON TABLE public."thread_mutes" TO "service_role";

GRANT UPDATE ON TABLE public."thread_mutes" TO "service_role";

GRANT DELETE ON TABLE public."thread_mutes" TO "service_role";

GRANT TRUNCATE ON TABLE public."thread_mutes" TO "service_role";

GRANT REFERENCES ON TABLE public."thread_mutes" TO "service_role";

GRANT TRIGGER ON TABLE public."thread_mutes" TO "service_role";

GRANT MAINTAIN ON TABLE public."thread_mutes" TO "service_role";

ALTER TABLE public."follow_ups" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."follow_ups" REPLICA IDENTITY FULL;

REVOKE ALL ON TABLE public."follow_ups" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."follow_ups" TO "service_role";

GRANT SELECT ON TABLE public."follow_ups" TO "service_role";

GRANT UPDATE ON TABLE public."follow_ups" TO "service_role";

GRANT DELETE ON TABLE public."follow_ups" TO "service_role";

GRANT TRUNCATE ON TABLE public."follow_ups" TO "service_role";

GRANT REFERENCES ON TABLE public."follow_ups" TO "service_role";

GRANT TRIGGER ON TABLE public."follow_ups" TO "service_role";

GRANT MAINTAIN ON TABLE public."follow_ups" TO "service_role";

REVOKE ALL ON SEQUENCE public."corpus_embeddings_id_seq" FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON SEQUENCE public."corpus_embeddings_id_seq" TO "anon";

GRANT UPDATE ON SEQUENCE public."corpus_embeddings_id_seq" TO "anon";

GRANT USAGE ON SEQUENCE public."corpus_embeddings_id_seq" TO "anon";

GRANT SELECT ON SEQUENCE public."corpus_embeddings_id_seq" TO "authenticated";

GRANT UPDATE ON SEQUENCE public."corpus_embeddings_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE public."corpus_embeddings_id_seq" TO "authenticated";

GRANT SELECT ON SEQUENCE public."corpus_embeddings_id_seq" TO "service_role";

GRANT UPDATE ON SEQUENCE public."corpus_embeddings_id_seq" TO "service_role";

GRANT USAGE ON SEQUENCE public."corpus_embeddings_id_seq" TO "service_role";

ALTER TABLE public."corpus_embeddings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."corpus_embeddings" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."corpus_embeddings" TO "anon";

GRANT SELECT ON TABLE public."corpus_embeddings" TO "anon";

GRANT UPDATE ON TABLE public."corpus_embeddings" TO "anon";

GRANT DELETE ON TABLE public."corpus_embeddings" TO "anon";

GRANT TRUNCATE ON TABLE public."corpus_embeddings" TO "anon";

GRANT REFERENCES ON TABLE public."corpus_embeddings" TO "anon";

GRANT TRIGGER ON TABLE public."corpus_embeddings" TO "anon";

GRANT MAINTAIN ON TABLE public."corpus_embeddings" TO "anon";

GRANT INSERT ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT SELECT ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT UPDATE ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT DELETE ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT TRUNCATE ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT REFERENCES ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT TRIGGER ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT MAINTAIN ON TABLE public."corpus_embeddings" TO "authenticated";

GRANT INSERT ON TABLE public."corpus_embeddings" TO "service_role";

GRANT SELECT ON TABLE public."corpus_embeddings" TO "service_role";

GRANT UPDATE ON TABLE public."corpus_embeddings" TO "service_role";

GRANT DELETE ON TABLE public."corpus_embeddings" TO "service_role";

GRANT TRUNCATE ON TABLE public."corpus_embeddings" TO "service_role";

GRANT REFERENCES ON TABLE public."corpus_embeddings" TO "service_role";

GRANT TRIGGER ON TABLE public."corpus_embeddings" TO "service_role";

GRANT MAINTAIN ON TABLE public."corpus_embeddings" TO "service_role";

ALTER TABLE public."prism_entitlements" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_entitlements" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_entitlements" TO "service_role";

GRANT SELECT ON TABLE public."prism_entitlements" TO "service_role";

GRANT UPDATE ON TABLE public."prism_entitlements" TO "service_role";

GRANT DELETE ON TABLE public."prism_entitlements" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_entitlements" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_entitlements" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_entitlements" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_entitlements" TO "service_role";

ALTER TABLE public."prism_pending_entitlements" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_pending_entitlements" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT SELECT ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT UPDATE ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT DELETE ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_pending_entitlements" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_pending_entitlements" TO "service_role";

ALTER TABLE public."prism_inquiry_principals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_inquiry_principals" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT SELECT ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT UPDATE ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT DELETE ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_inquiry_principals" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_inquiry_principals" TO "service_role";

ALTER TABLE public."trust_circle_members" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."trust_circle_members" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."trust_circle_members" TO "service_role";

GRANT SELECT ON TABLE public."trust_circle_members" TO "service_role";

GRANT UPDATE ON TABLE public."trust_circle_members" TO "service_role";

GRANT DELETE ON TABLE public."trust_circle_members" TO "service_role";

GRANT TRUNCATE ON TABLE public."trust_circle_members" TO "service_role";

GRANT REFERENCES ON TABLE public."trust_circle_members" TO "service_role";

GRANT TRIGGER ON TABLE public."trust_circle_members" TO "service_role";

GRANT MAINTAIN ON TABLE public."trust_circle_members" TO "service_role";

ALTER TABLE public."prism_fulfillment_events" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_fulfillment_events" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT SELECT ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT UPDATE ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT DELETE ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_fulfillment_events" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_fulfillment_events" TO "service_role";

ALTER TABLE public."prism_guests" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_guests" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_guests" TO "service_role";

GRANT SELECT ON TABLE public."prism_guests" TO "service_role";

GRANT UPDATE ON TABLE public."prism_guests" TO "service_role";

GRANT DELETE ON TABLE public."prism_guests" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_guests" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_guests" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_guests" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_guests" TO "service_role";

ALTER TABLE public."prism_inquiry_forks" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_inquiry_forks" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT SELECT ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT UPDATE ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT DELETE ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_inquiry_forks" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_inquiry_forks" TO "service_role";

ALTER TABLE public."prism_query_ledger" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_query_ledger" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_query_ledger" TO "service_role";

GRANT SELECT ON TABLE public."prism_query_ledger" TO "service_role";

GRANT UPDATE ON TABLE public."prism_query_ledger" TO "service_role";

GRANT DELETE ON TABLE public."prism_query_ledger" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_query_ledger" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_query_ledger" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_query_ledger" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_query_ledger" TO "service_role";

ALTER TABLE public."prism_learning_candidates" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_learning_candidates" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT SELECT ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT UPDATE ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT DELETE ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_learning_candidates" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_learning_candidates" TO "service_role";

ALTER TABLE public."prism_approved_learning" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prism_approved_learning" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."prism_approved_learning" TO "service_role";

GRANT SELECT ON TABLE public."prism_approved_learning" TO "service_role";

GRANT UPDATE ON TABLE public."prism_approved_learning" TO "service_role";

GRANT DELETE ON TABLE public."prism_approved_learning" TO "service_role";

GRANT TRUNCATE ON TABLE public."prism_approved_learning" TO "service_role";

GRANT REFERENCES ON TABLE public."prism_approved_learning" TO "service_role";

GRANT TRIGGER ON TABLE public."prism_approved_learning" TO "service_role";

GRANT MAINTAIN ON TABLE public."prism_approved_learning" TO "service_role";

ALTER TABLE public."refraction_notes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."refraction_notes" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public."refraction_notes" TO "service_role";

GRANT SELECT ON TABLE public."refraction_notes" TO "service_role";

GRANT UPDATE ON TABLE public."refraction_notes" TO "service_role";

GRANT DELETE ON TABLE public."refraction_notes" TO "service_role";

GRANT TRUNCATE ON TABLE public."refraction_notes" TO "service_role";

GRANT REFERENCES ON TABLE public."refraction_notes" TO "service_role";

GRANT TRIGGER ON TABLE public."refraction_notes" TO "service_role";

GRANT MAINTAIN ON TABLE public."refraction_notes" TO "service_role";

REVOKE ALL ON FUNCTION public."fork_shared_prism_inquiry"(p_share_id uuid, p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."fork_shared_prism_inquiry"(p_share_id uuid, p_user_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."add_signup_bonus"(p_email text, p_credits integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."add_signup_bonus"(p_email text, p_credits integer) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."add_signup_bonus"(p_email text, p_credits integer) TO "anon";

GRANT EXECUTE ON FUNCTION public."add_signup_bonus"(p_email text, p_credits integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."add_signup_bonus"(p_email text, p_credits integer) TO "service_role";

REVOKE ALL ON FUNCTION public."classify_prism_artifact_cost"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."classify_prism_artifact_cost"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."classify_prism_artifact_cost"() TO "anon";

GRANT EXECUTE ON FUNCTION public."classify_prism_artifact_cost"() TO "authenticated";

GRANT EXECUTE ON FUNCTION public."classify_prism_artifact_cost"() TO "service_role";

REVOKE ALL ON FUNCTION public."rls_auto_enable"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."rls_auto_enable"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."rls_auto_enable"() TO "anon";

GRANT EXECUTE ON FUNCTION public."rls_auto_enable"() TO "authenticated";

GRANT EXECUTE ON FUNCTION public."rls_auto_enable"() TO "service_role";

REVOKE ALL ON FUNCTION public."commit_inquiry_state"(p_inquiry_key text, p_expected_version integer, p_state jsonb, p_thread_id uuid, p_owner_user_id uuid, p_request_id text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."commit_inquiry_state"(p_inquiry_key text, p_expected_version integer, p_state jsonb, p_thread_id uuid, p_owner_user_id uuid, p_request_id text) TO "service_role";

REVOKE ALL ON FUNCTION public."prepare_prism_inquiry"(p_inquiry_key text, p_guest_id uuid, p_user_id uuid, p_preview_allowance integer, p_query_cost integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."prepare_prism_inquiry"(p_inquiry_key text, p_guest_id uuid, p_user_id uuid, p_preview_allowance integer, p_query_cost integer) TO "service_role";

REVOKE ALL ON FUNCTION public."draw_query"(p_user_id uuid, p_cost integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."draw_query"(p_user_id uuid, p_cost integer) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."draw_query"(p_user_id uuid, p_cost integer) TO "anon";

GRANT EXECUTE ON FUNCTION public."draw_query"(p_user_id uuid, p_cost integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."draw_query"(p_user_id uuid, p_cost integer) TO "service_role";

REVOKE ALL ON FUNCTION public."transfer_credits"(p_from_user_id uuid, p_to_user_id uuid, p_amount integer, p_thread_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."transfer_credits"(p_from_user_id uuid, p_to_user_id uuid, p_amount integer, p_thread_id uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."transfer_credits"(p_from_user_id uuid, p_to_user_id uuid, p_amount integer, p_thread_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION public."transfer_credits"(p_from_user_id uuid, p_to_user_id uuid, p_amount integer, p_thread_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."transfer_credits"(p_from_user_id uuid, p_to_user_id uuid, p_amount integer, p_thread_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."reset_monthly_queries"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."reset_monthly_queries"(p_user_id uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."reset_monthly_queries"(p_user_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION public."reset_monthly_queries"(p_user_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."reset_monthly_queries"(p_user_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."update_trust_score"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."update_trust_score"(p_user_id uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."update_trust_score"(p_user_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION public."update_trust_score"(p_user_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."update_trust_score"(p_user_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."migrate_local_threads"(p_user_id uuid, p_device_hint text, p_threads jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."migrate_local_threads"(p_user_id uuid, p_device_hint text, p_threads jsonb) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."migrate_local_threads"(p_user_id uuid, p_device_hint text, p_threads jsonb) TO "anon";

GRANT EXECUTE ON FUNCTION public."migrate_local_threads"(p_user_id uuid, p_device_hint text, p_threads jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."migrate_local_threads"(p_user_id uuid, p_device_hint text, p_threads jsonb) TO "service_role";

REVOKE ALL ON FUNCTION public."set_updated_at"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."set_updated_at"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."set_updated_at"() TO "anon";

GRANT EXECUTE ON FUNCTION public."set_updated_at"() TO "authenticated";

GRANT EXECUTE ON FUNCTION public."set_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION public."save_thread"(p_user_id uuid, p_title text, p_query text, p_response jsonb, p_query_type text, p_tier text, p_retention_days integer, p_expires_at timestamp with time zone, p_grace_ends_at timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."save_thread"(p_user_id uuid, p_title text, p_query text, p_response jsonb, p_query_type text, p_tier text, p_retention_days integer, p_expires_at timestamp with time zone, p_grace_ends_at timestamp with time zone) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."save_thread"(p_user_id uuid, p_title text, p_query text, p_response jsonb, p_query_type text, p_tier text, p_retention_days integer, p_expires_at timestamp with time zone, p_grace_ends_at timestamp with time zone) TO "anon";

GRANT EXECUTE ON FUNCTION public."save_thread"(p_user_id uuid, p_title text, p_query text, p_response jsonb, p_query_type text, p_tier text, p_retention_days integer, p_expires_at timestamp with time zone, p_grace_ends_at timestamp with time zone) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."save_thread"(p_user_id uuid, p_title text, p_query text, p_response jsonb, p_query_type text, p_tier text, p_retention_days integer, p_expires_at timestamp with time zone, p_grace_ends_at timestamp with time zone) TO "service_role";

REVOKE ALL ON FUNCTION public."attach_interpretation_packet"(p_packet_id text, p_artifact_id uuid, p_artifact_revision integer, p_packet_type text, p_sequence integer, p_status text, p_content jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."attach_interpretation_packet"(p_packet_id text, p_artifact_id uuid, p_artifact_revision integer, p_packet_type text, p_sequence integer, p_status text, p_content jsonb) TO "service_role";

REVOKE ALL ON FUNCTION public."draw_signal_credit"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."draw_signal_credit"(p_user_id uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."draw_signal_credit"(p_user_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION public."draw_signal_credit"(p_user_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."draw_signal_credit"(p_user_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."claim_prism_guest"(p_guest_id uuid, p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."claim_prism_guest"(p_guest_id uuid, p_user_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."apply_prism_subscription_by_email"(p_email text, p_status text, p_period_start timestamp with time zone, p_period_end timestamp with time zone, p_fulfillment_key text, p_credits integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."apply_prism_subscription_by_email"(p_email text, p_status text, p_period_start timestamp with time zone, p_period_end timestamp with time zone, p_fulfillment_key text, p_credits integer) TO "service_role";

REVOKE ALL ON FUNCTION public."credit_referral_query"(p_email text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."credit_referral_query"(p_email text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."credit_referral_query"(p_email text) TO "anon";

GRANT EXECUTE ON FUNCTION public."credit_referral_query"(p_email text) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."credit_referral_query"(p_email text) TO "service_role";

REVOKE ALL ON FUNCTION public."promote_prism_learning_candidate"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."promote_prism_learning_candidate"() TO "service_role";

REVOKE ALL ON FUNCTION public."match_prism_learning"(search_text text, match_count integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."match_prism_learning"(search_text text, match_count integer) TO "service_role";

REVOKE ALL ON FUNCTION public."match_corpus"(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."match_corpus"(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."match_corpus"(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source text) TO "anon";

GRANT EXECUTE ON FUNCTION public."match_corpus"(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source text) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."match_corpus"(query_embedding public.vector, match_threshold double precision, match_count integer, filter_source text) TO "service_role";

REVOKE ALL ON FUNCTION public."complete_interpretation_artifact"(p_artifact_id uuid, p_artifact_revision integer, p_inquiry_id text, p_inquiry_key text, p_thread_id uuid, p_owner_user_id uuid, p_completion_key text, p_constitution_version text, p_schema_version integer, p_query text, p_artifact jsonb, p_canonical_response text, p_orientation_packet jsonb, p_canonical_packet jsonb, p_charge boolean, p_usage_user_id uuid, p_usage_query_type text, p_usage_credit_source text, p_usage_channel_context text, p_thread_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."complete_interpretation_artifact"(p_artifact_id uuid, p_artifact_revision integer, p_inquiry_id text, p_inquiry_key text, p_thread_id uuid, p_owner_user_id uuid, p_completion_key text, p_constitution_version text, p_schema_version integer, p_query text, p_artifact jsonb, p_canonical_response text, p_orientation_packet jsonb, p_canonical_packet jsonb, p_charge boolean, p_usage_user_id uuid, p_usage_query_type text, p_usage_credit_source text, p_usage_channel_context text, p_thread_payload jsonb) TO "service_role";

REVOKE ALL ON FUNCTION public."complete_followup_interpretation_artifact"(p_expected_state_version integer, p_inquiry_state jsonb, p_request_id text, p_artifact_id uuid, p_artifact_revision integer, p_inquiry_id text, p_inquiry_key text, p_thread_id uuid, p_owner_user_id uuid, p_completion_key text, p_constitution_version text, p_schema_version integer, p_query text, p_artifact jsonb, p_canonical_response text, p_orientation_packet jsonb, p_canonical_packet jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."complete_followup_interpretation_artifact"(p_expected_state_version integer, p_inquiry_state jsonb, p_request_id text, p_artifact_id uuid, p_artifact_revision integer, p_inquiry_id text, p_inquiry_key text, p_thread_id uuid, p_owner_user_id uuid, p_completion_key text, p_constitution_version text, p_schema_version integer, p_query text, p_artifact jsonb, p_canonical_response text, p_orientation_packet jsonb, p_canonical_packet jsonb) TO "service_role";

REVOKE ALL ON FUNCTION public."increment_share_followup"(p_share_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."increment_share_followup"(p_share_id uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."increment_share_followup"(p_share_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION public."increment_share_followup"(p_share_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION public."increment_share_followup"(p_share_id uuid) TO "service_role";

REVOKE ALL ON FUNCTION public."prism_query_access"(p_guest_id uuid, p_user_id uuid, p_preview_allowance integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."prism_query_access"(p_guest_id uuid, p_user_id uuid, p_preview_allowance integer) TO "service_role";

REVOKE ALL ON FUNCTION public."ensure_creator_is_participant"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."ensure_creator_is_participant"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."ensure_creator_is_participant"() TO "anon";

GRANT EXECUTE ON FUNCTION public."ensure_creator_is_participant"() TO "authenticated";

GRANT EXECUTE ON FUNCTION public."ensure_creator_is_participant"() TO "service_role";

REVOKE ALL ON FUNCTION public."charge_prism_artifact_completion"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."charge_prism_artifact_completion"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public."charge_prism_artifact_completion"() TO "anon";

GRANT EXECUTE ON FUNCTION public."charge_prism_artifact_completion"() TO "authenticated";

GRANT EXECUTE ON FUNCTION public."charge_prism_artifact_completion"() TO "service_role";

REVOKE ALL ON FUNCTION public."consume_prism_query"(p_completion_key text, p_guest_id uuid, p_user_id uuid, p_thread_id uuid, p_artifact_id uuid, p_artifact_revision integer, p_submission_type text, p_preview_allowance integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."consume_prism_query"(p_completion_key text, p_guest_id uuid, p_user_id uuid, p_thread_id uuid, p_artifact_id uuid, p_artifact_revision integer, p_submission_type text, p_preview_allowance integer) TO "service_role";

REVOKE ALL ON FUNCTION public."credit_prism_bank_by_email"(p_email text, p_queries integer, p_fulfillment_key text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."credit_prism_bank_by_email"(p_email text, p_queries integer, p_fulfillment_key text) TO "service_role";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."channel_participants";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."room_messages";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."shared_threads";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."notifications";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."thread_highlights";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."share_chat_messages";

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."follow_ups";

NOTIFY pgrst, 'reload schema';

