CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_role_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE TABLE public.channel_catalog_state (id integer PRIMARY KEY DEFAULT 1 CHECK(id = 1), revision integer NOT NULL DEFAULT 0);
GRANT SELECT ON public.channel_catalog_state TO anon, authenticated;
GRANT INSERT, UPDATE ON public.channel_catalog_state TO authenticated;
GRANT ALL ON public.channel_catalog_state TO service_role;
ALTER TABLE public.channel_catalog_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY state_read ON public.channel_catalog_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY state_admin_insert ON public.channel_catalog_state FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(), 'admin'));
CREATE POLICY state_admin_update ON public.channel_catalog_state FOR UPDATE TO authenticated USING(public.has_role(auth.uid(), 'admin')) WITH CHECK(public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.channel_catalog_entries (id text PRIMARY KEY, channel jsonb NOT NULL, position integer NOT NULL, deleted boolean NOT NULL DEFAULT false);
GRANT SELECT ON public.channel_catalog_entries TO anon, authenticated;
GRANT INSERT, UPDATE ON public.channel_catalog_entries TO authenticated;
GRANT ALL ON public.channel_catalog_entries TO service_role;
ALTER TABLE public.channel_catalog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY active_channel_read ON public.channel_catalog_entries FOR SELECT TO anon, authenticated USING (NOT deleted);
CREATE POLICY admin_channel_read ON public.channel_catalog_entries FOR SELECT TO authenticated USING(public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_channel_insert ON public.channel_catalog_entries FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(), 'admin'));
CREATE POLICY admin_channel_update ON public.channel_catalog_entries FOR UPDATE TO authenticated USING(public.has_role(auth.uid(), 'admin')) WITH CHECK(public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.save_channel_catalog(entries jsonb, expected_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_revision integer; item jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
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
GRANT EXECUTE ON FUNCTION public.save_channel_catalog(jsonb,integer) TO authenticated;
