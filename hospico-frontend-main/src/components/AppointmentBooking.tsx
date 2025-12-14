import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { apiRequest } from "../api";

interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualifications: string;
}

interface TimeSlot {
  time: string;
  isBooked: boolean;
}

interface AppointmentResponse {
  id: number;
  userId: number;
  appointmentTime: string;
  patientName: string;
  patientAge: number;
  status: string;
}

interface AppointmentBookingProps {
  hospitalId: string;
  doctorId?: string;
  doctorName?: string;
  specialization?: string;
  onClose: () => void;
}

const AppointmentBooking = ({ hospitalId, doctorId, doctorName, specialization, onClose }: AppointmentBookingProps) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [problem, setProblem] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selfBooking, setSelfBooking] = useState<boolean>(true);
  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(null);

  // Apply cached profile (or fallback user) to patient fields
  const applyProfileToFields = useCallback(() => {
    const source: UserProfile | null = cachedProfile || (user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          age: user.age,
          gender: user.gender,
        }
      : null);

    if (!source) return;

    setPatientName(source.name || source.email?.split("@")[0] || "");
    setPatientEmail(source.email || "");
    setPatientPhone(source.phone || "");
    setPatientAge(source.age ? source.age.toString() : "");
    setPatientGender(source.gender || "");
  }, [cachedProfile, user]);

  // Fetch profile to auto-populate patient details
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const profile = await apiRequest<UserProfile>("/api/users/me", "GET");
        setCachedProfile(profile);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    fetchProfile();
  }, [user]);

  // Load doctors for the selected hospital
  useEffect(() => {
    const loadDoctors = async () => {
      setLoading(true);
      setError(null);
      try {
        await apiRequest<Doctor[]>(
          `/api/clinics/${hospitalId}/doctors`,
          "GET"
        );
        
        // Pre-fill doctor if provided from props
        if (doctorId) {
          setSelectedDoctor(doctorId);
        }
        
      } catch (err) {
        setError("Failed to load doctors for this hospital");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, [hospitalId, doctorId, user]);

  // Auto-populate when self booking is enabled or when profile changes
  useEffect(() => {
    if (!selfBooking) return;
    applyProfileToFields();
  }, [selfBooking, cachedProfile, user, applyProfileToFields]);

  // Generate time slots when date or doctor changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const generateSlots = async () => {
      // Check if selected date is today
      const today = new Date();
      const selectedDateObj = new Date(selectedDate);
      const isToday = selectedDateObj.toDateString() === today.toDateString();
      
      // Get current time
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      // Check if selected date is Sunday
      const selectedDay = new Date(selectedDate).getDay();
      const isSunday = selectedDay === 0;

      // Fetch booked appointments for this doctor on this date
      let bookedTimes: string[] = [];
      try {
        console.log(`🔍 Fetching booked appointments for doctor ${selectedDoctor} on date ${selectedDate}`);
        const url = `http://localhost:8080/api/appointments/doctor/${selectedDoctor}/date/${selectedDate}`;
        console.log(`📍 API URL: ${url}`);
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem('jwt_token')}`,
            "Content-Type": "application/json",
          },
        });
        
        console.log(`📊 Response status: ${response.status}`);
        
        if (response.ok) {
          const appointments: AppointmentResponse[] = await response.json();
          console.log("📦 Raw appointments data:", appointments);
          
          if (Array.isArray(appointments)) {
            console.log(`✅ Found ${appointments.length} appointment(s)`);
            appointments.forEach((apt, idx) => {
              console.log(`  [${idx}] Status: ${apt.status}, Time: ${apt.appointmentTime}`);
            });
            
            bookedTimes = appointments
              .filter(apt => apt.status === "BOOKED")
              .map((apt) => {
                const time = apt.appointmentTime?.substring(11, 16);
                console.log(`  ✅ Extracted booked time: ${time}`);
                return time;
              })
              .filter((time): time is string => time !== undefined && time.length === 5);

            console.log("✅ Final booked times array:", bookedTimes);
          }
        } else {
          console.error(`❌ API returned status ${response.status}`);
          const errorText = await response.text();
          console.error("❌ Error response body:", errorText);
          console.error("❌ This means the backend rejected the request. Check backend logs.");
        }
      } catch (err) {
        console.error("❌ Failed to fetch booked appointments:", err);
      }

      // Generate time slots based on doctor's timings
      const slots: TimeSlot[] = [];
      
      // Morning session: 9:00 AM - 1:00 PM
      for (let hour = 9; hour <= 13; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === 13 && minute > 0) break; // Stop at 1:00 PM
          
          // Skip past times if today is selected
          if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
            continue;
          }
          
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const isBooked = bookedTimes.includes(timeString);
          
          slots.push({
            time: timeString,
            isBooked
          });
          
          if (isBooked) {
            console.log("Marked as BOOKED:", timeString);
          }
        }
      }
      
      // Afternoon session: 2:00 PM - 8:00 PM (weekdays) or 2:00 PM - 6:00 PM (Sunday)
      const afternoonEndHour = isSunday ? 18 : 20;
      for (let hour = 14; hour <= afternoonEndHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === afternoonEndHour && minute > 0) break;
          
          // Skip past times if today is selected
          if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
            continue;
          }
          
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const isBooked = bookedTimes.includes(timeString);
          
          slots.push({
            time: timeString,
            isBooked
          });
          
          if (isBooked) {
            console.log("Marked as BOOKED:", timeString);
          }
        }
      }
      
      console.log("All generated slots:", slots);
      setAvailableSlots(slots);
      setSelectedSlot("");
    };

    generateSlots();
  }, [selectedDoctor, selectedDate]);

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !patientName || !patientAge || !patientGender || !problem) {
      setError("Please fill in all required fields");
      return;
    }

    // Check if selected slot is actually available (not booked)
    const selectedSlotObj = availableSlots.find(slot => slot.time === selectedSlot);
    console.log("Selected slot object:", selectedSlotObj);
    console.log("Is booked:", selectedSlotObj?.isBooked);
    
    if (selectedSlotObj?.isBooked) {
      setError("❌ This slot is already booked and cannot be selected. Please choose a different time.");
      setSelectedSlot("");
      console.warn("Attempted to book already booked slot:", selectedSlot);
      return;
    }

    setBookingLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Combine date and time
      const appointmentDateTime = `${selectedDate}T${selectedSlot}:00`;
      
      const appointmentData = {
        userId: user?.id ? parseInt(user.id) : null,
        clinicId: parseInt(hospitalId),
        doctorId: parseInt(selectedDoctor),
        appointmentTime: appointmentDateTime,
        patientName,
        patientAge: parseInt(patientAge),
        patientGender,
        patientPhone,
        patientEmail,
        reason: problem  // Adding the problem/reason field
      };

      const response = await apiRequest<unknown>(
        "/api/appointments",
        "POST",
        appointmentData
      );

      if (response) {
        setSuccess("Appointment booked successfully!");
        // Close the modal after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to book appointment";
      setError(message);
      console.error(err);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Book Appointment</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Doctor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Doctor *
                </label>
                {doctorName && specialization && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      {doctorName} - {specialization}
                    </p>
                  </div>
                )}
              </div>

              {/* Problem/Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Problem/Reason *
                </label>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your problem or reason for visit"
                />
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Time Slot Selection */}
              {selectedDate && selectedDoctor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time Slot *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => 
                        slot.isBooked ? (
                          <div
                            key={slot.time}
                            className="w-full px-3 py-2 text-sm font-medium rounded-md border-2 border-gray-300 bg-gray-300 text-gray-600 cursor-not-allowed pointer-events-none"
                            title="This slot is already booked"
                          >
                            {slot.time}
                          </div>
                        ) : (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`w-full px-3 py-2 text-sm font-medium rounded-md border-2 transition-all ${
                              selectedSlot === slot.time
                                ? "border-green-600 bg-green-50 text-green-900 shadow-lg"
                                : "border-blue-400 bg-blue-50 text-blue-900 hover:bg-blue-100 cursor-pointer"
                            }`}
                          >
                            {slot.time}
                          </button>
                        )
                      )
                    ) : (
                      <p className="text-gray-500 text-sm col-span-full">No available slots for this date</p>
                    )}
                  </div>
                </div>
              )}

              {/* Patient Details */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="selfCheckbox"
                    checked={selfBooking}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelfBooking(checked);

                      if (!checked) {
                        // Clear all fields when user opts out
                        setPatientName("");
                        setPatientPhone("");
                        setPatientAge("");
                        setPatientGender("");
                        setPatientEmail("");
                      } else {
                        // Re-apply cached profile when opting back in
                        applyProfileToFields();
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="selfCheckbox" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Booking for myself
                  </label>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age *
                    </label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter age"
                      min="1"
                      max="120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender *
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  disabled={bookingLoading || !selectedDoctor || !selectedDate || !selectedSlot || !patientName || !patientAge || !patientGender || !problem}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? "Booking..." : "Book Appointment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;
