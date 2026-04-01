# Bela Tracker

Mobile-first web aplikacija za praćenje rezultata i statistike belot igre.

## Što aplikacija prati

- igrače po `username`
- partije (4 igrača, timovi i prvi djelitelj)
- unos svake ruke: bodovi, zvanja i tko je zvao
- napredne metrike po igraču:
  - prosjeci bodova/zvanja
  - caller prolaznost
  - trend forme (L5/L10)
  - consistency indeks, clutch indeks
  - partner impact i MVP score
- statistiku parova i leaderboard

## Getting Started

1. Instaliraj dependencije:

```bash
npm install
```

2. Pokreni development server:

```bash
npm run dev
```

3. Otvori [http://localhost:3000](http://localhost:3000).

## Supabase (opcionalno)

- kopiraj `.env.example` u `.env.local`
- postavi:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- pokreni SQL migracije iz `supabase/migrations`

Ako env varijable nisu postavljene, aplikacija koristi in-memory repozitorij (za lokalni demo/test).

## Testiranje

```bash
npm run test
npm run lint
```

