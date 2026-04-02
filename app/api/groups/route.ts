import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";

export async function GET() {
  const repo = getRepo();
  const groups = await repo.listGroups();
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Naziv grupe mora imati barem 2 znaka" }, { status: 400 });
  }
  const repo = getRepo();
  try {
    const group = await repo.createGroup(name);
    return NextResponse.json({ group }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Greška pri kreiranju grupe" }, { status: 500 });
  }
}
