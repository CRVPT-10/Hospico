import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import defaultHospitalImage from "../assets/images/default-hospital.jpeg";
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Hospital Image */}
      <div className="w-full h-96 bg-gray-200 overflow-hidden">
        <img
          src={getHospitalImageUrl(hospital.imageUrl)}
          alt={hospital.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hospital Info Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hospital Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{hospital.name}</h1>
              <p className="text-gray-600 text-lg">{hospital.specializations.join(", ")}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <span className="text-green-600 text-sm font-semibold">✓ Emergency Services Available</span>
            </div>
          </div>

          {/* Location and Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <p className="text-gray-600 flex items-start">
                📍 {hospital.address}, {hospital.city}
              </p>
            </div>
            {hospital.phone && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
                <p className="text-gray-600 flex items-start">
                  📞 {hospital.phone}
                </p>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Specialties</h3>
              <p className="text-gray-600">Multiple Specialties</p>
            </div>
          </div>
        </div>

        {/* Doctors Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Doctors</h2>
          {hospital.doctors && hospital.doctors.length > 0 ? (
            <div className="space-y-6">
              {hospital.doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-center">
                    {/* Left Section - Button */}
                    <div className="flex items-center">
                      <button 
                        onClick={() => {
                          setActiveTab({});
                          setSelectedDoctorId(doctor.id);
                          setShowBookingModal(true);
                        }}
                        className="w-full sm:w-auto px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 font-medium text-sm transition-colors"
                      >
                        Book An Appointment
                      </button>
                    </div>

                    {/* Middle Section - Services & Timings Tabs */}
                    <div className="flex-1 lg:border-l border-gray-200 lg:pl-6">
                      <div className="flex gap-6 mb-4 border-b border-gray-200">
                        <button 
                          onClick={() => setActiveTab({ ...activeTab, [doctor.id]: 'services' })}
                          className={`pb-2 text-sm font-medium transition-colors ${
                            activeTab[doctor.id] !== 'timings' 
                              ? 'text-blue-600 border-b-2 border-blue-600' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Services Offered
                        </button>
                        <button 
                          onClick={() => setActiveTab({ ...activeTab, [doctor.id]: 'timings' })}
                          className={`pb-2 text-sm font-medium transition-colors ${
                            activeTab[doctor.id] === 'timings' 
                              ? 'text-blue-600 border-b-2 border-blue-600' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Timings
                        </button>
                      </div>
                      <div className="space-y-2">
                        {activeTab[doctor.id] === 'timings' ? (
                          <div className="space-y-3 mt-2">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 rounded-lg p-4">
                              <p className="text-xs font-semibold text-blue-900 uppercase mb-2">Weekdays & Saturday</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full">
                                  MON - SAT
                                </span>
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-sm font-semibold text-gray-800">09:00 AM - 01:00 PM</span>
                                  <span className="text-gray-500">&</span>
                                  <span className="text-sm font-semibold text-gray-800">02:00 PM - 08:00 PM</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-600 rounded-lg p-4">
                              <p className="text-xs font-semibold text-orange-900 uppercase mb-2">Sunday</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-full">
                                  SUN
                                </span>
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-sm font-semibold text-gray-800">09:00 AM - 01:00 PM</span>
                                  <span className="text-gray-500">&</span>
                                  <span className="text-sm font-semibold text-gray-800">02:00 PM - 06:00 PM</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-base font-bold text-gray-900">
                              {doctor.specialization || 'Multiple Specializations'}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {doctor.biography || 'Day time OPD'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Doctor Info & Image */}
                    <div className="flex gap-4 items-start lg:border-l border-gray-200 lg:pl-6">
                      <div className="flex-1 lg:text-right">
                        <h3 className="text-lg font-bold text-gray-900">{doctor.name}</h3>
                        <p className="text-xs text-gray-600 mb-2">{doctor.qualification || 'Medical Doctor'}</p>
                        <p className="text-xs text-gray-700 font-medium mb-3">
                          {doctor.specialization || 'General Practitioner'}
                        </p>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="flex items-center lg:justify-end gap-2">
                            <span>📍 City Location</span>
                          </p>
                          <p className="flex items-center lg:justify-end gap-2">
                            <span>Yrs 15</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <img
                          src={getDoctorImageUrl(doctor.imageUrl)}
                          alt={doctor.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600">No doctors available</p>
            </div>
          )}
        </div>
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
};

export default HospitalProfile;