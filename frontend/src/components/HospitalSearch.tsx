import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api";

interface Specialization {
  id: string | number;
  name: string;
}

type CityAnchor = {
  city: string;
  latitude: number;
  longitude: number;
};

type HospitalRecord = {
  city?: string;
  latitude?: number | string;
  longitude?: number | string;
};

const SPECIALTY_CANONICAL_ALIASES: Record<string, string> = {
  general: "general medicine",
  "general physician": "general medicine",
  "internal medicine": "general medicine",
  "family medicine": "family medicine",
  "general surgery": "general surgery",
  "surgical oncology": "oncology",
  oncology: "oncology",
  "surgical gastroenterology": "gastroenterology",
  gastroenterology: "gastroenterology",
  "anaesthesia": "anesthesiology",
  "anaesthesiology": "anesthesiology",
  "anaethesiology": "anesthesiology",
  "orthopaedics": "orthopedics",
  "paediatrics": "pediatrics",
  pediatrics: "pediatrics",
  dermatology: "dermatology",
  dermatologist: "dermatology",
  cardiology: "cardiology",
  cardiologist: "cardiology",
  neurology: "neurology",
  neurologist: "neurology",
  nephrology: "nephrology",
  nephrologist: "nephrology",
  pulmonology: "pulmonology",
  pulmonologist: "pulmonology",
  urology: "urology",
  urologist: "urology",
  radiology: "radiology",
  radiologist: "radiology",
  pathology: "pathology",
  pathologist: "pathology",
  psychiatry: "psychiatry",
  psychiatrist: "psychiatry",
  rheumatology: "rheumatology",
  geriatrics: "geriatrics",
  endocrinology: "endocrinology",
  hematology: "hematology",
  "emergency medicine": "emergency medicine",
  "plastic surgery": "plastic surgery",
  "nuclear medicine": "nuclear medicine",
  "physiotherapy": "physiotherapy",
  "physical medicine": "physiotherapy",
  "physical medicine and rehabilitation": "physiotherapy",
  "dentist": "dentist",
  "dentistry": "dentist",
  "dental surgery": "dentist",
  "dental": "dentist",
  "ent specialist": "ent",
  "ear nose throat": "ent",
  "ear nose and throat": "ent",
  "ear nose & throat": "ent",
  "neuro surgery": "neurosurgery",
  "cardiothoracic surgery": "ct surgery",
  "cardio thoracic surgery": "ct surgery",
  "obg": "gynecology obstetrics",
  gynecology: "gynecology obstetrics",
  gynaecology: "gynecology obstetrics",
  obstetrics: "gynecology obstetrics",
  "obstetrics and gynecology": "gynecology obstetrics",
  "obstetrics & gynecology": "gynecology obstetrics",
  "obstetrics and gynaecology": "gynecology obstetrics",
  "obstetrics & gynaecology": "gynecology obstetrics",
};

const SPECIALTY_DISPLAY_NAMES: Record<string, string> = {
  "general surgery": "General Surgery",
  "general medicine": "General Medicine",
  pediatrics: "Pediatrics",
  orthopedics: "Orthopedics",
  "gynecology obstetrics": "Gynecology & Obstetrics",
  dermatology: "Dermatology",
  ent: "ENT",
  cardiology: "Cardiology",
  dentist: "Dentistry",
  neurology: "Neurology",
  anesthesiology: "Anesthesiology",
  nephrology: "Nephrology",
  urology: "Urology",
  gastroenterology: "Gastroenterology",
  pulmonology: "Pulmonology",
  radiology: "Radiology",
  pathology: "Pathology",
  psychiatry: "Psychiatry",
  endocrinology: "Endocrinology",
  oncology: "Oncology",
  hematology: "Hematology",
  rheumatology: "Rheumatology",
  geriatrics: "Geriatrics",
  "family medicine": "Family Medicine",
  "emergency medicine": "Emergency Medicine",
  physiotherapy: "Physiotherapy",
  "plastic surgery": "Plastic Surgery",
  neurosurgery: "Neurosurgery",
  "ct surgery": "CT Surgery",
  "nuclear medicine": "Nuclear Medicine",
  dialysis: "Dialysis",
};

