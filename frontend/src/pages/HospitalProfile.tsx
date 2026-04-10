import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import defaultHospitalImage from "../assets/images/default-hospital.jpg";
import defaultDoctorImage from "../assets/images/default-doctor.jpeg";
import { API_BASE_URL, apiRequest } from "../api";
import AppointmentBooking from "../components/AppointmentBooking";
import VerifiedReviewModal from "../components/VerifiedReviewModal";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

interface Doctor {
  id: string | number;
  name: string;
  qualification: string;
  specialization: string;
  experience: string;
  biography: string;
  imageUrl?: string;
}

interface Hospital {
  id: string | number;
  clinicId?: string | number;
  publicId?: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  specializations: string[];
  imageUrl?: string;
  doctors?: Doctor[];
  latitude?: number | string;
  longitude?: number | string;
}

interface Review {
  id: string | number;
  rating?: number;
  comment?: string;
  createdAt: string;
  userId?: string | number;
  doctorId?: string | number;
  badgeType?: "verified_phone" | "verified_patient" | "hospital_verified";
  proofStatus?: "pending" | "approved" | "rejected";
  ratings?: {
    explanationClarity?: number;
    timeSpent?: number;
    diagnosisConfidence?: number;
    waitingTime?: number;
    staffBehavior?: number;
    cleanliness?: number;
    overallExperience?: number;
  };
}

interface ReviewSummary {
  totalReviews: number;
  overallRating?: number;
  starDistribution?: Record<string, number>;
  starPercentages?: Record<string, number>;
  subRatingAverages?: {
    explanationClarity?: number;
    timeSpent?: number;
    diagnosisConfidence?: number;
    waitingTime?: number;
    staffBehavior?: number;
    cleanliness?: number;
    overallExperience?: number;
  };
  customersSay?: string;
  badgeCounts: {
    verified_phone?: number;
    verified_patient?: number;
    hospital_verified?: number;
  };
  reviews: Review[];
}

type CustomReviewDoctorMeta = {
  name?: string;
  specialization?: string;
};

const CUSTOM_REVIEW_DOCTOR_META_KEY = "custom_review_doctor_meta_v1";

