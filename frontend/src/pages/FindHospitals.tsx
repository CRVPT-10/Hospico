import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import HospitalSearch from "../components/HospitalSearch";
import { apiRequest } from "../api";
import type { RootState } from "../store/store";
import { useTheme } from "../context/ThemeContext";

import NearbyHospitals from "../components/NearbyHospitals";
import HospitalCardComponent, { type Hospital as HospitalType } from "../components/HospitalCard";

type Hospital = HospitalType;

const INITIAL_HOSPITAL_BATCH = 12;
const LOAD_MORE_BATCH = 12;

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

      // Flatten transparency so PNG alpha does not render as dark/blank strips.
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

const resolveCityFromCoordinates = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    const data = await response.json();
    const primary = (data.city || "").trim();
    if (primary) {
      return primary;
    }
  } catch (error) {
    console.error("Error getting location from BigDataCloud:", error);
  }

  try {
    const fallbackResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );
    const fallbackData = await fallbackResponse.json();
    const address = fallbackData?.address || {};
    return (
      address.city ||
      address.town ||
      address.municipality ||
      address.county ||
      address.state_district ||
      address.state ||
      "Vijayawada"
    );
  } catch (error) {
    console.error("Error getting location from Nominatim:", error);
    return "Vijayawada";
  }
};

