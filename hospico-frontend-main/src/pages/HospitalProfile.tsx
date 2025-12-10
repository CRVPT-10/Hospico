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
  doctors: Doctor[];
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
        const response = await apiRequest<any>(
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <img
          src={hospital.imageUrl || defaultHospitalImage}
          alt={hospital.name}
          className="w-full h-64 object-cover rounded-md mb-4"
        />
        <h1 className="text-2xl font-bold mb-2">{hospital.name}</h1>
        <p className="text-gray-600 mb-2">📍 {hospital.address}, {hospital.city}</p>
        {hospital.phone && <p className="text-gray-600 mb-4">📞 {hospital.phone}</p>}
        <h2 className="text-xl font-semibold mb-2">Specializations</h2>
        <ul className="list-disc list-inside mb-4">
          {hospital.specializations.map((specialization) => (
            <li key={specialization}>{specialization}</li>
          ))}
        </ul>
        <h2 className="text-xl font-semibold mb-4">Doctors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospital.doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center"
            >
              <img
                src={doctor.imageUrl || defaultDoctorImage}
                alt={doctor.name}
                className="w-24 h-24 object-cover rounded-full mb-4"
              />
              <h3 className="text-lg font-semibold mb-1">{doctor.name}</h3>
              <p className="text-sm text-gray-600 mb-1">{doctor.qualification}</p>
              <p className="text-sm text-gray-600 mb-1">{doctor.specialization}</p>
              <p className="text-sm text-gray-600 mb-1">Experience: {doctor.experience}</p>
              <p className="text-sm text-gray-600 text-center">{doctor.biography}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HospitalProfile;