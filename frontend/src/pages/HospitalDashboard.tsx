import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageSquare,
  MinusCircle,
  Plus,
  Save,
  Star,
  Stethoscope,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import type { RootState } from "../store/store";
import { apiRequest } from "../api";

type DashboardTab = "overview" | "profile" | "appointments" | "doctors" | "reviews";

type HospitalProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  specializations: string;
};

type HospitalDoctor = {
  id?: string | number;
  name?: string;
  specialization?: string;
  qualifications?: string;
  experience?: string;
};

type AppointmentResponse = {
  id?: string;
  appointmentTime?: string;
  status?: string;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  reason?: string;
  doctorName?: string;
};

type DoctorForm = {
  name: string;
  specialization: string;
  qualifications: string;
  experience: string;
  email: string;
  phone: string;
  password: string;
};

type DoctorSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

type ClinicApiResponse = {
  clinicId?: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  specializations?: string[];
  doctors?: HospitalDoctor[];
};

type ModerationReview = {
  id: string | number;
  hospitalId?: string | number;
  doctorId?: string | number;
  comment?: string;
  createdAt?: string;
  proofStatus?: string;
  proofType?: string;
  proofUrl?: string;
  badgeType?: string;
};

const extractClinicIdFromHospitalEmail = (email?: string) => {
  if (!email) return null;
  const match = email.match(/\.(\d+)@hospiico\.com$/i);
  return match?.[1] ?? null;
};

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const { hospitalId } = useParams();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const displayName = authUser?.name || "Hospital Admin";
  const clinicIdFromEmail = extractClinicIdFromHospitalEmail(authUser?.email);
  const effectiveClinicId = hospitalId || clinicIdFromEmail || authUser?.id || "";
  const profileStorageKey = `hospital_profile_${effectiveClinicId || "hospital"}`;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [doctorActionError, setDoctorActionError] = useState<string | null>(null);
  const [doctorActionLoading, setDoctorActionLoading] = useState(false);
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [doctorForm, setDoctorForm] = useState<DoctorForm>({
    name: "",
    specialization: "",
    qualifications: "",
    experience: "",
    email: "",
    phone: "",
    password: "",
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>([]);
  const [pendingProofs, setPendingProofs] = useState<ModerationReview[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofSuccess, setProofSuccess] = useState<string | null>(null);
  const [proofActionId, setProofActionId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [profile, setProfile] = useState<HospitalProfile>(() => {
    try {
      const saved = localStorage.getItem(profileStorageKey);
      if (saved) {
        return JSON.parse(saved) as HospitalProfile;
      }
    } catch {
    }

    return {
      name: "City General Hospital",
      address: "Plot No. 45, Banjara Hills Road, Hyderabad",
      phone: "1-234-567-890",
      email: "citygeneral@hospiico.com",
      specializations: "General Medicine, Cardiology, Orthopedics",
    };
  });

  useEffect(() => {
    if (hospitalId && clinicIdFromEmail && hospitalId !== clinicIdFromEmail) {
      navigate(`/hospital-dashboard/${clinicIdFromEmail}`, { replace: true });
    }
  }, [hospitalId, clinicIdFromEmail, navigate]);

  const slotsStorageKey = selectedDoctorId
    ? `hospital_doctor_slots_${effectiveClinicId}_${selectedDoctorId}`
    : "";

  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorSlots([]);
      return;
    }
    try {
      const raw = localStorage.getItem(slotsStorageKey);
      setDoctorSlots(raw ? (JSON.parse(raw) as DoctorSlot[]) : []);
    } catch {
      setDoctorSlots([]);
    }
  }, [selectedDoctorId, slotsStorageKey]);

  useEffect(() => {
    const loadHospital = async () => {
      if (!effectiveClinicId) {
        setLoading(false);
        setLoadError("Unable to resolve hospital profile id");
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);
        let clinic: ClinicApiResponse;
        try {
          clinic = await apiRequest<ClinicApiResponse>(`/api/clinics/id?id=${effectiveClinicId}`, "GET");
        } catch (primaryError) {
          if (!clinicIdFromEmail || clinicIdFromEmail === effectiveClinicId) {
            throw primaryError;
          }
          clinic = await apiRequest<ClinicApiResponse>(`/api/clinics/id?id=${clinicIdFromEmail}`, "GET");
          navigate(`/hospital-dashboard/${clinicIdFromEmail}`, { replace: true });
        }

        const nextProfile: HospitalProfile = {
          name: clinic?.name || profile.name,
          address: [clinic?.address, clinic?.city].filter(Boolean).join(", ") || profile.address,
          phone: clinic?.phone || profile.phone,
          email: clinic?.email || authUser?.email || profile.email,
          specializations: (clinic?.specializations || []).join(", ") || profile.specializations,
        };

        setProfile(nextProfile);
        const nextDoctors = clinic?.doctors || [];
        setDoctors(nextDoctors);
        if (nextDoctors.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(String(nextDoctors[0].id));
        }

        try {
          const clinicAppointments = await apiRequest<AppointmentResponse[]>(
            `/api/appointments/clinic/${effectiveClinicId}`,
            "GET"
          );
          setAppointments(clinicAppointments || []);
          setAppointmentsError(null);
        } catch (appointmentErr) {
          setAppointments([]);
          setAppointmentsError((appointmentErr as Error).message || "Failed to load appointments");
        }
      } catch (error) {
        setLoadError((error as Error).message || "Failed to load hospital profile");
      } finally {
        setLoading(false);
      }
    };

    loadHospital();
  }, [effectiveClinicId, clinicIdFromEmail, authUser?.email, navigate, selectedDoctorId]);

  const persistDoctorSlots = (updated: DoctorSlot[]) => {
    if (!selectedDoctorId) return;
    setDoctorSlots(updated);
    localStorage.setItem(slotsStorageKey, JSON.stringify(updated));
  };

  const addSlot = () => {
    if (!selectedDoctorId) {
      setSlotError("Select a doctor first");
      return;
    }
    if (!slotDate || !slotStart || !slotEnd) {
      setSlotError("Date, start time and end time are required");
      return;
    }
    if (slotEnd <= slotStart) {
      setSlotError("End time must be after start time");
      return;
    }

    const overlap = doctorSlots.some(
      (slot) => slot.date === slotDate && !(slotEnd <= slot.startTime || slotStart >= slot.endTime)
    );
    if (overlap) {
      setSlotError("Slot overlaps existing slot for this date");
      return;
    }

    const updated = [
      ...doctorSlots,
      {
        id: crypto.randomUUID(),
        date: slotDate,
        startTime: slotStart,
        endTime: slotEnd,
      },
    ];
    persistDoctorSlots(updated);
    setSlotError(null);
  };

  const removeSlot = (slotId: string) => {
    persistDoctorSlots(doctorSlots.filter((slot) => slot.id !== slotId));
  };

  const loadDoctorsForClinic = async () => {
    const clinic = await apiRequest<ClinicApiResponse>(`/api/clinics/id?id=${effectiveClinicId}`, "GET");
    const nextDoctors = clinic?.doctors || [];
    setDoctors(nextDoctors);
    if (nextDoctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(String(nextDoctors[0].id));
    }
  };

  const handleAddDoctor = async () => {
    if (!doctorForm.email || !doctorForm.password) {
      setDoctorActionError("Doctor email and password are required");
      return;
    }
    try {
      setDoctorActionLoading(true);
      setDoctorActionError(null);
      await apiRequest(
        "/api/doctors",
        "POST",
        {
          name: doctorForm.name,
          specialization: doctorForm.specialization,
          qualifications: doctorForm.qualifications,
          experience: doctorForm.experience,
          email: doctorForm.email,
          phone: doctorForm.phone,
          password: doctorForm.password,
          clinicId: effectiveClinicId,
        }
      );
      await loadDoctorsForClinic();
      setIsAddDoctorOpen(false);
      setDoctorForm({
        name: "",
        specialization: "",
        qualifications: "",
        experience: "",
        email: "",
        phone: "",
        password: "",
      });
    } catch (error) {
      setDoctorActionError((error as Error).message || "Failed to add doctor");
    } finally {
      setDoctorActionLoading(false);
    }
  };

  const handleRemoveDoctor = async (doctorId?: string | number) => {
    if (!doctorId) return;
    try {
      setDoctorActionLoading(true);
      setDoctorActionError(null);
      await apiRequest(`/api/doctors/${doctorId}`, "DELETE");
      await loadDoctorsForClinic();
      if (String(doctorId) === selectedDoctorId) {
        setSelectedDoctorId("");
      }
    } catch (error) {
      setDoctorActionError((error as Error).message || "Failed to remove doctor");
    } finally {
      setDoctorActionLoading(false);
    }
  };

  const loadPendingProofs = async () => {
    setLoadingProofs(true);
    setProofError(null);
    try {
      const response = await apiRequest<ModerationReview[]>("/api/reviews/moderation/pending", "GET");
      setPendingProofs(response || []);
    } catch (error) {
      setProofError((error as Error).message || "Failed to load pending proof reviews");
    } finally {
      setLoadingProofs(false);
    }
  };

  const handleProofDecision = async (reviewId: string | number, status: "approved" | "rejected") => {
    setProofError(null);
    setProofSuccess(null);
    setProofActionId(String(reviewId));
    try {
      await apiRequest(`/api/reviews/moderation/${reviewId}/status`, "PUT", { status });
      setProofSuccess(`Proof ${status} successfully`);
      await loadPendingProofs();
    } catch (error) {
      setProofError((error as Error).message || "Failed to update proof status");
    } finally {
      setProofActionId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "reviews") {
      void loadPendingProofs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const stats = useMemo(
    () => ({
      appointments: appointments.length,
      doctors: doctors.length,
      reviews: pendingProofs.length,
      rating: "0.0",
    }),
    [appointments.length, doctors.length, pendingProofs.length]
  );

  const quickActions = [
    {
      title: "View Appointments",
      subtitle: "Manage patient bookings",
      icon: <CalendarDays className="h-5 w-5 text-blue-400" />,
      tab: "appointments" as const,
    },
    {
      title: "Add Doctor",
      subtitle: "Expand your medical team",
      icon: <Plus className="h-5 w-5 text-emerald-400" />,
      tab: "doctors" as const,
    },
    {
      title: "Edit Profile",
      subtitle: "Update hospital details",
      icon: <Building2 className="h-5 w-5 text-purple-400" />,
      tab: "profile" as const,
    },
  ];

  const saveProfile = () => {
    localStorage.setItem(profileStorageKey, JSON.stringify(profile));
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#0b1730] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="mb-4 rounded-xl border border-[#2b3f63] bg-[#1b2b47] px-4 py-3 text-[#9db0cf]">Loading hospital profile...</div>
        )}
        {loadError && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{loadError}</div>
        )}

        <section className="bg-[#1b2b47] border border-[#2b3f63] rounded-2xl overflow-hidden">
          <div className="px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2b3f63]">
            <div>
              <h1 className="text-4xl font-bold">{profile.name}</h1>
              <p className="text-[#9db0cf] mt-1 text-lg">Hospital Management Dashboard</p>
            </div>
            <div className="text-right">
              <p className="text-[#9db0cf] text-sm">Welcome back,</p>
              <p className="font-semibold text-xl">{displayName}</p>
            </div>
          </div>

          <div className="px-6">
            <div className="flex flex-wrap gap-7 border-b border-[#2b3f63]">
              <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<ClipboardList className="h-4 w-4" />} label="Overview" />
              <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={<Building2 className="h-4 w-4" />} label="Hospital Profile" />
              <TabButton active={activeTab === "appointments"} onClick={() => setActiveTab("appointments")} icon={<CalendarDays className="h-4 w-4" />} label="Appointments" />
              <TabButton active={activeTab === "doctors"} onClick={() => setActiveTab("doctors")} icon={<Stethoscope className="h-4 w-4" />} label="Doctors" />
              <TabButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} icon={<MessageSquare className="h-4 w-4" />} label="Reviews" />
            </div>

            <div className="py-6">
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <MetricCard title="Total Appointments" value={String(stats.appointments)} icon={<CalendarDays className="h-5 w-5 text-blue-400" />} />
                    <MetricCard title="Doctors" value={String(stats.doctors)} icon={<Stethoscope className="h-5 w-5 text-emerald-400" />} />
                    <MetricCard title="Reviews" value={String(stats.reviews)} icon={<Star className="h-5 w-5 text-yellow-400" />} />
                    <MetricCard title="Rating" value={stats.rating} icon={<Star className="h-5 w-5 text-purple-400" />} />
                  </div>

                  <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl p-6 mb-6">
                    <h2 className="text-2xl font-semibold mb-5">Hospital Information</h2>
                    <div className="grid md:grid-cols-2 gap-6 text-[#d2ddf1]">
                      <InfoItem label="Address" value={profile.address} />
                      <InfoItem label="Phone" value={profile.phone} />
                      <InfoItem label="Email" value={profile.email} />
                      <InfoItem label="Specializations" value={profile.specializations} />
                    </div>
                  </div>

                  <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl p-6">
                    <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      {quickActions.map((action) => (
                        <button
                          key={action.title}
                          onClick={() => setActiveTab(action.tab)}
                          className="text-left border border-[#2f466e] rounded-xl p-4 hover:border-blue-400 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {action.icon}
                            <h3 className="font-semibold text-lg">{action.title}</h3>
                          </div>
                          <p className="text-[#9db0cf] text-sm">{action.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "profile" && (
                <div className="max-w-3xl bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl p-6">
                  <h2 className="text-3xl font-semibold mb-6">Edit Hospital Profile</h2>
                  <div className="space-y-4">
                    <InputField label="Hospital Name" value={profile.name} onChange={(value) => setProfile((p) => ({ ...p, name: value }))} />
                    <InputField label="Address" value={profile.address} onChange={(value) => setProfile((p) => ({ ...p, address: value }))} />
                    <InputField label="Phone" value={profile.phone} onChange={(value) => setProfile((p) => ({ ...p, phone: value }))} />
                    <InputField label="Email" value={profile.email} onChange={(value) => setProfile((p) => ({ ...p, email: value }))} />
                    <InputField
                      label="Specializations"
                      value={profile.specializations}
                      onChange={(value) => setProfile((p) => ({ ...p, specializations: value }))}
                    />

                    <button
                      onClick={saveProfile}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "appointments" && (
                <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl overflow-hidden">
                  {appointmentsError && (
                    <div className="mx-6 mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{appointmentsError}</div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="bg-[#13233d]">
                          <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Patient</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Doctor</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Date & Time</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Symptoms</th>
                          <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appointment, index) => (
                          <tr key={appointment.id ?? String(index)} className="border-t border-[#2b3f63]">
                            <td className="px-6 py-4">{appointment.patientName || "-"}</td>
                            <td className="px-6 py-4 text-[#d2ddf1]">{appointment.doctorName || "-"}</td>
                            <td className="px-6 py-4 text-[#d2ddf1]">{appointment.appointmentTime ? new Date(appointment.appointmentTime).toLocaleString() : "-"}</td>
                            <td className="px-6 py-4 text-[#d2ddf1]">{appointment.reason || "-"}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-3 py-1 rounded-full bg-[#13233d] border border-[#35517f] text-[#d2ddf1] text-xs">
                                {appointment.status || "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {appointments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-[#9db0cf]">No appointments found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === "doctors" && (
                <div className="space-y-4">
                  {doctorActionError && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{doctorActionError}</div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold">Doctors</h3>
                    <button
                      onClick={() => setIsAddDoctorOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4" /> Add Doctor
                    </button>
                  </div>

                  {doctors.length > 0 ? (
                    <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px]">
                          <thead>
                            <tr className="bg-[#13233d]">
                              <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Doctor Name</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Specialization</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Qualifications</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Experience</th>
                              <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doctors.map((doctor, index) => (
                              <tr key={String(doctor.id ?? index)} className="border-t border-[#2b3f63]">
                                <td className="px-6 py-4">{doctor.name || "-"}</td>
                                <td className="px-6 py-4 text-[#d2ddf1]">{doctor.specialization || "-"}</td>
                                <td className="px-6 py-4 text-[#d2ddf1]">{doctor.qualifications || "-"}</td>
                                <td className="px-6 py-4 text-[#d2ddf1]">{doctor.experience || "-"}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setSelectedDoctorId(String(doctor.id ?? ""))}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#35517f] bg-[#13233d] text-[#d2ddf1]"
                                    >
                                      <Clock3 className="h-4 w-4" /> Slots
                                    </button>
                                    <button
                                      onClick={() => handleRemoveDoctor(doctor.id)}
                                      disabled={doctorActionLoading}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                    >
                                      <Trash2 className="h-4 w-4" /> Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <Placeholder icon={<Stethoscope className="h-6 w-6 text-emerald-400" />} title="Doctors" subtitle="No doctors added yet." />
                  )}

                  <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-semibold">Manage Doctor Slots</h4>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="rounded-xl border border-[#35517f] bg-[#13233d] px-3 py-2 text-white"
                      >
                        <option value="">Select doctor</option>
                        {doctors.map((doctor) => (
                          <option key={String(doctor.id)} value={String(doctor.id)}>{doctor.name || doctor.id}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid md:grid-cols-4 gap-3 mb-4">
                      <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="rounded-xl border border-[#35517f] bg-[#13233d] px-3 py-2 text-white" />
                      <input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="rounded-xl border border-[#35517f] bg-[#13233d] px-3 py-2 text-white" />
                      <input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="rounded-xl border border-[#35517f] bg-[#13233d] px-3 py-2 text-white" />
                      <button onClick={addSlot} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2"><Plus className="h-4 w-4" /> Add Slot</button>
                    </div>
                    {slotError && <p className="text-red-300 mb-3">{slotError}</p>}

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {doctorSlots
                        .filter((slot) => slot.date === slotDate)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((slot) => (
                          <div key={slot.id} className="rounded-xl border border-[#35517f] bg-[#13233d] p-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{slot.startTime} - {slot.endTime}</p>
                              <p className="text-xs text-[#9db0cf]">Available</p>
                            </div>
                            <button onClick={() => removeSlot(slot.id)} className="text-red-300 hover:text-red-200"><MinusCircle className="h-5 w-5" /></button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "reviews" && (
                <div className="space-y-4">
                  {(proofError || proofSuccess) && (
                    <div className={`rounded-xl px-4 py-3 ${proofError
                      ? "border border-red-500/40 bg-red-500/10 text-red-200"
                      : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      }`}>
                      {proofError || proofSuccess}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold">Pending Proof Reviews</h3>
                    <button
                      onClick={() => void loadPendingProofs()}
                      className="px-4 py-2 rounded-xl border border-[#35517f] bg-[#13233d] text-[#d2ddf1]"
                    >
                      Refresh Queue
                    </button>
                  </div>

                  <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px]">
                        <thead>
                          <tr className="bg-[#13233d]">
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Review ID</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Doctor ID</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Proof Type</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Submitted</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Comment</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Proof</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold tracking-wider text-[#9db0cf] uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingProofs.map((review) => {
                            const busy = proofActionId === String(review.id);
                            return (
                              <tr key={String(review.id)} className="border-t border-[#2b3f63]">
                                <td className="px-6 py-4">{String(review.id)}</td>
                                <td className="px-6 py-4 text-[#d2ddf1]">{String(review.doctorId || "-")}</td>
                                <td className="px-6 py-4 text-[#d2ddf1]">{review.proofType || "other"}</td>
                                <td className="px-6 py-4 text-[#d2ddf1]">{review.createdAt ? new Date(review.createdAt).toLocaleString() : "-"}</td>
                                <td className="px-6 py-4 text-[#d2ddf1] max-w-xs truncate">{review.comment || "-"}</td>
                                <td className="px-6 py-4">
                                  {review.proofUrl ? (
                                    <a href={review.proofUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">View File</a>
                                  ) : (
                                    <span className="text-[#9db0cf]">No file</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => void handleProofDecision(review.id, "approved")}
                                      disabled={busy}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs"
                                    >
                                      <CheckCircle2 className="h-4 w-4" /> Approve
                                    </button>
                                    <button
                                      onClick={() => void handleProofDecision(review.id, "rejected")}
                                      disabled={busy}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs"
                                    >
                                      <XCircle className="h-4 w-4" /> Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {!loadingProofs && pendingProofs.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-10 text-center text-[#9db0cf]">No pending proof reviews.</td>
                            </tr>
                          )}
                          {loadingProofs && (
                            <tr>
                              <td colSpan={7} className="px-6 py-10 text-center text-[#9db0cf]">Loading pending proof reviews...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#1e2f4d] border border-[#2b3f63]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b3f63]">
              <h3 className="text-2xl font-semibold">Add Doctor</h3>
              <button onClick={() => setIsAddDoctorOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-4">
              <InputField label="Name" value={doctorForm.name} onChange={(value) => setDoctorForm((s) => ({ ...s, name: value }))} />
              <InputField label="Specialization" value={doctorForm.specialization} onChange={(value) => setDoctorForm((s) => ({ ...s, specialization: value }))} />
              <InputField label="Qualifications" value={doctorForm.qualifications} onChange={(value) => setDoctorForm((s) => ({ ...s, qualifications: value }))} />
              <InputField label="Experience" value={doctorForm.experience} onChange={(value) => setDoctorForm((s) => ({ ...s, experience: value }))} />
              <InputField label="Email" value={doctorForm.email} onChange={(value) => setDoctorForm((s) => ({ ...s, email: value }))} />
              <InputField label="Phone" value={doctorForm.phone} onChange={(value) => setDoctorForm((s) => ({ ...s, phone: value }))} />
              <div className="md:col-span-2">
                <InputField label="Password" value={doctorForm.password} onChange={(value) => setDoctorForm((s) => ({ ...s, password: value }))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#2b3f63] flex justify-end gap-3">
              <button onClick={() => setIsAddDoctorOpen(false)} className="px-4 py-2 rounded-xl border border-[#35517f]">Cancel</button>
              <button onClick={handleAddDoctor} disabled={doctorActionLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save Doctor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-colors ${
      active
        ? "border-blue-500 text-blue-300"
        : "border-transparent text-[#9db0cf] hover:text-white"
    }`}
  >
    {icon}
    {label}
  </button>
);

const MetricCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl p-5">
    <div className="flex items-center justify-between mb-2">
      <p className="text-[#9db0cf] text-sm">{title}</p>
      {icon}
    </div>
    <p className="text-4xl font-bold">{value}</p>
  </div>
);

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[#9db0cf] text-sm mb-1">{label}</p>
    <p className="text-lg font-medium">{value || "-"}</p>
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="block text-sm mb-2 text-[#b9c9e3]">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-[#35517f] bg-[#13233d] px-4 py-3 text-white placeholder:text-[#8ea2c4]"
    />
  </div>
);

const Placeholder = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="bg-[#1e2f4d] border border-[#2b3f63] rounded-2xl p-10 text-center">
    <div className="w-12 h-12 mx-auto rounded-xl bg-[#13233d] flex items-center justify-center mb-3">{icon}</div>
    <h3 className="text-2xl font-semibold mb-1">{title}</h3>
    <p className="text-[#9db0cf]">{subtitle}</p>
  </div>
);

export default HospitalDashboard;
