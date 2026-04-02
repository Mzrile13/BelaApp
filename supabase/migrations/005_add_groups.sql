create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists group_players (
  group_id uuid not null references groups(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, player_id)
);

create index if not exists idx_group_players_group_id on group_players(group_id);
create index if not exists idx_group_players_player_id on group_players(player_id);
