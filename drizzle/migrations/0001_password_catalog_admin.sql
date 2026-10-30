CREATE OR REPLACE FUNCTION public.save_channel_catalog(entries jsonb, expected_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_revision integer; item jsonb;
BEGIN
 IF current_user <> 'service_role' THEN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 END IF;
 IF jsonb_typeof(entries) <> 'array' OR jsonb_array_length(entries) > 2000 THEN RAISE EXCEPTION 'Invalid catalog'; END IF;
 PERFORM pg_advisory_xact_lock(871245);
 INSERT INTO public.channel_catalog_state(id,revision) VALUES(1,0) ON CONFLICT(id) DO NOTHING;
 SELECT revision INTO current_revision FROM public.channel_catalog_state WHERE id=1 FOR UPDATE;
 IF current_revision <> expected_revision THEN RAISE EXCEPTION 'Catalog changed; reload before saving'; END IF;
 IF EXISTS(SELECT 1 FROM public.channel_catalog_entries e WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(entries) i WHERE i->'channel'->>'id'=e.id)) THEN RAISE EXCEPTION 'Use soft deletion'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(entries) LOOP
 INSERT INTO public.channel_catalog_entries(id,channel,position,deleted) VALUES(item->'channel'->>'id', item->'channel', (item->>'position')::integer, (item->>'deleted')::boolean)
 ON CONFLICT(id) DO UPDATE SET channel=EXCLUDED.channel, position=EXCLUDED.position, deleted=EXCLUDED.deleted;
 END LOOP;
 UPDATE public.channel_catalog_state SET revision=revision+1 WHERE id=1;
 RETURN current_revision+1;
END $$;
REVOKE ALL ON FUNCTION public.save_channel_catalog(jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_channel_catalog(jsonb,integer) TO authenticated, service_role;