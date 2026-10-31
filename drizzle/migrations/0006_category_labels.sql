CREATE TABLE public.category_labels (
  key text PRIMARY KEY CHECK (key IN ('home','live','movies','series','news','sports','islamic','kids','general','movieChannels')),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 40),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX category_labels_label_unique ON public.category_labels (lower(btrim(label)));
GRANT SELECT ON public.category_labels TO anon, authenticated;
GRANT ALL ON public.category_labels TO service_role;
ALTER TABLE public.category_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY category_labels_read ON public.category_labels FOR SELECT TO anon, authenticated USING (true);