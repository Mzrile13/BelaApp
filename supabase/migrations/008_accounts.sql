-- =====================================================================
-- Multi-tenancy, FAZA 1 (aditivna / "expand").
--
-- Pušta se PRIJE deploya novog koda. Stari deployani kod ne šalje account_id,
-- pa svaki account_id stupac dobiva DEFAULT = legacy račun: njegovi inserti i
-- dalje prolaze i završe kod postojeće grupe. Default se miče u 009.
--
-- Idempotentno; može se ponoviti.
-- =====================================================================

-- ACCESS EXCLUSIVE zahtjev koji ne može odmah dobiti lock staje u red ISPRED
-- svih idućih čitatelja — jedan dugi SELECT bi tako srušio cijelu stranicu.
-- Uz lock_timeout migracija radije padne i rollbacka se, pa se samo ponovi.
set lock_timeout = '3s';
set statement_timeout = '60s';

-- Legacy račun ima fiksni id da DEFAULT-ovi ispod budu obične konstante i da
-- rollback skripta bude statična.
--   00000000-0000-0000-0000-000000000001 = račun s postojećim podacima

-- ---------------------------------------------------------------------
-- 1. accounts
-- ---------------------------------------------------------------------
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text not null check (char_length(username) between 1 and 64),
  -- Generirani stupac: PostgREST ne zna filtrirati po lower(username), pa
  -- prijava radi indeksirani .eq("username_lc", unos.toLowerCase()).
  -- NIKAD se ne šalje u insertu.
  username_lc   text generated always as (lower(username)) stored,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create unique index if not exists accounts_username_lc_key on accounts (username_lc);

-- Supabase novim tablicama u public shemi po defaultu daje grantove anon i
-- authenticated rolama. Bez ovoga bi publishable ključ mogao čitati hasheve
-- lozinki. Isti obrazac kao 007_enable_rls.sql.
alter table accounts enable row level security;   -- RLS uključen, nula politika
revoke all on accounts from anon, authenticated;

-- Legacy račun. Username i hash su namjerno placeholderi: '!' nije parsabilan
-- hash pa se ovim retkom nitko ne može prijaviti dok vlasnik ne pusti
-- jednokratni UPDATE iz runbooka. Fail-closed, a prave kredencijale drži izvan
-- repozitorija.
insert into accounts (id, username, password_hash)
values ('00000000-0000-0000-0000-000000000001', 'legacy-pending', '!')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. account_id stupci
--    dodavanje -> default -> backfill -> not null, sve u jednom prolazu, pa
--    ne postoji trenutak u kojem bi insert mogao ostaviti NULL.
--    NOT NULL smije ovdje jer default pokriva stari kod.
-- ---------------------------------------------------------------------
alter table players add column if not exists account_id uuid;
alter table games   add column if not exists account_id uuid;
alter table rounds  add column if not exists account_id uuid;
alter table groups  add column if not exists account_id uuid;

alter table players alter column account_id set default '00000000-0000-0000-0000-000000000001';
alter table games   alter column account_id set default '00000000-0000-0000-0000-000000000001';
alter table rounds  alter column account_id set default '00000000-0000-0000-0000-000000000001';
alter table groups  alter column account_id set default '00000000-0000-0000-0000-000000000001';

update players set account_id = '00000000-0000-0000-0000-000000000001' where account_id is null;
update games   set account_id = '00000000-0000-0000-0000-000000000001' where account_id is null;
update groups  set account_id = '00000000-0000-0000-0000-000000000001' where account_id is null;

-- Runda uvijek nasljeđuje račun svoje partije, ne konstantu — tako je izraz
-- točan i ako se 008 ikad ponovi kad već postoji više računa.
update rounds r
   set account_id = g.account_id
  from games g
 where g.id = r.game_id
   and r.account_id is distinct from g.account_id;

alter table players alter column account_id set not null;
alter table games   alter column account_id set not null;
alter table rounds  alter column account_id set not null;
alter table groups  alter column account_id set not null;

-- ---------------------------------------------------------------------
-- 3. Globalni unique -> per-account.
--    Novi indeks se radi PRVI, stari se briše DRUGI, pa ne postoji ni
--    mikrosekunda u kojoj bi duplikat mogao proći.
--    Ostaje case-sensitive, točno kako je i dosad bilo u bazi — tako
--    migracija ne može pasti na postojećim podacima.
-- ---------------------------------------------------------------------
create unique index if not exists players_account_id_username_key
  on players (account_id, username);
create unique index if not exists groups_account_id_name_key
  on groups (account_id, name);

-- Postgres iz 001/005 generira imena players_username_key i groups_name_key,
-- ali brišemo po obliku (jednostupčani unique), neovisno o imenu.
do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
      from pg_constraint
     where contype = 'u'
       and conrelid in ('players'::regclass, 'groups'::regclass)
       and array_length(conkey, 1) = 1
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. Mete za složene (tenant-safe) strane ključeve.
--    id je već PK, ali Postgres traži unique baš nad (id, account_id) da bi
--    složeni FK mogao pokazivati na te stupce.
-- ---------------------------------------------------------------------
do $$ begin
  alter table games add constraint games_id_account_id_key unique (id, account_id);
exception when duplicate_table or duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 5. Strani ključevi.
--    ON DELETE RESTRICT: brisanje računa mora biti svjestan čin, a ne kaskada
--    koja tiho obriše cijelu sezonu partija.
-- ---------------------------------------------------------------------
do $$ begin
  alter table players add constraint players_account_id_fkey
    foreign key (account_id) references accounts(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table games add constraint games_account_id_fkey
    foreign key (account_id) references accounts(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table groups add constraint groups_account_id_fkey
    foreign key (account_id) references accounts(id) on delete restrict;
exception when duplicate_object then null; end $$;

-- rounds NEMA izravan FK na accounts. Umjesto toga složeni FK na games čini
-- strukturno nemogućim da se account_id runde raziđe s računom njezine
-- partije, a postojanje računa jamči tranzitivno preko games.account_id.
do $$ begin
  alter table rounds add constraint rounds_game_id_account_id_fkey
    foreign key (game_id, account_id) references games (id, account_id)
    on update cascade on delete cascade;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 6. Indeksi za novi filter.
--    Stari globalni indeksi iz 006 se ovdje NE brišu — stari build još vrti
--    upite koji ih koriste. Njih miče 009.
-- ---------------------------------------------------------------------
create index if not exists idx_games_account_created
  on games (account_id, created_at desc);
create index if not exists idx_games_account_finished_created
  on games (account_id, created_at desc)
  where finished_at is not null;

-- players/groups: per-account unique indeksi odozgo služe i za uvjet
-- "where account_id = $1 order by username/name", što je točno ono što rade
-- listPlayers()/listGroups(). Dodatni indeks nije potreban.
-- rounds: idx_rounds_game_id (iz 001) ostaje pristupni put; filter po
-- account_id je jeftina provjera nad ionako malim rezultatom.
