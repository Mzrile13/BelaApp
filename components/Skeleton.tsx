/**
 * Kostur za `loading.tsx` granice. Osim što daje trenutnu povratnu informaciju,
 * postojanje `loading.tsx` je uvjet da Next uopće prefetcha dinamičku rutu —
 * bez njega klik na link ne pokreće ništa dok server ne odgovori.
 */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-md bg-[rgba(169,194,179,0.16)] ${className}`}
    />
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[14px] bg-[rgba(6,20,16,0.45)] px-3.5 py-3"
        >
          <SkeletonLine className="h-[26px] w-[26px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-3 w-2/5" />
            <SkeletonLine className="h-2.5 w-3/5" />
          </div>
          <SkeletonLine className="h-6 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <section key={index} className="card space-y-2.5 p-4">
          <SkeletonLine className="h-3.5 w-1/3" />
          <SkeletonLine className="h-14 w-full rounded-[14px]" />
        </section>
      ))}
    </div>
  );
}

/** Zajednički okvir: naslov stranice + sadržaj. */
export function SkeletonPage({
  titleWidth = "w-40",
  children,
}: {
  titleWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20" aria-busy="true">
      <SkeletonLine className={`mb-4 h-7 ${titleWidth}`} />
      {children}
    </main>
  );
}
