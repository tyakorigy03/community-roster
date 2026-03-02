import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Eye, Lock, User, Clock, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

// Import the modal components (we'll create these separately)
import StaffProfileModal from "../components/StaffProfileModal";
import SendInviteModal from "../components/SendInviteModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";

function StaffsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);

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
    e.stopPropagation(); // Prevent card click
    setSelectedStaff(staff);
    setShowInviteModal(true);
  };

  // Handle delete button click
  const handleDeleteClick = (staff, e) => {
    e.stopPropagation(); // Prevent card click
    setStaffToDelete(staff);
    setShowDeleteModal(true);
  };

  // Handle actual deletion
  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staffToDelete.id);

      if (error) throw error;

      toast.success("Staff deleted successfully");
      setStaffs(staffs.filter(s => s.id !== staffToDelete.id));
      setShowDeleteModal(false);
      setStaffToDelete(null);
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Failed to delete staff");
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-300 py-2 gap-4">
        <h2 className="text-2xl font-bold text-gray-700">Staff</h2>
        
        {/* Search */}
        <div className="flex items-center gap-2 w-full md:max-w-xs">
          <Search className="text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            className="w-full text-sm p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Link to={'/addstaff'} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Staff
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        /* Staff List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaffs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No staff found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm ? "Try a different search term" : "Add your first staff member"}
              </p>
            </div>
          ) : (
            filteredStaffs.map((staff) => (
              <div
                key={staff.id}
                onClick={() => handleStaffClick(staff)}
                className="flex flex-col p-4 rounded-xl shadow border border-gray-300 bg-white hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  {staff.profile_picture ? (
                    <img
                      src={staff.profile_picture}
                      alt={staff.name}
                      className="rounded-full h-12 w-12 object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="rounded-full h-12 w-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                      {staff.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-700 truncate">{staff.name}</p>
                    <p className="text-gray-500 text-sm">{staff.role || "Staff Member"}</p>
                  </div>
                </div>

                {/* Staff Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} />
                    <span className="truncate">{staff.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} />
                    <span>{staff.phone || "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} />
                    <span>DOB: {formatDate(staff.dob)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText size={14} />
                    <span>Documents: {staff.documents_count || 0}/8</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => handleInviteClick(staff, e)}
                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    title="Send Invite"
                  >
                    <Lock size={16} />
                  </button>
                  <Link
                    to={`/edit-staff/${staff.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </Link>
                  <button
                    onClick={(e) => handleDeleteClick(staff, e)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          staff={staffToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setStaffToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// Helper component for FileText icon
function FileText(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

export default StaffsPage;