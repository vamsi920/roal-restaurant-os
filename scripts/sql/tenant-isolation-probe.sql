-- Prompt 25 / 51 — RLS cross-tenant probe (Org A JWT → Org B rows).
-- Run via Supabase MCP execute_sql or linked `supabase db execute --file scripts/sql/tenant-isolation-probe.sql`.
-- Probe user: qa-role-owner on org A only (a0000001-…).

DO $$
DECLARE
  uid text := 'a0000001-0001-4001-8001-000000000001';
  org_a uuid := 'b1111111-1111-4111-8111-111111111111';
  org_b uuid := 'ac88ceed-96d4-4a91-b474-49f5a3ee011d';
  rest_a uuid := 'b2222222-2222-4222-8222-222222222222';
  rest_b uuid := '639b2da9-3409-4fc9-b899-d313b7d7583f';
  legacy_org uuid := '00000000-0000-4000-8000-000000000001';
  cnt int;
  upd int;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- Positive: Org A visible
  SELECT count(*) INTO cnt FROM restaurants WHERE id = rest_a;
  IF cnt <> 1 THEN RAISE EXCEPTION 'positive_control restaurants A expected 1 got %', cnt; END IF;

  SELECT count(*) INTO cnt FROM organizations WHERE id = org_a;
  IF cnt <> 1 THEN RAISE EXCEPTION 'positive_control organizations A expected 1 got %', cnt; END IF;

  -- Negative: Org B hidden
  SELECT count(*) INTO cnt FROM restaurants WHERE id = rest_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK restaurants SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM organizations WHERE id = org_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK organizations SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM categories WHERE restaurant_id = rest_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK categories SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM items i JOIN categories c ON c.id = i.category_id WHERE c.restaurant_id = rest_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK items SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM draft_orders WHERE restaurant_id = rest_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK draft_orders SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM phone_order_receipts WHERE restaurant_id = rest_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK phone_order_receipts SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM menu_imports WHERE organization_id = org_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK menu_imports SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM notification_settings WHERE organization_id = org_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK notification_settings SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM notification_deliveries WHERE organization_id = org_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK notification_deliveries SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM usage_events WHERE organization_id = org_b;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK usage_events SELECT %', cnt; END IF;

  -- Legacy POC (egg mania) hidden from Org A probe user
  SELECT count(*) INTO cnt FROM restaurants WHERE organization_id = legacy_org;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK legacy restaurants SELECT %', cnt; END IF;

  SELECT count(*) INTO cnt FROM usage_events WHERE organization_id = legacy_org;
  IF cnt > 0 THEN RAISE EXCEPTION 'LEAK legacy usage_events SELECT %', cnt; END IF;

  -- Writes blocked
  UPDATE organizations SET name = name WHERE id = org_b;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd > 0 THEN RAISE EXCEPTION 'LEAK organizations UPDATE %', upd; END IF;

  UPDATE draft_orders SET status = status WHERE restaurant_id = rest_b;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd > 0 THEN RAISE EXCEPTION 'LEAK draft_orders UPDATE %', upd; END IF;

  UPDATE menu_imports SET extraction_status = extraction_status WHERE organization_id = org_b;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd > 0 THEN RAISE EXCEPTION 'LEAK menu_imports UPDATE %', upd; END IF;

  UPDATE notification_settings SET order_stuck_minutes = order_stuck_minutes WHERE organization_id = org_b;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd > 0 THEN RAISE EXCEPTION 'LEAK notification_settings UPDATE %', upd; END IF;

  BEGIN
    INSERT INTO restaurants (organization_id, name) VALUES (org_b, 'probe-leak');
    RAISE EXCEPTION 'LEAK restaurants INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO usage_events (organization_id, event_type) VALUES (org_b, 'voice_order');
    RAISE EXCEPTION 'LEAK usage_events INSERT allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR not_null_violation THEN NULL;
  END;
END $$;
