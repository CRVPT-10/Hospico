import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import defaultHospitalImage from "../assets/images/default-hospital.jpg";
import defaultDoctorImage from "../assets/images/default-doctor.jpeg";
import { apiRequest } from "../api";
import AppointmentBooking from "../components/AppointmentBooking";

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

const HospitalProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<{ [key: string]: string }>({});
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
      <div className="relative w-full h-auto min-h-[450px] lg:h-72 bg-gray-900 overflow-hidden">
        <img src={getHospitalImageUrl(hospital.imageUrl)} alt={hospital.name} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900/90" />
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40 backdrop-blur-sm">Open 24/7</span>
        </div>
        {/* Hospital Info - Stacked on Mobile, Side by Side on Desktop */}
        <div className="absolute inset-0 flex items-start lg:items-center py-16 lg:py-0">
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
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${hospital.latitude},${hospital.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full lg:w-64 h-32 lg:h-36 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 border-blue-500 rounded-xl overflow-hidden hover:border-blue-400 transition-all shadow-xl relative group flex-shrink-0"
                >
                  {/* Map-like background with grid */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700">
                    {/* Grid pattern to simulate map */}
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 0, 0, .1) 25%, rgba(0, 0, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .1) 75%, rgba(0, 0, 0, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 0, 0, .1) 25%, rgba(0, 0, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .1) 75%, rgba(0, 0, 0, .1) 76%, transparent 77%, transparent)',
                      backgroundSize: '25px 25px'
                    }}></div>
                    {/* Road-like lines */}
                    <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-blue-400/40 transform -rotate-12"></div>
                    <div className="absolute top-1/3 left-0 right-0 h-1 bg-blue-300/30 transform rotate-6"></div>
                  </div>
                  {/* Pin marker */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
                    <div className="relative">
                      <div className="w-10 h-10 bg-red-500 rounded-full border-4 border-white shadow-xl"></div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-transparent border-t-red-500"></div>
                    </div>
                  </div>
                  {/* Bottom gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 dark:from-slate-900/90 via-transparent to-transparent pointer-events-none"></div>
                  {/* Text */}
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <div className="text-sm text-gray-900 dark:text-white font-semibold drop-shadow-md group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">View on Map</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Doctors Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Our Doctors</h2>
        </div>
        {/* Doctors List */}
        {hospital.doctors && hospital.doctors.length > 0 ? (
          <div className="space-y-6">
            {hospital.doctors.map((doctor) => (
              <div key={doctor.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-100 dark:border-transparent p-4 sm:p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
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
                  <div className="flex flex-col gap-3 items-end flex-shrink-0 lg:border-l border-gray-200 dark:border-slate-600 lg:pl-6">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">⭐</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">4.8</span>
                    </div>
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