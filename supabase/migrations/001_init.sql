create extension if not exists pgcrypto;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  dealer_player_id uuid not null references players(id),
  teams jsonb not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  round_number int not null,
  caller_player_id uuid not null references players(id),
  called_suit text not null check (called_suit in ('karo', 'herc', 'pik', 'tref')),
  calling_team text not null check (calling_team in ('A', 'B')),
  points_team_a int not null,
  points_team_b int not null,
  zvanja_team_a int not null default 0,
  zvanja_team_b int not null default 0,
  zvanja_player_id_a uuid references players(id),
  zvanja_player_id_b uuid references players(id),
  caller_succeeded boolean not null,
  created_at timestamptz not null default now(),
  unique (game_id, round_number)
);

create index if not exists idx_rounds_game_id on rounds(game_id);
create index if not exists idx_rounds_caller on rounds(caller_player_id);
