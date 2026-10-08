import { NextResponse } from "next/server";
import { listDoctors, listVisits } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Today's live queue. Optionally filtered by doctor.
 * nowServing = the `serving` visit, else the next `waiting` token.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const date = q.get("date") ?? new Date().toISOString().slice(0, 10);
  const doctorId = q.get("doctorId") ?? undefined;
  const doctors = await listDoctors();
  const visits = await listVisits(doctorId, date);
  const active = visits.filter((v) => v.status === "waiting" || v.status === "serving");
  const serving = active.find((v) => v.status === "serving") ?? active[0] ?? null;
  return NextResponse.json({
    date,
    doctors: doctorId ? doctors.filter((d) => d.id === doctorId) : doctors,
    queue: active,
    nowServing: serving,
    counts: {
      waiting: visits.filter((v) => v.status === "waiting").length,
      serving: visits.filter((v) => v.status === "serving").length,
      done: visits.filter((v) => v.status === "done").length,
    },
  });
}
