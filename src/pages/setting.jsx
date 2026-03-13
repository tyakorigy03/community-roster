import { Camera, UserPlus, X, Settings as SettingsIcon, Shield, Save,ChevronDown ,ArrowUpRight, Users, AlertCircle, ChevronRight, ShieldCheck, Lock, LayoutDashboard, Database, BellRing, Smartphone, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

export default function SettingsPage() {
  const { currentStaff } = useUser();
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
        .eq('tenant_id', currentStaff.tenant_id)
        .order('id');

      if (settingsError) throw settingsError;

      // Fetch staff from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', currentStaff.tenant_id)
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
      const { error } = await supabase
        .from('settings')
        .update({ enabled: newEnabledState })
        .eq('id', settingId)
        .eq('tenant_id', currentStaff.tenant_id)
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
      const { error } = await supabase
        .from('staff')
        .update({ role: "admin" })
        .eq('id', parseInt(newAdminId))
        .eq('tenant_id', currentStaff.tenant_id)
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
      const { error } = await supabase
        .from('staff')
        .update({ role: "staff" })
        .eq('id', staffId)
        .eq('tenant_id', currentStaff.tenant_id)
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Configurations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30">
      {/* Professional Compact Header */}
   <div className="flex flex-row justify-between items-center gap-3 p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">

  {/* LEFT */}
  <div className="flex items-center gap-3 min-w-0">
    {/* Settings Icon */}
    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 flex-shrink-0">
      <SettingsIcon className="text-white" size={20} />
    </div>

    <div className="min-w-0">
      <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
        System Framework
      </h2>

      <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
        Operational → Core Configuration
        {isSaving && (
          <span className="ml-2 bg-blue-100 text-blue-600 text-[9px] px-2 py-0.5 rounded-full border border-blue-200 font-black uppercase animate-pulse">
            Synchronizing...
          </span>
        )}
      </p>
    </div>
  </div>

  {/* RIGHT */}
  <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
    
    {/* Save message */}
    {saveMessage.text && (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border animate-in slide-in-from-right-4 duration-500 ${
        saveMessage.type === "success"
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
      }`}>
        {saveMessage.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
        <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-widest truncate">
          {saveMessage.text}
        </span>
      </div>
    )}

    {/* Divider line */}
    <div className="h-8 w-[1px] bg-slate-200/40 mx-1"></div>

    {/* Refresh Button */}
    <button
      onClick={() => fetchData()}
      className="px-3 py-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl shadow-sm flex items-center gap-2 text-[9px] lg:text-[11px] font-black uppercase tracking-widest transition-all"
    >
      <Database size={14} className="text-blue-500" />
      <span className="hidden sm:inline">Refresh Data</span>
    </button>
  </div>
</div>



      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Sidebar - High Density Navigation / Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 -z-0"></div>
              <div className="relative z-10">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <LayoutDashboard size={14} className="text-blue-600" />
                  Infrastructure Summary
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Active Parameters', value: settings.length, icon: Smartphone, color: 'text-indigo-600' },
                    { label: 'Administrative Staff', value: assignedAdmins.length, icon: ShieldCheck, color: 'text-blue-600' },
                    { label: 'Total Environment', value: staff.length, icon: Users, color: 'text-slate-600' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-white transition-all cursor-default group">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-white rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors ${item.color}`}><item.icon size={14} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Security Protocol</h3>
              <p className="text-xs font-medium text-slate-300 leading-relaxed">System-wide configurations affect all operational nodes. Changes are logged and applied in real-time to the production environment.</p>
              <div className="mt-5 flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                <Lock size={12} />
                <span>Encrypted Connection</span>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-8 space-y-8">

            {/* Feature Flags Section */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/40">
              <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Functional Parameters</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Application Feature Flags</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                  <Smartphone className="text-blue-600" size={18} />
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {settings.length === 0 ? (
                  <div className="px-8 py-16 text-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm mx-auto">
                      <Database className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">No Parameters Defined</h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-xs mx-auto">The system configuration table is currently empty.</p>
                  </div>
                ) : (
                  settings.map((setting) => (
                    <div key={setting.id} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${setting.enabled ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          {setting.key === "photo-proof" ? <Camera size={20} /> : <SettingsIcon size={20} />}
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{setting.name}</h4>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5 line-clamp-1 max-w-sm">{setting.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSetting(setting.id)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ring-offset-2 hover:ring-2 hover:ring-slate-200 ${setting.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${setting.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Administrative Hierarchy Section */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/40">
              <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Access Hierarchy</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Permission Escalation Management</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                  <ShieldCheck className="text-emerald-600" size={18} />
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Elevation Interface */}
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/50 rounded-full -mr-16 -mt-16 blur-xl"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UserPlus size={12} className="text-blue-500" />
                        Elevate Personnel
                      </label>
                      <div className="relative">
                        <select
                          className="w-full h-12 bg-white border border-slate-100 rounded-2xl px-4 text-[11px] font-black uppercase tracking-widest appearance-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 outline-none transition-all cursor-pointer"
                          value={newAdminId}
                          onChange={(e) => setNewAdminId(e.target.value)}
                          disabled={isSaving}
                        >
                          <option value="">Select Candidate...</option>
                          {staff.filter(s => s.role === "staff").map((staffMember) => (
                            <option key={staffMember.id} value={staffMember.id}>
                              {staffMember.name} — {staffMember.email}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      onClick={handleAssignAdmin}
                      disabled={!newAdminId || isSaving}
                      className={`h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-xl ${!newAdminId || isSaving
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                        }`}
                    >
                      {isSaving ? "Synchronizing..." : "Authorize Elevation"}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Authorized Personnel Grid */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authorized Controllers</h4>
                    <span className="h-[1px] flex-1 bg-slate-100"></span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full border border-emerald-100 font-black">
                      {assignedAdmins.length} ACTIVE
                    </span>
                  </div>

                  {assignedAdmins.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Assistant Controllers Assigned</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assignedAdmins.map((admin) => (
                        <div
                          key={admin.id}
                          className="group bg-white border border-slate-100 rounded-[1.8rem] p-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm transition-transform group-hover:scale-110">
                                <span className="text-blue-600 font-black text-sm">
                                  {admin.name?.charAt(0) || "U"}
                                </span>
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{admin.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{admin.email}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveAdmin(admin.id)}
                              disabled={isSaving}
                              className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Revoke Permissions"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-blue-500/10"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
