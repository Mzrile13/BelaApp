import type { Metadata } from "next";
import { requireAccountId } from "@/lib/session";
import { loadSeasonPage } from "@/lib/seasonPage";
import { SeasonPageBody } from "./SeasonPageBody";

export const metadata: Metadata = { title: "Sezona · Bela Tracker" };

export default async function SeasonPage() {
  const data = await loadSeasonPage(await requireAccountId(), null);
  return <SeasonPageBody data={data} />;
}
