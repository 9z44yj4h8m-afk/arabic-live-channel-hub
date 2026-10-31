ALTER TABLE public.xtream_items ADD COLUMN IF NOT EXISTS extension text NOT NULL DEFAULT 'mp4';
CREATE OR REPLACE FUNCTION public.save_xtream_connection(ciphertext text, expected_revision integer) RETURNS integer LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v integer;
BEGIN
IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
PERFORM pg_advisory_xact_lock(871247);
SELECT revision INTO v FROM public.xtream_connections WHERE id=1 FOR UPDATE;
IF coalesce(v,0) <> expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
INSERT INTO public.xtream_connections(id,encrypted_credentials,revision) VALUES(1,ciphertext,expected_revision+1) ON CONFLICT(id) DO UPDATE SET encrypted_credentials=excluded.encrypted_credentials,revision=excluded.revision,updated_at=now();
RETURN expected_revision+1;
END $$;
REVOKE ALL ON FUNCTION public.save_xtream_connection(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_xtream_connection(text,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.sync_xtream_items(payload jsonb, target_kind text, target_parent text, expected_revision integer) RETURNS integer LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v integer;
BEGIN
IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
IF target_kind NOT IN ('live','movie','series','episode') OR jsonb_typeof(payload) <> 'array' OR jsonb_array_length(payload)>20000 THEN RAISE EXCEPTION 'Invalid payload'; END IF;
PERFORM pg_advisory_xact_lock(871247);
SELECT revision INTO v FROM public.xtream_connections WHERE id=1 FOR UPDATE;
IF v IS NULL OR v<>expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
UPDATE public.xtream_items SET deleted=true WHERE kind=target_kind AND parent_id=target_parent;
INSERT INTO public.xtream_items(kind,remote_id,parent_id,name,category,position,season,episode,extension)
SELECT target_kind,x->>'remote_id',target_parent,x->>'name',coalesce(x->>'category',''),(x->>'position')::integer,coalesce((x->>'season')::integer,0),coalesce((x->>'episode')::integer,0),coalesce(x->>'extension','mp4') FROM jsonb_array_elements(payload) x
ON CONFLICT(kind,remote_id,parent_id) DO UPDATE SET name=excluded.name,category=excluded.category,position=excluded.position,season=excluded.season,episode=excluded.episode,extension=excluded.extension,deleted=false,updated_at=now();
UPDATE public.xtream_connections SET revision=revision+1,updated_at=now() WHERE id=1 RETURNING revision INTO v;
RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.sync_xtream_items(jsonb,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_xtream_items(jsonb,text,text,integer) TO service_role;