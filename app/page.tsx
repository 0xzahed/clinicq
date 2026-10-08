"use client";

import { useCallback, useEffect, useState } from "react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room: string;
  fee: number;
}

interface Visit {
  id: string;
  patientName: string;
  phone: string;
  doctorName: string;
  date: string;
  token: number;
  status: string;
}

const input =
  "h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm outline-none placeholder:text-slate-600 focus:border-teal-500";
const btn =
  "h-11 cursor-pointer rounded-xl bg-teal-500 px-5 font-semibold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40";
const ghost =
  "h-9 cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-teal-500 hover:text-white";

const statusPill: Record<string, string> = {
  waiting: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  serving: "bg-teal-500/15 text-teal-300 border-teal-500/40",
  done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-600/40",
};

export default function Home() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queue, setQueue] = useState<Visit[]>([]);
  const [nowServing, setNowServing] = useState<Visit | null>(null);
  const [counts, setCounts] = useState({ waiting: 0, serving: 0, done: 0 });
  const [docId, setDocId] = useState("");
  const [error, setError] = useState("");
  const [vForm, setVForm] = useState({ patientName: "", phone: "", doctorId: "", date: new Date().toISOString().slice(0, 10) });
  const [dForm, setDForm] = useState({ name: "", specialty: "", room: "", fee: "" });

  const load = useCallback(async () => {
    try {
      const [d, q] = await Promise.all([
        fetch("/api/doctors").then((x) => x.json()),
        fetch(`/api/queue${docId ? `?doctorId=${encodeURIComponent(docId)}` : ""}`).then((x) => x.json()),
      ]);
      setDoctors(d.doctors ?? []);
      setQueue(q.queue ?? []);
      setNowServing(q.nowServing ?? null);
      setCounts(q.counts ?? { waiting: 0, serving: 0, done: 0 });
    } catch {
      /* offline */
    }
  }, [docId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "Failed.");

  const post = async (url: string, body: unknown, method = "POST") => {
    const r = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Failed.");
    return j;
  };

  const addVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const j = await post("/api/visits", vForm);
      setError(`✅ Token #${j.token} — ${j.patientName} (${j.doctorName})`);
      setVForm({ patientName: "", phone: "", doctorId: "", date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (e) {
      fail(e);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setError("");
    try {
      await post("/api/visits", { id, status }, "PATCH");
      load();
    } catch (e) {
      fail(e);
    }
  };

  const addDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await post("/api/doctors", { ...dForm, fee: Number(dForm.fee) || 0 });
      setDForm({ name: "", specialty: "", room: "", fee: "" });
      load();
    } catch (e) {
      fail(e);
    }
  };

  const seed = async () => {
    await fetch("/api/seed", { method: "POST" });
    load();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal-400">ClinicQ</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Token queue, zero chaos.</h1>
          <p className="mt-2 text-slate-400">Doctors · tokens · live queue — one dashboard.</p>
        </div>
        <div className="flex gap-2">
          <select value={docId} onChange={(e) => setDocId(e.target.value)} className={`${input} cursor-pointer`}>
            <option value="">All doctors</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={seed} className={ghost}>Demo data</button>
        </div>
      </header>

      {error && (
        <p className="mt-4 rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">{error}</p>
      )}

      {nowServing && (
        <div className="mt-6 rounded-2xl border border-teal-500/40 bg-teal-500/10 p-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal-300">Now serving</p>
          <p className="mt-1 text-6xl font-black tabular-nums">#{nowServing.token}</p>
          <p className="mt-1 font-bold">{nowServing.patientName} <span className="font-normal text-slate-400">· {nowServing.doctorName}</span></p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { l: "Waiting", v: counts.waiting },
          { l: "Serving", v: counts.serving },
          { l: "Done today", v: counts.done },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">{c.l}</p>
            <p className="mt-1 text-3xl font-black tabular-nums">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">New token</h2>
            <form onSubmit={addVisit} className="mt-3 grid grid-cols-2 gap-2">
              <input value={vForm.patientName} onChange={(e) => setVForm({ ...vForm, patientName: e.target.value })} placeholder="Patient *" className={input} />
              <input value={vForm.phone} onChange={(e) => setVForm({ ...vForm, phone: e.target.value })} placeholder="Phone" className={input} />
              <select value={vForm.doctorId} onChange={(e) => setVForm({ ...vForm, doctorId: e.target.value })} className={`${input} cursor-pointer`}>
                <option value="">Doctor…</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — ৳{d.fee}</option>)}
              </select>
              <input value={vForm.date} onChange={(e) => setVForm({ ...vForm, date: e.target.value })} type="date" className={`${input} text-slate-300`} />
              <button type="submit" className={`${btn} col-span-2`}>Issue token</button>
            </form>
          </section>

          <section>
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">Doctors</h2>
            <form onSubmit={addDoctor} className="mt-3 flex gap-2">
              <input value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} placeholder="Dr. Name" className={`${input} flex-1`} />
              <input value={dForm.specialty} onChange={(e) => setDForm({ ...dForm, specialty: e.target.value })} placeholder="Specialty" className={`${input} flex-1`} />
              <input value={dForm.fee} onChange={(e) => setDForm({ ...dForm, fee: e.target.value })} placeholder="৳" inputMode="numeric" className={`${input} w-24`} />
              <button type="submit" className={btn}>Add</button>
            </form>
            <ul className="mt-3 space-y-1.5">
              {doctors.map((d) => (
                <li key={d.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm">
                  <b>{d.name}</b><span className="font-mono text-xs text-slate-500">{d.specialty} · {d.room}</span>
                  <span className="ml-auto font-mono font-bold">৳{d.fee}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section>
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">Live queue (auto-refresh 15s)</h2>
          <ul className="mt-3 space-y-2">
            {queue.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 font-mono text-lg font-black">#{v.token}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{v.patientName}</p>
                  <p className="font-mono text-xs text-slate-500">{v.doctorName} · {v.date}</p>
                </div>
                <span className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{v.status}</span>
                  {v.status === "waiting" && (
                    <button onClick={() => setStatus(v.id, "serving")} className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:border-teal-500">▶ Serve</button>
                  )}
                  {v.status === "serving" && (
                    <button onClick={() => setStatus(v.id, "done")} className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:border-emerald-500">✓ Done</button>
                  )}
                </span>
              </li>
            ))}
            {queue.length === 0 && <li className="text-sm text-slate-600">Queue is empty — issue a token.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
