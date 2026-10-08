import { NextResponse } from "next/server";
import { addVisit, deleteVisit, listVisits, setVisitStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const visits = await listVisits(q.get("doctorId") ?? undefined, q.get("date") ?? undefined);
  return NextResponse.json({ visits });
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send visit JSON." }, { status: 400 });
  }
  try {
    const v = await addVisit({
      patientName: String(b.patientName ?? ""),
      phone: String(b.phone ?? ""),
      doctorId: String(b.doctorId ?? ""),
      date: String(b.date ?? ""),
      note: String(b.note ?? ""),
    });
    return NextResponse.json(v, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 422 });
  }
}

export async function PATCH(req: Request) {
  let b: { id?: string; status?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Send { id, status }." }, { status: 400 });
  }
  try {
    const v = await setVisitStatus(String(b.id ?? ""), String(b.status ?? ""));
    if (!v) return NextResponse.json({ error: "Visit not found." }, { status: 404 });
    return NextResponse.json(v);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return NextResponse.json({ deleted: await deleteVisit(id) });
}
