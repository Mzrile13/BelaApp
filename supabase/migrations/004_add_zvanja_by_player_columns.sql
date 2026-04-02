alter table if exists rounds
  add column if not exists zvanja_by_player_a jsonb not null default '[]'::jsonb,
  add column if not exists zvanja_by_player_b jsonb not null default '[]'::jsonb;
