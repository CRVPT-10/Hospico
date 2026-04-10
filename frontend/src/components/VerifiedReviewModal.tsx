import { useEffect, useState } from "react";
import axios from "axios";
import { apiClient, apiRequest } from "../api";

type DoctorOption = {
  id: string | number;
  name: string;
  specialization?: string;
};

type Specialization = {
  id: number;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hospitalId: string | number;
  doctors: DoctorOption[];
  defaultDoctorId?: string | number | null;
  isLoggedIn: boolean;
  editingReview?: {
    id: string | number;
    ratings?: {
      explanationClarity?: number;
      timeSpent?: number;
      diagnosisConfidence?: number;
      waitingTime?: number;
      staffBehavior?: number;
      cleanliness?: number;
      overallExperience?: number;
    };
    comment?: string;
  } | null;
};

const proofTypes = [
  "prescription",
  "opd slip",
  "lab report",
  "discharge summary",
  "consultation bill",
];

const CUSTOM_REVIEW_DOCTOR_META_KEY = "custom_review_doctor_meta_v1";

const emptyRatings = {
  explanationClarity: 5,
  timeSpent: 5,
  diagnosisConfidence: 5,
  waitingTime: 5,
  staffBehavior: 5,
  cleanliness: 5,
  overallExperience: 5,
};

