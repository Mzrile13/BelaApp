import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Callout, DataTable, Prose, Section, StatEntry } from "@/components/DocsPrimitives";

export const metadata: Metadata = {
  title: "Upute — Bela Tracker",
  description: "Kako pokrenuti partiju, upisati ruku i snaći se u statistikama.",
};

const CONTENTS = [
  ["pocetak", "Prvi koraci"],
  ["nova-partija", "Nova partija"],
  ["unos-ruke", "Unos ruke"],
  ["bodovanje", "Kako se boduje"],
  ["tijek", "Tijek partije"],
  ["kraj", "Kraj partije"],
  ["povijest", "Povijest"],
  ["statistike", "Ljestvice i sezona"],
  ["racun", "Račun i aplikacija"],
] as const;

const b = "font-semibold text-ink";

export default function UputePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 pb-20">
      <BackButton fallbackHref="/" className="self-start" />

      <header className="card px-[18px] py-[18px]">
        <h1 className="text-[24px] font-extrabold text-balance text-heading">
          Kako se koristi aplikacija
        </h1>
        <p className="mt-2 text-[13.5px] leading-[1.65] text-subtle">
          Bela Tracker vodi rezultat partije umjesto papira i iz svake odigrane ruke
          slaže statistike. Jedan od igrača za stolom upisuje ruke na mobitelu, sve
          ostalo aplikacija računa sama.
        </p>
        <nav className="mt-3.5 grid grid-cols-2 gap-1.5">
          {CONTENTS.map(([id, label], index) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 rounded-[10px] bg-well/45 px-2.5 py-2 text-[12px] font-semibold text-soft"
            >
              <span className="text-[11px] font-bold tabular-nums text-muted">
                {index + 1}
              </span>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="pocetak" eyebrow="Za početak" title="Prvi koraci">
        <Prose>
          <p>
            Račun pripada <b className={b}>cijelom društvu</b>, ne pojedincu. Svi koji
            igraju zajedno koriste istu prijavu, pa svatko može upisivati partije i
            gledati iste statistike. Igrači unutar računa su samo imena — oni nemaju
            svoje lozinke.
          </p>
          <p>
            Na dnu ekrana je glavna navigacija: <b className={b}>Početna</b>,{" "}
            <b className={b}>Ljestvica</b>, istaknuti gumb <b className={b}>+ Nova</b>{" "}
            za novu partiju, <b className={b}>Sezona</b> i <b className={b}>Povijest</b>.
          </p>
        </Prose>
      </Section>

      <Section id="nova-partija" eyebrow="Gumb + Nova" title="Nova partija">
        <StatEntry name="Korak 1 · Grupa">
          Grupa je društvo s kojim obično igraš, npr. „Petkom kod Ive”. Odaberi
          postojeću grupu ili napravi novu gumbom Nova grupa. U polje{" "}
          <i>Dodaj igrača</i> upiši ime: ako igrač već postoji, ponudit će se, a ako ne
          postoji, napravit će se novi. Grupa treba barem četiri igrača. Grupu možeš
          preimenovati ili obrisati, a igrača maknuti iz nje — njegove odigrane partije
          time se ne brišu.
        </StatEntry>

        <StatEntry
          name="Korak 2 · Postava"
          reading={
            <>
              Djelitelj se nakon toga mijenja sam, ruku po ruku, pa ga u partiji više
              ne treba birati.
            </>
          }
        >
          Rasporedi četiri igrača u Tim A i Tim B: dodirni prazno mjesto pa igrača s
          popisa. Dodir na popunjeno mjesto ga oslobađa. Na kraju odaberi tko{" "}
          <b className={b}>prvi dijeli</b> i dodirni Pokreni partiju.
        </StatEntry>

        <Callout title="Igrači koji sjede jedan nasuprot drugome su par">
          <p>
            U isti tim stavi dvojicu koji igraju zajedno. Statistike parova i rejting
            ovise o tome, pa krivo složen tim kvari brojke za svu četvoricu.
          </p>
        </Callout>
      </Section>

      <Section id="unos-ruke" eyebrow="Nakon svakog dijeljenja" title="Unos ruke">
        <Prose>
          <p>
            Na ekranu partije dodirni <b className={b}>Unesi novu ruku</b>. Unos ima tri
            koraka, a gumb Spremi ruku je uvijek na dnu ekrana.
          </p>
        </Prose>

        <StatEntry name="1 · Tko je zvao i koji znak">
          Dodirni igrača koji je zvao adut, pa znak: karo, herc, pik ili tref. Zvač je
          važan — po njemu se određuje je li tim prošao ili pao.
        </StatEntry>

        <StatEntry
          name="2 · Zvanja"
          reading={
            <>
              Zvanja se upisuju po igraču, ne po timu, jer se iz njih računa osobna
              statistika zvanja.
            </>
          }
        >
          Dodirni igrača koji je zvao, pa vrijednost: +20, +50 ili +100 mogu se
          dodati više puta (npr. dva terca = dva puta +20), a +150 i +200 se
          uključuju i isključuju. Reset briše zvanja odabranog igrača. Belu upiši kao
          +20.
        </StatEntry>

        <StatEntry
          name="3 · Bodovi iz čiste igre"
          reading={
            <>
              Upisuju se samo bodovi iz štihova, <b className={b}>bez zvanja</b>. Zbroj
              mora biti točno 162, inače se ruka ne može spremiti.
            </>
          }
        >
          Dodirni polje jednog tima i tipkovnicom upiši njegove bodove — drugi tim se
          sam nadopuni do 162. Ako je jedan tim pokupio sve štihove, odaberi njegovo
          polje i dodirni <b className={b}>Štiglja +90</b>.
        </StatEntry>

        <Callout title="Krivo upisana ruka">
          <p>
            Na ekranu partije, u popisu ruku ispod rezultata, svaka ruka ima gumb{" "}
            <b className={b}>Uredi</b>. Ispravak se odmah provuče kroz rezultat i sve
            statistike.
          </p>
        </Callout>
      </Section>

      <Section id="bodovanje" eyebrow="Što aplikacija računa sama" title="Kako se boduje">
        <Prose>
          <p>
            Ne treba ništa zbrajati ručno. Za svaku ruku aplikacija zbroji čistu igru,
            zvanja i štiglju te odluči je li zvač prošao.
          </p>
        </Prose>

        <DataTable
          columns={["Situacija", "Ishod"]}
          rows={[
            ["Zvač ima više od pola svih bodova", "prošao — svaki tim piše svoje"],
            ["Zvač ima pola ili manje", "pao — sve ide protivnicima"],
            ["Štiglja", "+90 i sva zvanja oba tima idu timu sa štigljom"],
          ]}
          caption="„Svi bodovi” znači čista igra + zvanja + štiglja oba tima zajedno."
        />

        <StatEntry name="Primjer">
          Tim A zove, ima 70 iz igre i terc od 20, ukupno 90. Tim B ima 92 i nema
          zvanja. Svih bodova je 182, pola je 91 — Tim A ima 90, dakle pao je, i Tim B
          piše svih 182.
        </StatEntry>
      </Section>

      <Section id="tijek" eyebrow="Ekran partije" title="Tijek partije">
        <Prose>
          <p>
            Na vrhu je ukupni rezultat oba tima i ime igrača koji{" "}
            <b className={b}>sljedeći dijeli</b>. Ispod je popis svih ruku s
            međurezultatom nakon svake.
          </p>
          <p>
            Partija ostaje spremljena i kad zatvoriš aplikaciju. Na početnoj se tada
            pojavi gumb <b className={b}>Nastavi partiju</b> koji vodi na popis aktivnih
            partija. Tamo se nedovršena partija može i obrisati — završena se ne može.
          </p>
        </Prose>
      </Section>

      <Section id="kraj" eyebrow="1001" title="Kraj partije">
        <Prose>
          <p>
            Partija završava sama čim neki tim dođe do <b className={b}>1001</b>. Ako
            oba prijeđu u istoj ruci, pobjeđuje tim s više bodova; ako su izjednačeni,
            igra se dalje.
          </p>
          <p>Na kraju se pojavi kartica pobjednika s nekoliko mogućnosti:</p>
        </Prose>

        <DataTable
          columns={["Gumb", "Što radi"]}
          rows={[
            ["Revanš", "nova partija s istim timovima, odmah na postavi"],
            ["Podijeli", "slika rezultata za WhatsApp ili drugu aplikaciju"],
            ["Komentar", "kratka bilješka uz partiju, pretraživa u povijesti"],
          ]}
        />

        <Callout title="Statistike broje samo završene partije">
          <p>
            Dok partija ne dođe do 1001, ne ulazi ni u rejting ni u ljestvice. Ako
            prekinete na pola, rezultat se neće vidjeti u statistikama.
          </p>
        </Callout>
      </Section>

      <Section id="povijest" eyebrow="Kartica Povijest" title="Povijest">
        <Prose>
          <p>
            Sve odigrane partije, najnovije prve. Filtriraj po igraču ili paru, po
            razdoblju, po rezultatu (pobjede ili porazi) ili pretraži komentare.
            Dodirom se otvara partija sa svim rukama.
          </p>
          <p>
            Partija otvorena iz povijesti je samo za pregled — ruke se ispravljaju na
            ekranu partije, dok traje ili odmah nakon kraja.
          </p>
        </Prose>
      </Section>

      <Section id="statistike" eyebrow="Ljestvica i Sezona" title="Ljestvice i sezona">
        <DataTable
          columns={["Gdje", "Što pokazuje"]}
          rows={[
            ["Ljestvica · Igrači", "poredak po rejtingu; dodir otvara profil igrača"],
            ["Ljestvica · Parovi", "poredak parova po kemiji"],
            ["Ljestvica · Kategorije", "male ljestvice za pojedine statistike"],
            ["Usporedi dva igrača", "jedan pored drugoga, međusobni i zajednički učinak"],
            ["Sezona", "poredak tekuće sezone, MVP i par sezone, arhiva prošlih"],
          ]}
        />

        <Prose>
          <p>
            Profil igrača ima graf rejtinga kroz partije i popis njegovih partija.
            Sezona traje od 1. listopada do 30. rujna. Kako se koja brojka računa
            objašnjeno je na stranici{" "}
            <Link href="/informacije" className="font-semibold text-accent underline underline-offset-2">
              Informacije
            </Link>
            .
          </p>
        </Prose>
      </Section>

      <Section id="racun" eyebrow="Profil" title="Račun i aplikacija">
        <StatEntry name="Lozinka i odjava">
          Gumb s imenom računa u gornjem desnom kutu početne otvara promjenu lozinke i
          odjavu. Nakon promjene lozinke svi ostali uređaji moraju se ponovno
          prijaviti.
        </StatEntry>

        <StatEntry name="Instaliraj na mobitel">
          Aplikacija se može dodati na početni zaslon i otvarati kao obična aplikacija.
          Na iPhoneu u Safariju: Dijeli → Dodaj na početni zaslon. Na Androidu u
          Chromeu: izbornik ⋮ → Instaliraj aplikaciju.
        </StatEntry>

        <StatEntry name="Internet">
          Za upis ruku potrebna je veza. Ako spremanje ne uspije, ruka ostaje
          upisana na ekranu — samo ponovno dodirni Spremi ruku kad se veza vrati.
        </StatEntry>
      </Section>
    </main>
  );
}
