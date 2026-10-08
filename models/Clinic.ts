import mongoose, { Schema } from "mongoose";

const DoctorSchema = new Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String, default: "" },
    room: { type: String, default: "" },
    fee: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Doctor = mongoose.models.Doctor ?? mongoose.model("Doctor", DoctorSchema);

const VisitSchema = new Schema(
  {
    patientName: { type: String, required: true },
    phone: { type: String, default: "" },
    doctorId: { type: String, required: true, index: true },
    doctorName: { type: String, default: "" },
    date: { type: String, required: true }, // YYYY-MM-DD
    token: { type: Number, required: true }, // serial per doctor per day
    status: { type: String, default: "waiting" }, // waiting|serving|done|cancelled
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

VisitSchema.index({ doctorId: 1, date: 1 });

export const Visit = mongoose.models.Visit ?? mongoose.model("Visit", VisitSchema);
