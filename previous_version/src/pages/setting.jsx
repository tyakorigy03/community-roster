import { Camera, UserPlus, X, Settings as SettingsIcon, Shield, Save, Users, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newAdminId, setNewAdminId] = useState("");
  const [assignedAdmins, setAssignedAdmins] = useState([]);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });

  // Fetch initial data from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch settings from settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .order('id');
      
      if (settingsError) throw settingsError;
      
      // Fetch staff from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .order('name');
      
      if (staffError) throw staffError;
      
      setSettings(settingsData || []);
      setStaff(staffData || []);
      
      // Get current admins (where role = 'admin')
      const currentAdmins = (staffData || []).filter(s => s.role === "admin");
      setAssignedAdmins(currentAdmins);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setSaveMessage({ 
        type: "error", 
        text: "Failed to load data. Please refresh the page." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSetting = async (settingId) => {
    setIsSaving(true);
    setSaveMessage({ type: "", text: "" });
    
    try {
      const settingToUpdate = settings.find(s => s.id === settingId);
      if (!settingToUpdate) return;
      
      const newEnabledState = !settingToUpdate.enabled;
      
      // Update setting in Supabase settings table
      const { data, error } = await supabase
        .from('settings')
        .update({ enabled: newEnabledState })
        .eq('id', settingId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      const updatedSettings = settings.map(setting =>
        setting.id === settingId 
          ? { ...setting, enabled: newEnabledState }
          : setting
      );
      
      setSettings(updatedSettings);
      
      // If toggling photo-proof setting, you might want to update related logic
      if (settingToUpdate.key === "photo-proof") {
        // You could trigger additional actions here
        console.log("Photo proof setting changed to:", newEnabledState);
      }
      
      setSaveMessage({ 
        type: "success", 
        text: `${settingToUpdate.name} ${newEnabledState ? 'enabled' : 'disabled'}` 
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      setSaveMessage({ 
        type: "error", 
        text: "Failed to update setting. Please try again." 
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  const handleAssignAdmin = async () => {
    if (!newAdminId) return;
    
    setIsSaving(true);
    setSaveMessage({ type: "", text: "" });
    
    try {
      const staffToPromote = staff.find(s => s.id === parseInt(newAdminId));
      
      if (!staffToPromote) {
        throw new Error("Staff member not found");
      }
      
      // Update staff role to 'admin' in Supabase staff table
      const { data, error } = await supabase
        .from('staff')
        .update({ role: "admin" })
        .eq('id', parseInt(newAdminId))
        .select();
      
      if (error) throw error;
      
      // Refresh data to get updated staff list
      await fetchData();
      
      setNewAdminId("");
      
      setSaveMessage({ 
        type: "success", 
        text: `${staffToPromote.name} promoted to admin` 
      });
    } catch (error) {
      console.error("Error assigning admin:", error);
      setSaveMessage({ 
        type: "error", 
        text: "Failed to assign admin. Please try again." 
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  const handleRemoveAdmin = async (staffId) => {
    setIsSaving(true);
    setSaveMessage({ type: "", text: "" });
    
    try {
      const adminToRemove = staff.find(s => s.id === staffId);
      
      if (!adminToRemove) {
        throw new Error("Admin not found");
      }
      
      // Update staff role back to 'staff' in Supabase staff table
      const { data, error } = await supabase
        .from('staff')
        .update({ role: "staff" })
        .eq('id', staffId)
        .select();
      
      if (error) throw error;
      
      // Refresh data to get updated staff list
      await fetchData();
      
      setSaveMessage({ 
        type: "success", 
        text: `${adminToRemove.name} removed as admin` 
      });
    } catch (error) {
      console.error("Error removing admin:", error);
      setSaveMessage({ 
        type: "error", 
        text: "Failed to remove admin. Please try again." 
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ type: "", text: "" }), 3000);
    }
  };

  // Get photo proof setting (if it exists)
  const photoProofSetting = settings.find(s => s.key === "photo-proof");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b rounded-t-3xl border-gray-200 px-3 py-3 sm:px-6 lg:px-8 lg:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Title */}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <SettingsIcon className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">
                  System Settings
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Configure application preferences and permissions
                </p>
              </div>
            </div>
          </div>

          {/* Save Status */}
          {saveMessage.text && (
            <div className={`px-4 py-2 rounded-lg ${saveMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <div className="flex items-center gap-2 text-sm">
                {saveMessage.type === "success" ? (
                  <Save className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {saveMessage.text}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Application Settings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <SettingsIcon className="text-gray-600 w-5 h-5" />
              <h3 className="text-lg font-semibold text-gray-900">Application Settings</h3>
            </div>
          </div>
          
          {settings.length === 0 ? (
            <div className="p-8 text-center">
              <SettingsIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No settings configured</p>
              <p className="text-sm text-gray-400 mt-1">Add settings to the database to manage them here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {settings.map((setting) => (
                <div key={setting.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {setting.key === "photo-proof" ? (
                        <Camera className="w-5 h-5 text-gray-600" />
                      ) : (
                        <SettingsIcon className="w-5 h-5 text-gray-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{setting.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{setting.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleSetting(setting.id)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${setting.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        setting.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Management */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <Shield className="text-gray-600 w-5 h-5" />
              <h3 className="text-lg font-semibold text-gray-900">Admin Management</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Add New Admin */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Assign Assistant Admin</h4>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Staff Member
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    disabled={isSaving}
                  >
                    <option value="">Choose staff member...</option>
                    {staff
                      .filter(s => s.role === "staff") // Only show non-admins
                      .map((staffMember) => (
                        <option key={staffMember.id} value={staffMember.id}>
                          {staffMember.name} ({staffMember.email})
                        </option>
                      ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={handleAssignAdmin}
                    disabled={!newAdminId || isSaving}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      !newAdminId || isSaving
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isSaving ? "Assigning..." : "Assign Admin"}
                  </button>
                </div>
              </div>
            </div>

            {/* Current Admins */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Current Admins</h4>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {assignedAdmins.length} admin{assignedAdmins.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {assignedAdmins.length === 0 ? (
                <div className="text-center py-8 border border-gray-200 rounded-lg">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No assistant admins assigned yet</p>
                  <p className="text-sm text-gray-400 mt-1">Assign staff members to help manage the system</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assignedAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {admin.name?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{admin.name}</p>
                            <p className="text-sm text-gray-500">{admin.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Role: {admin.role}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveAdmin(admin.id)}
                          disabled={isSaving}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove admin access"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}