import { NextResponse } from "next/server";
import { addDoctor, addVisit, listDoctors } from "@/lib/store";

/** One-click demo data for client demos. */
export async function POST() {
  let doctors = await listDoctors();
  if (doctors.length === 0) {
    await addDoctor("Dr. Nasrin Akter", "Medicine", "Room 101", 500);
    await addDoctor("Dr. Kamal Hossain", "Child Specialist", "Room 102", 600);
    doctors = await listDoctors();
  }
  const today = new Date().toISOString().slice(0, 10);
  const patients = ["Rahim Uddin", "Shimu Akter", "Karim Sheikh"];
  let added = 0;
  for (let i = 0; i < patients.length; i++) {
    try {
      await addVisit({
        patientName: patients[i],
        phone: "01XXXXXXXXX",
        doctorId: doctors[i % doctors.length].id,
        date: today,
        note: "Demo visit",
      });
      added++;
    } catch {
      /* re-seed — skip */
    }
  }
  return NextResponse.json({ doctors: doctors.length, added });
}
