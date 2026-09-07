import type { Metadata } from "next";
import { BackButton } from "@/components/BackButton";
import {
  Callout,
  DataTable,
  Formula,
  Prose,
  Section,
  StatEntry,
} from "@/components/DocsPrimitives";

export const metadata: Metadata = {
  title: "Informacije — Bela Tracker",
  description: "Kako se računa rejting, kemija parova i sve statistike.",
};

const CONTENTS = [
  ["rangiranje", "Kako se rangira"],
  ["rejting", "Rejting"],
  ["nesigurnost", "Nesigurnost (±)"],
  ["kemija", "Kemija parova"],
  ["igraci", "Statistike igrača"],
  ["parovi", "Statistike para"],
  ["kategorije", "Kategorije"],
  ["izostavljeno", "Što se ne računa"],
  ["pojmovnik", "Pojmovnik"],
] as const;

export default function InformacijePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 pb-20">
      <BackButton fallbackHref="/" className="self-start" />

      <header className="card px-[18px] py-[18px]">
        <h1 className="text-[24px] font-extrabold text-balance text-[#f7fbf6]">
          Kako sve ovo radi
        </h1>
        <p className="mt-2 text-[13.5px] leading-[1.65] text-[#a9c2b3]">
          Svaka brojka u aplikaciji računa se iz završenih partija — nema ručnog
          namještanja i nema ocjena. Ovdje piše što svaka statistika mjeri, kako se
          točno računa i kako se čita.
        </p>
        <nav className="mt-3.5 grid grid-cols-2 gap-1.5">
          {CONTENTS.map(([id, label], index) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 rounded-[10px] bg-[rgba(6,20,16,0.45)] px-2.5 py-2 text-[12px] font-semibold text-[#dcece3]"
            >
              <span className="text-[10px] font-bold tabular-nums text-[#8fa89b]">
                {index + 1}
              </span>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="rangiranje" eyebrow="Sažetak" title="Kako se rangira">
        <Prose>
          <p>
            Postoje točno dvije ljestvice, i svaka odgovara na svoje pitanje.
            Igrači se rangiraju po <b className="font-semibold text-[#eef3ee]">rejtingu</b>,
            koji mjeri jačinu. Parovi se rangiraju po{" "}
            <b className="font-semibold text-[#eef3ee]">kemiji</b>, koja mjeri igraju li
            zajedno bolje nego što bi se od njih dvojice očekivalo.
          </p>
          <p>
            Sve ostale statistike stoje samostalno, svaka sa svojom malom ljestvicom na
            kartici Kategorije. Namjerno se{" "}
            <b className="font-semibold text-[#eef3ee]">ne zbrajaju</b> u jednu ocjenu:
            većina ih mjeri istu stvar iz različitih kutova, pa bi zbroj samo skrivao što
            se zapravo dogodilo.
          </p>
        </Prose>

        <DataTable
          columns={["Ljestvica", "Sortira se po", "Prag"]}
          rows={[
            ["Igrači", "rejting − nesigurnost", "15 partija"],
            ["Parovi", "kemija", "10 zajedničkih partija"],
          ]}
          caption="Ispod praga se ne skriva ništa — ti igrači i parovi stoje u zasebnoj sekciji na dnu ljestvice."
        />
      </Section>

      <Section id="rejting" eyebrow="Jačina igrača" title="Rejting">
        <Prose>
          <p>
            Postotak pobjeda ne mjeri igrača — mjeri i to s kim je igrao i protiv koga.
            U ekipi u kojoj se parovi stalno mijenjaju to je presudno. Zato rejting ne
            broji pobjede, nego{" "}
            <b className="font-semibold text-[#eef3ee]">
              prije svake partije predvidi tko bi trebao pobijediti
            </b>
            , pa nagradi ili kazni prema tome koliko je predviđanje promašeno.
          </p>
          <p>Svi kreću od 1500.</p>
        </Prose>

        <Formula label="Osnovna računica">{`jačina tima  = (rejting igrača 1 + rejting igrača 2) / 2
očekivanje E = 1 / (1 + 10 ^ ((jačina protivnika − jačina tima) / 400))
ishod S      = 1 pobjeda · 0 poraz · 0.5 neriješeno

promjena     = K × margina × (S − E)`}</Formula>

        <Prose>
          <p>
            Oba suigrača dobiju istu promjenu. Zbroj svih promjena u jednoj partiji je
            nula — koliko jedan tim dobije, toliko drugi izgubi.
          </p>
        </Prose>

        <StatEntry
          name="Primjer"
          reading={
            <>
              Poraz koji je bio očekivan gotovo te ne košta, a neočekivana pobjeda te
              jako gura gore. Za favorita vrijedi obrnuto: dobije malo kad pregazi
              slabije, izgubi puno kad mu oni uzmu partiju.
            </>
          }
        >
          Ti (1400) i slabiji partner (1300) činite tim od 1350. Protivnici su 1600 i
          1550, dakle tim od 1575. Razlika od 225 bodova daje vam oko 22% šanse.
          <Formula>{`E = 1 / (1 + 10 ^ (225 / 400)) = 0.215

pobjeda 1001:500  →  24 × 1.30 × (1 − 0.215) = +24
poraz   500:1001  →  24 × 1.30 × (0 − 0.215) =  −7`}</Formula>
        </StatEntry>

        <StatEntry name="Margina">
          Rezultat 1001:950 i 1001:200 nisu isti dokaz, pa razlika u bodovima skalira
          veličinu promjene. Nikad je ne poništava i nikad ne udvostručuje.
          <Formula>{`margina = 0.75 + 0.5 × ln(1 + 4 × (pobjednik − gubitnik) / 1001)`}</Formula>
        </StatEntry>

        <DataTable
          columns={["Rezultat", "Množitelj"]}
          rows={[
            ["1001 : 950", "0.84"],
            ["1001 : 800", "1.04"],
            ["1001 : 600", "1.23"],
            ["1001 : 400", "1.36"],
            ["1001 : 200", "1.47"],
            ["1001 : 0", "1.55"],
          ]}
          caption="Uvjerljiva pobjeda vrijedi otprilike 1.75× više od tijesne."
        />

        <StatEntry name="Više prolaza kroz povijest">
          Prva partija ikad odigrana suđena je dok je sustav mislio da su svi jednaki.
          Zato sustav pregazi cijelu povijest četiri puta, gdje završni rejtinzi jednog
          prolaza postaju polazni sljedećeg. Na kraju su i najstarije partije suđene
          znanjem koje sustav ima danas, a redoslijed partija više ne utječe na rezultat.
        </StatEntry>

        <StatEntry name="Sezone">
          Sezona je kalendarska godina. Na prijelazu se svi povuku 25% prema 1500 — tko
          je bio 1800 kreće novu sezonu na 1725. Prošlost se ne briše, samo blijedi.
        </StatEntry>

        <DataTable
          columns={["Konstanta", "Vrijednost"]}
          rows={[
            ["Početni rejting", "1500"],
            ["K, prvih 10 partija", "48"],
            ["K, nakon toga", "24"],
            ["Prolazaka kroz povijest", "4"],
            ["Sezonska regresija", "25%"],
          ]}
        />

        <Callout title="Zašto nema prigušenja favorita">
          <p>
            Standardni recept (538-ov) uz marginu dodaje i prigušenje koje smanjuje
            korak kad pobijedi favorit. Zvuči razumno, ali je asimetrično po ishodu, pa
            ne pomiče samo brzinu nego i samu ravnotežu — cijelu ljestvicu trajno vuče
            prema 1500.
          </p>
          <p>
            Provjereno mjerenjem: zadanim izmišljenim igračima s poznatim pravim
            rejtinzima generirane su partije, pa se gledalo koliko vjerno ih sustav
            rekonstruira. Nepristran rezultat je 1.00.
          </p>
          <DataTable
            columns={["Partija", "S prigušenjem", "Bez njega"]}
            rows={[
              ["60", "0.80", "0.91"],
              ["150", "0.80", "0.93"],
              ["400", "0.74", "0.86"],
            ]}
          />
          <p>
            Povećanje K ne pomaže — na 300 partija pogoršava rezultat s 0.56 na 0.42 pri
            K=60, jer veći K dodaje šum, a ne signal.
          </p>
        </Callout>

        <DataTable
          columns={["Razlika u jačini timova", "Šansa jačeg tima"]}
          rows={[
            ["50", "57%"],
            ["100", "64%"],
            ["150", "70%"],
            ["200", "76%"],
            ["300", "85%"],
            ["400", "91%"],
          ]}
          caption="Razlika između dva igrača prepolovi se dok uđe u tim, jer je jačina tima prosjek dvojice. Razlika od 150 bodova između dva igrača znači razliku od oko 75 među timovima, tj. oko 61%."
        />
      </Section>

      <Section id="nesigurnost" eyebrow="Koliko vjerovati broju" title="Nesigurnost (±)">
        <Prose>
          <p>
            Broj iza znaka ± <b className="font-semibold text-[#eef3ee]">nije raspon
            rejtinga</b> — to je koliko sustav još nije siguran u njega. Pada s brojem
            odigranih partija.
          </p>
        </Prose>

        <Formula>{`pouzdanost = partije / (partije + 12)
±          = 120 × (1 − pouzdanost)

poredak    = rejting − ±`}</Formula>

        <DataTable
          columns={["Partija", "±"]}
          rows={[
            ["0", "120"],
            ["5", "85"],
            ["10", "65"],
            ["15", "53"],
            ["30", "34"],
            ["50", "23"],
            ["100", "13"],
          ]}
        />

        <Prose>
          <p>
            Ljestvica se sortira po rejtingu umanjenom za ±. Igrač s 1700 ±53 rangira se
            na 1647, a igrač s 1650 ±13 na 1637 — prvi je i dalje ispred, ali tijesno.
            Tko je odigrao tri sjajne partije neće preskočiti nekoga tko godinama drži
            razinu.
          </p>
          <p>
            Prikaz <span className="font-mono text-[#eef3ee]">1687 ±22</span> čitaj kao:
            pravi rejting je vrlo vjerojatno oko 1687, i sustav je u to prilično siguran.
            Manji ±, zasluženiji broj.
          </p>
        </Prose>
      </Section>

      <Section id="kemija" eyebrow="Jačina para" title="Kemija parova">
        <Prose>
          <p>
            Da se parovi rangiraju po pobjedama, par dvojice najboljih igrača uvijek bi
            vodio — a to već piše u listi igrača. Kemija zato mjeri nešto drugo:{" "}
            <b className="font-semibold text-[#eef3ee]">
              igra li ovaj par bolje ili gore nego što bi se očekivalo od te dvojice
              ljudi
            </b>
            .
          </p>
          <p>
            Za svaku njihovu zajedničku partiju sustav izračuna očekivanu šansu iz
            njihova dva pojedinačna rejtinga protiv stvarnih protivnika te večeri, pa to
            usporedi sa stvarnim učinkom.
          </p>
        </Prose>

        <Formula>{`očekivano  = prosjek očekivanja kroz sve zajedničke partije
sirova     = stvarni postotak pobjeda − očekivano
pouzdanost = partije / (partije + 6)

kemija     = sirova × pouzdanost`}</Formula>

        <DataTable
          columns={["Zajedničkih partija", "Ostaje od sirove"]}
          rows={[
            ["4", "40%"],
            ["6", "50%"],
            ["10", "63%"],
            ["20", "77%"],
            ["50", "89%"],
          ]}
          caption="Stiskanje prema nuli sprječava da par s tri partije vodi ljestvicu samo zato što je tri puta iznenadio. Predznak se nikad ne mijenja."
        />

        <Prose>
          <p>
            Primjer: par je odigrao 20 partija zajedno, prema rejtinzima trebao je dobiti
            50%, a dobio je 65%. Sirova kemija je +15%, prikazana +11.5%.
          </p>
          <p>
            <b className="font-semibold text-[#eef3ee]">Plus</b> znači da zajedno igraju
            bolje od zbroja svojih dijelova — razumiju se, znaju kad tko zove, ne gaze
            jedan drugome zvanja. <b className="font-semibold text-[#eef3ee]">Minus</b>{" "}
            znači suprotno. Nula je posve normalna: točno su onoliko dobri koliko im
            rejtinzi kažu. Vrijednosti su obično skromne, između −15% i +15%, jer dio
            kemije neizbježno upije i sam pojedinačni rejting.
          </p>
        </Prose>
      </Section>

      <Section id="igraci" eyebrow="Kartica igrača" title="Statistike igrača">
        <StatEntry
          name="Vrijednost zvanja"
          chips={["min. 10 zvanja za ljestvicu"]}
          formula={
            <Formula>{`osnovica   = prosječna razlika koju donese zvanje u cijeloj ekipi,
             posebno za zvanja iz volje, posebno za zvanja na mus

vrijednost = zbroj (razlika u ruci − osnovica) kroz sva tvoja zvanja
po partiji = vrijednost / odigrane partije`}</Formula>
          }
          reading={
            <>
              Tko nikad ne zove ima 0 — ni nagradu ni kaznu. Plus znači da tvoja zvanja
              donose više od prosječnog zvanja u ekipi. Minus znači da padaš češće nego
              što se isplati.
            </>
          }
        >
          Zamjenjuje staru prolaznost, koja je nagrađivala kukavičluk: tko zove samo sa
          sigurnim adutom ima 95% prolaznosti, a zapravo nikad ne riskira. Ova statistika
          ne pita jesi li prošao, nego koliko si bodova razlike donio u odnosu na to
          koliko prosječno zvanje donese.
        </StatEntry>

        <StatEntry
          name="Prolaznost iz volje i na musu"
          reading={
            <>
              Velik jaz između te dvije brojke znači da dobro biraš kad ćeš zvati. Visoka
              prolaznost na musu znači da znaš spasiti lošu ruku.
            </>
          }
        >
          Udio zvanja koja su prošla, razdvojen po tome je li zvanje bilo izbor. Djelitelj
          zove zadnji, pa ako svi prije njega dalju — mora. To nije njegova odluka i
          nepošteno ju je mjeriti kao dobrovoljnu, pa sustav prepoznaje tko je dijelio
          koju ruku i mjeri ta zvanja odvojeno.
        </StatEntry>

        <StatEntry
          name="Zvao iz volje"
          chips={["min. 30 ruku za ljestvicu"]}
          formula={
            <Formula>{`zvao iz volje = zvanja iz volje / ruke u kojima igrač nije dijelio`}</Formula>
          }
          reading={
            <>
              Sam po sebi ni dobar ni loš — zanimljiv je u paru s vrijednošću zvanja.
              Visoko i pozitivno je najbolji igrač za stolom; visoko i negativno je
              kockar.
            </>
          }
        >
          Koliko često preuzimaš igru na sebe kad ne moraš. Na ljestvici Kategorije
          zove se Hrabrost.
        </StatEntry>

        <StatEntry
          name="Završnica"
          chips={["min. 8 takvih ruku za ljestvicu"]}
          formula={
            <Formula>{`ruka se broji ako je PRIJE nje:
  vodeći tim ≥ 700 bodova   i   razlika ≤ 150 bodova

završnica = dobivene takve ruke / sve takve ruke`}</Formula>
          }
          reading={<>Živci kad partija visi. Iznad 50% znači da dobivaš ruke koje odlučuju.</>}
        >
          Udio dobivenih ruku odigranih dok je partija stvarno na kocki. Stara verzija
          brojala je ruke koje su slučajno završile tijesno, što je bilo bacanje novčića,
          a ne pritisak.
        </StatEntry>

        <StatEntry
          name="Forma"
          chips={["min. 3 partije za ljestvicu"]}
          reading={
            <>
              Iznad +12 je nalet, ispod −12 pad; između je mirno stanje. Ovo pokreće i
              strelicu na kartici.
            </>
          }
        >
          Promjena rejtinga kroz zadnjih 10 partija.
        </StatEntry>

        <StatEntry
          name="Stabilnost"
          chips={["min. 30 ruku za ljestvicu"]}
          reading={
            <>
              <b className="font-semibold text-[#c9d9a0]">Manji broj je bolji.</b> Igrač s
              40 i prosjekom 85 je pouzdan; igrač sa 70 i istim prosjekom je vlak smrti.
            </>
          }
        >
          Standardna devijacija tvojih bodova po ruci — koliko ti rezultat skače.
        </StatEntry>

        <StatEntry
          name="Najveći preokret"
          reading={<>Najveći uspon unutar jedne partije, mjeren u bodovima razlike.</>}
        >
          Najveći zaostatak nadoknađen unutar jedne partije. Traži se odvojeno u svakoj
          partiji, pa se uzima najbolji — preokret ne može biti sastavljen od kraja jedne
          i početka druge partije.
        </StatEntry>

        <StatEntry
          name="Najbolji partner i nezgodan protivnik"
          chips={["min. 3 partije"]}
          formula={
            <Formula>{`najbolji partner  = suigrač s kojim imaš najveću kemiju
nezgodan protivnik = protivnik protiv kojeg najviše zaostaješ
                     za očekivanim: (pobjede − očekivane pobjede) / partije`}</Formula>
          }
          reading={
            <>
              Nezgodan protivnik nije nužno onaj koji te najviše puta pobijedio, nego onaj
              koji te pobjeđuje više nego što bi smio.
            </>
          }
        >
          Odnosi izvedeni iz istog računa očekivanja kao i kemija.
        </StatEntry>

        <StatEntry name="Najviši rejting">
          Najveća vrijednost rejtinga koju si ikad dosegnuo — da se imaš na što pozvati
          kad padneš.
        </StatEntry>

        <h3 className="border-t border-[rgba(255,255,255,0.07)] pt-3 text-[14px] font-bold text-[#f2f5f0]">
          Ostale brojke na kartici
        </h3>

        <DataTable
          columns={["Statistika", "Kako se računa"]}
          rows={[
            ["Bodovi po ruci", "prosjek bodova tvog tima po ruci"],
            ["Plus minus", "(bodovi za − bodovi protiv) / partije"],
            ["Prosj. štiglji", "štiglje tvog tima / partije"],
            ["Prosj. zvanja", "tvoja osobna zvanja / partije"],
            ["Zvao po ruci", "zvanja / odigrane ruke"],
            ["Trenutni streak", "niz pobjeda ili poraza koji traje"],
            ["Max win streak", "najdulji niz pobjeda ikad"],
            ["Najdraži znak", "adut koji si najčešće zvao"],
          ]}
        />
      </Section>

      <Section id="parovi" eyebrow="Kartica para" title="Statistike para">
        <Prose>
          <p>
            Par je uvijek jedan tim unutar partije, pa se sve njegove brojke odnose na
            partije koje su njih dvojica odigrala zajedno.
          </p>
        </Prose>

        <DataTable
          columns={["Statistika", "Kako se računa"]}
          rows={[
            ["Kemija", "stvarni − očekivani postotak pobjeda, stisnuto"],
            ["Očekivano", "prosjek očekivanja iz pojedinačnih rejtinga"],
            ["Zajednički rejting", "prosjek rejtinga te dvojice"],
            ["Bodovi po ruci", "prosjek bodova para po ruci"],
            ["Plus minus", "(bodovi za − bodovi protiv) / partije"],
            ["Zvanja iz volje / na mus", "koliko su zvanja preuzeli i u kojim okolnostima"],
            ["Vrijednost zvanja", "ista računica kao kod igrača, po partiji para"],
            ["Završnica", "dobivene ruke u završnici, kao kod igrača"],
          ]}
        />
      </Section>

      <Section id="kategorije" eyebrow="Male ljestvice" title="Kategorije">
        <Prose>
          <p>
            Svaka kategorija ima svoj minimalni uzorak. Ispod njega igrač se ne pojavljuje
            na toj ljestvici — ne zato da bude sakriven, nego zato što brojka od pet ruku
            ne znači ništa.
          </p>
        </Prose>

        <DataTable
          columns={["Ljestvica", "Sortira se po", "Minimalni uzorak"]}
          rows={[
            ["MVP sezone", "porast rejtinga u sezoni", "5 partija"],
            ["Uspon sezone", "porast rejtinga u sezoni", "5 partija"],
            ["Forma", "promjena kroz zadnjih 10 partija", "3 partije"],
            ["Zvanje aduta", "vrijednost zvanja po partiji", "10 zvanja"],
            ["Hrabrost", "udio zvanja iz volje", "30 ruku"],
            ["Zvanja", "prosjek zvanja po partiji", "3 partije"],
            ["Štiglja", "prosjek štiglji po partiji", "3 partije"],
            ["Završnica", "dobivene ruke u završnici", "8 takvih ruku"],
            ["Stabilnost", "najmanje rasipanje bodova", "30 ruku"],
            ["Preokret", "najveći nadoknađeni zaostatak", "1 partija"],
            ["Kemija", "kemija para, najviša", "4 zajedničke partije"],
            ["Neslaganje", "kemija para, najniža", "4 zajedničke partije"],
            ["Rivalstva", "najveći zaostatak za očekivanim", "3 partije"],
          ]}
        />

        <Callout title="MVP sezone nije mjera jačine">
          <p>
            To je nagrada za najveći napredak u sezoni. Igrač koji je cijelu sezonu držao
            visoku razinu neće je osvojiti, jer nije imao kamo rasti. Za jačinu služi
            rejting na kartici Igrači.
          </p>
        </Callout>
      </Section>

      <Section id="izostavljeno" eyebrow="Granice" title="Što se ne računa">
        <StatEntry name="Nezavršene partije">
          Partija ulazi u statistiku tek kad netko stigne do 1001 ili kad se ručno
          označi kao završena. Nedovršena partija ne ulazi nigdje — ni u rejting, ni u
          prosjeke, ni u brojanje ruku. Njezina margina nije usporediva s partijom koja
          je odigrana do kraja.
        </StatEntry>

        <StatEntry name="Ruke kao zaseban dokaz za rejting">
          Rejting gleda samo konačni rezultat partije, ne pojedinačne ruke. Unutar partije
          timovi su fiksni, pa ruke nisu nezavisne jedna o drugoj — brojanje svake ruke
          kao zasebnog dokaza lažno bi napuhalo sigurnost. Konačna razlika ionako sažima
          sve što ruke nose.
        </StatEntry>

        <StatEntry name="Stara MVP ocjena">
          Uklonjena. Bila je ponderirani zbroj komponenti razvučenih na raspon trenutne
          ekipe, pa je najgori igrač uvijek dobivao nulu bez obzira koliko dobar bio.
          Komponente su joj uz to mjerile uglavnom istu stvar, a nije korigirala ni
          partnera ni protivnika. Uz nju su otišle i dvije izvedene brojke: utjecaj
          partnera, koji se pokazao pukim artefaktom računice, i rizik zvanja, koji se
          nigdje nije prikazivao.
        </StatEntry>
      </Section>

      <Section id="pojmovnik" eyebrow="Nazivi" title="Pojmovnik">
        <DataTable
          columns={["Pojam", "Značenje"]}
          rows={[
            ["Partija", "igra do 1001 boda, sastoji se od više ruku"],
            ["Ruka", "jedno dijeljenje i odigravanje svih karata"],
            ["Mus", "djelitelj mora zvati ako su svi prije njega dalje"],
            ["Štiglja", "svi štihovi u ruci, nosi 90 bodova i sva zvanja"],
            ["Zvanja", "bodovi za kombinacije karata u ruci"],
            ["Pao", "zvač nije skupio više od polovice bodova u ruci"],
          ]}
        />
      </Section>

      <p className="px-1 text-[11px] leading-relaxed text-[#8fa89b]">
        Sve brojke se preračunavaju iz cijele povijesti svaki put — nema spremljenih
        međurezultata koji bi mogli zastarjeti. Ispravak unosa neke stare ruke uredno se
        provuče kroz sve statistike.
      </p>
    </main>
  );
}
