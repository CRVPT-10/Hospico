import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

interface Specialization {
  id: number;
  specialization: string;
}

const HospitalSearch = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoordinates({ lat: latitude, lng: longitude });
          
          try {
            // Use a reverse geocoding service to get the city name
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
              setSelectedLocation("Vijayawada"); // Fallback to default
            }
          } catch (error) {
            console.error("Error getting location name:", error);
            setSelectedLocation("Vijayawada"); // Fallback to default
          } finally {
            setIsGettingLocation(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setSelectedLocation("Vijayawada"); // Fallback to default
          setIsGettingLocation(false);
        }
      );
    } else {
      setSelectedLocation("Vijayawada"); // Fallback to default
      setIsGettingLocation(false);
    }
  }, []);

  const handleSearch = () => {
    // Navigate to protected page with query params
    // When searching, we don't show nearby hospitals
    const params = new URLSearchParams({
      q: encodeURIComponent(searchText),
      loc: encodeURIComponent(selectedLocation),
    });
    navigate(`/find-hospitals?${params.toString()}`);
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoordinates({ lat: latitude, lng: longitude });
          
          try {
            // Use a reverse geocoding service to get the city name
            // For simplicity, we'll use a free service, but in production you might want to use a paid service
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();
            
            if (data.city) {
              setSelectedLocation(data.city);
            } else if (data.locality) {
              setSelectedLocation(data.locality);
            } else {
              // Fallback to coordinates if city name is not available
              setSelectedLocation(`${data.principalSubdivision} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            }
          } catch (error) {
            console.error("Error getting location name:", error);
            // Fallback to coordinates
            setSelectedLocation(`(${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          } finally {
            setIsGettingLocation(false);
            // Navigate to find-hospitals with coordinates for nearby hospitals and location name
            const params = new URLSearchParams({
              lat: latitude.toString(),
              lng: longitude.toString(),
              loc: selectedLocation,
            });
            navigate(`/find-hospitals?${params.toString()}`);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please enter manually.");
          setIsGettingLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setIsGettingLocation(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              className="block w-full pl-10 pr-16 py-2 sm:py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search hospitals, specialties…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <input
              className="block w-full pl-10 pr-16 py-2 sm:py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            />
            <button
              className="absolute inset-y-0 right-0 m-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md flex items-center justify-center bg-white hover:bg-blue-50"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" strokeWidth="2" />
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    <line x1="12" y1="4" x2="12" y2="2" strokeWidth="2" />
                    <line x1="12" y1="22" x2="12" y2="20" strokeWidth="2" />
                    <line x1="4" y1="12" x2="2" y2="12" strokeWidth="2" />
                    <line x1="22" y1="12" x2="20" y2="12" strokeWidth="2" />
                  </svg>
                </>
              )}
            </button>
          </div>
          <button
            className="w-full sm:w-auto px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm text-gray-600 mt-3">
        <span className="whitespace-nowrap">Filter by specialty:</span>
      </div>
      <SpecialtyFilters 
        userCoordinates={userCoordinates} 
        searchText={searchText}
        selectedLocation={selectedLocation}
      />
    </div>
  );
};

function SpecialtyFilters({ userCoordinates, searchText, selectedLocation }: { 
  userCoordinates: { lat: number; lng: number } | null; 
  searchText: string; 
  selectedLocation: string; 
}) {
  const [specialties, setSpecialties] = useState<Specialization[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const data = await apiRequest<Specialization[]>(
          "/api/specializations",
          "GET"
        );
        setSpecialties(data);
      } catch (error) {
        console.error("Failed to fetch specializations:", error);
        // Fallback to hardcoded list if API fails
        setSpecialties([
          { id: 1, specialization: "Dermatologist" },
          { id: 2, specialization: "Dentist" },
          { id: 3, specialization: "Cardiologist" },
          { id: 4, specialization: "ENT Specialist" },
          { id: 5, specialization: "General Physician" },
          { id: 6, specialization: "Pediatrician" },
          { id: 7, specialization: "Gynecologist" },
          { id: 8, specialization: "Neurologist" },
        ]);
      }
    };

    fetchSpecialties();
  }, []);

  const handleSpecializationClick = (specialization: string) => {
    // Toggle specialization in array
    const exists = selectedSpecializations.includes(specialization);
    const nextSelection = exists
      ? selectedSpecializations.filter((s) => s !== specialization)
      : [...selectedSpecializations, specialization];
    setSelectedSpecializations(nextSelection);
    
    // Build params for navigation using current search text and selected location
    const params = new URLSearchParams({
      q: encodeURIComponent(searchText),
      loc: encodeURIComponent(selectedLocation),
    });

    // Append all selected specs as repeated params
    nextSelection.forEach((spec) => params.append("spec", encodeURIComponent(spec)));
    
    navigate(`/find-hospitals?${params.toString()}`);
  };

  const scrollLeft = () => {
    document.getElementById("specialties-container")?.scrollBy({ left: -120 });
  };

  const scrollRight = () => {
    document.getElementById("specialties-container")?.scrollBy({ left: 120 });
  };

  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100"
        onClick={scrollLeft}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <div
        id="specialties-container"
        className="flex flex-1 gap-1 overflow-x-auto scrollbar-none"
      >
        {specialties.map((s) => (
          <button
            key={s.id}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedSpecializations.includes(s.specialization)
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700"
            }`}
            onClick={() => handleSpecializationClick(s.specialization)}
          >
            {s.specialization}
          </button>
        ))}
      </div>
      <button
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100"
        onClick={scrollRight}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}

export default HospitalSearch;