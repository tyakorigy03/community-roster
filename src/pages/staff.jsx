import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  Lock,
  User,
  Mail,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  FileText,
  Fingerprint
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

// Import the modal components
import StaffProfileModal from "../components/StaffProfileModal";
import SendInviteModal from "../components/SendInviteModal";
import DeactivateStaffModal from "../components/DeactivateStaffModal";

function StaffsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'

  // Modal states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [staffToDeactivate, setStaffToDeactivate] = useState(null);

  // Fetch staff from database
  useEffect(() => {
    fetchStaffs();
  }, []);

  const fetchStaffs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch documents count for each staff
      const staffsWithDocs = await Promise.all(
        data.map(async (staff) => {
          const { count, error: docsError } = await supabase
            .from("staff_documents")
            .select("*", { count: 'exact', head: true })
            .eq("staff_id", staff.id);

          return {
            ...staff,
            documents_count: docsError ? 0 : count,
          };
        })
      );

      setStaffs(staffsWithDocs);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff data");
    } finally {
      setLoading(false);
    }
  };

  const filteredStaffs = staffs.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle staff card click
  const handleStaffClick = (staff) => {
    setSelectedStaff(staff);
    setShowProfileModal(true);
  };

  // Handle invite button click
  const handleInviteClick = (staff, e) => {
    e.stopPropagation();
    setSelectedStaff(staff);
    setShowInviteModal(true);
  };

  // Handle deactivate button click
  const handleDeactivateClick = (staff, e) => {
    e.stopPropagation();
    setStaffToDeactivate(staff);
    setShowDeactivateModal(true);
  };

  // Handle actual deactivation
  const handleDeactivateConfirm = async () => {
    if (!staffToDeactivate) return;

    try {
      setDeactivating(true);
      const { error } = await supabase
        .from("staff")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq("id", staffToDeactivate.id);

      if (error) throw error;

      toast.success(`${staffToDeactivate.name} record deactivated`);
      setStaffs(staffs.filter(s => s.id !== staffToDeactivate.id));
      setShowDeactivateModal(false);
      setStaffToDeactivate(null);
    } catch (error) {
      console.error("Error deactivating staff:", error);
      toast.error("Failed to deactivate record");
    } finally {
      setDeactivating(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-0 animate-in fade-in duration-500">
      {/* Compact Activity Header */}
      <div className="flex  gap-3 justify-between items-center p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">Staff Roster</h2>
          <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">Personnel directory</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
          {/* View Toggle */}
          <div className="bg-slate-100/50 p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ListIcon size={14} />
            </button>
          </div>

          <div className="hidden sm:flex items-center bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50 w-48 lg:w-64">
            <Search className="text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search personnel..."
              className="bg-transparent border-none text-[10px] font-bold placeholder:text-slate-400 focus:outline-none w-full ml-2 uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Link
            to={'/addstaff'}
            className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={13} /> <span className="hidden sm:inline">Add Member</span>
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent shadow-lg shadow-blue-200"></div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Retrieving profiles...</p>
          </div>
        ) : filteredStaffs.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
            <User className="mx-auto text-slate-100 mb-4" size={56} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No staff members</p>
            <p className="text-sm font-bold text-slate-200 mt-2 uppercase tracking-tight">Try adjusting your filters</p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredStaffs.map((staff) => (
              <div
                key={staff.id}
                onClick={() => handleStaffClick(staff)}
                className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer group flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-start justify-between mb-5">
                    <div className="relative">
                      {staff.profile_picture ? (
                        <img
                          src={staff.profile_picture}
                          alt={staff.name}
                          className="rounded-2xl h-12 w-12 object-cover border border-slate-100 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="rounded-2xl h-12 w-12 flex items-center justify-center bg-blue-50 text-blue-600 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {staff.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">Active</span>
                  </div>

                  <div className="mb-5">
                    <p className="text-[13px] font-black text-slate-900 uppercase truncate leading-tight">{staff.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{staff.role || "Specialist"}</p>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <Mail size={12} />
                      <span className="text-[10px] font-bold truncate leading-none">{staff.email || "No contact"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <FileText size={12} />
                      <span className="text-[10px] font-bold leading-none uppercase">Compliance: {staff.documents_count || 0}/8</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => handleInviteClick(staff, e)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                      title="Authorize"
                    >
                      <Fingerprint size={14} />
                    </button>
                    <Link
                      to={`/edit-staff/${staff.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      <Edit size={14} />
                    </Link>
                  </div>
                  <button
                    onClick={(e) => handleDeactivateClick(staff, e)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Role & Contact</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStaffs.map((staff) => (
                    <tr
                      key={staff.id}
                      onClick={() => handleStaffClick(staff)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {staff.profile_picture ? (
                            <img src={staff.profile_picture} className="w-9 h-9 rounded-xl object-cover shadow-sm" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase">
                              {staff.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase">{staff.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Joined {formatDate(staff.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-slate-600 uppercase leading-none">{staff.role || "Specialist"}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1.5">{staff.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${staff.documents_count >= 8 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${(staff.documents_count / 8) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{staff.documents_count || 0}/8</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => handleInviteClick(staff, e)} className="p-1.5 text-slate-400 hover:text-green-600" title="Authorize"><Fingerprint size={14} /></button>
                          <Link to={`/edit-staff/${staff.id}`} onClick={(e) => e.stopPropagation()} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit"><Edit size={14} /></Link>
                          <button onClick={(e) => handleDeactivateClick(staff, e)} className="p-1.5 text-slate-400 hover:text-red-600" title="Deactivate"><Trash2 size={14} /></button>
                          <ChevronRight size={14} className="text-slate-200 ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedStaff && showProfileModal && (
        <StaffProfileModal
          staff={selectedStaff}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Invite Modal */}
      {selectedStaff && showInviteModal && (
        <SendInviteModal
          staff={selectedStaff}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <DeactivateStaffModal
          staff={staffToDeactivate}
          onClose={() => {
            setShowDeactivateModal(false);
            setStaffToDeactivate(null);
          }}
          onConfirm={handleDeactivateConfirm}
          loading={deactivating}
        />
      )}
    </div>
  );
}

export default StaffsPage;
