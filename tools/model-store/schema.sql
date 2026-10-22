-- Model catalogue. One row per model (or loose reference image); the bytes live in R2.
create table if not exists model_assets (
  id             text primary key,             -- stable slug, /models/<id>
  name           text not null,
  kind           text not null,                -- building | character | gear | nature | prop | scenery | model | reference-image
  group_name     text,
  status         text,                         -- good | partial | weak
  match_score    real,                         -- outline overlap 0..1 against the source image
  source_path    text not null,                -- where it lives in evanrobinson2/abbiesworld_ios
  site_path      text,                         -- path the Ranch Atelier site serves it at, if any
  tree           text,                         -- branch it was read from
  sha256         text not null,
  bytes          integer,
  glb_url        text,
  ref_url        text,
  render_url     text,
  overlay_url    text,
  provenance_url text,
  source_image   text,
  showcase       boolean not null default false, -- shown on /models
  provenance     jsonb,
  page           jsonb,                        -- full /models record
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists model_assets_kind on model_assets (kind);
create index if not exists model_assets_site_path on model_assets (site_path);
create index if not exists model_assets_sha on model_assets (sha256);