const SPECIALTY_PRIORITY_ORDER = [
  "general surgery",
  "general medicine",
  "pediatrics",
  "orthopedics",
  "gynecology obstetrics",
  "dermatology",
  "ent",
  "cardiology",
  "dentist",
  "neurology",
  "anesthesiology",
  "nephrology",
  "urology",
  "gastroenterology",
  "pulmonology",
  "radiology",
  "psychiatry",
  "family medicine",
  "emergency medicine",
  "pathology",
  "endocrinology",
  "oncology",
  "hematology",
  "rheumatology",
  "geriatrics",
  "physiotherapy",
  "plastic surgery",
  "neurosurgery",
  "ct surgery",
  "nuclear medicine",
  "dialysis",
] as const;

const SPECIALTY_PRIORITY_RANK = new Map<string, number>(
  SPECIALTY_PRIORITY_ORDER.map((specialty, index) => [specialty, index])
);

const toCanonicalSpecialty = (value: string) => {
  const normalized = (value || "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return SPECIALTY_CANONICAL_ALIASES[normalized] || normalized;
};

const toDisplaySpecialty = (value: string) => {
  const canonical = toCanonicalSpecialty(value);
  return SPECIALTY_DISPLAY_NAMES[canonical] || value;
};

const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildCityAnchors = (clinics: HospitalRecord[]) => {
  const totalsByCity = new Map<string, { city: string; latitudeSum: number; longitudeSum: number; count: number }>();

  clinics.forEach((clinic) => {
    const city = (clinic.city || "").trim();
    const latitude = Number(clinic.latitude);
    const longitude = Number(clinic.longitude);

    if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const key = city.toLowerCase();
    const existing = totalsByCity.get(key);
    if (existing) {
      existing.latitudeSum += latitude;
      existing.longitudeSum += longitude;
      existing.count += 1;
    } else {
      totalsByCity.set(key, { city, latitudeSum: latitude, longitudeSum: longitude, count: 1 });
    }
  });

  return Array.from(totalsByCity.values()).map((entry) => ({
    city: entry.city,
    latitude: entry.latitudeSum / entry.count,
    longitude: entry.longitudeSum / entry.count,
  }));
};

const getNearestCity = (latitude: number, longitude: number, anchors: CityAnchor[]) => {
  let bestCity = "";
  let bestDistance = Number.POSITIVE_INFINITY;

  anchors.forEach((anchor) => {
    const distance = haversineDistanceKm(latitude, longitude, anchor.latitude, anchor.longitude);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCity = anchor.city;
    }
  });

  return bestCity;
};

const HospitalSearch = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [cityAnchors, setCityAnchors] = useState<CityAnchor[]>([]);

  useEffect(() => {
    const loadCityAnchors = async () => {
      try {
        const response = await apiRequest<HospitalRecord[]>('/api/clinics', 'GET', undefined, {
          cacheTtlMs: 10 * 60 * 1000,
          cacheKey: 'hospital-search-city-anchors',
        });
        setCityAnchors(buildCityAnchors(response || []));
      } catch {
        setCityAnchors([]);
      }
    };

    void loadCityAnchors();
  }, []);

  // Detect user's location on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const locParam = params.get("loc");

  // If URL already has a city, use it
  if (locParam) {
    setSelectedLocation(locParam);
    setIsGettingLocation(false);
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const city = getNearestCity(latitude, longitude, cityAnchors);
          setSelectedLocation(city);
        } catch (e) {
          console.error("Error getting location name:", e);
          setSelectedLocation("");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setSelectedLocation("");
        setIsGettingLocation(false);
      }
    );
  } else {
    setSelectedLocation("");
    setIsGettingLocation(false);
  }
}, [cityAnchors]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchText.trim()) {
      params.set("q", searchText.trim());
    }
    if (selectedLocation.trim()) {
      params.set("loc", selectedLocation.trim());
    }
    navigate(`/find-hospitals?${params.toString()}`);
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const resolvedCity = getNearestCity(latitude, longitude, cityAnchors);
            setSelectedLocation(resolvedCity);
            const params = new URLSearchParams({
              lat: latitude.toString(),
              lng: longitude.toString(),
            });
            if (resolvedCity) {
              params.set("loc", resolvedCity);
            }
            navigate(`/find-hospitals?${params.toString()}`);
          } catch (e) {
            console.error("Error getting location name:", e);
            setSelectedLocation("");
            navigate(`/find-hospitals?lat=${latitude}&lng=${longitude}`);
          } finally {
            setIsGettingLocation(false);
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
    <div className="bg-white/90 dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg transition-colors duration-200">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-[0.80]">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-300">
              <svg
                className="h-5 w-5"
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
              className="block w-full pl-10 pr-4 py-2 sm:py-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-colors duration-200"
              placeholder="Search hospitals, specialties…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="relative flex-1 sm:flex-[0.20]">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-300">
              <svg
                className="h-5 w-5"
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
            <select
              className="block w-full pl-10 pr-20 py-2 sm:py-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none shadow-sm transition-colors duration-200"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">Select City</option>
              <option value="Vijayawada">Vijayawada</option>
              <option value="Guntur">Guntur</option>
              <option value="Visakhapatnam">Visakhapatnam</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bangalore">Bangalore</option>
            </select>
            <div className="absolute inset-y-0 right-14 flex items-center pr-2 pointer-events-none text-gray-400 dark:text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button
              className="absolute inset-y-0 right-0 m-1 px-3 py-1 text-xs font-semibold text-blue-100 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center shadow-lg border border-blue-500/30"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            className="w-full sm:w-auto px-5 py-2 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xl border border-blue-500/50 transition-colors"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-200 mt-3">
        <span className="whitespace-nowrap">Filter by specialty:</span>
      </div>
      <SpecialtyFilters
        searchText={searchText}
        selectedLocation={selectedLocation}
      />
    </div>
  );
};

