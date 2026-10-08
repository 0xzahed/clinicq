import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { Doctor, Visit } from "@/models/Clinic";

export interface DoctorDoc {
  id: string;
  name: string;
  specialty: string;
  room: string;
  fee: number;
}

export type VisitStatus = "waiting" | "serving" | "done" | "cancelled";

export interface VisitDoc {
  id: string;
  patientName: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  date: string;
  token: number;
  status: VisitStatus;
  note: string;
}

type Raw = Record<string, unknown> & { _id?: unknown };

// ---------- Shared file store ----------
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "clinic.json");

interface FileDB {
  doctors: DoctorDoc[];
  visits: VisitDoc[];
}

function readFile(): FileDB {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as FileDB;
  } catch {
    return { doctors: [], visits: [] };
  }
}

function writeFile(d: FileDB): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(d));
}

const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ---------- Doctors ----------
export async function listDoctors(): Promise<DoctorDoc[]> {
  if (await db()) {
    const rows = (await Doctor.find({}).sort({ name: 1 }).lean().catch(() => [])) as unknown as Raw[];
    return rows.map((r) => ({ id: String(r._id ?? ""), name: String(r.name ?? ""), specialty: String(r.specialty ?? ""), room: String(r.room ?? ""), fee: Number(r.fee ?? 0) }));
  }
  return readFile().doctors;
}

export async function addDoctor(name: string, specialty: string, room: string, fee: number): Promise<DoctorDoc> {
  if (!name.trim()) throw new Error("Doctor name is required.");
  if (!Number.isFinite(fee) || fee < 0) throw new Error("Fee must be 0 or more.");
  if (await db()) {
    const c = await Doctor.create({ name: name.trim(), specialty: specialty.trim(), room: room.trim(), fee });
    const r = c.toObject() as unknown as Raw;
    return { id: String(r._id ?? ""), name: String(r.name), specialty: String(r.specialty ?? ""), room: String(r.room ?? ""), fee: Number(r.fee ?? 0) };
  }
  const d = readFile();
  const doc: DoctorDoc = { id: rid(), name: name.trim(), specialty: specialty.trim(), room: room.trim(), fee };
  d.doctors.push(doc);
  writeFile(d);
  return doc;
}

export async function deleteDoctor(id: string): Promise<boolean> {
  if (await db()) {
    const r = await Doctor.findByIdAndDelete(id).catch(() => null);
    return !!r;
  }
  const d = readFile();
  const n = d.doctors.length;
  d.doctors = d.doctors.filter((x) => x.id !== id);
  if (d.doctors.length !== n) writeFile(d);
  return d.doctors.length !== n;
}

async function doctorName(id: string): Promise<string> {
  const all = await listDoctors();
  const d = all.find((x) => x.id === id);
  if (!d) throw new Error("Doctor not found.");
  return d.name;
}

// ---------- Visits / token queue ----------
const toVisit = (r: Raw): VisitDoc => ({
  id: String(r._id ?? r.id ?? ""),
  patientName: String(r.patientName ?? ""),
  phone: String(r.phone ?? ""),
  doctorId: String(r.doctorId ?? ""),
  doctorName: String(r.doctorName ?? ""),
  date: String(r.date ?? ""),
  token: Number(r.token ?? 0),
  status: (["waiting", "serving", "done", "cancelled"].includes(String(r.status)) ? String(r.status) : "waiting") as VisitStatus,
  note: String(r.note ?? ""),
});

/** Next token = highest token for this doctor+day + 1 (cancelled tokens are NOT reused). */
export async function addVisit(input: {
  patientName: string;
  phone: string;
  doctorId: string;
  date: string;
  note: string;
}): Promise<VisitDoc> {
  const patientName = input.patientName.trim();
  if (!patientName) throw new Error("Patient name is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Date must be YYYY-MM-DD.");
  const name = await doctorName(input.doctorId);

  if (await db()) {
    const last = (await Visit.find({ doctorId: input.doctorId, date: input.date }).sort({ token: -1 }).limit(1).lean().catch(() => [])) as unknown as Raw[];
    const token = (last[0] ? Number(last[0].token) : 0) + 1;
    const c = await Visit.create({ patientName, phone: input.phone.trim(), doctorId: input.doctorId, doctorName: name, date: input.date, token, status: "waiting", note: input.note.trim() });
    return toVisit(c.toObject() as unknown as Raw);
  }
  const d = readFile();
  const sameDay = d.visits.filter((v) => v.doctorId === input.doctorId && v.date === input.date);
  const token = sameDay.reduce((a, v) => Math.max(a, v.token), 0) + 1;
  const v: VisitDoc = { id: rid(), patientName, phone: input.phone.trim(), doctorId: input.doctorId, doctorName: name, date: input.date, token, status: "waiting", note: input.note.trim() };
  d.visits.push(v);
  writeFile(d);
  return v;
}

export async function listVisits(doctorId?: string, date?: string): Promise<VisitDoc[]> {
  if (await db()) {
    const q: Record<string, unknown> = {};
    if (doctorId) q.doctorId = doctorId;
    if (date) q.date = date;
    const rows = (await Visit.find(q).sort({ date: 1, token: 1 }).lean().catch(() => [])) as unknown as Raw[];
    return rows.map(toVisit);
  }
  const all = readFile().visits;
  return all
    .filter((v) => (!doctorId || v.doctorId === doctorId) && (!date || v.date === date))
    .sort((a, b) => (a.date === b.date ? a.token - b.token : a.date < b.date ? -1 : 1));
}

export async function setVisitStatus(id: string, status: string): Promise<VisitDoc | null> {
  if (!["waiting", "serving", "done", "cancelled"].includes(status)) throw new Error("Invalid status.");
  if (await db()) {
    const r = (await Visit.findByIdAndUpdate(id, { status }, { new: true }).lean().catch(() => null)) as unknown as Raw | null;
    return r ? toVisit(r) : null;
  }
  const d = readFile();
  const v = d.visits.find((x) => x.id === id);
  if (!v) return null;
  v.status = status as VisitStatus;
  writeFile(d);
  return v;
}

export async function deleteVisit(id: string): Promise<boolean> {
  if (await db()) {
    const r = await Visit.findByIdAndDelete(id).catch(() => null);
    return !!r;
  }
  const d = readFile();
  const n = d.visits.length;
  d.visits = d.visits.filter((v) => v.id !== id);
  if (d.visits.length !== n) writeFile(d);
  return d.visits.length !== n;
}
