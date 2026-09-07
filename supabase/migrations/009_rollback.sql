-- Rollback za 009_accounts_enforce.sql — vraća DEFAULT-e.
--
-- Ako se vraća i stari build: PRVO ovo, PA redeploy. Obrnuto stari kod lupa u
-- NOT NULL na svakom insertu.

set lock_timeout = '3s';

alter table players alter column account_id set default '00000000-0000-0000-0000-000000000001';
alter table games   alter column account_id set default '00000000-0000-0000-0000-000000000001';
alter table rounds  alter column account_id set default '00000000-0000-0000-0000-000000000001';
alter table groups  alter column account_id set default '00000000-0000-0000-0000-000000000001';

create index if not exists idx_games_created_at on games (created_at desc);
create index if not exists idx_games_finished_created
  on games (created_at desc) where finished_at is not null;

-- Za poglede: ponovno pustiti tijelo 002_stats_views.sql, pa
--   revoke all on player_round_stats, player_aggregate_stats from anon, authenticated;
