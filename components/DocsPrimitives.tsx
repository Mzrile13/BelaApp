import type { ReactNode } from "react";

/**
 * Gradivni elementi stranice s informacijama. Namjerno bez kartica oko svake
 * natuknice — hijerarhiju nose tanke linije, a puna ploha je rezervirana za
 * formule, da se u dugom tekstu odmah vidi gdje je račun.
 */

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-4 px-[18px] py-[18px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#8fa89b]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-[19px] font-extrabold text-balance text-[#f7fbf6]">{title}</h2>
      <div className="mt-3.5 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 text-[13.5px] leading-[1.65] text-[#a9c2b3]">
      {children}
    </div>
  );
}

export function Formula({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border-l-2 border-[#c9d9a0] bg-[rgba(6,20,16,0.55)] px-3.5 py-3">
      {label ? (
        <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8fa89b]">
          {label}
        </p>
      ) : null}
      <pre className="font-mono text-[12px] leading-[1.7] whitespace-pre text-[#eef3ee]">
        {children}
      </pre>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[rgba(169,194,179,0.15)] px-2 py-[3px] text-[10px] font-semibold text-[#a9c2b3]">
      {children}
    </span>
  );
}

/**
 * Jedna statistika. Svaka natuknica ima isti raspored — naziv, oznake, što
 * mjeri, kako se računa, kako se čita — pa se mogu uspoređivati okom.
 */
export function StatEntry({
  name,
  chips,
  children,
  formula,
  reading,
}: {
  name: string;
  chips?: string[];
  children: ReactNode;
  formula?: ReactNode;
  reading?: ReactNode;
}) {
  return (
    <article className="border-t border-[rgba(255,255,255,0.07)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-[14px] font-bold text-[#f2f5f0]">{name}</h3>
        {chips?.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      <p className="mt-1 text-[13px] leading-[1.6] text-[#a9c2b3]">{children}</p>
      {formula ? <div className="mt-2">{formula}</div> : null}
      {reading ? (
        <p className="mt-2 border-l-2 border-[rgba(201,217,160,0.35)] pl-2.5 text-[12.5px] leading-[1.55] text-[#8fa89b]">
          <b className="font-semibold text-[#c9d9a0]">Kako čitati: </b>
          {reading}
        </p>
      ) : null}
    </article>
  );
}

export function DataTable({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: Array<Array<string | ReactNode>>;
  caption?: string;
}) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="overflow-x-auto rounded-[12px] bg-[rgba(6,20,16,0.45)]">
        <table className="w-full border-collapse text-[12.5px] tabular-nums">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`whitespace-nowrap border-b border-[rgba(255,255,255,0.08)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[#8fa89b] ${
                    index === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`whitespace-nowrap border-b border-[rgba(255,255,255,0.04)] px-3 py-[7px] ${
                      cellIndex === 0
                        ? "text-left font-semibold text-[#eef3ee]"
                        : "text-right text-[#a9c2b3]"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? <figcaption className="px-1 text-[11px] text-[#8fa89b]">{caption}</figcaption> : null}
    </figure>
  );
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-[12px] border border-[rgba(201,217,160,0.22)] bg-[rgba(201,217,160,0.07)] px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#c9d9a0]">{title}</p>
      <div className="mt-1.5 flex flex-col gap-2 text-[12.5px] leading-[1.6] text-[#a9c2b3]">
        {children}
      </div>
    </aside>
  );
}
