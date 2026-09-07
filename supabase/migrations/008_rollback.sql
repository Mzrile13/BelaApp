-- Rollback za 008_accounts.sql. Pustiti SAMO dok postoji jedino legacy račun.
-- Čim se registrira drugi račun i dva računa dijele ime igrača, globalni
-- players_username_key se više ne može vratiti.
--
-- Bez gubitka podataka: svaki obrisani stupac držao je jednu te istu konstantu,
-- a stari build ga nikad nije čitao.

set lock_timeout = '3s';

alter table rounds  drop constraint if exists rounds_game_id_account_id_fkey;
alter table players drop constraint if exists players_account_id_fkey;
alter table games   drop constraint if exists games_account_id_fkey;
alter table groups  drop constraint if exists groups_account_id_fkey;

alter table games drop constraint if exists games_id_account_id_key;

-- Globalni unique se vraća PRIJE brisanja per-account varijanti.
alter table players add constraint players_username_key unique (username);
alter table groups  add constraint groups_name_key      unique (name);
drop index if exists players_account_id_username_key;
drop index if exists groups_account_id_name_key;

drop index if exists idx_games_account_created;
drop index if exists idx_games_account_finished_created;

alter table players drop column if exists account_id;
alter table games   drop column if exists account_id;
alter table rounds  drop column if exists account_id;
alter table groups  drop column if exists account_id;

drop table if exists accounts;
