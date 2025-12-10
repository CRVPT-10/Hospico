import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import defaultHospitalImage from "../assets/images/default-hospital.jpeg";
import defaultDoctorImage from "../assets/images/default-doctor.jpeg";
import { apiRequest } from "../api";

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {hospital.doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white rounded-lg shadow-md p-6 border-4 border-red-500"
                >
                  <div className="flex gap-6">
                    {/* Doctor Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={getDoctorImageUrl(doctor.imageUrl)}
                        alt={doctor.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>

                    {/* Doctor Info */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{doctor.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{doctor.qualification}</p>
                      
                      {/* Tabs-like Info */}
                      <div className="space-y-2 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Services Offered</p>
                          <p className="text-sm text-gray-700">{doctor.specialization}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Expertise</p>
                          <p className="text-sm text-gray-700">{doctor.experience}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Languages</p>
                          <p className="text-sm text-gray-700">English, Hindi, Local</p>
                        </div>
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
    </div>
  );
};

export default HospitalProfile;