-- Sound catalogue. One row per game-ready sound; the bytes live in R2 (sounds/blobs/...).
-- Same conventions as model_assets (tools/model-store/schema.sql) so the two can later be served as one
-- asset catalogue: id, name, kind, group_name, urls, sha256, bytes, provenance and the full page record.
create table if not exists sound_assets (
  id           text primary key,              -- /sounds/<id>
  slot         text not null,                 -- library slot (tools/sound-engineer/library.mjs)
  name         text not null,
  kind         text not null,                 -- ambience | animal | effect | ui | music
  group_name   text,
  loop         boolean not null default false,
  audio_url    text,
  duration     real,
  loudness     real,                          -- integrated LUFS after levelling
  peak         real,                          -- true peak dBTP
  channels     smallint,
  sha256       text not null,
  bytes        integer,
  source_path  text,                          -- the file inside its Sonniss bundle zip
  source_part  text,                          -- e.g. gdc2024/3
  license      text not null default 'sonniss-gdc',
  uses         text[],
  provenance   jsonb,                         -- source, recipe, candidates, notes
  page         jsonb,                         -- full /sounds record
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists sound_assets_kind on sound_assets (kind);
create index if not exists sound_assets_slot on sound_assets (slot);
