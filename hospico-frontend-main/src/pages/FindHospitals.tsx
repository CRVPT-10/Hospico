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
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
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
    const locParam = urlParams.get("loc");
    
    // If location is in URL params, use it; otherwise it will be detected from geolocation
    if (locParam) {
      setSelectedLocation(decodeURIComponent(locParam));
    } else {
      // Try to detect user's city from geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const data = await response.json();
              if (data.city) {
                setSelectedLocation(data.city);
              } else if (data.locality) {
                setSelectedLocation(data.locality);
              } else if (data.principalSubdivision) {
                setSelectedLocation(data.principalSubdivision);
              } else {
                setSelectedLocation("Vijayawada");
              }
            } catch (error) {
              console.error("Error getting location:", error);
              setSelectedLocation("Vijayawada");
            }
          },
          () => {
            setSelectedLocation("Vijayawada");
          }
        );
      } else {
        setSelectedLocation("Vijayawada");
      }
    }
    
    setQuery(urlParams.get("q") || "");
    const specsParam = urlParams.getAll("spec");
    if (specsParam.length > 0) {
      setSelectedSpecializations(specsParam.map((s) => decodeURIComponent(s)));
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
        let data;
        
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
        
        // If user coordinates are available, use the sorted-by-distance endpoint
        if (userCoordinates) {
          params.append("lat", userCoordinates.lat.toString());
          params.append("lng", userCoordinates.lng.toString());
          
          const queryString = params.toString();
          const url = `/api/clinics/sorted-by-distance${queryString ? `?${queryString}` : ""}`;
          
          data = await apiRequest<Hospital[]>(url, "GET");
        } else {
          const queryString = params.toString();
          const url = `/api/clinics${queryString ? `?${queryString}` : ""}`;
          
          data = await apiRequest<Hospital[]>(url, "GET");
        }

        if (!cancelled) {
          const transformedData = (data || []).map((hospital) => ({
            ...hospital,
            id: hospital.clinicId ? hospital.clinicId.toString() : "unknown",
            specialties: hospital.specializations || hospital.specializations,
            imageUrl: hospital.imageurl || hospital.imageUrl,
            address: hospital.address,
          }));
          
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
  }, [selectedLocation, selectedSpecializations, userCoordinates, query]);

  useEffect(() => {
    console.log("Fetched hospitals:", hospitals);
  }, [hospitals]);

  // No need for client-side filtering anymore since backend handles it
  const filteredHospitals = hospitals;

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
              {selectedSpecializations.length > 0 && (
                <span className="text-gray-600 font-normal">
                  {" "}specializing in {selectedSpecializations.join(", ")}
                </span>
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