import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";
import defaultHospitalImage from "../assets/images/default-hospital.jpeg";

interface NearbyHospital {
  clinicId: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  specializations: string[];
  phone?: string;
  imageUrl?: string;
  distance: number; // in kilometers
  estimatedTime: number; // in minutes
}

interface NearbyHospitalsProps {
  latitude: number;
  longitude: number;
}

const NearbyHospitals = ({ latitude, longitude }: NearbyHospitalsProps) => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyHospitals = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<NearbyHospital[]>(
          `/api/clinics/nearby?lat=${latitude}&lng=${longitude}`,
          "GET"
        );
        setHospitals(data);
      } catch (err) {
        setError((err as Error)?.message || "Failed to load nearby hospitals");
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyHospitals();
  }, [latitude, longitude]);

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <p className="text-gray-600">Finding nearby hospitals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (hospitals.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <p className="text-gray-600">No nearby hospitals found.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Nearby Hospitals</h3>
      <p className="text-sm text-gray-500 mb-4">Distances and travel times are estimates only</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hospital) => (
          <div
            key={hospital.clinicId}
            className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer"
            onClick={() => navigate(`/find-hospital/${hospital.clinicId}`)}
          >
            <img
              src={hospital.imageUrl || defaultHospitalImage}
              alt={hospital.name}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hospital.name}
            </h3>
            <div className="text-sm text-gray-600 mb-3">
              <p>📍 {hospital.address}, {hospital.city}</p>
              <div className="flex items-center mt-2">
                <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{formatDistance(hospital.distance)}</span>
                <span className="mx-2">•</span>
                <svg className="h-4 w-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{formatTime(hospital.estimatedTime)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {hospital.specializations.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium"
                >
                  {specialty}
                </span>
              ))}
            </div>
            <button className="mt-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NearbyHospitals;