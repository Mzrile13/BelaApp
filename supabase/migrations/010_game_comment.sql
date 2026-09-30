-- Kratki komentar/opis završene partije. Nullable, bez defaulta — aditivna
-- migracija: stari build je ne dira, a novi kod čita komentar zasebnim upitom
-- pa deploy prije migracije ne ruši ostale stranice.
alter table games
add column if not exists comment text
check (comment is null or char_length(comment) <= 500);
