import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import defaultHospitalImage from "../assets/images/default-hospital.jpg";
import defaultDoctorImage from "../assets/images/default-doctor.jpeg";
import { apiRequest } from "../api";
import AppointmentBooking from "../components/AppointmentBooking";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  experience: string;
  biography: string;
  imageUrl?: string;
}

interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  specializations: string[];
  imageUrl?: string;
  doctors?: Doctor[];
  latitude?: number;
  longitude?: number;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  userId: number;
  doctorId: number;
}

const HospitalProfile = () => {
  const { id } = useParams<{ id: string }>();
  // Use user from Redux if available, otherwise fallback to 1 for demo
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?.id || 1;

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({});
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("All");
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiRequest<Review[]>(`/api/reviews/hospital/${id}`, "GET");
        setReviews(data);
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      }
    };
    if (id) {
      fetchReviews();
    }
  }, [id]);

  const handleDeleteReview = async (reviewId: number) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      await apiRequest(`/api/reviews/${reviewId}`, "DELETE");
      setReviews(reviews.filter(r => r.id !== reviewId));
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

  // Filter reviews based on selection
  const filteredReviews = reviews.filter(review => {
    if (selectedSpecialization === "All") return true;
    const doctor = hospital?.doctors?.find(d => Number(d.id) === review.doctorId);
    return (doctor?.specialization || "General Practitioner") === selectedSpecialization;
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
      setLoading(true);
      setError(null);
      try {
        const response = await apiRequest<Hospital>(
          `/api/clinics/id?id=${id}`,
          "GET"
        );
        // API returns the clinic object directly, not wrapped in .data
        setHospital(response);
      } catch (err) {
        setError((err as Error)?.message || "Failed to load clinic details");
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();
  }, [id]);

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

    // If it's already an absolute URL, return it as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // If it's a relative path or invalid, use default
    return defaultDoctorImage;
  };

  // Function to get the correct hospital image URL
  const getHospitalImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return defaultHospitalImage;

    // If it's already an absolute URL, return it as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // If it's a relative path or invalid, use default
    return defaultHospitalImage;
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Hero Section */}
      <div className="relative w-full h-auto min-h-[450px] lg:h-72 bg-gray-900 overflow-hidden flex items-center">
        <img src={getHospitalImageUrl(hospital.imageUrl)} alt={hospital.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
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
              {hospital.latitude && hospital.longitude && (
                <div className="relative text-right w-full lg:w-[300px] h-[200px] flex-shrink-0 rounded-xl overflow-hidden shadow-xl border-2 border-blue-500/50">
                  <div className="overflow-hidden bg-none w-full h-full">
                    <iframe
                      className="w-full h-full"
                      frameBorder="0"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?width=300&height=200&hl=en&q=${hospital.latitude},${hospital.longitude}&t=&z=15&ie=UTF8&iwloc=B&output=embed`}
                      title="Hospital Location"
                    ></iframe>
                    <a
                      href="https://sprunkiretake.net"
                      style={{
                        fontSize: "2px",
                        color: "gray",
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        zIndex: 1,
                        maxHeight: "1px",
                        overflow: "hidden"
                      }}
                    >
                      Sprunki
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Doctors Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Doctors</h2>

          {/* Specialization Filters */}
          <div className="flex flex-wrap gap-2">
            {uniqueSpecializations.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialization(spec)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${selectedSpecialization === spec
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-700"
                  }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Doctors List */}
        {filteredDoctors && filteredDoctors.length > 0 ? (
          <div className="space-y-6">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-100 dark:border-transparent p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                  {/* Left Section - Doctor Image & Info */}
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0">
                      <img src={getDoctorImageUrl(doctor.imageUrl)} alt={doctor.name} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{doctor.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{doctor.specialization || "General Practitioner"}</p>
                      <p className="text-xs text-gray-600 dark:text-slate-500 mb-3">15 years exp • {doctor.qualification || "MD"}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">🟢 Available</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">Next: Today, 4:00 PM</span>
                      </div>
                    </div>
                  </div>
                  {/* Middle Section - Services & Timings Tabs */}
                  <div className="flex-1 lg:border-l border-gray-200 dark:border-slate-600 lg:pl-6">
                    <div className="flex gap-6 mb-4">
                      <button
                        onClick={() => setActiveTab({ ...activeTab, [doctor.id]: 'services' })}
                        className={`pb-2 text-sm font-medium transition-colors ${activeTab[doctor.id] !== 'timings'
                          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                          }`}
                      >
                        Services Offered
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
                        <div className="space-y-3 mt-2">
                          <div className="bg-blue-50 dark:bg-blue-500/20 border-l-4 border-blue-400 rounded-lg p-4">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase mb-2">Weekdays & Saturday</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full">
                                MON–SAT
                              </span>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">09:00 AM – 01:00 PM</span>
                                <span className="text-gray-400 dark:text-slate-400">&</span>
                                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">02:00 PM – 08:00 PM</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-500/20 border-l-4 border-orange-400 rounded-lg p-4">
                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-300 uppercase mb-2">Sunday</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-full">
                                SUN
                              </span>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">09:00 AM – 01:00 PM</span>
                                <span className="text-gray-400 dark:text-slate-400">&</span>
                                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">02:00 PM – 06:00 PM</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-base font-bold text-gray-900 dark:text-slate-100">
                            {doctor.specialization || 'General Practitioner'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                            {doctor.biography || 'Day time OPD'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Right Section - Rating & Book Button */}
                  <div className="flex flex-col gap-3 items-end justify-center flex-shrink-0 lg:border-l border-gray-200 dark:border-slate-600 lg:pl-6">

                    <button
                      onClick={() => {
                        setActiveTab({});
                        setSelectedDoctorId(doctor.id);
                        setShowBookingModal(true);
                      }}
                      className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 text-center">
            <p className="text-gray-500 dark:text-slate-300">No doctors available</p>
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 border-t border-gray-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Patient Reviews</h2>

        {filteredReviews.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review, index) => {
              const reviewDoctor = hospital?.doctors?.find(d => Number(d.id) === review.doctorId);

              return (
                <div key={review.id} className="relative bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow group">

                  {/* Delete Button - Only show if current user owns the review */}
                  {(Number(review.userId) === Number(currentUserId) || currentUserId === 1) && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="absolute bottom-6 right-6 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors z-10"
                      title="Delete Review"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                      Remove
                    </button>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                        U{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">User {index + 1}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex bg-yellow-50 dark:bg-yellow-900/10 px-2 py-1 rounded-lg">
                      <span className="text-yellow-500 text-sm">★</span>
                      <span className="ml-1 text-sm font-bold text-gray-700 dark:text-gray-300">{review.rating}</span>
                    </div>
                  </div>

                  {reviewDoctor && (
                    <div className="mb-3 px-3 py-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg inline-block">
                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wide">Doctor</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{reviewDoctor.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{reviewDoctor.specialization}</p>
                    </div>
                  )}

                  <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed italic border-l-2 border-gray-200 dark:border-slate-600 pl-3">
                    "{review.comment}"
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
            <p className="text-gray-500 dark:text-slate-400">No reviews yet.</p>
          </div>
        )}
      </div>

      {/* Appointment Booking Modal */}
      {showBookingModal && selectedDoctorId && (
        <AppointmentBooking
          hospitalId={id || ''}
          doctorId={selectedDoctorId}
          doctorName={hospital?.doctors?.find(d => d.id === selectedDoctorId)?.name}
          specialization={hospital?.doctors?.find(d => d.id === selectedDoctorId)?.specialization}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctorId(null);
          }}
        />
      )}
    </div>
  );
}

export default HospitalProfile;