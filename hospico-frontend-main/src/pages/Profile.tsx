import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Edit, Mail, Phone, Save, User, X } from "lucide-react";
import { useAppDispatch, type RootState } from "../store/store";
import { fetchUserRecords } from "../features/medicalRecords/medicalRecordsSlice";
import { apiRequest } from "../api";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  age?: number;
  gender?: string;
};

type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  password?: string;
  age?: number;
  gender?: string;
};

type Appointment = {
  id: number;
  appointmentTime: string;
  status: string;
  clinicName: string;
  doctorName: string;
  reason?: string;
};

export default function Profile() {
  const { user: authUser, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { files: healthRecords } = useSelector((state: RootState) => state.medicalRecords);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousVisits, setPreviousVisits] = useState<Appointment[]>([]);

  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    fetchCurrentUserProfile();
    fetchRecentAppointments();
    if (authUser?.id) {
      dispatch(fetchUserRecords(Number(authUser.id)));
    }
  }, [authUser, isAuthenticated, dispatch]);

  const fetchCurrentUserProfile = async () => {
    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authUserData = await apiRequest<any>("/api/users/me", "GET");

      if (authUserData && authUserData.id) {
        const userProfile: UserProfile = {
          id: authUserData.id,
          name: authUserData.name || "",
          email: authUserData.email || "",
          phone: authUserData.phone || "",
          role: authUserData.role || "",
          age: authUserData.age ?? undefined,
          gender: authUserData.gender ?? undefined
        };

        setProfile(userProfile);
        setEditData({
          name: userProfile.name || "",
          phone: userProfile.phone || "",
          age: userProfile.age ? String(userProfile.age) : "",
          gender: userProfile.gender || "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        setError("Unable to fetch user profile");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      let errorMessage = "Failed to fetch profile data. Please try logging in again.";
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Session expired: Please log in again";
        } else if (err.response.status === 403) {
          errorMessage = "Access denied: Insufficient permissions";
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAppointments = async () => {
    try {
      if (authUser?.id) {
        const appointments = await apiRequest<Appointment[]>(`/api/appointments/user/${authUser.id}`, "GET");

        // Sort by date (most recent first) and take only 2
        const sortedAppointments = appointments
          .sort((a, b) => new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime())
          .slice(0, 2);

        setPreviousVisits(sortedAppointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    }
  };


  const handleSave = async () => {
    if (editData.newPassword !== editData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateProfilePayload = {};
      if (editData.name !== profile?.name) updateData.name = editData.name;
      if (editData.phone !== profile?.phone) updateData.phone = editData.phone;
      if (editData.age !== (profile?.age ? String(profile.age) : "") && editData.age !== "") {
        updateData.age = Number(editData.age);
      }
      if (editData.gender !== (profile?.gender || "")) {
        updateData.gender = editData.gender || undefined;
      }
      if (editData.newPassword) updateData.password = editData.newPassword;

      const updatedProfile = await apiRequest<UserProfile>("/api/users/me", "PATCH", updateData);

      setProfile(updatedProfile);
      setIsEditing(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      let errorMessage = "Failed to update profile";
      if (err.response) {
        if (err.response.status === 400) {
          errorMessage = "Invalid input data";
        } else if (err.response.status === 401) {
          errorMessage = "Session expired: Please log in again";
        } else if (err.response.status === 403) {
          errorMessage = "Access denied: Cannot update this profile";
        } else if (err.response.status === 404) {
          errorMessage = "User not found";
        }
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="text-gray-600">No profile data available</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900 py-10 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 p-6 sm:p-8 transition-colors duration-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-500 dark:text-slate-300">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0 notranslate">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name || ""}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full max-w-[200px] sm:max-w-md text-2xl font-semibold text-gray-900 dark:text-white rounded-md px-2 py-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                  />
                ) : (
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{profile.name}</h1>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-slate-300 mt-1">
                  <span className="inline-flex items-center gap-2">
                    <Mail size={16} />
                    {profile.email}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Phone size={16} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.phone || ""}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="border-b border-gray-400 dark:border-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none bg-transparent pb-0.5 text-gray-900 dark:text-white"
                      />
                    ) : (
                      profile.phone || "No phone number"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white border border-blue-500 shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: profile.name || "",
                      phone: profile.phone || "",
                      age: profile.age ? String(profile.age) : "",
                      gender: profile.gender || "",
                      newPassword: "",
                      confirmPassword: ""
                    });
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-600 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-lg p-4 sm:p-5 flex flex-col transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 tracking-wide uppercase">Contact & Identity</h2>
                <span className="px-3 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-600/30 text-blue-800 dark:text-blue-300 capitalize">{profile.role.toLowerCase()}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 notranslate">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Full Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-slate-400"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-slate-100 font-medium">{profile.name}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Email</p>
                  <p className="text-gray-900 dark:text-slate-100 font-medium break-all">{profile.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Phone</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-slate-400"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-slate-100 font-medium">{profile.phone || "No phone number"}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Age</p>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      value={editData.age || ""}
                      onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-slate-400"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-slate-100 font-medium">{profile.age ?? "Not set"}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Gender</p>
                  {isEditing ? (
                    <select
                      value={editData.gender || ""}
                      onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-slate-100 font-medium">{profile.gender || "Not set"}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-lg p-4 sm:p-5 flex flex-col transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 tracking-wide uppercase">Previous Visits</h2>
                <span className="text-xs text-gray-500 dark:text-slate-400">Recent 2</span>
              </div>
              <div className="space-y-3">
                {previousVisits.length > 0 ? (
                  previousVisits.map((visit) => (
                    <div key={visit.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-gray-900 dark:text-slate-100 font-medium">{visit.clinicName}</p>
                          <p className="text-sm text-gray-600 dark:text-slate-300">{visit.doctorName}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(visit.appointmentTime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      {visit.reason && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{visit.reason}</p>
                      )}
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${visit.status === "BOOKED" ? "bg-green-600 text-white dark:bg-green-600/30 dark:text-green-300" :
                        visit.status === "CANCELLED" ? "bg-red-100 dark:bg-red-600/30 text-red-800 dark:text-red-300" :
                          "bg-blue-100 dark:bg-blue-600/30 text-blue-800 dark:text-blue-300"
                        }`}>
                        {visit.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-slate-400">
                    <p className="text-sm">No appointments yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-lg p-4 sm:p-5 transition-colors duration-200">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 tracking-wide uppercase mb-4">Change Password</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">New Password</p>
                  <input
                    type="password"
                    id="newPassword"
                    value={editData.newPassword || ""}
                    onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-slate-400"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Confirm Password</p>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={editData.confirmPassword || ""}
                    onChange={(e) => setEditData({ ...editData, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none placeholder-gray-400 dark:placeholder-slate-400"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 shadow-sm dark:shadow-lg p-4 sm:p-5 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 tracking-wide uppercase">Health Records</h2>
              <button
                onClick={() => navigate('/reports')}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Upload
              </button>
            </div>
            <div className="space-y-3">
              {healthRecords.length > 0 ? (
                healthRecords.slice(0, 5).map((record) => (
                  <div key={record.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 p-3 flex items-center justify-between shadow-sm">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-gray-900 dark:text-slate-100 font-medium truncate" title={record.name}>{record.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{record.date}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-600/30 text-blue-800 dark:text-blue-300 font-semibold shrink-0">
                      {record.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-slate-400 text-sm">
                  No health records found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}