-- Uključi RLS na svim tablicama. Namjerno BEZ policy-ja → anon/publishable
-- ključ ne dobiva pristup; samo service_role (server) prolazi kroz RLS.
alter table players       enable row level security;
alter table games         enable row level security;
alter table rounds        enable row level security;
alter table groups        enable row level security;
alter table group_players enable row level security;

-- View-ovi se izvršavaju s ovlastima vlasnika, pa im moramo maknuti pristup
-- za javne role zasebno (inače bi anon čitao tablice kroz njih).
revoke all on player_round_stats     from anon, authenticated;
revoke all on player_aggregate_stats from anon, authenticated;

-- Pojas i tregeri: makni i direktne grantove na tablice s javnih rola.
revoke all on players       from anon, authenticated;
revoke all on games         from anon, authenticated;
revoke all on rounds        from anon, authenticated;
revoke all on groups        from anon, authenticated;
revoke all on group_players from anon, authenticated;
