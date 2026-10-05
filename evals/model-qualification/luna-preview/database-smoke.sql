BEGIN;
DO $setup$
DECLARE v_guest uuid;
BEGIN
  INSERT INTO public.prism_guests(secret_hash) VALUES (repeat('a',64)) RETURNING guest_id INTO v_guest;
  PERFORM set_config('prism.test_guest',v_guest::text,true);
END $setup$;
SET LOCAL ROLE service_role;
DO $service$
DECLARE v_guest uuid := current_setting('prism.test_guest')::uuid;
        v_artifact uuid := pg_catalog.gen_random_uuid();
        v_access record; v_first record; v_again record; v_total integer;
BEGIN
  SELECT * INTO v_access FROM public.prepare_prism_inquiry('luna-schema-smoke-inquiry',v_guest,NULL,NULL,2);
  IF NOT v_access.allowed OR v_access.remaining <> 5 THEN RAISE EXCEPTION 'TEST_INITIAL_ACCESS_FAILED'; END IF;
  SELECT * INTO v_first FROM public.consume_prism_query('luna-schema-smoke-completion',v_guest,NULL,NULL,v_artifact,1,'primary',NULL);
  IF NOT v_first.consumed OR v_first.already_consumed OR v_first.remaining <> 3 THEN RAISE EXCEPTION 'TEST_FIRST_DEBIT_FAILED'; END IF;
  SELECT * INTO v_again FROM public.consume_prism_query('luna-schema-smoke-completion',v_guest,NULL,NULL,v_artifact,1,'primary',NULL);
  IF NOT v_again.consumed OR NOT v_again.already_consumed OR v_again.remaining <> 3 THEN RAISE EXCEPTION 'TEST_DUPLICATE_DEBIT_FAILED'; END IF;
  SELECT count(*) INTO v_total FROM public.prism_query_ledger WHERE guest_id=v_guest;
  IF v_total <> 1 THEN RAISE EXCEPTION 'TEST_LEDGER_IDEMPOTENCE_FAILED'; END IF;
END $service$;
SET LOCAL ROLE anon;
DO $anon$
DECLARE v_total integer;
BEGIN
  BEGIN
    PERFORM * FROM public.consume_prism_query('unauthorized',current_setting('prism.test_guest')::uuid,NULL,NULL,pg_catalog.gen_random_uuid(),1,'primary',NULL);
    RAISE EXCEPTION 'TEST_ANON_EXECUTE_UNEXPECTED';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    SELECT count(*) INTO v_total FROM public.prism_guests;
    IF v_total <> 0 THEN RAISE EXCEPTION 'TEST_ANON_ROWS_VISIBLE'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $anon$;
ROLLBACK;
SELECT 'passed' AS transaction_smoke,
 (SELECT count(*) FROM public.prism_guests) AS guests_after_rollback,
 (SELECT count(*) FROM public.prism_query_ledger) AS ledger_after_rollback,
 (SELECT count(*) FROM public.prism_inquiry_principals) AS principals_after_rollback;
