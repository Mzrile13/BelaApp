# Migracije

Nema Supabase CLI-ja ni psql-a na ovom stroju — sve se pušta ručno kroz
**Supabase dashboard → SQL Editor** (projekt `iknssbcvrtaigdfksjdv`).
U repou ništa ne prati koje su migracije primijenjene.

---

## Runbook: multi-tenancy (008 → 009)

Uvodi račune po grupi prijatelja. Redoslijed je cijeli mehanizam za uvođenje bez
pada — nemoj ga preskakati ni preslagivati.

> **Kod i baza su nesinkroni dok ne pustiš 008.** Novi kod filtrira po
> `account_id`, a taj stupac još ne postoji. Deploy prije koraka 2 obara
> aplikaciju u cijelosti. Isto vrijedi za lokalni `npm run dev` spojen na live
> bazu.

### Korak 1 — pre-flight (samo čitanje, ništa ne mijenja)

```sql
show server_version;                                   -- treba >= 11
select indexname from pg_indexes
 where schemaname = 'public' and tablename = 'games';  -- je li 006 primijenjen?
select count(*) from rounds r
  left join games g on g.id = r.game_id
 where g.id is null;                                   -- MORA biti 0
```

Ako `idx_games_created_at` nema u popisu, prvo pusti `006_perf_indexes.sql`
(idempotentan je).

### Korak 2 — pusti `008_accounts.sql`

Cijeli sadržaj datoteke u SQL Editor. Stvara `accounts`, dodaje `account_id` na
`players`/`games`/`rounds`/`groups` s privremenim `DEFAULT`-om na legacy račun,
prebacuje sve postojeće podatke na njega i mijenja globalne unique constrainte
per-account varijantama.

Stari deployani kod nakon ovoga **i dalje radi** — njegovi inserti nemaju
`account_id` pa padnu na DEFAULT.

### Korak 3 — postavi kredencijale legacy računa

Migracija 008 ubacuje račun s imenom `legacy-pending` i neupotrebljivim hashem `'!'`, da
prave kredencijale ne završe u gitu. Zamijeni ih:

```sql
update accounts
   set username = '<APP_USERNAME>',
       password_hash = '<pbkdf2$sha256$210000$...>'
 where id = '00000000-0000-0000-0000-000000000001';
```

Gotov SQL s već generiranim hashem trenutne lozinke stoji u
`korak3-kredencijali.local.sql` u korijenu projekta (gitignoriran preko
`*.local.sql`). Ako ga trebaš regenerirati — npr. jer mijenjaš lozinku:

```bash
node -e '
const c=require("crypto"),pw=process.argv[1],N=210000;
const s=c.randomBytes(16);
const h=c.pbkdf2Sync(pw,s,N,32,"sha256");
console.log(`pbkdf2$sha256$${N}$${s.toString("base64")}$${h.toString("base64")}`);
' "$APP_PASSWORD"
```

Ovo je ujedno i prilika da promijeniš lozinku — samo generiraj hash iz nove.
Registracija za nove račune traži barem 8 znakova.

Provjera:

```sql
select id, username, left(password_hash, 14) from accounts;
```

### Korak 4 — Vercel env varijable

Dodaj:

```
LEGACY_ACCOUNT_ID=00000000-0000-0000-0000-000000000001
```

Time stari session cookieji (oblik `<expiry>.<potpis>`, bez identiteta) i dalje
vrijede i mapiraju se na legacy račun — nitko se pri deployu ne odjavljuje.

`AUTH_SECRET` ostaje nepromijenjen. `APP_USERNAME` i `APP_PASSWORD` više se ne
čitaju iz koda; ostavi ih ili obriši, svejedno je.

### Korak 5 — deploy

Nakon deploya provjeri:
- prijava starim kredencijalima radi,
- naslovnica, leaderboard, povijest i postojeće partije prikazuju sve podatke,
- unos nove ruke prolazi.

Ako nešto ne valja — **samo vrati prethodni deploy**. Shema je kompatibilna u oba
smjera dok DEFAULT postoji.

### Korak 6 — pusti `009_accounts_enforce.sql`

Miče DEFAULT-e, briše indekse iz 006 koje su zamijenili per-account ekvivalenti i
briše dva mrtva pogleda iz 002. Sve je katalog-only, ispod milisekunde.

**Tek nakon ovog koraka registracija smije u promet.** Dok DEFAULT postoji, bilo
koji propust u kodu tiho zapiše tuđe podatke pod legacy račun; bez DEFAULT-a to
postaje glasan NOT NULL prekršaj.

### Korak 7 — završna provjera

```sql
select 'players' t, count(*) filter (where account_id is null) nulls from players
union all select 'games',  count(*) filter (where account_id is null) from games
union all select 'rounds', count(*) filter (where account_id is null) from rounds
union all select 'groups', count(*) filter (where account_id is null) from groups;
-- sve nule

select relname, relrowsecurity from pg_class
 where relname in ('accounts','players','games','rounds','groups','group_players');
-- relrowsecurity mora biti true za svih šest
```

Zatim registriraj probni račun i potvrdi da ne vidi tvoje igrače ni partije.

### Korak 8 — za ~30 dana

Kad svi stari cookieji isteknu: makni `LEGACY_ACCOUNT_ID` iz Vercela i legacy
granu iz `verifySessionToken()` u `utils/auth.ts`.

---

## Rollback

| Kad | Što |
|---|---|
| Nakon 008, prije deploya | `008_rollback.sql` |
| Nakon deploya, prije 009 | samo vrati prethodni deploy |
| Nakon 009 | **prvo** `009_rollback.sql`, **pa** redeploy starog builda |

Zadnji redak je bitan: staro izdanje ne šalje `account_id`, pa bez vraćenih
DEFAULT-a lupa u NOT NULL na svakom insertu i pretvara loš deploy u potpuni ispad.

**Točka bez povratka nije migracija nego prva registracija drugog računa.** Čim
dva računa dijele ime igrača, globalni `players_username_key` se više ne može
vratiti. Zato je registracija iza koraka 5.

---

## Lokalno testiranje bez diranja produkcije

Pokreni s praznim `SUPABASE_SERVICE_ROLE_KEY` — aplikacija tada pada na lokalni
file-fallback (`.data/`) umjesto na Supabase:

```bash
SUPABASE_SERVICE_ROLE_KEY="" npm run dev
```
