import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Upload,
  FileText,
  Image,
  X,
  User,
  Phone,
  Users,
  FileCheck,
  DollarSign,
  AlertCircle
} from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";

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

function AddStaff() {
  const { currentStaff } = useUser();
  const [staffData, setStaffData] = useState({
    name: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
    nextOfKin: {
      name: "",
      phone: "",
      relationship: ""
    },
    documents: documentFields.reduce((acc, doc) => {
      acc[doc] = { file: null, expiry: "", uploadProgress: 0, isUploading: false, fileName: "" };
      return acc;
    }, {}),
    profilePicture: null,
    base_rate_id: "",
    rate_effective_from: new Date().toISOString().split('T')[0]
  });
  const [payRates, setPayRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const fileInputRefs = useRef({});
  const profileInputRef = useRef(null);

  useEffect(() => {
    if (currentStaff?.tenant_id) {
      fetchPayRates();
    }
  }, [currentStaff]);

  const fetchPayRates = async () => {
    try {
      setLoadingRates(true);
      const { data, error } = await supabase
        .from('pay_rates')
        .select('*')
        .eq('tenant_id', currentStaff.tenant_id)
        .order('name');
      if (error) throw error;
      setPayRates(data || []);
    } catch (err) {
      console.error("Error fetching pay rates:", err);
    } finally {
      setLoadingRates(false);
    }
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
    setStaffData(prev => ({ ...prev, profilePicture: file }));
    setProfileUploadProgress(0);
  };

  const removeDocument = (docName) => {
    setStaffData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docName]: {
          ...prev.documents[docName],
          file: null,
          fileName: "",
          uploadProgress: 0,
          isUploading: false
        }
      }
    }));

    if (fileInputRefs.current[docName]) {
      fileInputRefs.current[docName].value = "";
    }
  };

  const removeProfilePicture = () => {
    setStaffData(prev => ({ ...prev, profilePicture: null }));
    setProfileUploadProgress(0);

    if (profileInputRef.current) {
      profileInputRef.current.value = "";
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

      return isPdf ? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}` : res.data.secure_url;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let profilePicUrl = "";
      if (staffData.profilePicture) {
        profilePicUrl = await uploadFileToCloudinary(
          staffData.profilePicture,
          (progress) => setProfileUploadProgress(progress)
        );
      }

      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .insert([{
          name: staffData.name,
          dob: staffData.dob,
          phone: staffData.phone,
          email: staffData.email,
          address: staffData.address,
          next_of_kin: staffData.nextOfKin,
          profile_picture: profilePicUrl,
          tenant_id: currentStaff.tenant_id
        }])
        .select()
        .single();

      if (staffError) throw staffError;

      // Handle Base Rate Assignment
      if (staffData.base_rate_id) {
        const { error: rateError } = await supabase
          .from("staff_pay_rates")
          .insert([{
            staff_id: staff.id,
            pay_rate_id: staffData.base_rate_id,
            effective_from: staffData.rate_effective_from || new Date().toISOString().split('T')[0],
            is_default: true,
            priority: 1,
            tenant_id: currentStaff.tenant_id
          }]);
        if (rateError) throw rateError;
      }

      for (const docName of documentFields) {
        const doc = staffData.documents[docName];
        if (doc.file) {
          const url = await uploadFileToCloudinary(
            doc.file,
            null,
            docName
          );
          const { error: docError } = await supabase
            .from("staff_documents")
            .insert([{
              staff_id: staff.id,
              document_name: docName,
              file_url: url,
              expiry_date: doc.expiry || null,
              tenant_id: currentStaff.tenant_id
            }]);
          if (docError) throw docError;
        }
      }

      toast.success("Staff added successfully!");

      setStaffData({
        name: "",
        dob: "",
        phone: "",
        email: "",
        address: "",
        nextOfKin: {
          name: "",
          phone: "",
          relationship: ""
        },
        documents: documentFields.reduce((acc, doc) => {
          acc[doc] = { file: null, expiry: "", uploadProgress: 0, isUploading: false, fileName: "" };
          return acc;
        }, {}),
        profilePicture: null,
        base_rate_id: "",
        rate_effective_from: new Date().toISOString().split('T')[0]
      });
      setProfileUploadProgress(0);

    } catch (err) {
      console.error(err);
      toast.error("Error adding staff. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextOfKinChange = (e) => {
    const { name, value } = e.target;
    setStaffData((prev) => ({
      ...prev,
      nextOfKin: {
        ...prev.nextOfKin,
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
              Add New Staff
            </h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              Staff Registration Form
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
                  value={staffData.nextOfKin.name}
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
                  value={staffData.nextOfKin.phone}
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
                  value={staffData.nextOfKin.relationship}
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

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all">
              {staffData.profilePicture ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Image size={24} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-900 uppercase truncate">
                        {staffData.profilePicture.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                        {(staffData.profilePicture.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
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
            {payRates.length === 0 && !loadingRates && (
              <p className="mt-3 text-[8px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={10} />
                No active pay rates found. Please configure them in Payroll Settings first.
              </p>
            )}
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
                      Upload File
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
                  {documentFields.map((doc) => (
                    <tr key={doc} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-black text-slate-700 uppercase">
                        {doc}
                      </td>

                      <td className="px-4 py-3">
                        {staffData.documents[doc].file ? (
                          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(staffData.documents[doc].fileName)}
                              <span className="text-[10px] font-bold text-slate-700 truncate max-w-[200px]">
                                {staffData.documents[doc].fileName}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeDocument(doc)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                              disabled={isSubmitting}
                              title="Remove file"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed border-slate-200 rounded-xl p-3 hover:border-blue-300 transition-all cursor-pointer"
                            onClick={() => fileInputRefs.current[doc]?.click()}
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
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={staffData.documents[doc].expiry}
                          onChange={(e) => handleDocumentExpiryChange(doc, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/40 text-[9px] font-black text-slate-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          disabled={isSubmitting}
                        />
                      </td>

                      <td className="px-4 py-3">
                        {staffData.documents[doc].isUploading ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${staffData.documents[doc].uploadProgress}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">
                              {staffData.documents[doc].uploadProgress}%
                            </span>
                          </div>
                        ) : staffData.documents[doc].file ? (
                          <span className="inline-flex px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full bg-green-100 text-green-700">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full bg-slate-100 text-slate-400">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================== SUBMIT BUTTON ==================== */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding Staff...
                </>
              ) : (
                <>
                  <Plus size={16} /> Add Staff Member
                </>
              )}
            </button>

            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center">
              * Required Fields
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStaff;