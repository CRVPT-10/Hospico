import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HospitalSearch from "../components/HospitalSearch";
import ProtectedRoute from "../components/ProtectedRoute";
import { apiRequest } from "../api";
import defaultHospitalImage from "../assets/images/default-hospital.jpeg";
import NearbyHospitals from "../components/NearbyHospitals";
import AppointmentBooking from "../components/AppointmentBooking";

interface Hospital {
  id: string;
  clinicId?: string; // Temporary property for mapping
  name: string;
  city?: string;
  address?: string; // Added address field
  specialties?: string[];
  specializations?: string[]; // Temporary property for mapping
  rating?: number;
  distance?: number; // Added distance field
  imageUrl?: string; // Added property for hospital image URL
  imageurl?: string; // Added property for mapping fetched data
}

const FindHospitals = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse URL params on mount
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Vijayawada");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  // State for appointment booking modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Data states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setQuery(urlParams.get("q") || "");
    setSelectedLocation(urlParams.get("loc") || "Vijayawada");
    setSelectedSpecialization(decodeURIComponent(urlParams.get("spec") || ""));
    
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
        let data;
        
        // If user coordinates are available, fetch hospitals sorted by distance
        if (userCoordinates) {
          // For "Available hospitals" section, use the sorted-by-distance endpoint
          const params = new URLSearchParams();
          params.append("lat", userCoordinates.lat.toString());
          params.append("lng", userCoordinates.lng.toString());
          
          // Add city filter if specified
          if (selectedLocation) {
            params.append("city", selectedLocation);
          }
          
          // Add specialization filter if specified
          if (selectedSpecialization) {
            params.append("specialization", selectedSpecialization);
          }
          
          const queryString = params.toString();
          const url = `http://localhost:8080/api/clinics/sorted-by-distance${queryString ? `?${queryString}` : ""}`;
          
          // Call the sorted-by-distance endpoint
          data = await apiRequest<any[]>(
            url,
            "GET"
          );
        } else {
          // Build query parameters for regular clinics endpoint
          const params = new URLSearchParams();
          if (selectedLocation) {
            params.append("city", selectedLocation);
          }
          if (selectedSpecialization) {
            params.append("specialization", selectedSpecialization);
          }
          
          const queryString = params.toString();
          const url = `http://localhost:8080/api/clinics${queryString ? `?${queryString}` : ""}`;
          
          // Call the backend clinics endpoint. We use the absolute URL to ensure it hits port 8080.
          data = await apiRequest<any[]>(
            url,
            "GET"
          );
        }

        if (!cancelled) {
          let transformedData = (data || []).map((hospital) => ({
            ...hospital,
            id: hospital.clinicId ? hospital.clinicId.toString() : "unknown", // Ensure `id` is always a string
            specialties: hospital.specializations || hospital.specializations, // Map `specializations` to `specialties`
            imageUrl: hospital.imageurl || hospital.imageUrl, // Map `imageurl` to `imageUrl`
            address: hospital.address, // Map `address` field
          }));
          
          // If we're using the regular endpoint (not nearby), we need to filter by city if needed
          if (!userCoordinates && selectedLocation) {
            transformedData = transformedData.filter(hospital => 
              hospital.city && hospital.city.toLowerCase() === selectedLocation.toLowerCase()
            );
          }
          
          setHospitals(transformedData);
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
  }, [selectedLocation, query, selectedSpecialization, userCoordinates]);

  useEffect(() => {
    console.log("Fetched hospitals:", hospitals);
  }, [hospitals]);

  // Filter hospitals based on search query
  const filteredHospitals = hospitals.filter((hospital) =>
    hospital.name.toLowerCase().includes(query.toLowerCase())
  );

  // Function to get the correct image URL
  const getImageUrl = (imageUrl: string | undefined) => {
    if (!imageUrl) return defaultHospitalImage;
    
    // If it's already an absolute URL, return it as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a relative path that points to our assets, use the default image
    if (imageUrl.includes('/src/assets/images/')) {
      return defaultHospitalImage;
    }
    
    // For other relative paths, try to construct a proper URL
    // In a real app, you might want to serve these from a CDN or static folder
    return defaultHospitalImage;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-64px)] bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <HospitalSearch />
          
          {/* Results */}
          <div className="mt-8">
            {userCoordinates && (
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Nearby Hospitals
                </h2>
                <NearbyHospitals latitude={userCoordinates.lat} longitude={userCoordinates.lng} />
              </div>
            )}
            
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              {userCoordinates ? "Other " : ""}Hospitals{selectedLocation ? ` in ${selectedLocation}` : ""}
              {query && (
                <span className="text-gray-600 font-normal"> {" "}for "{query}"</span>
              )}
              {selectedSpecialization && (
                <span className="text-gray-600 font-normal"> {" "}specializing in "{selectedSpecialization}"</span>
              )}
            </h2>

            {loading ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-gray-600">Loading hospitals…</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-gray-600">No hospitals found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHospitals.map((hospital) => (
                  <div
                    key={hospital.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <img
                      src={getImageUrl(hospital.imageUrl)}
                      alt={hospital.name}
                      className="w-full h-48 object-cover rounded-md mb-4"
                    />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {hospital.name}
                    </h3>
                    <div className="text-sm text-gray-600 mb-3">
                      {hospital.address && <p>📍 {hospital.address}</p>}
                      {hospital.distance !== undefined && (
                        <p>
                          {hospital.distance < 1 
                            ? `${Math.round(hospital.distance * 1000)}m` 
                            : `${hospital.distance.toFixed(1)}km`}
                        </p>
                      )}
                      <p>⭐ {hospital.rating ?? "—"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(hospital.specialties || []).map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2 mt-auto">
                      <button 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors flex-1"
                        onClick={() => navigate(`/find-hospital/${hospital.id}`)}
                      >
                        View Details
                      </button>
                      <button 
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium text-sm transition-colors flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHospitalId(hospital.id);
                          setShowBookingModal(true);
                        }}
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Appointment Booking Modal */}
        {showBookingModal && selectedHospitalId && (
          <AppointmentBooking 
            hospitalId={selectedHospitalId}
            onClose={() => {
              setShowBookingModal(false);
              setSelectedHospitalId(null);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default FindHospitals;