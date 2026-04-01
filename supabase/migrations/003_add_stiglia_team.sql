alter table rounds
add column if not exists stiglia_team text
check (stiglia_team in ('A', 'B'));
