import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  X,
  Save,
  Eye,
  Download,
  User,
  Phone,
  Users,
  FileCheck,
  DollarSign,
  AlertCircle,
  Plus
} from "lucide-react";
import axios from "axios";
import { supabase } from "../lib/supabase";
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

function EditStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const fileInputRefs = useRef({});
  const profileInputRef = useRef(null);

  const [staffData, setStaffData] = useState({
    name: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
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
    profilePictureFile: null,
    base_rate_id: "",
    rate_effective_from: new Date().toISOString().split('T')[0],
    existing_rate_assignment_id: null
  });
  const [payRates, setPayRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStaffData();
      fetchPayRates();
    }
  }, [id]);

  const fetchPayRates = async () => {
    try {
      setLoadingRates(true);
      const { data, error } = await supabase
        .from('pay_rates')
        .select('*')
        .order('name');
      if (error) throw error;
      setPayRates(data || []);
    } catch (err) {
      console.error("Error fetching pay rates:", err);
    } finally {
      setLoadingRates(false);
    }
  };

  const fetchStaffData = async () => {
    try {
      setLoading(true);

      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("id", id)
        .single();
      if (staffError) throw staffError;

      // Fetch primary pay rate
      const { data: currentRate, error: rateError } = await supabase
        .from("staff_pay_rates")
        .select("*")
        .eq("staff_id", id)
        .eq("is_default", true)
        .order("effective_from", { ascending: false })
        .limit(1)
        .single();

      const { data: documents, error: docError } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", id);

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

      setStaffData({
        name: staff.name || "",
        dob: staff.dob || "",
        phone: staff.phone || "",
        email: staff.email || "",
        address: staff.address || "",
        next_of_kin: nextOfKin,
        documents: documentsMap,
        profile_picture: staff.profile_picture || "",
        profilePictureFile: null,
        base_rate_id: currentRate?.pay_rate_id || "",
        rate_effective_from: currentRate?.effective_from || new Date().toISOString().split('T')[0],
        existing_rate_assignment_id: currentRate?.id || null
      });

    } catch (err) {
      console.error("Error fetching staff data:", err);
      toast.error("Failed to load staff data");
      navigate("/staff");
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
    setStaffData(prev => ({ ...prev, profilePictureFile: file }));
    setProfileUploadProgress(0);
  };

  const removeDocument = async (docName) => {
    const doc = staffData.documents[docName];

    if (doc.id) {
      try {
        const { error } = await supabase
          .from("staff_documents")
          .delete()
          .eq("id", doc.id);

        if (error) throw error;
        toast.success(`${docName} removed successfully`);
      } catch (err) {
        console.error("Error deleting document:", err);
        toast.error(`Failed to remove ${docName}`);
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

  const uploadFileToCloudinary = async (file, onProgress, docName = null) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "blessingcommunity");
    const isPdf = file.type === "application/pdf";

    try {
      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/dazbtduwj/upload",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            if (onProgress) {
              onProgress(percentCompleted);
            }

            if (docName) {
              setStaffData(prev => ({
                ...prev,
                documents: {
                  ...prev.documents,
                  [docName]: {
                    ...prev.documents[docName],
                    uploadProgress: percentCompleted,
                    isUploading: true
                  }
                }
              }));
            }
          }
        }
      );

      if (docName) {
        setStaffData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [docName]: {
              ...prev.documents[docName],
              isUploading: false
            }
          }
        }));
      }

      return isPdf
        ? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}`
        : res.data.secure_url;
    } catch (error) {
      if (docName) {
        setStaffData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [docName]: {
              ...prev.documents[docName],
              isUploading: false
            }
          }
        }));
      }
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
      toast.error("Failed to download document");
    }
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

  const getFileIcon = (fileName) => {
    if (!fileName) return <FileText size={14} />;
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <Image size={14} />;
    }
    return <FileText size={14} />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let profilePicUrl = staffData.profile_picture;
      if (staffData.profilePictureFile) {
        profilePicUrl = await uploadFileToCloudinary(
          staffData.profilePictureFile,
          (progress) => setProfileUploadProgress(progress)
        );
      }

      const { error: staffError } = await supabase
        .from("staff")
        .update({
          name: staffData.name,
          dob: staffData.dob,
          phone: staffData.phone,
          email: staffData.email,
          address: staffData.address,
          next_of_kin: staffData.next_of_kin,
          profile_picture: profilePicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (staffError) throw staffError;

      // Handle Base Rate Assignment Update/Insert
      if (staffData.base_rate_id) {
        if (staffData.existing_rate_assignment_id) {
          const { error: rateUpdateError } = await supabase
            .from("staff_pay_rates")
            .update({
              pay_rate_id: staffData.base_rate_id,
              effective_from: staffData.rate_effective_from,
              updated_at: new Date().toISOString()
            })
            .eq("id", staffData.existing_rate_assignment_id);
          if (rateUpdateError) throw rateUpdateError;
        } else {
          const { error: rateInsertError } = await supabase
            .from("staff_pay_rates")
            .insert([{
              staff_id: id,
              pay_rate_id: staffData.base_rate_id,
              effective_from: staffData.rate_effective_from || new Date().toISOString().split('T')[0],
              is_default: true,
              priority: 1
            }]);
          if (rateInsertError) throw rateInsertError;
        }
      }

      for (const docName of documentFields) {
        const doc = staffData.documents[docName];

        if (doc.file) {
          const url = await uploadFileToCloudinary(
            doc.file,
            null,
            docName
          );

          if (doc.id) {
            const { error: updateError } = await supabase
              .from("staff_documents")
              .update({
                file_url: url,
                expiry_date: doc.expiry || null,
                updated_at: new Date().toISOString()
              })
              .eq("id", doc.id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from("staff_documents")
              .insert([{
                staff_id: id,
                document_name: docName,
                file_url: url,
                expiry_date: doc.expiry || null
              }]);

            if (insertError) throw insertError;
          }
        } else if (doc.existing_url && doc.expiry) {
          if (doc.id) {
            const { error: updateError } = await supabase
              .from("staff_documents")
              .update({
                expiry_date: doc.expiry,
                updated_at: new Date().toISOString()
              })
              .eq("id", doc.id);

            if (updateError) throw updateError;
          }
        }
      }

      toast.success("Staff updated successfully!");
      navigate("/staff");

    } catch (err) {
      console.error(err);
      toast.error("Error updating staff. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
            LOADING STAFF DATA...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-0 animate-in fade-in duration-500">

      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 lg:px-6 lg:py-4 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/staff"
            className="p-2 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="min-w-0">
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
              Edit Staff Member
            </h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              {staffData.name}
            </p>
          </div>
        </div>
      </div>

      {/* ==================== FORM CONTENT ==================== */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ==================== SECTION 1: BASIC INFORMATION ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Basic Information
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Personal Details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Staff Name *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="JOHN DOE"
                  value={staffData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dob"
                  value={staffData.dob}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Phone Number *
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+61 400 000 000"
                  value={staffData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="john.doe@example.com"
                  value={staffData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="123 MAIN STREET"
                  value={staffData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ==================== SECTION 2: NEXT OF KIN ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Next of Kin
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Emergency Contact Information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={staffData.next_of_kin?.name || ""}
                  onChange={handleNextOfKinChange}
                  placeholder="JANE DOE"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Contact Number *
                </label>
                <input
                  type="text"
                  name="phone"
                  value={staffData.next_of_kin?.phone || ""}
                  onChange={handleNextOfKinChange}
                  placeholder="+61 400 000 000"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Relationship
                </label>
                <input
                  type="text"
                  name="relationship"
                  value={staffData.next_of_kin?.relationship || ""}
                  onChange={handleNextOfKinChange}
                  placeholder="MOTHER, SPOUSE, ETC."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ==================== SECTION 3: PROFILE PICTURE ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Phone size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Profile Picture
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Staff Photo Upload
                </p>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-2xl p-5 transition-all ${isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-blue-300"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
            >
              {staffData.profile_picture || staffData.profilePictureFile ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl">
                  <div className="flex items-center gap-4">
                    {staffData.profile_picture && !staffData.profilePictureFile ? (
                      <>
                        <img
                          src={staffData.profile_picture}
                          alt="Profile"
                          className="rounded-2xl h-16 w-16 object-cover border-2 border-white shadow-sm"
                        />
                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase">
                            Existing Photo
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            Click browse to replace
                          </p>
                        </div>
                      </>
                    ) : staffData.profilePictureFile ? (
                      <>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <Image size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">
                            {staffData.profilePictureFile.name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {(staffData.profilePictureFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    {profileUploadProgress > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${profileUploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          {profileUploadProgress}%
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={removeProfilePicture}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                      disabled={isSubmitting}
                      title="Remove photo"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-4">
                  <div className="p-3 bg-slate-50 rounded-2xl mb-3">
                    <Upload size={24} className="text-slate-400" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase mb-3">
                    Drag & drop or click to browse
                  </p>

                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleProfilePicture(e.target.files[0])}
                    className="hidden"
                    id="profile-upload"
                    disabled={isSubmitting}
                  />

                  <label
                    htmlFor="profile-upload"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all"
                  >
                    Browse Files
                  </label>

                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-2">
                    JPG, PNG, GIF, WEBP
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ==================== SECTION 4: PRIMARY COMPENSATION ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Primary Compensation
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Initial Rate Assignment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Strategic Rate Profile
                </label>
                <div className="relative">
                  <select
                    name="base_rate_id"
                    value={staffData.base_rate_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                    disabled={isSubmitting || loadingRates}
                  >
                    <option value="">Select a rate profile...</option>
                    {payRates.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} — ${r.hourly_rate}/HR ({r.day_type})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Plus size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Effective From
                </label>
                <input
                  type="date"
                  name="rate_effective_from"
                  value={staffData.rate_effective_from}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ==================== SECTION 5: STAFF DOCUMENTS ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileCheck size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Staff Documents
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Certifications & Compliance Records
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border border-slate-100 rounded-xl overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {documentFields.map((doc) => {
                    const docData = staffData.documents[doc];
                    const hasFile = docData.file || docData.existing_url;

                    return (
                      <tr key={doc} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-black text-slate-700 uppercase">
                          {doc}
                        </td>

                        <td className="px-4 py-3">
                          {hasFile ? (
                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                {getFileIcon(docData.fileName)}
                                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[200px]">
                                  {docData.fileName || `Existing ${doc}`}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {docData.existing_url && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleViewDocument(docData.existing_url)}
                                      className="p-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                                      disabled={isSubmitting}
                                      title="View document"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(docData.existing_url, `${doc}_${staffData.name}`)}
                                      className="p-1.5 text-green-600 hover:text-green-700 transition-colors"
                                      disabled={isSubmitting}
                                      title="Download document"
                                    >
                                      <Download size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeDocument(doc)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                  disabled={isSubmitting}
                                  title="Remove document"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="border-2 border-dashed border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-all cursor-pointer"
                              onClick={() => fileInputRefs.current[doc]?.click()}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, doc)}
                            >
                              <input
                                ref={el => fileInputRefs.current[doc] = el}
                                type="file"
                                accept="image/*,application/pdf,.doc,.docx"
                                onChange={(e) => e.target.files && handleDocumentChange(doc, e.target.files[0])}
                                className="hidden"
                                disabled={isSubmitting}
                              />
                              <div className="flex flex-col items-center text-center">
                                <Upload size={16} className="text-slate-400 mb-1" />
                                <p className="text-[8px] font-bold text-slate-600 uppercase">
                                  Click or drag
                                </p>
                                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">
                                  Images, PDF, DOC
                                </p>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={docData.expiry}
                            onChange={(e) => handleDocumentExpiryChange(doc, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/40 text-[9px] font-black text-slate-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            disabled={isSubmitting}
                          />
                        </td>

                        <td className="px-4 py-3">
                          {docData.isUploading ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${docData.uploadProgress}%` }}
                                />
                              </div>
                              <span className="text-[8px] font-black text-slate-400 uppercase">
                                {docData.uploadProgress}%
                              </span>
                            </div>
                          ) : hasFile ? (
                            <span className="inline-flex px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full bg-green-100 text-green-700">
                              {docData.file ? "New" : "Active"}
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full bg-slate-100 text-slate-400">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================== SUBMIT BUTTONS ==================== */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/staff")}
              className="w-full sm:w-auto px-6 py-3 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} /> Update Staff
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditStaff;