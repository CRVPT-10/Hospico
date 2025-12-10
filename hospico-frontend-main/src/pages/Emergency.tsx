import { useCallback, useEffect, useState } from "react";
import { Phone, MapPin, AlertTriangle, Ambulance, ChevronFirst as FirstAid, Clock } from 'lucide-react';
import { apiRequest } from "../api";

interface NearbyFacility {
  id: string | number;
  name: string;
  address: string;
  distanceKm?: number;
  distance?: number;
  estimatedWaitMinutes?: number;
  etaMinutes?: number;
  estimatedTime?: number;
  latitude?: number;
  longitude?: number;
}

export default function Emergency() {
  const [facilities, setFacilities] = useState<NearbyFacility[]>([]);
  const [loadingNearby, setLoadingNearby] = useState<boolean>(false);
  const [errorNearby, setErrorNearby] = useState<string | null>(null);

  const fetchNearbyFacilities = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorNearby("Geolocation is not supported in this browser.");
      return;
    }

    setLoadingNearby(true);
    setErrorNearby(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await apiRequest<NearbyFacility[]>(
            `/api/clinics/nearby?lat=${latitude}&lng=${longitude}`,
            "GET"
          );

          const sorted = data
            .slice()
            .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));

          setFacilities(sorted.slice(0, 2));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to load nearby facilities";
          setErrorNearby(message);
        } finally {
          setLoadingNearby(false);
        }
      },
      (geoErr) => {
        setLoadingNearby(false);
        setErrorNearby(geoErr.message || "Unable to get your location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    fetchNearbyFacilities();
  }, [fetchNearbyFacilities]);

  const getDirectionsLink = (facility: NearbyFacility) => {
    if (facility.latitude && facility.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.name + " " + facility.address)}`;
  };

  return (
    <div className="space-y-16">
      {/* Emergency Banner */}
      <section className="bg-red-600 text-white p-8 rounded-xl">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <AlertTriangle className="h-12 w-12" />
          <div>
            <h1 className="text-3xl font-bold mb-2">Emergency Services</h1>
            <p className="text-xl">
              If you're experiencing a medical emergency, call emergency services immediately:
              <a href="tel:911" className="ml-2 font-bold underline">911</a>
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-red-50 p-3 rounded-full w-fit mb-4">
              <Ambulance className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ambulance Service</h3>
            <p className="text-gray-600 mb-4">24/7 emergency medical transportation</p>
            <a href="tel:911" className="text-red-600 font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Now
            </a>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-red-50 p-3 rounded-full w-fit mb-4">
              <FirstAid className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Emergency Rooms</h3>
            <p className="text-gray-600 mb-4">Find nearest emergency facilities</p>
            <button
              onClick={fetchNearbyFacilities}
              className="text-red-600 font-semibold flex items-center gap-2"
            >
              <MapPin className="h-5 w-5" />
              Locate ER
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="bg-red-50 p-3 rounded-full w-fit mb-4">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Wait Times</h3>
            <p className="text-gray-600 mb-4">Real-time ER wait time information</p>
            <button className="text-red-600 font-semibold flex items-center gap-2">
              Check Times
            </button>
          </div>
        </div>
      </section>

      {/* Emergency Guidelines */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">When to Seek Emergency Care</h2>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <ul className="space-y-4">
            {[
              "Chest pain or difficulty breathing",
              "Severe abdominal pain",
              "Stroke symptoms (face drooping, arm weakness, speech difficulty)",
              "Severe head injury or loss of consciousness",
              "Uncontrolled bleeding",
              "Poisoning or overdose",
              "Severe allergic reactions",
              "Major burns or injuries"
            ].map((symptom) => (
              <li key={symptom} className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <span>{symptom}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Nearby Facilities */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Nearby Emergency Facilities</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {loadingNearby && (
            <div className="md:col-span-2 text-gray-600">Locating nearby emergency rooms...</div>
          )}

          {errorNearby && !loadingNearby && (
            <div className="md:col-span-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
              {errorNearby}
            </div>
          )}

          {!loadingNearby && !errorNearby && facilities.length === 0 && (
            <div className="md:col-span-2 text-gray-600 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              No nearby emergency facilities found.
            </div>
          )}

          {!loadingNearby && !errorNearby && facilities.map((facility) => (
            <div key={facility.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-lg mb-2">{facility.name}</h3>
              <div className="space-y-2 text-gray-600">
                <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {facility.address}
                  {(() => {
                    const d = facility.distanceKm ?? facility.distance;
                    return d != null ? ` (${d.toFixed(1)} km)` : "";
                  })()}
                </p>
                {(facility.estimatedWaitMinutes ?? facility.etaMinutes ?? facility.estimatedTime) != null && (
                  <p className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Current wait: {facility.estimatedWaitMinutes ?? facility.etaMinutes ?? facility.estimatedTime} minutes
                  </p>
                )}
              </div>
              <a
                href={getDirectionsLink(facility)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex justify-center w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Get Directions
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}