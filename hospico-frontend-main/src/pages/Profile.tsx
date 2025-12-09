import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { User, Mail, Phone, Edit, Save, X } from "lucide-react";
import type { RootState } from "../store/store";
import { apiRequest } from "../api";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
};

type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  password?: string;
};

export default function Profile() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    console.log("Auth state:", { user, isAuthenticated });
    // Always fetch the current user profile from the server
    // This ensures we have the latest and complete user data
    fetchCurrentUserProfile();
  }, [user, isAuthenticated]);
  const fetchCurrentUserProfile = async () => {
    try {
      setLoading(true);
      // First try to get current user info from users/me endpoint
      const authUserData = await apiRequest<any>(
        "/api/users/me",
        "GET"
      );
      
      console.log("Auth user data:", authUserData);
      
      if (authUserData && authUserData.id) {
        // Create a UserProfile object from the auth data
        const userProfile: UserProfile = {
          id: authUserData.id,
          name: authUserData.name || "",
          email: authUserData.email || "",
          phone: authUserData.phone || "",
          role: authUserData.role || ""
        };
        
        setProfile(userProfile);
        setEditData({
          name: userProfile.name || "",
          phone: userProfile.phone || "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        setError("Unable to fetch user profile");
      }
    } catch (err: any) {
      let errorMessage = "Failed to fetch profile data. Please try logging in again.";
      if (err.response) {
        // Server responded with error status
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
      if (editData.newPassword) updateData.password = editData.newPassword;

      const updatedProfile = await apiRequest<UserProfile>(
        `/api/users/me`,
        "PATCH",
        updateData
      );

      setProfile(updatedProfile);
      setIsEditing(false);
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
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                      newPassword: "",
                      confirmPassword: ""
                    });
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center">
                  <User className="text-gray-500" size={24} />
                </div>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="text-xl font-semibold text-gray-900 border-b border-gray-300 focus:border-blue-500 focus:outline-none pb-1 w-full"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
                )}
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.phone}
                        onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        className="border-b border-gray-300 focus:border-blue-500 focus:outline-none pb-1"
                      />
                    ) : (
                      <span>{profile.phone || "No phone number"}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Role</h3>
              <p className="mt-1 text-gray-900 capitalize">{profile.role.toLowerCase()}</p>
            </div>

            {/* Change Password (Edit Mode Only) */}
            {isEditing && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={editData.newPassword}
                      onChange={(e) => setEditData({...editData, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={editData.confirmPassword}
                      onChange={(e) => setEditData({...editData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}