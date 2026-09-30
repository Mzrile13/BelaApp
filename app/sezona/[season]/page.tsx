import { notFound } from "next/navigation";
import { requireAccountId } from "@/lib/session";
import { seasonFromSlug } from "@/lib/season";
import { loadSeasonPage } from "@/lib/seasonPage";
import { SeasonPageBody } from "../SeasonPageBody";

export default async function SeasonArchivePage(props: PageProps<"/sezona/[season]">) {
  const { season: slug } = await props.params;
  const season = seasonFromSlug(slug);
  if (!season) notFound();
  const data = await loadSeasonPage(await requireAccountId(), season);
  return <SeasonPageBody data={data} />;
}
