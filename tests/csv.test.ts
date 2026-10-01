import { describe, expect, it } from "vitest";
import { toCsv } from "../lib/csv";

describe("csv", () => {
  it("počinje BOM-om i koristi CRLF", () => {
    const csv = toCsv(["a", "b"], [[1, "x"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿a,b\r\n1,x\r\n");
  });

  it("escapea navodnike, zareze, točka-zareze i nove redove", () => {
    const csv = toCsv(["komentar"], [['Rekla je "bravo", pa'], ["dva\nreda"], ["a;b"], [null], [true]]);
    expect(csv.split("\r\n").slice(1, -1)).toEqual([
      '"Rekla je ""bravo"", pa"',
      '"dva\nreda"',
      '"a;b"',
      "",
      "true",
    ]);
  });

  it("čuva hrvatske znakove", () => {
    expect(toCsv(["ime"], [["Čučić Šimić Žaja Đurđa"]])).toContain("Čučić Šimić Žaja Đurđa");
  });
});

import { buildExportCsv } from "../lib/export";
import { mkFinishedGame, mkGame, mkPlayer } from "./factories";

describe("izvoz", () => {
  const [A, B, C, D] = ["ana", "bruno", "cvita", "duje"].map((name, i) => mkPlayer(name, i + 1));
  const done = mkFinishedGame("g1", [A.id, B.id], [C.id, D.id], 1001, 400, "2026-09-20T10:00:00.000Z");
  const later = mkFinishedGame("g2", [A.id, C.id], [B.id, D.id], 300, 1001, "2026-10-05T10:00:00.000Z");
  const open = mkGame({ id: "g3", teamA: [A.id, B.id], teamB: [C.id, D.id], createdAt: "2026-10-06T10:00:00.000Z", finishedAt: null });
  const input = {
    players: [A, B, C, D],
    games: [later.game, open, done.game],
    rounds: [...done.rounds, ...later.rounds],
    comments: { g1: "Bravo, \"šampioni\"" },
    season: null,
  };

  it("partije su kronološke, s pobjednikom samo za završene", () => {
    const lines = buildExportCsv("games", input).replace("﻿", "").trim().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain("g1,");
    expect(lines[1]).toContain("ana + bruno,cvita + duje,1001,400,A,1,");
    expect(lines[1]).toContain('"Bravo, ""šampioni"""');
    expect(lines[3]).toMatch(/^g3,.*,false,.*,0,0,,0,$/);
  });

  it("filtrira po sezoni i izvozi ruke", () => {
    const csv = buildExportCsv("rounds", { ...input, season: "26/27" });
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^g2,.*,1,ana,A,herc,300,1001,0,0,,true$/);
  });
});

describe("csv: formule", () => {
  it("tekst koji počinje s = + - @ ostaje tekst, a negativni brojevi ostaju brojevi", () => {
    const csv = toCsv(["x"], [["=HYPERLINK(\"http://x\")"], ["+1"], ["-2"], ["@SUM(A1)"], [-5], ["obično"]]);
    expect(csv.split("\r\n").slice(1, -1)).toEqual([
      '"\'=HYPERLINK(""http://x"")"',
      "'+1",
      "'-2",
      "'@SUM(A1)",
      "-5",
      "obično",
    ]);
  });
});
