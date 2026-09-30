import { describe, expect, it } from "vitest";
import { selectAllPages } from "../lib/supabase";

function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { page, calls };
}

describe("selectAllPages", () => {
  it("skuplja sve retke preko limita od 1000", async () => {
    const { page, calls } = fakeTable(2500);
    const rows = await selectAllPages(page);
    expect(rows).toHaveLength(2500);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2500);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("točno 1000 redaka traži još jednu (praznu) stranicu", async () => {
    const { page, calls } = fakeTable(1000);
    expect(await selectAllPages(page)).toHaveLength(1000);
    expect(calls).toHaveLength(2);
  });

  it("prosljeđuje grešku baze", async () => {
    await expect(
      selectAllPages(async () => ({ data: null, error: new Error("boom") })),
    ).rejects.toThrow("boom");
  });
});
