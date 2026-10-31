CREATE TABLE public.xtream_connections (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), encrypted_credentials text NOT NULL, revision integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.xtream_connections TO service_role;
ALTER TABLE public.xtream_connections ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.xtream_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK (kind IN ('live','movie','series','episode')), remote_id text NOT NULL, parent_id text NOT NULL DEFAULT '', name text NOT NULL, category text NOT NULL DEFAULT '', position integer NOT NULL DEFAULT 0, season integer NOT NULL DEFAULT 0, episode integer NOT NULL DEFAULT 0, hidden boolean NOT NULL DEFAULT false, deleted boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,remote_id,parent_id));
GRANT ALL ON public.xtream_items TO service_role;
ALTER TABLE public.xtream_items ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.sync_xtream_items(payload jsonb, target_kind text, target_parent text, expected_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_revision integer;
BEGIN
 IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF target_kind NOT IN ('live','movie','series','episode') OR jsonb_typeof(payload) <> 'array' OR jsonb_array_length(payload) > 20000 THEN RAISE EXCEPTION 'Invalid payload'; END IF;
 PERFORM pg_advisory_xact_lock(871247);
 SELECT revision INTO current_revision FROM public.xtream_connections WHERE id=1 FOR UPDATE;
 IF current_revision IS NULL OR current_revision <> expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 UPDATE public.xtream_items SET deleted=true WHERE kind=target_kind AND parent_id=target_parent;
 INSERT INTO public.xtream_items(kind,remote_id,parent_id,name,category,position,season,episode)
 SELECT target_kind, x->>'remote_id', target_parent, x->>'name', coalesce(x->>'category',''), (x->>'position')::integer, coalesce((x->>'season')::integer,0), coalesce((x->>'episode')::integer,0) FROM jsonb_array_elements(payload) x
 ON CONFLICT(kind,remote_id,parent_id) DO UPDATE SET name=excluded.name,category=excluded.category,season=excluded.season,episode=excluded.episode,deleted=false,updated_at=now();
 UPDATE public.xtream_connections SET revision=revision+1,updated_at=now() WHERE id=1 RETURNING revision INTO current_revision;
 RETURN current_revision;
END $$;
REVOKE ALL ON FUNCTION public.sync_xtream_items(jsonb,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_xtream_items(jsonb,text,text,integer) TO service_role;