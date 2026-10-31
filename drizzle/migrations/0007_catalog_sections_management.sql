ALTER TABLE public.channel_catalog_state ADD COLUMN sections jsonb;
CREATE OR REPLACE FUNCTION public.save_catalog_with_sections(entries jsonb, sections jsonb, expected_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE next_revision integer;
BEGIN
 IF COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') <> 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(sections) <> 'array' OR jsonb_array_length(sections) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid sections'; END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(sections) s WHERE NOT (s->>'deleted')::boolean) THEN RAISE EXCEPTION 'Keep one section'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(entries) e WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(sections) s WHERE s->>'category'=e->'channel'->>'category' AND NOT (s->>'deleted')::boolean)) THEN RAISE EXCEPTION 'Channel section unavailable'; END IF;
 next_revision := public.save_channel_catalog(entries, expected_revision);
 UPDATE public.channel_catalog_state SET sections=save_catalog_with_sections.sections WHERE id=1;
 RETURN next_revision;
END $$;
REVOKE ALL ON FUNCTION public.save_catalog_with_sections(jsonb,jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_catalog_with_sections(jsonb,jsonb,integer) TO service_role;