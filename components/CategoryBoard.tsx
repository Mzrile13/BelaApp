import Link from "next/link";

export interface CategoryEntry {
  key: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}

/**
 * Jedna mala ljestvica. Kategorije se namjerno ne zbrajaju u jedan rezultat —
 * spajanje nekoliko koreliranih metrika u "MVP" je bilo upravo ono što je stari
 * sustav radio krivo.
 */
export function CategoryBoard({
  title,
  description,
  entries,
  limit = 5,
}: {
  title: string;
  description: string;
  entries: CategoryEntry[];
  limit?: number;
}) {
  const shown = entries.slice(0, limit);

  return (
    <section className="rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-3.5">
      <h2 className="text-[14px] font-bold text-[#f7fbf6]">{title}</h2>
      <p className="mt-0.5 text-[10.5px] leading-snug text-[#8fa89b]">{description}</p>

      {shown.length === 0 ? (
        <p className="mt-2.5 text-[11.5px] text-[#8fa89b]">Još nema dovoljno podataka.</p>
      ) : (
        <ol className="mt-2.5 space-y-1">
          {shown.map((entry, index) => {
            const inner = (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-3 shrink-0 text-[10.5px] font-bold text-[#8fa89b]">
                    {index + 1}
                  </span>
                  <span className="truncate text-[12.5px] font-semibold text-[#eef3ee]">
                    {entry.label}
                  </span>
                  {entry.hint ? (
                    <span className="shrink-0 text-[10.5px] text-[#8fa89b]">{entry.hint}</span>
                  ) : null}
                </span>
                <b className="shrink-0 pl-2 text-[12.5px] font-bold text-[#c9d9a0]">
                  {entry.value}
                </b>
              </>
            );

            return entry.href ? (
              <Link
                key={entry.key}
                href={entry.href}
                className="flex items-center justify-between rounded-[10px] bg-[rgba(6,20,16,0.45)] px-2.5 py-[7px]"
              >
                {inner}
              </Link>
            ) : (
              <li
                key={entry.key}
                className="flex items-center justify-between rounded-[10px] bg-[rgba(6,20,16,0.45)] px-2.5 py-[7px]"
              >
                {inner}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