export default function VerifiedReviewModal({
  open,
  onClose,
  onSuccess,
  hospitalId,
  doctors,
  defaultDoctorId,
  isLoggedIn,
  editingReview,
}: Props) {
  const isEditing = !!editingReview;
  const [step, setStep] = useState(isLoggedIn ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [doctorId, setDoctorId] = useState<string>(defaultDoctorId ? String(defaultDoctorId) : "");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState("");
  const [ratings, setRatings] = useState(editingReview?.ratings ? {
    explanationClarity: editingReview.ratings.explanationClarity ?? 5,
    timeSpent: editingReview.ratings.timeSpent ?? 5,
    diagnosisConfidence: editingReview.ratings.diagnosisConfidence ?? 5,
    waitingTime: editingReview.ratings.waitingTime ?? 5,
    staffBehavior: editingReview.ratings.staffBehavior ?? 5,
    cleanliness: editingReview.ratings.cleanliness ?? 5,
    overallExperience: editingReview.ratings.overallExperience ?? 5,
  } : emptyRatings);
  const [comment, setComment] = useState(editingReview?.comment ?? "");
  const [proofType, setProofType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [allSpecializations, setAllSpecializations] = useState<string[]>([]);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEditing) {
        setStep(1);
      } else {
        setStep(isLoggedIn ? 1 : 0);
      }
      setError(null);
      setDoctorId(defaultDoctorId ? String(defaultDoctorId) : "");

      const matchedDoctor = doctors.find((doctor) => String(doctor.id) === String(defaultDoctorId || ""));
      setDoctorName(matchedDoctor?.name || "");
      setDoctorSpecialization(matchedDoctor?.specialization || "");

      if (editingReview?.ratings) {
        setRatings({
          explanationClarity: editingReview.ratings.explanationClarity ?? 5,
          timeSpent: editingReview.ratings.timeSpent ?? 5,
          diagnosisConfidence: editingReview.ratings.diagnosisConfidence ?? 5,
          waitingTime: editingReview.ratings.waitingTime ?? 5,
          staffBehavior: editingReview.ratings.staffBehavior ?? 5,
          cleanliness: editingReview.ratings.cleanliness ?? 5,
          overallExperience: editingReview.ratings.overallExperience ?? 5,
        });
      } else {
        setRatings(emptyRatings);
      }
      setComment(editingReview?.comment ?? "");
      setShowBadgeInfo(false);
    }
  // Re-initialize only when modal context changes; do not depend on doctors array reference
  // to avoid clearing user-typed values while interacting with inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoggedIn, defaultDoctorId, editingReview, isEditing]);

  useEffect(() => {
    if (!open) return;

    const fetchSpecializations = async () => {
      try {
        const data = await apiRequest<Specialization[]>("/api/specializations", "GET");
        const names = (data || [])
          .map((item) => item.name?.trim())
          .filter((name): name is string => Boolean(name));
        setAllSpecializations(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
      } catch {
        // Fallback to known doctors in this hospital if DB list is unavailable.
        const fallback = doctors
          .map((doctor) => doctor.specialization?.trim())
          .filter((value): value is string => Boolean(value));
        setAllSpecializations(Array.from(new Set(fallback)).sort((a, b) => a.localeCompare(b)));
      }
    };

    void fetchSpecializations();
  }, [open, doctors]);

  if (!open) return null;

  const specializationOptions = allSpecializations;

  const resolveDoctorFromInputs = () => {
    const name = doctorName.trim().toLowerCase();
    const specialization = doctorSpecialization.trim().toLowerCase();

    const exactMatch = doctors.find((doctor) => {
      const doctorNameMatches = doctor.name.trim().toLowerCase() === name;
      if (!doctorNameMatches) return false;
      if (!specialization) return true;
      return (doctor.specialization || "").trim().toLowerCase() === specialization;
    });

    if (exactMatch) {
      return exactMatch;
    }

    return doctors.find((doctor) => doctor.name.trim().toLowerCase() === name) || null;
  };

  const resolveDoctorIdForSubmission = () => {
    if (doctorId) {
      return String(doctorId);
    }

    const matched = resolveDoctorFromInputs();
    if (matched) {
      return String(matched.id);
    }

    const specializationOnly = doctorSpecialization.trim().toLowerCase();
    if (specializationOnly) {
      const bySpecialization = doctors.find(
        (doctor) => (doctor.specialization || "").trim().toLowerCase() === specializationOnly
      );
      if (bySpecialization) {
        return String(bySpecialization.id);
      }
    }

    if (defaultDoctorId != null) {
      return String(defaultDoctorId);
    }

    if (doctors.length > 0) {
      return String(doctors[0].id);
    }

    // Project phase fallback: allow review submission even when hospital has no doctors configured yet.
    return "0";
  };

  const handleStep1Next = () => {
    setError(null);

    if (!doctorName.trim() || !doctorSpecialization.trim()) {
      setError("Required: Enter doctor name and specialization");
      return;
    }

    const resolvedDoctorId = resolveDoctorIdForSubmission();
    setDoctorId(resolvedDoctorId);
    setStep(2);
  };

  const handleStep2Next = () => {
    setError(null);
    if (!comment.trim()) {
      setError("Required: Describe your experience");
      return;
    }
    setStep(3);
  };

  const sendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ sessionId: string }>("/api/reviews/otp/send", "POST", { phone });
      setOtpSessionId(result.sessionId);
    } catch (err) {
      setError((err as Error).message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/api/reviews/otp/verify", "POST", {
        sessionId: otpSessionId,
        otpCode,
      });
      setOtpVerified(true);
      setStep(1);
    } catch (err) {
      setError((err as Error).message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (withoutProof = false) => {
    const resolvedDoctorId = resolveDoctorIdForSubmission();

    setDoctorId(String(resolvedDoctorId));

    if (!comment.trim()) {
      setError("Comment is required");
      return;
    }

    if (!withoutProof && !file) {
      setError("Please upload proof and use Submit Review, or use Submit Review Without Proof");
      return;
    }

    if (withoutProof && file) {
      setError("Proof is already selected. Use Submit Review to include proof");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let savedReviewId: string | number | null = null;

      if (isEditing && editingReview) {
        const average = (ratings.explanationClarity + ratings.timeSpent + ratings.diagnosisConfidence + 
                        ratings.waitingTime + ratings.staffBehavior + ratings.cleanliness + 
                        ratings.overallExperience) / 7;
        const updateData = {
          rating: Math.round(average * 10) / 10,
          comment: comment.trim() || null,
          explanation_clarity: ratings.explanationClarity,
          time_spent: ratings.timeSpent,
          diagnosis_confidence: ratings.diagnosisConfidence,
          waiting_time: ratings.waitingTime,
          staff_behavior: ratings.staffBehavior,
          cleanliness: ratings.cleanliness,
          overall_experience: ratings.overallExperience,
        };
        const updatedReview = await apiRequest<{ id?: string | number }>(`/api/reviews/${editingReview.id}`, "PUT", updateData);
        savedReviewId = updatedReview?.id ?? editingReview.id;
      } else {
        const formData = new FormData();
        formData.append("hospitalId", String(hospitalId));
        formData.append("doctorId", String(resolvedDoctorId));
        formData.append("explanationClarity", String(ratings.explanationClarity));
        formData.append("timeSpent", String(ratings.timeSpent));
        formData.append("diagnosisConfidence", String(ratings.diagnosisConfidence));
        formData.append("waitingTime", String(ratings.waitingTime));
        formData.append("staffBehavior", String(ratings.staffBehavior));
        formData.append("cleanliness", String(ratings.cleanliness));
        formData.append("overallExperience", String(ratings.overallExperience));
        formData.append("comment", comment.trim());

        if (!isLoggedIn) {
          formData.append("phone", phone);
          formData.append("otpSessionId", otpSessionId);
          formData.append("otpCode", otpCode);
        }

        if (!withoutProof && file) {
          if (proofType) {
            formData.append("proofType", proofType);
          }
          formData.append("file", file);
        }

        const createdResponse = await apiClient.post<{ id?: string | number }>("/api/reviews/create", formData);
        savedReviewId = createdResponse?.data?.id ?? null;
      }

      if (savedReviewId != null && (doctorName.trim() || doctorSpecialization.trim())) {
        try {
          const raw = localStorage.getItem(CUSTOM_REVIEW_DOCTOR_META_KEY);
          const parsed = raw ? JSON.parse(raw) as Record<string, { name?: string; specialization?: string }> : {};
          parsed[String(savedReviewId)] = {
            name: doctorName.trim() || undefined,
            specialization: doctorSpecialization.trim() || undefined,
          };
          localStorage.setItem(CUSTOM_REVIEW_DOCTOR_META_KEY, JSON.stringify(parsed));
        } catch {
          // Non-blocking: do not fail review submission if localStorage is unavailable.
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      let message = "Failed to submit review";
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        if (typeof responseData === "string" && responseData.trim()) {
          message = responseData;
        } else if (responseData && typeof responseData === "object" && "message" in responseData) {
          const serverMessage = (responseData as { message?: string }).message;
          if (serverMessage) {
            message = serverMessage;
          }
        } else if (err.message) {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStarRatingRow = (label: string, key: keyof typeof ratings) => (
    <div className="flex items-center justify-between gap-4" key={key}>
      <label className="text-sm text-gray-700 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRatings((prev) => ({ ...prev, [key]: value }))}
            className={`text-xl leading-none transition-colors ${ratings[key] >= value ? "text-amber-500" : "text-slate-400 dark:text-slate-500 hover:text-amber-400"}`}
            aria-label={`${label} ${value} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{isEditing ? "Edit Review" : "Write a Verified Review"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-300">Close</button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-300">
              {error}
            </div>
          )}

          {step === 0 && !isLoggedIn && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">Verify phone with OTP</p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading || !phone}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
                >
                  Send OTP
                </button>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading || !otpSessionId || !otpCode}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
                >
                  Verify OTP
                </button>
              </div>
              {otpVerified && <p className="text-emerald-600 text-sm">Phone verified. Badge: Verified Phone</p>}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">Step 1: Enter Doc details and rate ur visit</p>
              <input
                list="doctor-name-options"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Enter doctor name"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <datalist id="doctor-name-options">
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name} />
                ))}
              </datalist>

              <select
                value={doctorSpecialization}
                onChange={(e) => setDoctorSpecialization(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Select specialization</option>
                {specializationOptions.map((specialization) => (
                  <option key={specialization} value={specialization} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                    {specialization}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderStarRatingRow("Doctor: Explanation Clarity", "explanationClarity")}
                {renderStarRatingRow("Doctor: Time Spent", "timeSpent")}
                {renderStarRatingRow("Doctor: Diagnosis Confidence", "diagnosisConfidence")}
                {renderStarRatingRow("Hospital: Waiting Time", "waitingTime")}
                {renderStarRatingRow("Hospital: Staff Behavior", "staffBehavior")}
                {renderStarRatingRow("Hospital: Cleanliness", "cleanliness")}
                {renderStarRatingRow("Hospital: Overall Experience", "overallExperience")}
              </div>

              <button
                type="button"
                onClick={handleStep1Next}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-slate-300">Describe ur Experience*</p>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience (Doctor Explanation Clarity, Doctor Time Spent, Doctor Diagnosis Confidence, Hospital Waiting Time, Hospital Staff Behavior, Hospital Cleanliness, Hospital Overall Experience)"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900">Back</button>
                <button type="button" onClick={handleStep2Next} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Step 3: Upload Visit Proof to get a <span className="font-bold text-gray-900 dark:text-slate-100">Verified Badge</span> - Optional
                </p>
                <button
                  type="button"
                  onClick={() => setShowBadgeInfo((prev) => !prev)}
                  className="text-xs text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-500"
                >
                  See how Verification Badge Works?
                </button>
              </div>

              {showBadgeInfo && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-3 py-3 text-sm text-gray-700 dark:text-slate-200 space-y-2">
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Badge Hierarchy</p>
                  <p className="font-medium">Priority:</p>
                  <p>1. Hospital Verified Visit (future)</p>
                  <p>2. Verified Patient Visit</p>
                  <p>3. Verified Phone</p>
                  <p>4. Normal Reviews</p>
                  <p className="pt-1 text-xs text-gray-600 dark:text-slate-300">
                    How this works: uploading visit proof puts the review in pending verification. Once approved by Admin/Hospital moderation,
                    badge upgrades to Verified Patient Visit. If proof is not approved but phone is verified, badge remains Verified Phone.
                  </p>
                </div>
              )}

              <select
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Choose proof type (optional)</option>
                {proofTypes.map((type) => (
                  <option key={type} value={type} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">{type}</option>
                ))}
              </select>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-900 dark:text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-blue-700"
              />
              {file && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-300/40 dark:border-emerald-700/50 bg-emerald-50/60 dark:bg-emerald-900/20 px-3 py-2">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 truncate pr-3">
                    Selected proof: {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs font-medium text-emerald-800 dark:text-emerald-200 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-slate-400">Allowed: JPG, PNG, PDF up to 5MB</p>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900">Back</button>
                <button type="button" onClick={() => submitReview(false)} disabled={loading || !file} className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60">
                  {loading ? "Submitting..." : "Submit Review"}
                </button>
                <button type="button" onClick={() => submitReview(true)} disabled={loading || !!file} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                  Submit Review Without Proof
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