function SpecialtyFilters({ searchText, selectedLocation }: {
  searchText: string;
  selectedLocation: string;
}) {
  const [specialties, setSpecialties] = useState<Specialization[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const navigate = useNavigate();
  const uniqueSpecialties = useMemo(() => {
    const seen = new Map<string, Specialization>();

    for (const spec of specialties) {
      const canonical = toCanonicalSpecialty(spec.name);
      if (!canonical || seen.has(canonical)) {
        continue;
      }
      seen.set(canonical, {
        ...spec,
        name: toDisplaySpecialty(spec.name),
      });
    }

    return Array.from(seen.entries())
      .sort(([leftCanonical, leftSpec], [rightCanonical, rightSpec]) => {
        const leftRank = SPECIALTY_PRIORITY_RANK.get(leftCanonical) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = SPECIALTY_PRIORITY_RANK.get(rightCanonical) ?? Number.MAX_SAFE_INTEGER;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return leftSpec.name.localeCompare(rightSpec.name);
      })
      .map(([, spec]) => spec);
  }, [specialties]);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const data = await apiRequest<Specialization[]>(
          "/api/specializations",
          "GET",
          undefined,
          {
            cacheTtlMs: 10 * 60 * 1000,
          }
        );
        setSpecialties(data);
      } catch (error) {
        console.error("Failed to fetch specializations:", error);
        // Fallback to hardcoded list if API fails
        setSpecialties([
          { id: 1, name: "General Surgery" },
          { id: 2, name: "General Medicine" },
          { id: 3, name: "Pediatrics" },
          { id: 4, name: "Orthopedics" },
          { id: 5, name: "Gynecology & Obstetrics" },
          { id: 6, name: "Dermatology" },
          { id: 7, name: "ENT" },
          { id: 8, name: "Cardiology" },
          { id: 9, name: "Dentistry" },
          { id: 10, name: "Neurology" },
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
      q: searchText,
      loc: selectedLocation,
    });

    // Append all selected specs as repeated params
    nextSelection.forEach((spec) => params.append("spec", spec));

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
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-200"
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
        className="flex flex-1 gap-2 overflow-x-auto pb-2"
      >
        {uniqueSpecialties.map((s, index) => (
            <button
              key={`${s.id}-${index}`}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${selectedSpecializations.includes(s.name)
                ? "bg-blue-500 text-white border-blue-400 shadow-lg"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:text-white"
                }`}
              onClick={() => handleSpecializationClick(s.name)}
            >
              {s.name}
            </button>
          ))}
      </div>
      <button
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-200"
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