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
    if (user?.id) {
      fetchUserProfile(parseInt(user.id));
    } else {
      // If we don't have user data, try to fetch it
      fetchCurrentUserProfile();
    }
  }, [user, isAuthenticated]);

  const fetchCurrentUserProfile = async () => {
    try {
      setLoading(true);
      // First try to get current user info from users/me endpoint
      const authUserData = await apiRequest<any>(
        "http://localhost:8080/api/users/me",
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
          errorMessage = "Access denied: Please log in again";
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "Network error: Unable to connect to server";
      } else if (err.message) {
        // Something else happened
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: number) => {
    try {
      setLoading(true);
      // Use the users/me endpoint instead of users/{id}
      const authUserData = await apiRequest<any>(
        "http://localhost:8080/api/users/me",
        "GET"
      );
      
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
      let errorMessage = "Failed to fetch profile data.";
      if (err.response) {
        // Server responded with error status
        if (err.response.status === 401) {
          errorMessage = "Session expired: Please log in again";
        } else if (err.response.status === 403) {
          errorMessage = "Access denied";
        } else if (err.response.status === 404) {
          errorMessage = "User not found";
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "Network error: Unable to connect to server";
      } else if (err.message) {
        // Something else happened
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Profile fetch error:", err);
      // If fetching by ID fails, try fetching current user
      fetchCurrentUserProfile();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    if (editData.newPassword !== editData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const payload: UpdateProfilePayload = {};
      if (editData.name) payload.name = editData.name;
      if (editData.phone) payload.phone = editData.phone;
      if (editData.newPassword) payload.password = editData.newPassword;

      // Call the update API endpoint
      const response = await apiRequest<any>(
        `http://localhost:8080/api/users/${profile.id}`,
        "PATCH",
        payload
      );
      
      if (response) {
        setSaving(false);
        setIsEditing(false);
        // Refresh profile data
        fetchCurrentUserProfile();
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err: any) {
      let errorMessage = "Failed to update profile";
      if (err.response) {
        // Server responded with error status
        if (err.response.status === 401) {
          errorMessage = "Unauthorized: Please log in again";
        } else if (err.response.status === 403) {
          errorMessage = "Forbidden: You don't have permission to update this profile";
        } else if (err.response.status === 404) {
          errorMessage = "User not found";
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "Network error: Unable to connect to server";
      } else if (err.message) {
        // Something else happened
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Profile update error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    if (user?.id) {
      fetchUserProfile(parseInt(user.id));
    } else {
      fetchCurrentUserProfile();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <p className="text-yellow-800">No profile data available</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <div className="bg-white p-3 rounded-full">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
                <div className="ml-4 text-white">
                  <h1 className="text-2xl font-bold">{profile.name || "User"}</h1>
                  <p className="text-blue-100">{profile.role || "USER"}</p>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter full name"
                      />
                    ) : (
                      <p className="text-gray-900">{profile.name || "Not provided"}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-gray-900">{profile.email || "Not provided"}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-gray-900">{profile.phone || "Not provided"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={editData.newPassword}
                        onChange={(e) => setEditData({...editData, newPassword: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter new password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={editData.confirmPassword}
                        onChange={(e) => setEditData({...editData, confirmPassword: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      <p>Leave password fields empty to keep current password</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <p className="text-gray-900">••••••••</p>
                      <p className="text-sm text-gray-500 mt-1">Last updated: Not available</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type
                      </label>
                      <p className="text-gray-900 capitalize">{profile.role?.toLowerCase() || "user"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">Not available</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Total Appointments</p>
                  <p className="font-medium">0</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium">Not available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}