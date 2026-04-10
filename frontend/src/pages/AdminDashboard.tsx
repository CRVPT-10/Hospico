import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Building2, CheckCircle2, RefreshCcw, Save, UserPlus, UserRoundPlus, XCircle } from "lucide-react";
import { API_BASE_URL, apiRequest } from "../api";
import HospitalCardComponent, { type Hospital as HospitalCardData } from "../components/HospitalCard";
import type { RootState } from "../store/store";

type ClinicListItem = {
  clinicId?: string;
  publicId?: string;
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  imageUrl?: string;
  specializations?: string[];
};

type ClinicDetails = {
  clinicId?: string;
  publicId?: string;
  name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  timings?: string;
  imageUrl?: string;
  specializations?: string[];
};

type ClinicFormState = {
  name: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  phone: string;
  website: string;
  timings: string;
  imageUrl: string;
  specializations: string;
};

type DoctorFormState = {
  clinicId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  qualifications: string;
  specialization: string;
  experience: string;
  biography: string;
  fees: string;
  imageUrl: string;
};

type ModerationReview = {
  id: string | number;
  hospitalId?: string | number;
  clinicId?: string | number;
  clinic_id?: string | number;
  doctorId?: string | number;
  comment?: string;
  createdAt?: string;
  proofStatus?: string;
  proofType?: string;
  proofUrl?: string;
  badgeType?: string;
};

type HospitalAddRequest = {
  id: number;
  hospitalName: string;
  address: string;
  city: string;
  phone?: string;
  timings?: string;
  imageUrl?: string;
  specializations?: string;
  status: "pending" | "approved" | "disapproved";
  createdAt?: string;
  reviewedAt?: string;
  createdClinicId?: string;
};

type ClinicImageUploadResponse = {
  imageUrl?: string;
  fileName?: string;
};

const emptyClinicForm: ClinicFormState = {
  name: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  phone: "",
  website: "",
  timings: "",
  imageUrl: "",
  specializations: "",
};

const emptyDoctorForm: DoctorFormState = {
  clinicId: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  qualifications: "",
  specialization: "",
  experience: "",
  biography: "",
  fees: "",
  imageUrl: "",
};

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toClinicForm = (clinic: ClinicDetails): ClinicFormState => ({
  name: clinic.name || "",
  address: clinic.address || "",
  city: clinic.city || "",
  latitude: clinic.latitude != null ? String(clinic.latitude) : "",
  longitude: clinic.longitude != null ? String(clinic.longitude) : "",
  phone: clinic.phone || "",
  website: clinic.website || "",
  timings: clinic.timings || "",
  imageUrl: clinic.imageUrl || "",
  specializations: (clinic.specializations || []).join(", "),
});

const buildClinicPayload = (form: ClinicFormState) => ({
  name: form.name.trim(),
  address: form.address.trim(),
  city: form.city.trim(),
  latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
  longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
  phone: form.phone.trim() || undefined,
  website: form.website.trim() || undefined,
  timings: form.timings.trim() || undefined,
  imageUrl: form.imageUrl.trim() || undefined,
  specializations: splitCsv(form.specializations),
});

const isAllowedHospitalImageType = (file: File) =>
  ["image/jpeg", "image/jpg", "image/png"].includes(file.type.toLowerCase());

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

const compressImageFile = async (file: File): Promise<string> => {
  const originalDataUrl = await readFileAsDataUrl(file);

  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 900;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(originalDataUrl);
        return;
      }

      // Flatten transparency so PNG alpha does not render as a dark/blank band in cards.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => resolve(originalDataUrl);
    image.src = originalDataUrl;
  });
};

const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/jpeg" });
};

const toHospitalCardPreview = (id: string, form: ClinicFormState, imageUrlOverride?: string): HospitalCardData => {
  const parsedLatitude = form.latitude.trim() ? Number(form.latitude) : undefined;
  const parsedLongitude = form.longitude.trim() ? Number(form.longitude) : undefined;
  return {
    id,
    name: form.name.trim() || "Hospital Name Preview",
    address: form.address.trim() || "Address preview",
    city: form.city.trim() || undefined,
    imageUrl: imageUrlOverride || form.imageUrl.trim() || undefined,
    specializations: splitCsv(form.specializations),
    latitude: Number.isFinite(parsedLatitude as number) ? parsedLatitude : undefined,
    longitude: Number.isFinite(parsedLongitude as number) ? parsedLongitude : undefined,
  };
};

