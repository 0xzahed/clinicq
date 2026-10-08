import { NextResponse } from "next/server";
import { addDoctor, deleteDoctor, listDoctors } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ doctors: await listDoctors() });
}

export async function POST(req: Request) {
  let b: { name?: string; specialty?: string; room?: string; fee?: number };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send { name, specialty?, room?, fee? }." }, { status: 400 });
  }
  try {
    const d = await addDoctor(String(b.name ?? ""), String(b.specialty ?? ""), String(b.room ?? ""), Number(b.fee ?? 0));
    return NextResponse.json(d, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return NextResponse.json({ deleted: await deleteDoctor(id) });
}