const HospitalProfile = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id ? Number(user.id) : null;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({});
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("All");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [defaultDoctorIdToReview, setDefaultDoctorIdToReview] = useState<string | number | null>(null);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const customReviewDoctorMeta = useMemo(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_REVIEW_DOCTOR_META_KEY);
      return raw ? JSON.parse(raw) as Record<string, CustomReviewDoctorMeta> : {};
    } catch {
      return {};
    }
  }, [reviews]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!hospital?.clinicId) {
        setReviews([]);
        return;
      }

      try {
        let data: ReviewSummary;
        try {
          data = await apiRequest<ReviewSummary>(`/api/reviews/${hospital.clinicId}`, "GET");
        } catch {
          data = await apiRequest<ReviewSummary>(`/api/reviews/hospital/${hospital.clinicId}`, "GET");
        }
        setReviewSummary(data);
        setReviews(data.reviews || []);
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      }
    };

    fetchReviews();
  }, [hospital?.clinicId]);

  const handleDeleteReview = async (reviewId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      const encodedId = encodeURIComponent(String(reviewId));
      try {
        await apiRequest(`/api/reviews/${encodedId}/delete`, "DELETE");
      } catch {
        await apiRequest(`/api/reviews/${encodedId}`, "DELETE");
      }
      setReviews(reviews.filter(r => String(r.id) !== String(reviewId)));
      if (hospital?.clinicId) {
        let summary: ReviewSummary;
        try {
          summary = await apiRequest<ReviewSummary>(`/api/reviews/${hospital.clinicId}`, "GET");
        } catch {
          summary = await apiRequest<ReviewSummary>(`/api/reviews/hospital/${hospital.clinicId}`, "GET");
        }
        setReviewSummary(summary);
        setReviews(summary.reviews || []);
      }
    } catch (err) {
      console.error("Failed to delete review", err);
      alert("Failed to delete review");
    }
  };

  // Get unique specializations from doctors
  const uniqueSpecializations = ["All", ...new Set(hospital?.doctors?.map(d => d.specialization || "General Practitioner") || [])];

  // Filter doctors based on selection
  const filteredDoctors = hospital?.doctors?.filter(doc =>
    selectedSpecialization === "All" || (doc.specialization || "General Practitioner") === selectedSpecialization
  );

  // Filter and sort reviews based on selection and verification priority
  const filteredReviews = reviews
    .filter(review => {
      if (selectedSpecialization === "All") return true;
      const doctor = hospital?.doctors?.find(d => String(d.id) === String(review.doctorId));
      return (doctor?.specialization || "General Practitioner") === selectedSpecialization;
    })
    .sort((a, b) => {
      const priority = (badgeType?: string) => {
        if (badgeType === "verified_patient" || badgeType === "hospital_verified") return 0;
        if (badgeType === "verified_phone") return 1;
        return 2;
      };

      const diff = priority(a.badgeType) - priority(b.badgeType);
      if (diff !== 0) return diff;

      // Keep newest first inside the same priority bucket.
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Click outside handler to reset to services tab
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside any doctor's tab section
      const clickedInsideAnyTab = Object.values(tabRefs.current).some(ref =>
        ref && ref.contains(target)
      );

      if (!clickedInsideAnyTab) {
        // Reset all tabs to services
        setActiveTab({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchClinic = async () => {
      if (!routeId) {
        setError("Invalid hospital link");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        let response: Hospital;

        try {
          response = await apiRequest<Hospital>(
            `/api/clinics/public/${encodeURIComponent(routeId)}`,
            "GET"
          );
        } catch {
          // Backward compatibility for older numeric links.
          response = await apiRequest<Hospital>(
            `/api/clinics/id?id=${routeId}`,
            "GET"
          );
        }

        // API returns the clinic object directly, not wrapped in .data
        setHospital(response);
      } catch (err) {
        setError((err as Error)?.message || "Failed to load clinic details");
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();
  }, [routeId]);

  if (loading) {
    return <p>Loading hospital details...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!hospital) {
    return <p>Hospital not found.</p>;
  }

  // Function to get the correct doctor image URL
  const getDoctorImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return defaultDoctorImage;

    // Allow remote, data, and blob URLs to render as-is.
    if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
      return imageUrl;
    }

    // If it's a relative path or invalid, use default
    return defaultDoctorImage;
  };

  // Function to get the correct hospital image URL
  const getHospitalImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return defaultHospitalImage;

    // Allow remote, data, blob, and backend-relative URLs to render as-is.
    if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
      return imageUrl;
    }

    if (imageUrl.startsWith("/")) {
      if (!API_BASE_URL || API_BASE_URL === "/api" || API_BASE_URL.endsWith("/api")) {
        return imageUrl;
      }
      return `${API_BASE_URL}${imageUrl}`;
    }

    // If it's a relative path or invalid, use default
    return defaultHospitalImage;
  };

  const renderStars = (value: number) => {
    const fullStars = Math.floor(value);
    const halfStar = value - fullStars >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    return `${"★".repeat(fullStars)}${halfStar ? "☆" : ""}${"☆".repeat(emptyStars)}`;
  };

  const starRows = [5, 4, 3, 2, 1];

  const subRatingLabels: Record<string, string> = {
    explanationClarity: "Doctor Explanation Clarity",
    timeSpent: "Doctor Time Spent",
    diagnosisConfidence: "Doctor Diagnosis Confidence",
    waitingTime: "Hospital Waiting Time",
    staffBehavior: "Hospital Staff Behavior",
    cleanliness: "Hospital Cleanliness",
    overallExperience: "Hospital Overall Experience",
  };

  const averageFromValues = (values: Array<number | undefined>) => {
    const valid = values.filter((value): value is number => typeof value === "number");
    if (valid.length === 0) return 0;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  };

  const doctorSummaryAverage = averageFromValues([
    reviewSummary?.subRatingAverages?.explanationClarity,
    reviewSummary?.subRatingAverages?.timeSpent,
    reviewSummary?.subRatingAverages?.diagnosisConfidence,
  ]);

  const hospitalSummaryAverage = averageFromValues([
    reviewSummary?.subRatingAverages?.waitingTime,
    reviewSummary?.subRatingAverages?.staffBehavior,
    reviewSummary?.subRatingAverages?.cleanliness,
    reviewSummary?.subRatingAverages?.overallExperience,
  ]);

  const hasReviewData = (reviewSummary?.totalReviews ?? reviews.length) > 0;

  const parseCoordinate = (value: number | string | undefined) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const normalized = value.trim().replace(/,/g, ".");
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const mapLatitude = parseCoordinate(hospital.latitude);
  const mapLongitude = parseCoordinate(hospital.longitude);
  const mapQuery = mapLatitude != null && mapLongitude != null
    ? `${mapLatitude},${mapLongitude}`
    : hospital.address?.trim();
  const mapOpenHref = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`
    : null;
  const mapEmbedSrc = mapQuery
    ? `https://maps.google.com/maps?width=300&height=200&hl=en&q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Hero Section */}
      <div className="relative w-full h-auto min-h-[450px] lg:h-72 bg-gray-900 overflow-hidden flex items-center">
        <img
          src={getHospitalImageUrl(hospital.imageUrl)}
          alt={hospital.name}
          onError={(event) => {
            const target = event.currentTarget;
            if (target.src !== defaultHospitalImage) {
              target.src = defaultHospitalImage;
            }
          }}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900/90" />
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40 backdrop-blur-sm">Open 24/7</span>
        </div>
        {/* Hospital Info - Stacked on Mobile, Side by Side on Desktop */}
        <div className="relative z-10 w-full py-16 lg:py-0">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1 w-full lg:w-auto">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 text-shadow-sm">{hospital.name}</h1>
                <p className="text-sm sm:text-base text-gray-200 mb-3 line-clamp-2">{hospital.specializations.join(", ")}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-xs border border-white/20 backdrop-blur-sm">
                    📍 {hospital.address}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-xs border border-white/20 backdrop-blur-sm">
                    Multi-Specialty Hospital
                  </span>
                </div>
                {hospital.phone && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-xs border border-white/20 backdrop-blur-sm">
                      📞 {hospital.phone}
                    </span>
                  </div>
                )}
              </div>
              {/* Map Button - Bottom on Mobile, Right Side on Desktop */}
              {mapEmbedSrc && (
                <div className="relative text-right w-full lg:w-[300px] h-[200px] flex-shrink-0 rounded-xl overflow-hidden shadow-xl border-2 border-blue-500/50">
                  <iframe
                    className="w-full h-full"
                    frameBorder="0"
                    marginHeight={0}
                    marginWidth={0}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedSrc}
                    title="Hospital Location"
                  ></iframe>
                  {mapOpenHref && (
                    <a
                      href={mapOpenHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open hospital location in Google Maps"
                      className="absolute inset-0 z-10"
                    >
                      <span className="sr-only">Open hospital location in Google Maps</span>
                    </a>
                  )}
                  {mapOpenHref && (
                    <a
                      href={mapOpenHref}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 z-20 inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-blue-600/90 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      Open in Google Maps
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Patient Reviews Section - Social Proof immediately after Hero */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Patients Say</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Real experiences from our patients</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                Total Reviews: {reviewSummary?.totalReviews ?? reviews.length}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                Verified Phone: {reviewSummary?.badgeCounts?.verified_phone ?? 0}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Verified Patient Visit: {reviewSummary?.badgeCounts?.verified_patient ?? 0}
              </span>
              <button
                type="button"
                onClick={() => setShowBadgeInfo((prev) => !prev)}
                className="ml-1 text-xs text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-500 whitespace-nowrap"
              >
                See how Verification Badge Works?
              </button>
            </div>
            {showBadgeInfo && (
              <div className="mt-2 max-w-xl rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-3 py-3 text-sm text-gray-700 dark:text-slate-200 space-y-2">
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
          </div>
          <button
            onClick={() => {
              setEditingReview(null);
              setDefaultDoctorIdToReview(null);
              setShowReviewModal(true);
            }}
            className="self-start md:mt-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Write a Review
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-4">
            {reviewSummary && (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <h3 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Customer reviews</h3>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-slate-100">
                    {Number(reviewSummary.overallRating ?? 0).toFixed(1)}
                  </p>
                  <div>
                    <p className="text-2xl leading-none text-orange-500">{renderStars(reviewSummary.overallRating ?? 0)}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {reviewSummary.totalReviews} global ratings
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {starRows.map((star) => {
                    const key = String(star);
                    const percent = reviewSummary.starPercentages?.[key] ?? 0;
                    const count = reviewSummary.starDistribution?.[key] ?? 0;
                    return (
                      <div key={star} className="grid grid-cols-[56px_1fr_88px] items-center gap-3">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{star} star</span>
                        <div className="h-4 rounded-md border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-slate-300">{percent}% ({count})</span>
                      </div>
                    );
                  })}
                </div>

                {hasReviewData && (
                  <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 gap-3">
                    <div className="rounded-xl bg-slate-100 dark:bg-slate-700/60 px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-slate-400">Doctor Experience Avg</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{doctorSummaryAverage.toFixed(1)}/5</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 dark:bg-slate-700/60 px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-slate-400">Hospital Experience Avg</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{hospitalSummaryAverage.toFixed(1)}/5</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reviewSummary && hasReviewData && (
              <div className="hidden md:block rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Customers say</h3>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-sm">
                  {reviewSummary.customersSay || "Patients are sharing their experience. Summary will update as more detailed ratings come in."}
                </p>
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700 space-y-2">
                  {Object.entries(reviewSummary.subRatingAverages || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">{subRatingLabels[key] || key}</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{Number(value).toFixed(1)}/5</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {filteredReviews.length > 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3">
                <div className="py-2 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Top reviews {hospital.city ? `from ${hospital.city}` : ""}</h3>
                </div>
                {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 5)).map((review, index) => {
              const reviewDoctor = hospital?.doctors?.find(d => String(d.id) === String(review.doctorId));
              const doctorMeta = customReviewDoctorMeta[String(review.id)];
              const displayDoctorName = doctorMeta?.name || reviewDoctor?.name;
              const displayDoctorSpecialization = doctorMeta?.specialization || reviewDoctor?.specialization;
              const reviewDoctorScore = averageFromValues([
                review.ratings?.explanationClarity,
                review.ratings?.timeSpent,
                review.ratings?.diagnosisConfidence,
              ]);
              const reviewHospitalScore = averageFromValues([
                review.ratings?.waitingTime,
                review.ratings?.staffBehavior,
                review.ratings?.cleanliness,
                review.ratings?.overallExperience,
              ]);

                return (
                  <div
                    key={review.id}
                    className="py-5 border-b last:border-b-0 border-gray-200 dark:border-slate-700"
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                        {String.fromCharCode(65 + (index % 26))}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Verified Patient</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-orange-500 text-base leading-none">{renderStars(review.rating ?? 0)}</span>
                          {review.badgeType && (
                            <span className="text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                              {review.badgeType === "verified_patient" && "Verified Patient Visit"}
                              {review.badgeType === "verified_phone" && "Verified Phone"}
                              {review.badgeType === "hospital_verified" && "Hospital Verified Visit"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                          Reviewed on {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {currentUserId != null && Number(review.userId) === Number(currentUserId) ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingReview(review);
                            setShowReviewModal(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-all"
                          title="Edit Review"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-all"
                          title="Delete Review"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    {review.comment && review.comment.trim() ? (
                      <p>{review.comment}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                          Doctor Score: {reviewDoctorScore.toFixed(1)}/5
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900/40">
                          Hospital Score: {reviewHospitalScore.toFixed(1)}/5
                        </span>
                      </div>
                    )}
                  </div>

                  {displayDoctorName && (
                    <p className="mt-3 text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Dr. {displayDoctorName}{displayDoctorSpecialization ? ` (${displayDoctorSpecialization})` : ""}
                    </p>
                  )}

                    <div className="mt-4 flex items-center gap-3 text-sm">
                      <button className="px-4 py-1 rounded-full border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        Helpful
                      </button>
                      <span className="text-gray-300 dark:text-slate-600">|</span>
                      <button className="text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors">
                        Report
                      </button>
                    </div>
                  </div>
                );
              })}

                {filteredReviews.length > 5 && (
                  <div className="pt-4 pb-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllReviews((prev) => !prev)}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 underline underline-offset-2"
                    >
                      {showAllReviews ? "Show less" : `Show more reviews (${filteredReviews.length - 5} more)`}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Graceful Empty State */
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Reviews Yet
                </h3>
                <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto text-sm">
                  Be the first to share your experience! Your feedback helps other patients make informed decisions about their healthcare.
                </p>
              </div>
            )}
            </div>
          </div>
        </div>

      {/* Doctors Section - Main Action Area */}
      <div className="bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800/50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Expert Doctors</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">Book an appointment with our specialists</p>
              </div>
            </div>

            {/* Specialization Filters */}
            <div className="flex flex-wrap gap-2 mt-6">
              {uniqueSpecializations.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialization(spec)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedSpecialization === spec
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
                    }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          {/* Doctors List */}
          {filteredDoctors && filteredDoctors.length > 0 ? (
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.id}
                  ref={(el) => { tabRefs.current[doctor.id] = el; }}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-6 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* Left Section - Doctor Image & Info */}
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0 relative">
                        <img
                          src={getDoctorImageUrl(doctor.imageUrl)}
                          alt={doctor.name}
                          onError={(event) => {
                            const target = event.currentTarget;
                            if (target.src !== defaultDoctorImage) {
                              target.src = defaultDoctorImage;
                            }
                          }}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shadow-md"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{doctor.name}</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                          {doctor.specialization || "General Practitioner"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                          15 years exp • {doctor.qualification || "MD"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Available Today
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section - Services & Timings Tabs */}
                    <div className="flex-1 lg:border-l border-gray-200 dark:border-slate-700 lg:pl-6">
                      <div className="flex gap-4 mb-4">
                        <button
                          onClick={() => setActiveTab({ ...activeTab, [doctor.id]: 'services' })}
                          className={`pb-2 text-sm font-medium transition-colors ${activeTab[doctor.id] !== 'timings'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                        >
                          Services
                        </button>
                        <button
                          onClick={() => setActiveTab({ ...activeTab, [doctor.id]: 'timings' })}
                          className={`pb-2 text-sm font-medium transition-colors ${activeTab[doctor.id] === 'timings'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                        >
                          Timings
                        </button>
                      </div>
                      <div className="space-y-2">
                        {activeTab[doctor.id] === 'timings' ? (
                          <div className="space-y-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-lg p-4">
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase mb-2">Weekdays & Saturday</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                  MON–SAT
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">09:00 AM – 01:00 PM</span>
                                  <span className="text-gray-400 dark:text-slate-500">&</span>
                                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">02:00 PM – 08:00 PM</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 rounded-lg p-4">
                              <p className="text-xs font-semibold text-orange-600 dark:text-orange-300 uppercase mb-2">Sunday</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                  SUN
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">09:00 AM – 01:00 PM</span>
                                  <span className="text-gray-400 dark:text-slate-500">&</span>
                                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">02:00 PM – 06:00 PM</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-base font-bold text-gray-900 dark:text-slate-100">
                              {doctor.specialization || 'General Practitioner'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mt-1">
                              {doctor.biography || 'Providing comprehensive healthcare services with personalized attention to every patient.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Book Button */}
                    <div className="flex flex-col gap-3 items-stretch lg:items-end justify-center flex-shrink-0 lg:border-l border-gray-200 dark:border-slate-700 lg:pl-6 pt-4 lg:pt-0">
                      <button
                        onClick={() => {
                          setActiveTab({});
                          setSelectedDoctorId(doctor.id);
                          setShowBookingModal(true);
                        }}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105"
                      >
                        Book Appointment
                      </button>
                      <button
                        onClick={() => {
                          setEditingReview(null);
                          setDefaultDoctorIdToReview(doctor.id);
                          setShowReviewModal(true);
                        }}
                        className="px-8 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold text-sm transition-all"
                      >
                        Write Review
                      </button>
                      <p className="text-xs text-gray-500 dark:text-slate-400 text-center lg:text-right">
                        Next available: Today
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-slate-400 font-medium">Doctors will be available soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {showBookingModal && selectedDoctorId && (
        <AppointmentBooking
          hospitalId={String(hospital?.clinicId || '')}
          doctorId={selectedDoctorId}
          doctorName={hospital?.doctors?.find(d => d.id === selectedDoctorId)?.name}
          specialization={hospital?.doctors?.find(d => d.id === selectedDoctorId)?.specialization}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctorId(null);
          }}
        />
      )}

      <VerifiedReviewModal
        open={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setEditingReview(null);
          setDefaultDoctorIdToReview(null);
        }}
        onSuccess={async () => {
          setEditingReview(null);
          setDefaultDoctorIdToReview(null);
          if (hospital?.clinicId) {
            let data: ReviewSummary;
            try {
              data = await apiRequest<ReviewSummary>(`/api/reviews/${hospital.clinicId}`, "GET");
            } catch {
              data = await apiRequest<ReviewSummary>(`/api/reviews/hospital/${hospital.clinicId}`, "GET");
            }
            setReviewSummary(data);
            setReviews(data.reviews || []);
          }
        }}
        hospitalId={hospital?.clinicId || hospital?.id || ""}
        doctors={(hospital?.doctors || []).map((doctor) => ({
          id: doctor.id,
          name: doctor.name,
          specialization: doctor.specialization,
        }))}
        defaultDoctorId={editingReview?.doctorId || defaultDoctorIdToReview}
        editingReview={editingReview}
        isLoggedIn={Boolean(user?.id)}
      />
    </div>
  );
}

export default HospitalProfile;