const FindHospitals = () => {
  const location = useLocation();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { theme } = useTheme();

  // Parse URL params on mount
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRealPosition, setCurrentRealPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Data states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHospitalRequestModal, setShowHospitalRequestModal] = useState(false);
  const [showHospitalRequestForm, setShowHospitalRequestForm] = useState(false);
  const [submittingHospitalRequest, setSubmittingHospitalRequest] = useState(false);
  const [hospitalRequestError, setHospitalRequestError] = useState<string | null>(null);
  const [hospitalRequestSuccess, setHospitalRequestSuccess] = useState<string | null>(null);
  const [visibleHospitalCount, setVisibleHospitalCount] = useState(INITIAL_HOSPITAL_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [hospitalRequestForm, setHospitalRequestForm] = useState({
    hospitalName: "",
    address: "",
    city: selectedLocation || "",
    phone: "",
    timings: "",
    latitude: "",
    longitude: "",
    imageUrl: "",
    specializations: "",
  });
  const [hospitalRequestImagePreview, setHospitalRequestImagePreview] = useState<string | null>(null);
  const [showHospitalRequestImagePreview, setShowHospitalRequestImagePreview] = useState(false);
  const [hospitalRequestImageUploading, setHospitalRequestImageUploading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const locParam = urlParams.get("loc");

    // If location is in URL params, use it; otherwise it will be detected from geolocation
    if (locParam) {
      setSelectedLocation(locParam);
    } else {
      // Try to detect user's city from geolocation
      const detectLocation = async () => {
        let coords = null;

        if (Capacitor.isNativePlatform()) {
          try {
            const status = await Geolocation.checkPermissions();
            if (status.location !== 'granted') {
              await Geolocation.requestPermissions();
            }
            // Increased timeout to 30s and enabled high accuracy for better results
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: Infinity // Accept any cached position to be faster
            });
            coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          } catch (e) {
            console.error("Native location error:", e);
            // Fallback is handled below (coords remains null)
          }
        } else if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject)
            );
            coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          } catch (e) { console.error(e); }
        }

        if (coords) {
          try {
            const { latitude, longitude } = coords;
            const city = await resolveCityFromCoordinates(latitude, longitude);
            setSelectedLocation(city);
          } catch (error) {
            console.error("Error getting location:", error);
            setSelectedLocation("Vijayawada");
          }
        } else {
          setSelectedLocation("Vijayawada");
        }
      };

      detectLocation();
    }

    // Always try to get real position for distance calculation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentRealPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    setQuery(urlParams.get("q") || "");
    const specsParam = urlParams.getAll("spec");
    if (specsParam.length > 0) {
      setSelectedSpecializations(specsParam);
    } else {
      setSelectedSpecializations([]);
    }

    // Check if we have coordinates in the URL for nearby hospitals
    const lat = urlParams.get("lat");
    const lng = urlParams.get("lng");
    if (lat && lng) {
      setUserCoordinates({ lat: parseFloat(lat), lng: parseFloat(lng) });
    } else {
      setUserCoordinates(null);
    }
  }, [location]);

  useEffect(() => {
    let cancelled = false;

    // Fetch regular hospitals based on location and specialization filters
    const fetchHospitals = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build query parameters
        const params = new URLSearchParams();

        // Always add city filter
        if (selectedLocation) {
          params.append("city", selectedLocation);
        }

        // Add specialization filters (multi-select)
        if (selectedSpecializations.length > 0) {
          selectedSpecializations.forEach((spec) => params.append("spec", spec));
        }

        // Add search query if specified
        if (query) {
          params.append("search", query);
        }

        // If current real position is available, always add lat/lng for distance calculation
        const effectiveLat = userCoordinates?.lat || currentRealPosition?.lat;
        const effectiveLng = userCoordinates?.lng || currentRealPosition?.lng;

        if (effectiveLat && effectiveLng) {
          params.append("lat", effectiveLat.toString());
          params.append("lng", effectiveLng.toString());
        }

        const queryString = params.toString();
        // If user coordinates (from search/nearby) are specifically requested, use distance sorting endpoint
        const url = userCoordinates
          ? `/api/clinics/sorted-by-distance${queryString ? `?${queryString}` : ""}`
          : `/api/clinics${queryString ? `?${queryString}` : ""}`;

        const data = await apiRequest<Hospital[]>(url, "GET", undefined, {
          cacheTtlMs: 2 * 60 * 1000,
        });

        if (!cancelled) {
          setHospitals(data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error)?.message || "Failed to load hospitals");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHospitals();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, selectedSpecializations, userCoordinates, currentRealPosition, query]);

  useEffect(() => {
    console.log("Fetched hospitals:", hospitals);
  }, [hospitals]);

  useEffect(() => {
    setHospitalRequestForm((prev) => {
      if (prev.city.trim()) {
        return prev;
      }
      return { ...prev, city: selectedLocation || "" };
    });
  }, [selectedLocation]);

  const openHospitalRequestModal = () => {
    setShowHospitalRequestModal(true);
    setShowHospitalRequestForm(false);
    setHospitalRequestError(null);
    setHospitalRequestSuccess(null);
  };

  const closeHospitalRequestModal = () => {
    setShowHospitalRequestModal(false);
    setShowHospitalRequestForm(false);
    setHospitalRequestError(null);
    setHospitalRequestSuccess(null);
  };

  const submitHospitalRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setHospitalRequestError(null);
    setHospitalRequestSuccess(null);

    if (!hospitalRequestForm.hospitalName.trim() || !hospitalRequestForm.address.trim() || !hospitalRequestForm.city.trim() || !hospitalRequestForm.specializations.trim()) {
      setHospitalRequestError("Hospital name, address, city, and specializations are required");
      return;
    }

    if (hospitalRequestImageUploading) {
      setHospitalRequestError("Wait for hospital image upload to finish before submitting");
      return;
    }

    const parsedLatitude = hospitalRequestForm.latitude.trim() ? Number(hospitalRequestForm.latitude) : undefined;
    const parsedLongitude = hospitalRequestForm.longitude.trim() ? Number(hospitalRequestForm.longitude) : undefined;

    if (hospitalRequestForm.latitude.trim() && !Number.isFinite(parsedLatitude)) {
      setHospitalRequestError("Latitude must be a valid number");
      return;
    }

    if (hospitalRequestForm.longitude.trim() && !Number.isFinite(parsedLongitude)) {
      setHospitalRequestError("Longitude must be a valid number");
      return;
    }

    setSubmittingHospitalRequest(true);
    try {
      await apiRequest("/api/hospital-requests", "POST", {
        hospitalName: hospitalRequestForm.hospitalName.trim(),
        address: hospitalRequestForm.address.trim(),
        city: hospitalRequestForm.city.trim(),
        phone: hospitalRequestForm.phone.trim() || undefined,
        timings: hospitalRequestForm.timings.trim() || undefined,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        imageUrl: hospitalRequestForm.imageUrl.trim() || undefined,
        specializations: hospitalRequestForm.specializations.trim() || undefined,
        requesterEmail: authUser?.email?.trim() || undefined,
      });

      setHospitalRequestSuccess("Request sent successfully. Admin will review and approve/disapprove.");
      setHospitalRequestForm({
        hospitalName: "",
        address: "",
        city: selectedLocation || "",
        phone: "",
        timings: "",
        latitude: "",
        longitude: "",
        imageUrl: "",
        specializations: "",
      });
      setHospitalRequestImagePreview(null);
      setShowHospitalRequestImagePreview(false);
    } catch (err) {
      setHospitalRequestError((err as Error).message || "Failed to send request");
    } finally {
      setSubmittingHospitalRequest(false);
    }
  };

  const handleHospitalRequestImageChange = async (file: File | null) => {
    if (!file) return;

    if (!isAllowedHospitalImageType(file)) {
      setHospitalRequestError("Only JPG, JPEG, and PNG files are allowed");
      return;
    }

    setHospitalRequestImageUploading(true);
    setHospitalRequestError(null);

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
      const uploadResponse = await apiRequest<{ imageUrl?: string }>("/api/clinics/upload-image", "POST", formData);
      const imageUrl = uploadResponse.imageUrl?.trim();

      if (!imageUrl) {
        throw new Error("Hospital image upload did not return a valid URL");
      }

      setHospitalRequestForm((prev) => ({ ...prev, imageUrl }));
      setHospitalRequestImagePreview(previewDataUrl);
      setShowHospitalRequestImagePreview(true);
    } catch (err) {
      setHospitalRequestError((err as Error).message || "Failed to upload hospital image");
    } finally {
      setHospitalRequestImageUploading(false);
    }
  };

  // No need for client-side filtering anymore since backend handles it
  const filteredHospitals = hospitals;
  const visibleHospitals = filteredHospitals.slice(0, visibleHospitalCount);
  const hasMoreHospitals = visibleHospitalCount < filteredHospitals.length;

  useEffect(() => {
    setVisibleHospitalCount(INITIAL_HOSPITAL_BATCH);
  }, [selectedLocation, query, selectedSpecializations, hospitals.length]);

  useEffect(() => {
    if (loading || !hasMoreHospitals || !loadMoreRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisibleHospitalCount((prev) => Math.min(prev + LOAD_MORE_BATCH, filteredHospitals.length));
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, hasMoreHospitals, filteredHospitals.length]);



  return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <HospitalSearch />

          {/* Results */}
          <div className="mt-8">
            {userCoordinates && (
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  Nearby Hospitals
                </h2>
                <NearbyHospitals latitude={userCoordinates.lat} longitude={userCoordinates.lng} />
              </div>
            )}

            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100">
                {userCoordinates ? "Other " : ""}Hospitals{selectedLocation ? ` in ${selectedLocation}` : ""}
                {query && (
                  <span className="text-gray-500 dark:text-slate-400 font-normal"> {" "}for "{query}"</span>
                )}
                {selectedSpecializations.length > 0 && (
                  <span className="text-gray-500 dark:text-slate-400 font-normal">
                    {" "}specializing in {selectedSpecializations.join(", ")}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={openHospitalRequestModal}
                className="text-left sm:text-right text-base font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-500"
              >
                Can't Find Hospital?
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 shadow-md animate-pulse">
                    <div className="w-full h-44 bg-gray-200 dark:bg-slate-700 rounded-md mb-4" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-16" />
                      <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-full w-20" />
                    </div>
                    <div className="mt-auto">
                      <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-md w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center border border-gray-200 dark:border-slate-600">
                <p className="text-red-500 dark:text-red-400">{error}</p>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center border border-gray-200 dark:border-slate-600">
                <p className="text-gray-500 dark:text-slate-300">No hospitals found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleHospitals.map((hospital) => (
                    <HospitalCardComponent
                      key={hospital.id || hospital.clinicId}
                      hospital={hospital}
                      theme={theme}
                    />
                  ))}
                </div>

                {hasMoreHospitals && (
                  <div className="flex items-center justify-center pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleHospitalCount((prev) => Math.min(prev + LOAD_MORE_BATCH, filteredHospitals.length))
                      }
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      Load More Hospitals
                    </button>
                  </div>
                )}

                <div ref={loadMoreRef} className="h-1" />
              </div>
            )}
          </div>
        </div>

        {showHospitalRequestModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {showHospitalRequestForm ? "Send Hospital Request" : "Hospital Not Found"}
                </h3>
                <button
                  type="button"
                  onClick={closeHospitalRequestModal}
                  className="text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white"
                >
                  Close
                </button>
              </div>

              {!showHospitalRequestForm ? (
                <div className="space-y-4">
                  <p className="text-gray-700 dark:text-slate-200">
                    Sorry Hospital You are finding isnt available yet
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    If you want you can add hospital by filling details and with admin approval
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHospitalRequestForm(true)}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Send request to add hospital
                  </button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={submitHospitalRequest}>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Hospital Name *</label>
                    <input
                      required
                      value={hospitalRequestForm.hospitalName}
                      onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, hospitalName: event.target.value }))}
                      placeholder="Hospital Name"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Address *</label>
                    <input
                      required
                      value={hospitalRequestForm.address}
                      onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="Address"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">City *</label>
                      <input
                        required
                        value={hospitalRequestForm.city}
                        onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="City"
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                      />
                    </div>
                    <input
                      value={hospitalRequestForm.phone}
                      onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Phone"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <input
                    value={hospitalRequestForm.timings}
                    onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, timings: event.target.value }))}
                    placeholder="Timings"
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={hospitalRequestForm.latitude}
                      onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, latitude: event.target.value }))}
                      placeholder="Latitude (optional)"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                    <input
                      value={hospitalRequestForm.longitude}
                      onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, longitude: event.target.value }))}
                      placeholder="Longitude (optional)"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700 dark:text-slate-300">Hospital Image (optional)</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(event) => void handleHospitalRequestImageChange(event.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                    {hospitalRequestImagePreview && (
                      <button
                        type="button"
                        onClick={() => setShowHospitalRequestImagePreview((prev) => !prev)}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-slate-200"
                      >
                        {showHospitalRequestImagePreview ? "Hide Preview" : "Show Preview"}
                      </button>
                    )}
                    {hospitalRequestImagePreview && showHospitalRequestImagePreview && (
                      <div className="max-w-sm pointer-events-none">
                        <HospitalCardComponent
                          hospital={{
                            id: "request-preview",
                            name: hospitalRequestForm.hospitalName.trim() || "Hospital Name Preview",
                            address: hospitalRequestForm.address.trim() || "Address preview",
                            city: hospitalRequestForm.city.trim() || undefined,
                            imageUrl: hospitalRequestImagePreview,
                            specializations: hospitalRequestForm.specializations
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                            latitude: hospitalRequestForm.latitude.trim()
                              ? Number(hospitalRequestForm.latitude)
                              : undefined,
                            longitude: hospitalRequestForm.longitude.trim()
                              ? Number(hospitalRequestForm.longitude)
                              : undefined,
                          }}
                          theme={theme}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">Specializations *</label>
                    <input
                      required
                      value={hospitalRequestForm.specializations}
                      onChange={(event) => setHospitalRequestForm((prev) => ({ ...prev, specializations: event.target.value }))}
                      placeholder="Specializations (comma separated)"
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100"
                    />
                  </div>

                  {hospitalRequestError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{hospitalRequestError}</p>
                  )}
                  {hospitalRequestSuccess && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{hospitalRequestSuccess}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingHospitalRequest || hospitalRequestImageUploading}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium"
                  >
                    {submittingHospitalRequest ? "Sending..." : "Submit Request"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
  );
};

export default FindHospitals;