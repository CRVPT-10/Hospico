import { useState, useEffect } from "react";
import { apiRequest } from "../api";
import HospitalCardComponent, { type Hospital } from "./HospitalCard";
import { useTheme } from "../context/ThemeContext";

const sortByDistance = (items: Hospital[]) =>
  [...items].sort((a, b) => {
    const aDistance = a.distanceKm ?? a.distance ?? Number.POSITIVE_INFINITY;
    const bDistance = b.distanceKm ?? b.distance ?? Number.POSITIVE_INFINITY;
    return aDistance - bDistance;
  });

interface NearbyHospitalsProps {
  latitude: number;
  longitude: number;
}

const NearbyHospitals = ({ latitude, longitude }: NearbyHospitalsProps) => {
  const { theme } = useTheme();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyHospitals = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<Hospital[]>(
          `/api/clinics/nearby?lat=${latitude}&lng=${longitude}`,
          "GET",
          undefined,
          {
            cacheTtlMs: 60 * 1000,
          }
        );
        setHospitals(sortByDistance(data || []));
      } catch (err) {
        setError((err as Error)?.message || "Failed to load nearby hospitals");
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyHospitals();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-700 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Finding nearby hospitals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/10 rounded-2xl p-8 text-center border border-red-500/20 backdrop-blur-sm">
        <p className="text-red-400 font-medium">{error}</p>
      </div>
    );
  }

  if (hospitals.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-8 text-center border border-slate-700 backdrop-blur-sm">
        <p className="text-slate-400 font-medium">No nearby hospitals found in your area.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nearest Hospitals</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Based on your current GPS location</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hospital) => (
          <HospitalCardComponent
            key={hospital.clinicId || hospital.id}
            hospital={hospital}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

export default NearbyHospitals;