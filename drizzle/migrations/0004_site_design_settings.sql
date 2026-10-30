CREATE TABLE public.site_design_settings (
  id text PRIMARY KEY CHECK (id IN ('draft','published')),
  config jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_design_settings TO anon, authenticated;
GRANT ALL ON public.site_design_settings TO service_role;
ALTER TABLE public.site_design_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY published_design_read ON public.site_design_settings FOR SELECT TO anon, authenticated USING (id = 'published');
CREATE FUNCTION public.save_site_design(payload jsonb, expected_revision integer, publish boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_revision integer; next_revision integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM pg_advisory_xact_lock(871246);
  SELECT revision INTO current_revision FROM public.site_design_settings WHERE id = 'draft';
  current_revision := coalesce(current_revision, 0);
  IF current_revision <> expected_revision THEN RAISE EXCEPTION 'Design changed in another session'; END IF;
  next_revision := current_revision + 1;
  INSERT INTO public.site_design_settings (id, config, revision) VALUES ('draft', payload, next_revision)
  ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, revision = EXCLUDED.revision, updated_at = now();
  IF publish THEN
    INSERT INTO public.site_design_settings (id, config, revision) VALUES ('published', payload, next_revision)
    ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, revision = EXCLUDED.revision, updated_at = now();
  END IF;
  RETURN next_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.save_site_design(jsonb, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_site_design(jsonb, integer, boolean) TO service_role;