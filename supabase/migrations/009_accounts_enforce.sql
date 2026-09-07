-- =====================================================================
-- Multi-tenancy, FAZA 2 ("contract").
--
-- Pušta se TEK kad je novi kod deployan i provjeren. Sve je ovdje samo
-- katalog: bez skeniranja tablica, bez prepisivanja, ispod milisekunde.
--
-- Nakon ovoga stari build više ne može pisati — i to je cilj: dok DEFAULT
-- postoji, bug koji zaboravi account_id tiho zapiše tuđe podatke pod legacy
-- račun. DROP DEFAULT tu klasu grešaka pretvara iz tihog curenja u glasan
-- NOT NULL prekršaj.
--
-- VAŽNO: registraciju novih računa pustiti u promet tek nakon ove migracije.
-- =====================================================================

set lock_timeout = '3s';

alter table players alter column account_id drop default;
alter table games   alter column account_id drop default;
alter table rounds  alter column account_id drop default;
alter table groups  alter column account_id drop default;

-- Zamijenjeni (account_id, created_at desc) ekvivalentima iz 008.
drop index if exists idx_games_created_at;
drop index if exists idx_games_finished_created;

-- Mrtav kod: pogledi iz 002 se ne referenciraju nigdje u TS-u (statistika ide
-- kroz lib/stats.ts), a agregiraju preko SVIH partija i igrača bez ikakve
-- granice računa — latentno cross-account curenje čim ih netko upotrijebi.
-- Ovisni pogled ide prvi.
drop view if exists player_aggregate_stats;
drop view if exists player_round_stats;