export default function AdminDashboard() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = authUser?.role?.toUpperCase() === "ADMIN";

  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitals, setHospitals] = useState<ClinicListItem[]>([]);
  const [selectedEditCity, setSelectedEditCity] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [hospitalError, setHospitalError] = useState<string | null>(null);
  const [hospitalSuccess, setHospitalSuccess] = useState<string | null>(null);

  const [addHospitalForm, setAddHospitalForm] = useState<ClinicFormState>(emptyClinicForm);
  const [editHospitalForm, setEditHospitalForm] = useState<ClinicFormState>(emptyClinicForm);

  const [creatingHospital, setCreatingHospital] = useState(false);
  const [savingHospital, setSavingHospital] = useState(false);
  const [editHospitalImagePreview, setEditHospitalImagePreview] = useState<string | null>(null);
  const [addHospitalImagePreview, setAddHospitalImagePreview] = useState<string | null>(null);
  const [showEditHospitalImagePreview, setShowEditHospitalImagePreview] = useState(false);
  const [showAddHospitalImagePreview, setShowAddHospitalImagePreview] = useState(false);
  const [hospitalImageUploading, setHospitalImageUploading] = useState<"add" | "edit" | null>(null);

  const [doctorCreateForm, setDoctorCreateForm] = useState<DoctorFormState>(emptyDoctorForm);
  const [doctorAssignForm, setDoctorAssignForm] = useState<DoctorFormState>(emptyDoctorForm);
  const [selectedDoctorCreateCity, setSelectedDoctorCreateCity] = useState("");
  const [selectedDoctorAssignCity, setSelectedDoctorAssignCity] = useState("");
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorSuccess, setDoctorSuccess] = useState<string | null>(null);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [assigningDoctor, setAssigningDoctor] = useState(false);
  const [pendingProofs, setPendingProofs] = useState<ModerationReview[]>([]);
  const [loadingModeration, setLoadingModeration] = useState(false);
  const [moderationActionId, setModerationActionId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderationSuccess, setModerationSuccess] = useState<string | null>(null);
  const [pendingHospitalRequests, setPendingHospitalRequests] = useState<HospitalAddRequest[]>([]);
  const [loadingHospitalRequests, setLoadingHospitalRequests] = useState(false);
  const [hospitalRequestActionId, setHospitalRequestActionId] = useState<string | null>(null);
  const [hospitalRequestError, setHospitalRequestError] = useState<string | null>(null);
  const [hospitalRequestSuccess, setHospitalRequestSuccess] = useState<string | null>(null);
  const [previewHospitalRequestImageUrl, setPreviewHospitalRequestImageUrl] = useState<string | null>(null);
  const [previewHospitalRequestCard, setPreviewHospitalRequestCard] = useState<HospitalCardData | null>(null);

  const cityMatches = (hospitalCity?: string, selectedCity?: string) =>
    (hospitalCity || "").trim().toLowerCase() === (selectedCity || "").trim().toLowerCase();

  const hospitalCities = useMemo(
    () =>
      Array.from(
        new Set(
          hospitals
            .map((hospital) => hospital.city?.trim())
            .filter((city): city is string => Boolean(city))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [hospitals]
  );

  const editHospitalsByCity = useMemo(
    () => (selectedEditCity ? hospitals.filter((hospital) => cityMatches(hospital.city, selectedEditCity)) : []),
    [hospitals, selectedEditCity]
  );

  const doctorCreateHospitalsByCity = useMemo(
    () =>
      selectedDoctorCreateCity
        ? hospitals.filter((hospital) => cityMatches(hospital.city, selectedDoctorCreateCity))
        : [],
    [hospitals, selectedDoctorCreateCity]
  );

  const doctorAssignHospitalsByCity = useMemo(
    () =>
      selectedDoctorAssignCity
        ? hospitals.filter((hospital) => cityMatches(hospital.city, selectedDoctorAssignCity))
        : [],
    [hospitals, selectedDoctorAssignCity]
  );

  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.clinicId === selectedClinicId) || null,
    [hospitals, selectedClinicId]
  );

  const clinicNameById = useMemo(() => {
    const map = new Map<string, string>();
    hospitals.forEach((hospital) => {
      if (hospital.clinicId) {
        map.set(String(hospital.clinicId), hospital.name || String(hospital.clinicId));
      }
    });
    return map;
  }, [hospitals]);

  const getClinicDisplay = (review: ModerationReview) => {
    const clinicId = review.hospitalId ?? review.clinicId ?? review.clinic_id;
    if (clinicId == null) {
      return "-";
    }
    const key = String(clinicId);
    return clinicNameById.get(key) || key;
  };

  const resolveImageUrl = (value?: string) => {
    if (!value) return "";
    if (/^(https?:|data:|blob:)/i.test(value)) {
      return value;
    }
    if (value.startsWith("/")) {
      if (!API_BASE_URL || API_BASE_URL === "/api" || API_BASE_URL.endsWith("/api")) {
        return value;
      }
      return `${API_BASE_URL}${value}`;
    }
    return value;
  };

  const clearMessages = () => {
    setHospitalError(null);
    setHospitalSuccess(null);
    setDoctorError(null);
    setDoctorSuccess(null);
  };

  const loadHospitals = async () => {
    setLoadingHospitals(true);
    setHospitalError(null);
    try {
      const response = await apiRequest<ClinicListItem[]>("/api/clinics", "GET");
      const items = (response || []).filter((item) => item.clinicId);
      setHospitals(items);
    } catch (err) {
      setHospitalError((err as Error).message || "Failed to load hospitals");
    } finally {
      setLoadingHospitals(false);
    }
  };

  const loadPendingProofs = async () => {
    setLoadingModeration(true);
    setModerationError(null);
    try {
      const response = await apiRequest<ModerationReview[]>("/api/reviews/moderation/pending", "GET");
      setPendingProofs(response || []);
    } catch (err) {
      setModerationError((err as Error).message || "Failed to load pending proof reviews");
    } finally {
      setLoadingModeration(false);
    }
  };

  const loadPendingHospitalRequests = async () => {
    setLoadingHospitalRequests(true);
    setHospitalRequestError(null);
    try {
      const response = await apiRequest<HospitalAddRequest[]>('/api/hospital-requests/pending', 'GET');
      setPendingHospitalRequests(response || []);
    } catch (err) {
      setHospitalRequestError((err as Error).message || 'Failed to load pending hospital requests');
    } finally {
      setLoadingHospitalRequests(false);
    }
  };

  const handleHospitalRequestDecision = async (requestId: number, status: 'approved' | 'disapproved') => {
    setHospitalRequestError(null);
    setHospitalRequestSuccess(null);
    setHospitalRequestActionId(String(requestId));

    try {
      await apiRequest(`/api/hospital-requests/${requestId}/status`, 'PUT', { status });
      setHospitalRequestSuccess(
        status === 'approved'
          ? 'Hospital request approved and hospital created successfully'
          : 'Hospital request disapproved'
      );
      await Promise.all([loadPendingHospitalRequests(), loadHospitals()]);
    } catch (err) {
      setHospitalRequestError((err as Error).message || 'Failed to update hospital request');
    } finally {
      setHospitalRequestActionId(null);
    }
  };

  const handleModerationDecision = async (reviewId: string | number, status: "approved" | "rejected") => {
    setModerationError(null);
    setModerationSuccess(null);
    setModerationActionId(String(reviewId));
    try {
      await apiRequest(`/api/reviews/moderation/${reviewId}/status`, "PUT", { status });
      setModerationSuccess(`Proof ${status} successfully`);
      await loadPendingProofs();
    } catch (err) {
      setModerationError((err as Error).message || "Failed to update proof status");
    } finally {
      setModerationActionId(null);
    }
  };

  useEffect(() => {
    if (hospitals.length === 0) {
      setSelectedEditCity("");
      setSelectedClinicId("");
      return;
    }

    const nextCity =
      selectedEditCity && hospitalCities.some((city) => cityMatches(city, selectedEditCity))
        ? selectedEditCity
        : hospitalCities[0] || "";

    if (nextCity !== selectedEditCity) {
      setSelectedEditCity(nextCity);
      return;
    }

    const cityHospitals = hospitals.filter((hospital) => cityMatches(hospital.city, nextCity));
    const nextClinicId =
      cityHospitals.find((hospital) => hospital.clinicId === selectedClinicId)?.clinicId ||
      cityHospitals[0]?.clinicId ||
      "";

    if (nextClinicId !== selectedClinicId) {
      setSelectedClinicId(nextClinicId);
    }
  }, [hospitals, hospitalCities, selectedEditCity, selectedClinicId]);

  useEffect(() => {
    if (hospitals.length === 0) {
      setSelectedDoctorCreateCity("");
      setDoctorCreateForm((prev) => ({ ...prev, clinicId: "" }));
      return;
    }

    const nextCity =
      selectedDoctorCreateCity && hospitalCities.some((city) => cityMatches(city, selectedDoctorCreateCity))
        ? selectedDoctorCreateCity
        : hospitalCities[0] || "";

    if (nextCity !== selectedDoctorCreateCity) {
      setSelectedDoctorCreateCity(nextCity);
      return;
    }

    const cityHospitals = hospitals.filter((hospital) => cityMatches(hospital.city, nextCity));
    const nextClinicId =
      cityHospitals.find((hospital) => hospital.clinicId === doctorCreateForm.clinicId)?.clinicId ||
      cityHospitals[0]?.clinicId ||
      "";

    if (nextClinicId !== doctorCreateForm.clinicId) {
      setDoctorCreateForm((prev) => ({ ...prev, clinicId: nextClinicId }));
    }
  }, [hospitals, hospitalCities, selectedDoctorCreateCity, doctorCreateForm.clinicId]);

  useEffect(() => {
    if (hospitals.length === 0) {
      setSelectedDoctorAssignCity("");
      setDoctorAssignForm((prev) => ({ ...prev, clinicId: "" }));
      return;
    }

    const nextCity =
      selectedDoctorAssignCity && hospitalCities.some((city) => cityMatches(city, selectedDoctorAssignCity))
        ? selectedDoctorAssignCity
        : hospitalCities[0] || "";

    if (nextCity !== selectedDoctorAssignCity) {
      setSelectedDoctorAssignCity(nextCity);
      return;
    }

    const cityHospitals = hospitals.filter((hospital) => cityMatches(hospital.city, nextCity));
    const nextClinicId =
      cityHospitals.find((hospital) => hospital.clinicId === doctorAssignForm.clinicId)?.clinicId ||
      cityHospitals[0]?.clinicId ||
      "";

    if (nextClinicId !== doctorAssignForm.clinicId) {
      setDoctorAssignForm((prev) => ({ ...prev, clinicId: nextClinicId }));
    }
  }, [hospitals, hospitalCities, selectedDoctorAssignCity, doctorAssignForm.clinicId]);

  const loadHospitalDetails = async (clinicId: string) => {
    if (!clinicId) {
      setEditHospitalForm(emptyClinicForm);
      return;
    }

    try {
      const details = await apiRequest<ClinicDetails>(`/api/clinics/id?id=${clinicId}`, "GET");
      setEditHospitalForm(toClinicForm(details));
      setEditHospitalImagePreview(details.imageUrl || null);
      setShowEditHospitalImagePreview(false);
    } catch (err) {
      setHospitalError((err as Error).message || "Failed to load selected hospital details");
    }
  };

  const handleClinicImageChange = async (file: File | null, mode: "edit" | "add") => {
    if (!file) return;

    if (!isAllowedHospitalImageType(file)) {
      setHospitalError("Only JPG, JPEG, and PNG files are allowed");
      return;
    }

    setHospitalImageUploading(mode);
    try {
      const previewDataUrl = await compressImageFile(file);
      if (!previewDataUrl) {
        throw new Error("Invalid image data");
      }

      const uploadFile = await dataUrlToFile(
        previewDataUrl,
        `${file.name.replace(/\.[^.]+$/, "") || "hospital-image"}.jpg`
      );

      const formData = new FormData();
      formData.append("file", uploadFile);

      const uploadResponse = await apiRequest<ClinicImageUploadResponse>("/api/clinics/upload-image", "POST", formData);
      const imageUrl = uploadResponse.imageUrl?.trim();
      if (!imageUrl) {
        throw new Error("Hospital image upload did not return a valid URL");
      }

      if (mode === "edit") {
        setEditHospitalForm((prev) => ({ ...prev, imageUrl }));
        setEditHospitalImagePreview(previewDataUrl);
        setShowEditHospitalImagePreview(true);
      } else {
        setAddHospitalForm((prev) => ({ ...prev, imageUrl }));
        setAddHospitalImagePreview(previewDataUrl);
        setShowAddHospitalImagePreview(true);
      }

      setHospitalError(null);
    } catch (err) {
      setHospitalError((err as Error).message || "Failed to load selected image");
    } finally {
      setHospitalImageUploading(null);
    }
  };

  useEffect(() => {
    void loadHospitals();
    void loadPendingProofs();
    void loadPendingHospitalRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClinicId) return;
    void loadHospitalDetails(selectedClinicId);
    setDoctorCreateForm((prev) => ({ ...prev, clinicId: prev.clinicId || selectedClinicId }));
    setDoctorAssignForm((prev) => ({ ...prev, clinicId: prev.clinicId || selectedClinicId }));
  }, [selectedClinicId]);

  const handleCreateHospital = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!addHospitalForm.name.trim() || !addHospitalForm.address.trim() || !addHospitalForm.city.trim()) {
      setHospitalError("Name, address, and city are required to add a hospital");
      return;
    }

    if (hospitalImageUploading === "add") {
      setHospitalError("Wait for the hospital image upload to finish before creating the hospital");
      return;
    }

    setCreatingHospital(true);
    try {
      await apiRequest("/api/clinics", "POST", buildClinicPayload(addHospitalForm));
      setAddHospitalForm(emptyClinicForm);
      setAddHospitalImagePreview(null);
      setShowAddHospitalImagePreview(false);
      setHospitalSuccess("Hospital created successfully");
      await loadHospitals();
    } catch (err) {
      setHospitalError((err as Error).message || "Failed to create hospital");
    } finally {
      setCreatingHospital(false);
    }
  };

  const handleSaveHospital = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!selectedClinicId) {
      setHospitalError("Select a hospital to edit");
      return;
    }

    if (!editHospitalForm.name.trim() || !editHospitalForm.address.trim() || !editHospitalForm.city.trim()) {
      setHospitalError("Name, address, and city are required to update a hospital");
      return;
    }

    if (hospitalImageUploading === "edit") {
      setHospitalError("Wait for the hospital image upload to finish before saving changes");
      return;
    }

    setSavingHospital(true);
    try {
      await apiRequest(`/api/clinics?id=${selectedClinicId}`, "PUT", buildClinicPayload(editHospitalForm));
      setHospitalSuccess("Hospital updated successfully");
      await loadHospitals();
      await loadHospitalDetails(selectedClinicId);
    } catch (err) {
      setHospitalError((err as Error).message || "Failed to update hospital");
    } finally {
      setSavingHospital(false);
    }
  };

  const handleCreateDoctor = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (
      !doctorCreateForm.clinicId ||
      !doctorCreateForm.name.trim() ||
      !doctorCreateForm.email.trim() ||
      !doctorCreateForm.phone.trim() ||
      !doctorCreateForm.password.trim()
    ) {
      setDoctorError("Clinic, doctor name, email, phone, and password are required");
      return;
    }

    setCreatingDoctor(true);
    try {
      await apiRequest("/api/doctors", "POST", {
        clinicId: doctorCreateForm.clinicId,
        name: doctorCreateForm.name.trim(),
        email: doctorCreateForm.email.trim(),
        phone: doctorCreateForm.phone.trim(),
        password: doctorCreateForm.password,
        qualifications: doctorCreateForm.qualifications.trim() || undefined,
        specialization: doctorCreateForm.specialization.trim() || undefined,
        experience: doctorCreateForm.experience.trim() || undefined,
        biography: doctorCreateForm.biography.trim() || undefined,
        fees: doctorCreateForm.fees.trim() ? Number(doctorCreateForm.fees) : undefined,
        imageUrl: doctorCreateForm.imageUrl.trim() || undefined,
      });
      setDoctorSuccess("Doctor account created and linked to hospital");
      setDoctorCreateForm({ ...emptyDoctorForm, clinicId: doctorCreateForm.clinicId });
    } catch (err) {
      setDoctorError((err as Error).message || "Failed to create doctor");
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleAssignExistingDoctor = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!doctorAssignForm.clinicId || !doctorAssignForm.email.trim() || !doctorAssignForm.password.trim()) {
      setDoctorError("Clinic, doctor email and password are required to assign an existing doctor");
      return;
    }

    setAssigningDoctor(true);
    try {
      await apiRequest("/api/doctors", "POST", {
        clinicId: doctorAssignForm.clinicId,
        email: doctorAssignForm.email.trim(),
        password: doctorAssignForm.password,
        name: doctorAssignForm.name.trim() || undefined,
        qualifications: doctorAssignForm.qualifications.trim() || undefined,
        specialization: doctorAssignForm.specialization.trim() || undefined,
        experience: doctorAssignForm.experience.trim() || undefined,
        biography: doctorAssignForm.biography.trim() || undefined,
        fees: doctorAssignForm.fees.trim() ? Number(doctorAssignForm.fees) : undefined,
        imageUrl: doctorAssignForm.imageUrl.trim() || undefined,
      });
      setDoctorSuccess("Existing doctor linked to selected hospital");
      setDoctorAssignForm({ ...emptyDoctorForm, clinicId: doctorAssignForm.clinicId });
    } catch (err) {
      setDoctorError((err as Error).message || "Failed to assign existing doctor");
    } finally {
      setAssigningDoctor(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900 px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/40 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="mt-3 text-red-600 dark:text-red-400">
            Access denied. Only ADMIN users can manage hospitals and doctors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">
              Manage hospitals, create doctors, and assign doctors to hospitals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadHospitals();
              void loadPendingProofs();
              void loadPendingHospitalRequests();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Refresh Data
          </button>
        </div>

        {(hospitalError || doctorError) && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-300">
            {hospitalError || doctorError}
          </div>
        )}

        {(moderationError || moderationSuccess) && (
          <div className={`rounded-lg p-3 ${moderationError
            ? "border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
            : "border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
            }`}>
            {moderationError || moderationSuccess}
          </div>
        )}

        {(hospitalRequestError || hospitalRequestSuccess) && (
          <div className={`rounded-lg p-3 ${hospitalRequestError
            ? "border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
            : "border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
            }`}>
            {hospitalRequestError || hospitalRequestSuccess}
          </div>
        )}

        {(hospitalSuccess || doctorSuccess) && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-emerald-700 dark:text-emerald-300">
            {hospitalSuccess || doctorSuccess}
          </div>
        )}

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Pending Hospital Add Requests</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">Approve to create a new hospital in database, or disapprove the request.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadPendingHospitalRequests()}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-200"
            >
              Refresh Queue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Request ID</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Hospital</th>
                  <th className="w-[250px] text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Address</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">City</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Phone</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Timings</th>
                  <th className="w-[210px] text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Specializations</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Image</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Hospital Card</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Submitted</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingHospitalRequests.map((request) => {
                  const busy = hospitalRequestActionId === String(request.id);
                  return (
                    <tr key={request.id} className="border-b border-gray-100 dark:border-slate-700/60">
                      <td className="py-3 pr-4 text-sm text-gray-900 dark:text-slate-100">{request.id}</td>
                      <td className="py-3 pr-4 text-sm text-gray-900 dark:text-slate-100">{request.hospitalName}</td>
                      <td className="w-[250px] py-3 pr-4 text-sm text-gray-700 dark:text-slate-300 whitespace-normal break-words">{request.address}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">{request.city}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">{request.phone || "-"}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">{request.timings || "-"}</td>
                      <td className="w-[210px] py-3 pr-4 text-sm text-gray-700 dark:text-slate-300 whitespace-normal break-words">{request.specializations || "-"}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">
                        {request.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewHospitalRequestImageUrl(resolveImageUrl(request.imageUrl))}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            Preview
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewHospitalRequestCard({
                              id: `request-card-${request.id}`,
                              name: request.hospitalName,
                              address: request.address,
                              city: request.city,
                              imageUrl: request.imageUrl,
                              specializations: (request.specializations || "")
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            })
                          }
                          className="inline-flex items-center px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Preview
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">
                        {request.createdAt ? new Date(request.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col items-start gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleHospitalRequestDecision(request.id, 'approved')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleHospitalRequestDecision(request.id, 'disapproved')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs"
                          >
                            <XCircle size={14} /> Disapprove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loadingHospitalRequests && pendingHospitalRequests.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                      No pending hospital add requests.
                    </td>
                  </tr>
                )}

                {loadingHospitalRequests && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                      Loading hospital add requests...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {previewHospitalRequestImageUrl && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Hospital Request Image Preview</h3>
                <button
                  type="button"
                  onClick={() => setPreviewHospitalRequestImageUrl(null)}
                  className="text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                <img
                  src={previewHospitalRequestImageUrl}
                  alt="Hospital request"
                  className="w-full max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {previewHospitalRequestCard && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Hospital Card Preview</h3>
                <button
                  type="button"
                  onClick={() => setPreviewHospitalRequestCard(null)}
                  className="text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="max-w-sm pointer-events-none">
                <HospitalCardComponent
                  hospital={previewHospitalRequestCard}
                  theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                />
              </div>
            </div>
          </div>
        )}

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Pending Review Proof Moderation</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">Approve or reject uploaded review documents.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadPendingProofs()}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-200"
            >
              Refresh Queue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Review ID</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Clinic</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Proof Type</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Submitted</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Comment</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Proof</th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingProofs.map((review) => {
                  const busy = moderationActionId === String(review.id);
                  return (
                    <tr key={String(review.id)} className="border-b border-gray-100 dark:border-slate-700/60">
                      <td className="py-3 pr-4 text-sm text-gray-900 dark:text-slate-100">{String(review.id)}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">{getClinicDisplay(review)}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">{review.proofType || "other"}</td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300">
                        {review.createdAt ? new Date(review.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-700 dark:text-slate-300 max-w-xs truncate">{review.comment || "-"}</td>
                      <td className="py-3 pr-4 text-sm">
                        {review.proofUrl ? (
                          <a
                            href={review.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View File
                          </a>
                        ) : (
                          <span className="text-gray-500 dark:text-slate-400">No file</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleModerationDecision(review.id, "approved")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleModerationDecision(review.id, "rejected")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loadingModeration && pendingProofs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                      No pending proof reviews.
                    </td>
                  </tr>
                )}
                {loadingModeration && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                      Loading pending proofs...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Hospitals</h2>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Select City</label>
            <select
              value={selectedEditCity}
              onChange={(event) => {
                const city = event.target.value;
                setSelectedEditCity(city);
                const firstHospitalInCity = hospitals.find((hospital) => cityMatches(hospital.city, city));
                setSelectedClinicId(firstHospitalInCity?.clinicId || "");
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              disabled={loadingHospitals || hospitalCities.length === 0}
            >
              <option value="">{loadingHospitals ? "Loading cities..." : "Choose a city"}</option>
              {hospitalCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Select Hospital to Edit</label>
            <select
              value={selectedClinicId}
              onChange={(event) => setSelectedClinicId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              disabled={loadingHospitals || !selectedEditCity || editHospitalsByCity.length === 0}
            >
              <option value="">
                {loadingHospitals
                  ? "Loading hospitals..."
                  : !selectedEditCity
                    ? "Select a city first"
                    : "Choose a hospital"}
              </option>
              {editHospitalsByCity.map((hospital) => (
                <option key={hospital.clinicId} value={hospital.clinicId}>
                  {hospital.name}
                </option>
              ))}
            </select>

            {selectedHospital && (
              <div className="rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 text-sm text-gray-700 dark:text-slate-300">
                <p><span className="font-medium">Clinic ID:</span> {selectedHospital.clinicId}</p>
                <p><span className="font-medium">City:</span> {selectedHospital.city || "-"}</p>
                <p><span className="font-medium">Phone:</span> {selectedHospital.phone || "-"}</p>
              </div>
            )}

            <form onSubmit={handleSaveHospital} className="space-y-3">
              <input
                value={editHospitalForm.name}
                onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Hospital Name"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={editHospitalForm.address}
                onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Address"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={editHospitalForm.city}
                  onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="City"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  value={editHospitalForm.phone}
                  onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={editHospitalForm.latitude}
                  onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, latitude: event.target.value }))}
                  placeholder="Latitude"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  value={editHospitalForm.longitude}
                  onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, longitude: event.target.value }))}
                  placeholder="Longitude"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <input
                value={editHospitalForm.website}
                onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="Website"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={editHospitalForm.timings}
                onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, timings: event.target.value }))}
                placeholder="Timings (e.g. Mon-Sat 09:00-18:00)"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <div className="space-y-2">
                <label className="block text-sm text-gray-700 dark:text-slate-300">Hospital Image (JPG, JPEG, PNG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={(event) => void handleClinicImageChange(event.target.files?.[0] || null, "edit")}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                {editHospitalImagePreview && (
                  <button
                    type="button"
                    onClick={() => setShowEditHospitalImagePreview((prev) => !prev)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-200"
                  >
                    {showEditHospitalImagePreview ? "Hide Preview" : "Show Preview"}
                  </button>
                )}
                {editHospitalImagePreview && showEditHospitalImagePreview && (
                  <div className="max-w-sm pointer-events-none">
                    <HospitalCardComponent
                      hospital={toHospitalCardPreview("preview-edit", editHospitalForm, editHospitalImagePreview)}
                      theme={"dark"}
                    />
                  </div>
                )}
              </div>
              <input
                value={editHospitalForm.specializations}
                onChange={(event) => setEditHospitalForm((prev) => ({ ...prev, specializations: event.target.value }))}
                placeholder="Specializations (comma separated)"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={savingHospital || !selectedClinicId || hospitalImageUploading === "edit"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white"
              >
                <Save size={16} />
                {savingHospital ? "Saving..." : "Save Hospital Changes"}
              </button>
            </form>
          </article>

          <article className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-emerald-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Add New Hospital</h2>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-3">
              <input
                value={addHospitalForm.name}
                onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Hospital Name"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={addHospitalForm.address}
                onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Address"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={addHospitalForm.city}
                  onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="City"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  value={addHospitalForm.phone}
                  onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={addHospitalForm.latitude}
                  onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, latitude: event.target.value }))}
                  placeholder="Latitude"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  value={addHospitalForm.longitude}
                  onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, longitude: event.target.value }))}
                  placeholder="Longitude"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <input
                value={addHospitalForm.website}
                onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="Website"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={addHospitalForm.timings}
                onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, timings: event.target.value }))}
                placeholder="Timings"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <div className="space-y-2">
                <label className="block text-sm text-gray-700 dark:text-slate-300">Hospital Image (JPG, JPEG, PNG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={(event) => void handleClinicImageChange(event.target.files?.[0] || null, "add")}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                {addHospitalImagePreview && (
                  <button
                    type="button"
                    onClick={() => setShowAddHospitalImagePreview((prev) => !prev)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-200"
                  >
                    {showAddHospitalImagePreview ? "Hide Preview" : "Show Preview"}
                  </button>
                )}
                {addHospitalImagePreview && showAddHospitalImagePreview && (
                  <div className="max-w-sm pointer-events-none">
                    <HospitalCardComponent
                      hospital={toHospitalCardPreview("preview-add", addHospitalForm, addHospitalImagePreview)}
                      theme={"dark"}
                    />
                  </div>
                )}
              </div>
              <input
                value={addHospitalForm.specializations}
                onChange={(event) => setAddHospitalForm((prev) => ({ ...prev, specializations: event.target.value }))}
                placeholder="Specializations (comma separated)"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={creatingHospital || hospitalImageUploading === "add"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white"
              >
                <Building2 size={16} />
                {creatingHospital ? "Creating..." : "Create Hospital"}
              </button>
            </form>
          </article>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserRoundPlus size={18} className="text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Create New Doctor</h2>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3">
              <select
                value={selectedDoctorCreateCity}
                onChange={(event) => {
                  const city = event.target.value;
                  setSelectedDoctorCreateCity(city);
                  const firstHospitalInCity = hospitals.find((hospital) => cityMatches(hospital.city, city));
                  setDoctorCreateForm((prev) => ({ ...prev, clinicId: firstHospitalInCity?.clinicId || "" }));
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                disabled={loadingHospitals || hospitalCities.length === 0}
              >
                <option value="">Select city</option>
                {hospitalCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                value={doctorCreateForm.clinicId}
                onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, clinicId: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                disabled={!selectedDoctorCreateCity || doctorCreateHospitalsByCity.length === 0}
              >
                <option value="">{selectedDoctorCreateCity ? "Assign to hospital" : "Select city first"}</option>
                {doctorCreateHospitalsByCity.map((hospital) => (
                  <option key={hospital.clinicId} value={hospital.clinicId}>
                    {hospital.name}
                  </option>
                ))}
              </select>
              <input
                value={doctorCreateForm.name}
                onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Doctor Name"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={doctorCreateForm.email}
                onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Doctor Email (@hospiico.com)"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={doctorCreateForm.phone}
                  onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  type="password"
                  value={doctorCreateForm.password}
                  onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={doctorCreateForm.specialization}
                  onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, specialization: event.target.value }))}
                  placeholder="Specialization"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  value={doctorCreateForm.qualifications}
                  onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, qualifications: event.target.value }))}
                  placeholder="Qualifications"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={doctorCreateForm.experience}
                  onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, experience: event.target.value }))}
                  placeholder="Experience"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
                <input
                  value={doctorCreateForm.fees}
                  onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, fees: event.target.value }))}
                  placeholder="Consultation Fees"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                />
              </div>
              <input
                value={doctorCreateForm.imageUrl}
                onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                placeholder="Profile Image URL"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <textarea
                value={doctorCreateForm.biography}
                onChange={(event) => setDoctorCreateForm((prev) => ({ ...prev, biography: event.target.value }))}
                placeholder="Biography"
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={creatingDoctor}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white"
              >
                <UserPlus size={16} />
                {creatingDoctor ? "Creating..." : "Create Doctor"}
              </button>
            </form>
          </article>

          <article className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserRoundPlus size={18} className="text-violet-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Assign Existing Doctor</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Use an existing doctor account email and password to link that doctor to another hospital.
            </p>

            <form onSubmit={handleAssignExistingDoctor} className="space-y-3">
              <select
                value={selectedDoctorAssignCity}
                onChange={(event) => {
                  const city = event.target.value;
                  setSelectedDoctorAssignCity(city);
                  const firstHospitalInCity = hospitals.find((hospital) => cityMatches(hospital.city, city));
                  setDoctorAssignForm((prev) => ({ ...prev, clinicId: firstHospitalInCity?.clinicId || "" }));
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                disabled={loadingHospitals || hospitalCities.length === 0}
              >
                <option value="">Select city</option>
                {hospitalCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                value={doctorAssignForm.clinicId}
                onChange={(event) => setDoctorAssignForm((prev) => ({ ...prev, clinicId: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                disabled={!selectedDoctorAssignCity || doctorAssignHospitalsByCity.length === 0}
              >
                <option value="">{selectedDoctorAssignCity ? "Assign to hospital" : "Select city first"}</option>
                {doctorAssignHospitalsByCity.map((hospital) => (
                  <option key={hospital.clinicId} value={hospital.clinicId}>
                    {hospital.name}
                  </option>
                ))}
              </select>
              <input
                value={doctorAssignForm.email}
                onChange={(event) => setDoctorAssignForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Existing Doctor Email"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                type="password"
                value={doctorAssignForm.password}
                onChange={(event) => setDoctorAssignForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Existing Doctor Password"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={doctorAssignForm.name}
                onChange={(event) => setDoctorAssignForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Optional Display Name Override"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <input
                value={doctorAssignForm.specialization}
                onChange={(event) => setDoctorAssignForm((prev) => ({ ...prev, specialization: event.target.value }))}
                placeholder="Optional Specialization"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={assigningDoctor}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white"
              >
                <UserRoundPlus size={16} />
                {assigningDoctor ? "Assigning..." : "Assign Doctor"}
              </button>
            </form>
          </article>
        </section>
      </div>
    </div>
  );
}
