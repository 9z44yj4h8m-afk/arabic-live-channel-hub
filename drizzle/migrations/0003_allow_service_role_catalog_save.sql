CREATE OR REPLACE FUNCTION public.save_channel_catalog(entries jsonb, expected_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_revision integer; item jsonb;
BEGIN
 IF NOT (public.has_role(auth.uid(), 'admin') OR COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(entries) <> 'array' OR jsonb_array_length(entries) > 2000 THEN RAISE EXCEPTION 'Invalid catalog'; END IF;
 PERFORM pg_advisory_xact_lock(871245);
 INSERT INTO public.channel_catalog_state(id,revision) VALUES(1,0) ON CONFLICT(id) DO NOTHING;
 SELECT revision INTO current_revision FROM public.channel_catalog_state WHERE id=1 FOR UPDATE;
 IF current_revision <> expected_revision THEN RAISE EXCEPTION 'Catalog changed; reload before saving'; END IF;
 IF EXISTS(SELECT 1 FROM public.channel_catalog_entries e WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(entries) i WHERE i->'channel'->>'id'=e.id)) THEN RAISE EXCEPTION 'Use soft deletion'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(entries) LOOP
 INSERT INTO public.channel_catalog_entries(id,channel,position,deleted,hidden) VALUES(item->'channel'->>'id', item->'channel', (item->>'position')::integer, COALESCE((item->>'deleted')::boolean, false), COALESCE((item->>'hidden')::boolean, false))
 ON CONFLICT(id) DO UPDATE SET channel=EXCLUDED.channel, position=EXCLUDED.position, deleted=EXCLUDED.deleted, hidden=EXCLUDED.hidden;
 END LOOP;
 UPDATE public.channel_catalog_state SET revision=revision+1 WHERE id=1;
 RETURN current_revision+1;
END $$;
REVOKE ALL ON FUNCTION public.save_channel_catalog(jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_channel_catalog(jsonb,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_channel_catalog(jsonb,integer) TO service_role;