-- Performance indexes for recency ordering and finished-game pagination.
-- rounds(game_id) already has idx_rounds_game_id from 001_init.sql.

-- Ordering all games by recency (history first page, listGames).
create index if not exists idx_games_created_at
  on games (created_at desc);

-- Paginating finished games by recency (server-side history pagination).
create index if not exists idx_games_finished_created
  on games (created_at desc)
  where finished_at is not null;
