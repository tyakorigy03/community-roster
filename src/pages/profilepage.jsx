import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Save,
  Eye,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Camera,
  ArrowUpRight,
  FileSearch,
  Users
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";
import { toast } from "react-toastify";

const documentFields = [
  "Certificate",
  "Ndis Screening Check",
  "WWCC",
  "Police Check",
  "Visa",
  "Driving License",
  "Passport",
  "First Aid & CPR"
];

function StaffProfile() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('personal');
  const fileInputRefs = useRef({});
  const profileInputRef = useRef(null);
  const { currentStaff: user } = useUser();
  const [staffData, setStaffData] = useState({
    name: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
    role: "",
    next_of_kin: {
      name: "",
      phone: "",
      relationship: ""
    },
    documents: documentFields.reduce((acc, doc) => {
      acc[doc] = {
        file: null,
        existing_url: "",
        expiry: "",
        uploadProgress: 0,
        isUploading: false,
        fileName: "",
        id: null
      };
      return acc;
    }, {}),
    profile_picture: "",
    profilePictureFile: null
  });

  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    fetchCurrentStaffProfile();
  }, []);

  const fetchCurrentStaffProfile = async () => {
    try {
      setLoading(true);


      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("id", user.id)
        .eq("tenant_id", user.tenant_id)
        .single();

      if (staffError) throw staffError;

      if (!staff) {
        showToast("Staff profile not found", "error");
        return;
      }

      const { data: documents, error: docError } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("tenant_id", user.tenant_id);

      if (docError) throw docError;

      const documentsMap = { ...staffData.documents };
      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          const docName = doc.document_name;
          if (documentsMap[docName]) {
            documentsMap[docName] = {
              ...documentsMap[docName],
              existing_url: doc.file_url || "",
              expiry: doc.expiry_date || "",
              fileName: doc.file_url ? `Existing_${docName}.${getFileExtension(doc.file_url)}` : "",
              id: doc.id
            };
          }
        });
      }

      let nextOfKin = { name: "", phone: "", relationship: "" };
      if (staff.next_of_kin) {
        if (typeof staff.next_of_kin === 'string') {
          try {
            nextOfKin = JSON.parse(staff.next_of_kin);
          } catch (e) {
            console.error("Error parsing next_of_kin:", e);
          }
        } else if (typeof staff.next_of_kin === 'object') {
          nextOfKin = staff.next_of_kin;
        }
      }

      const formattedData = {
        id: staff.id,
        name: staff.name || "",
        dob: staff.dob || "",
        phone: staff.phone || "",
        email: staff.email || "",
        address: staff.address || "",
        role: staff.role || "Staff Member",
        next_of_kin: nextOfKin,
        documents: documentsMap,
        profile_picture: staff.profile_picture || "",
        profilePictureFile: null
      };

      setStaffData(formattedData);
      setOriginalData(JSON.parse(JSON.stringify(formattedData)));

    } catch (err) {
      console.error("Error fetching profile:", err);
      showToast("Failed to load profile data", "error");
    } finally {
      setLoading(false);
    }
  };

  const getFileExtension = (url) => {
    if (!url) return "";
    return url.split('.').pop().split('?')[0];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStaffData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextOfKinChange = (e) => {
    const { name, value } = e.target;
    setStaffData(prev => ({
      ...prev,
      next_of_kin: {
        ...prev.next_of_kin,
        [name]: value
      }
    }));
  };

  const handleDocumentChange = (docName, file) => {
    if (!file) return;

    setStaffData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docName]: {
          ...prev.documents[docName],
          file,
          fileName: file.name,
          uploadProgress: 0,
          isUploading: false
        }
      }
    }));
  };

  const handleDocumentExpiryChange = (docName, expiry) => {
    setStaffData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docName]: { ...prev.documents[docName], expiry }
      }
    }));
  };

  const handleProfilePicture = (file) => {
    if (!file) return;

    setStaffData(prev => ({
      ...prev,
      profilePictureFile: file
    }));
    setProfileUploadProgress(0);
  };

  const removeDocument = async (docName) => {
    const doc = staffData.documents[docName];

    if (doc.id) {
      try {
        const { error } = await supabase
          .from("staff_documents")
          .delete()
          .eq("id", doc.id)
          .eq("tenant_id", user.tenant_id);

        if (error) throw error;

        showToast(`${docName} removed successfully`, "success");
      } catch (err) {
        console.error("Error deleting document:", err);
        showToast(`Failed to remove ${docName}`, "error");
        return;
      }
    }

    setStaffData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docName]: {
          file: null,
          existing_url: "",
          expiry: "",
          uploadProgress: 0,
          isUploading: false,
          fileName: "",
          id: null
        }
      }
    }));

    if (fileInputRefs.current[docName]) {
      fileInputRefs.current[docName].value = "";
    }
  };

  const removeProfilePicture = () => {
    setStaffData(prev => ({
      ...prev,
      profile_picture: "",
      profilePictureFile: null
    }));
    setProfileUploadProgress(0);

    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e, docName = null) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (docName) {
        handleDocumentChange(docName, file);
      } else {
        handleProfilePicture(file);
      }
    }
  };

  const uploadFileToCloudinary = async (file, docName = null) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "blessingcommunity");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dazbtduwj/upload",
        {
          method: "POST",
          body: formData
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      const isPdf = file.type === "application/pdf";
      return isPdf
        ? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${data.public_id}&filename=${data.original_filename}`
        : data.secure_url;
    } catch (error) {
      throw error;
    }
  };

  const handleViewDocument = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownloadDocument = async (url, fileName) => {
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName || `document_${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error downloading document:", err);
      showToast("Failed to download document", "error");
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const isDocumentExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const handleCancelEdit = () => {
    setStaffData(JSON.parse(JSON.stringify(originalData)));
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let profilePicUrl = staffData.profile_picture;
      if (staffData.profilePictureFile) {
        profilePicUrl = await uploadFileToCloudinary(staffData.profilePictureFile);
      }

      const { error: staffError } = await supabase
        .from("staff")
        .update({
          name: staffData.name,
          dob: staffData.dob,
          phone: staffData.phone,
          address: staffData.address,
          next_of_kin: staffData.next_of_kin,
          profile_picture: profilePicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", staffData.id)
        .eq("tenant_id", user.tenant_id);

      if (staffError) throw staffError;

      for (const docName of documentFields) {
        const doc = staffData.documents[docName];

        if (doc.file) {
          const url = await uploadFileToCloudinary(doc.file, docName);

          if (doc.id) {
            const { error: updateError } = await supabase
              .from("staff_documents")
              .update({
                file_url: url,
                expiry_date: doc.expiry || null,
                updated_at: new Date().toISOString()
              })
              .eq("id", doc.id)
              .eq("tenant_id", user.tenant_id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from("staff_documents")
              .insert([{
                staff_id: staffData.id,
                document_name: docName,
                file_url: url,
                expiry_date: doc.expiry || null,
                tenant_id: user.tenant_id
              }]);

            if (insertError) throw insertError;
          }
        } else if (doc.existing_url && doc.expiry && doc.id) {
          const { error: updateError } = await supabase
            .from("staff_documents")
            .update({
              expiry_date: doc.expiry,
              updated_at: new Date().toISOString()
            })
            .eq("id", doc.id)
            .eq("tenant_id", user.tenant_id);

          if (updateError) throw updateError;
        }
      }

      showToast("Profile updated successfully!", "success");
      setIsEditing(false);
      await fetchCurrentStaffProfile();

    } catch (err) {
      console.error(err);
      showToast("Error updating profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message, type) => {
    if (type === 'error') {
      toast.error(message)
    } else if (type === 'success') {
      toast.success(message)
    } else {
      toast(message)
    }
  };

  const getDocumentsStats = () => {
    const uploaded = Object.values(staffData.documents).filter(doc => doc.existing_url || doc.file).length;
    const expired = Object.values(staffData.documents).filter(doc =>
      doc.existing_url && isDocumentExpired(doc.expiry)
    ).length;
    return { uploaded, total: documentFields.length, expired };
  };
if (loading) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">LOADING PROFILE DATA...</div>
      </div>
    </div>
  );
}
  const docStats = getDocumentsStats();

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Compact Header */}
   <div className="flex flex-row justify-between items-center gap-3 p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">

  {/* LEFT */}
  <div className="flex items-center gap-3 min-w-0">
    {/* User Icon */}
    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 flex-shrink-0">
      <User className="text-white" size={18} />
    </div>

    <div className="min-w-0">
      <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
        Operational Identity
      </h2>

      <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate flex items-center gap-2">
        Authorized → Personnel Profile

        {staffData.role && (
          <span className="bg-blue-100 text-blue-600 text-[9px] lg:text-[10px] px-2 py-0.5 rounded-full border border-blue-200 font-black uppercase tracking-widest flex-shrink-0 truncate max-w-[120px]">
            {staffData.role}
          </span>
        )}
      </p>
    </div>
  </div>

  {/* RIGHT */}
  {!isEditing && (
    <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
      {/* Divider line */}
      <div className="h-8 w-[1px] bg-slate-200/40"></div>

      <button
        onClick={() => setIsEditing(true)}
        className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
      >
        <Edit2 size={13} />
        <span className="hidden sm:inline">Modify Profile</span>
      </button>
    </div>
  )}
</div>


      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Profile Identity Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50 mb-8">
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 h-32 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute -bottom-16 left-8">
              <div className="relative group">
                {staffData.profile_picture ? (
                  <img
                    src={staffData.profile_picture}
                    alt={staffData.name}
                    className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-2xl ring-4 ring-slate-100/50"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-[2rem] flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-4xl border-4 border-white shadow-2xl ring-4 ring-slate-100/50 uppercase tracking-tighter">
                    {staffData.name?.split(" ").map((n) => n[0]).join("")}
                  </div>
                )}
                {isEditing && (
                  <button
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-2.5 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-100 hover:scale-110 transition-transform group-hover:bg-blue-600 group-hover:text-white"
                  >
                    <Camera size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="pt-20 pb-8 px-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">{staffData.name}</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Mail size={12} className="text-blue-500" />
                    {staffData.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Phone size={12} className="text-emerald-500" />
                    {staffData.phone || "UNLINKED"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldCheck size={12} className="text-indigo-500" />
                    ID: {typeof staffData.id === 'string' ? staffData.id.slice(0, 8) : staffData.id?.toString().slice(0, 8) || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Security Clearance</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Level 1 - Admin</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Profile Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Active Duty</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Document Integrity', val: `${docStats.uploaded}/${docStats.total}`, sub: 'Resource Compliance', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Safety Violations', val: docStats.expired, sub: 'Expired Certificates', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Operational Age', val: '2Y 4M', sub: 'Tenure on Duty', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Access Protocol', val: 'ENCRYPTED', sub: 'Data Sensitivity', icon: Lock, color: 'text-indigo-600', bg: 'bg-indigo-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-[1.5rem] border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform hover:scale-110`}>
                  <stat.icon size={16} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md ${stat.bg} ${stat.color}`}>
                  {stat.label.split(' ')[0]}
                </span>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.sub}</p>
              <h3 className={`text-lg font-black uppercase tracking-tighter ${stat.color === 'text-rose-600' ? 'text-rose-600' : 'text-slate-900'}`}>
                {stat.val}
              </h3>
            </div>
          ))}
        </div>

        {/* High-Density Tab Interface */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/50">
          <div className="px-6 pt-6 flex items-center gap-1 bg-slate-50/50 border-b border-slate-100 p-1">
            {[
              { id: 'personal', label: 'Identity Protocol', icon: User },
              { id: 'documents', label: 'Verification Ledger', icon: FileSearch }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 h-10 rounded-t-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === tab.id
                  ? 'bg-white text-blue-600 border-x border-t border-slate-100 -mb-[1px] shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                  }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {activeTab === tab.id && <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-white z-10" />}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {activeTab === 'personal' && (
              <div className="space-y-8">
                {isEditing && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Camera size={12} className="text-blue-500" />
                      Profile Visualization
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center text-center group bg-slate-50/50 ${isDragging
                        ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/5 shadow-inner"
                        : "border-slate-200 hover:border-blue-400 hover:bg-white transition-all cursor-pointer"
                        }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e)}
                      onClick={() => !staffData.profilePictureFile && profileInputRef.current?.click()}
                    >
                      {staffData.profilePictureFile ? (
                        <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-2xl shadow-xl border border-slate-100 animate-in zoom-in-95 duration-300">
                          <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <ImageIcon size={20} />
                          </div>
                          <div className="text-left">
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-1 max-w-[200px]">
                              {staffData.profilePictureFile.name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Ready for Synchronization
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeProfilePicture(); }}
                            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100 shadow-sm group-hover:scale-110 group-hover:text-blue-500 transition-all duration-500">
                            <Upload size={24} />
                          </div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1">Environmental Upload</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drag imagery here or interact to browse</p>
                          <input
                            ref={profileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              e.target.files && handleProfilePicture(e.target.files[0])
                            }
                            className="hidden"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={12} className="text-blue-500" />
                      Legal Designation
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={staffData.name}
                        onChange={handleInputChange}
                        placeholder="Authorized Name"
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                        <User className="text-blue-600" size={16} />
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail size={12} className="text-indigo-500" />
                      Communication Node (Auth)
                    </label>
                    <div className="flex items-center gap-3 h-12 px-4 bg-slate-100 border border-slate-200 rounded-2xl opacity-60">
                      <Mail className="text-indigo-600" size={16} />
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.email}</span>
                      <Lock size={12} className="ml-auto text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone size={12} className="text-emerald-500" />
                      Tactical Interconnect
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={staffData.phone}
                        onChange={handleInputChange}
                        placeholder="+61 000 000 000"
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                        <Phone className="text-emerald-600" size={16} />
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.phone || "UNLINKED"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={12} className="text-rose-500" />
                      Temporal Origin (DOB)
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="dob"
                        value={staffData.dob}
                        onChange={handleInputChange}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                        <Calendar className="text-rose-600" size={16} />
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{formatDate(staffData.dob)}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={12} className="text-amber-500" />
                      Geographic Base Station
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={staffData.address}
                        onChange={handleInputChange}
                        placeholder="Full operational address..."
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                        <MapPin className="text-amber-600" size={16} />
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.address || "NO BASE DEFINED"}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-8 mt-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Next of Kin Protocol</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        NOK Legal Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={staffData.next_of_kin?.name || ""}
                          onChange={handleNextOfKinChange}
                          placeholder="Personnel Name"
                          className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                          required
                        />
                      ) : (
                        <div className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.next_of_kin?.name || "N/A"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        NOK Interconnect
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={staffData.next_of_kin?.phone || ""}
                          onChange={handleNextOfKinChange}
                          placeholder="Interconnect Node"
                          className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                          required
                        />
                      ) : (
                        <div className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.next_of_kin?.phone || "N/A"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Kinship Matrix
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="relationship"
                          value={staffData.next_of_kin?.relationship || ""}
                          onChange={handleNextOfKinChange}
                          placeholder="Relationship Vector"
                          className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      ) : (
                        <div className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{staffData.next_of_kin?.relationship || "N/A"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <tr>
                      <th className="px-6 py-4 text-left">Operational Document</th>
                      <th className="px-6 py-4 text-left">Compliance Status</th>
                      <th className="px-6 py-4 text-left">Tactical Expiry</th>
                      <th className="px-6 py-4 text-right">Registry Operations</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {documentFields.map((docName) => {
                      const doc = staffData.documents[docName];
                      const hasFile = doc.file || doc.existing_url;
                      const expired = doc.existing_url && isDocumentExpired(doc.expiry);

                      return (
                        <tr key={docName} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 ${hasFile ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                <FileText size={16} />
                              </div>
                              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{docName}</span>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasFile ? (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${expired
                                ? 'bg-rose-500 text-white shadow-rose-500/20'
                                : 'bg-emerald-500 text-white shadow-emerald-500/20'
                                }`}>
                                {expired ? (
                                  <>
                                    <AlertCircle size={10} />
                                    Expired / Critical
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={10} />
                                    Valid / Active
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm shadow-amber-500/20">
                                <AlertCircle size={10} />
                                Missing Entry
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="date"
                                value={doc.expiry}
                                onChange={(e) => handleDocumentExpiryChange(docName, e.target.value)}
                                className="h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[10px] font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all outline-none w-full max-w-[140px]"
                              />
                            ) : (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase">
                                <Calendar size={12} className={expired ? "text-rose-500" : "text-slate-400"} />
                                {doc.expiry ? formatDate(doc.expiry) : "NO DATA"}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              {hasFile && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleViewDocument(doc.existing_url)}
                                    className="h-8 w-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Visualize"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDocument(doc.existing_url, `${docName}_${staffData.name}`)}
                                    className="h-8 w-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Export"
                                  >
                                    <Download size={14} />
                                  </button>
                                </>
                              )}

                              {isEditing && (
                                <>
                                  {hasFile ? (
                                    <button
                                      type="button"
                                      onClick={() => removeDocument(docName)}
                                      className="h-8 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                      title="Purge"
                                    >
                                      <X size={14} />
                                    </button>
                                  ) : (
                                    <div className="relative">
                                      <input
                                        ref={el => fileInputRefs.current[docName] = el}
                                        type="file"
                                        accept="image/*,application/pdf,.doc,.docx"
                                        onChange={(e) =>
                                          e.target.files && handleDocumentChange(docName, e.target.files[0])
                                        }
                                        className="hidden"
                                        id={`doc-${docName}`}
                                      />
                                      <label
                                        htmlFor={`doc-${docName}`}
                                        className="h-8 w-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
                                        title="Initialize"
                                      >
                                        <Upload size={14} />
                                      </label>
                                    </div>
                                  )}
                                </>
                              )}

                              {!hasFile && !isEditing && (
                                <span className="text-[10px] font-black text-slate-300 opacity-50 px-3">PROTECTED</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-4 mt-12 pt-8 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel modulation
                </button>

                <button
                  type="submit"
                  className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                  ) : (
                    <>
                      Commit Synchronization
                      <ArrowUpRight size={14} />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default StaffProfile;