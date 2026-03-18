import React, { useState, useRef } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Upload, 
  X, 
  FileText, 
  Image,
  User,
  Phone,
  FileCheck,
  Heart,
  Stethoscope,
  Users,
  CheckCircle
} from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";

function AddClient() {
  const { currentStaff } = useUser();
  const [clientData, setClientData] = useState({
    // Core Identity
    first_name: "",
    last_name: "",
    date_of_birth: "",
    
    // Contact Information
    phone_number: "",
    email: "",
    address_line: "",
    city: "",
    state: "",
    postcode: "",
    
    // NDIS Information
    ndis_number: "",
    diagnosis: "",
    
    // Care & Planning
    goals_summary: "",
    
    // Medical Contacts
    doctor_name: "",
    doctor_phone: "",
    doctor_email: "",
    
    // Next of Kin
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_relationship: "",
    
    // Status
    is_active: true,
  });
  
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [ndisPlanDocument, setNdisPlanDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [documentUploadProgress, setDocumentUploadProgress] = useState(0);
  const profileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClientData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePhoto = (file) => {
    if (!file) return;
    setProfilePhoto(file);
    setProfileUploadProgress(0);
  };

  const handleNdisPlanDocument = (file) => {
    if (!file) return;
    setNdisPlanDocument(file);
    setDocumentUploadProgress(0);
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
  };

  const removeNdisPlanDocument = () => {
    setNdisPlanDocument(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  };

  const uploadFileToCloudinary = async (file, onProgress) => {
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
          }
        }
      );
    return isPdf? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}` :  res.data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload profile photo
      let profilePhotoUrl = "";
      if (profilePhoto) {
        profilePhotoUrl = await uploadFileToCloudinary(
          profilePhoto,
          setProfileUploadProgress
        );
      }

      // Upload NDIS plan document
      let ndisPlanDocumentUrl = "";
      let ndisPlanDocumentId = null;
      if (ndisPlanDocument) {
        ndisPlanDocumentUrl = await uploadFileToCloudinary(
          ndisPlanDocument,
          setDocumentUploadProgress
        );

        // First, insert the document record
        const { data: document, error: docError } = await supabase
          .from("documents")
          .insert([{
            document_name: `NDIS_Plan_${clientData.ndis_number}`,
            file_url: ndisPlanDocumentUrl,
            document_type: "NDIS_PLAN",
            uploaded_at: new Date().toISOString(),
            tenant_id: currentStaff.tenant_id
          }])
          .select()
          .single();

        if (docError) throw docError;
        ndisPlanDocumentId = document.id;
      }

      // Insert client info
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert([{
          profile_photo_url: profilePhotoUrl,
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          date_of_birth: clientData.date_of_birth,
          phone_number: clientData.phone_number,
          email: clientData.email,
          address_line: clientData.address_line,
          city: clientData.city,
          state: clientData.state,
          postcode: clientData.postcode,
          ndis_number: clientData.ndis_number,
          diagnosis: clientData.diagnosis,
          ndis_plan_document_id: ndisPlanDocumentId,
          goals_summary: clientData.goals_summary,
          doctor_name: clientData.doctor_name,
          doctor_phone: clientData.doctor_phone,
          doctor_email: clientData.doctor_email,
          next_of_kin_name: clientData.next_of_kin_name,
          next_of_kin_phone: clientData.next_of_kin_phone,
          next_of_kin_relationship: clientData.next_of_kin_relationship,
          is_active: clientData.is_active,
          tenant_id: currentStaff.tenant_id
        }])
        .select()
        .single();

      if (clientError) throw clientError;

        const { error: documentUpdateError } =
        await supabase
            .from('documents')
            .update({
            owner_type: 'client',
            owner_id: client.id,
            })
            .eq('id', ndisPlanDocumentId)
            .eq('tenant_id', currentStaff.tenant_id);

     if (documentUpdateError) throw documentUpdateError;

      toast.success("Client added successfully!");
      
      // Reset form
      setClientData({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        phone_number: "",
        email: "",
        address_line: "",
        city: "",
        state: "",
        postcode: "",
        ndis_number: "",
        diagnosis: "",
        goals_summary: "",
        doctor_name: "",
        doctor_phone: "",
        doctor_email: "",
        next_of_kin_name: "",
        next_of_kin_phone: "",
        next_of_kin_relationship: "",
        is_active: true,
      });
      setProfilePhoto(null);
      setNdisPlanDocument(null);
      setProfileUploadProgress(0);
      setDocumentUploadProgress(0);

    } catch (err) {
      console.error(err);
      toast.error("Error adding client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 p-0 animate-in fade-in duration-500">
      
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 lg:px-6 lg:py-4 pt-safe border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-4 min-w-0">
          <Link 
            to="/clients" 
            className="p-2 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          
          <div className="min-w-0">
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
              Add New Client
            </h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              Registration Form
            </p>
          </div>
        </div>
      </div>

      {/* ==================== FORM CONTENT ==================== */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* ==================== SECTION 1: CORE IDENTITY ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Core Identity
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Basic Information
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Profile Photo Upload */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  Profile Photo
                </label>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all">
                  {profilePhoto ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <Image size={24} />
                        </div>
                        
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">
                            {profilePhoto.name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {(profilePhoto.size / 1024).toFixed(2)} KB
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
                          onClick={removeProfilePhoto}
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
                        onChange={(e) => e.target.files && handleProfilePhoto(e.target.files[0])}
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

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="JOHN"
                    value={clientData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="DOE"
                    value={clientData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={clientData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 2: CONTACT INFORMATION ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Phone size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Contact Information
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Communication Details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="+61 400 000 000"
                  value={clientData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="john.doe@example.com"
                  value={clientData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Address Line *
                </label>
                <input
                  type="text"
                  name="address_line"
                  placeholder="123 MAIN STREET"
                  value={clientData.address_line}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  placeholder="SYDNEY"
                  value={clientData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  placeholder="NSW"
                  value={clientData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  name="postcode"
                  placeholder="2000"
                  value={clientData.postcode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ==================== SECTION 3: NDIS INFORMATION ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileCheck size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  NDIS Information
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Registration & Plan Details
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    NDIS Number *
                  </label>
                  <input
                    type="text"
                    name="ndis_number"
                    placeholder="NDIS-XXXX-XXXX"
                    value={clientData.ndis_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Diagnosis
                  </label>
                  <textarea
                    name="diagnosis"
                    placeholder="ENTER DIAGNOSIS DETAILS..."
                    value={clientData.diagnosis}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-bold text-slate-700 tracking-wide placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* NDIS Plan Document Upload */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  NDIS Plan Document
                </label>

                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all">
                  {ndisPlanDocument ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <FileText size={24} />
                        </div>
                        
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">
                            {ndisPlanDocument.name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {(ndisPlanDocument.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {documentUploadProgress > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${documentUploadProgress}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">
                              {documentUploadProgress}%
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={removeNdisPlanDocument}
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
                        Upload NDIS Plan Document
                      </p>

                      <input
                        ref={documentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => e.target.files && handleNdisPlanDocument(e.target.files[0])}
                        className="hidden"
                        id="document-upload"
                        disabled={isSubmitting}
                      />

                      <label
                        htmlFor="document-upload"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all"
                      >
                        Browse Files
                      </label>

                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-2">
                        PDF, DOC, DOCX, TXT
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 4: CARE & PLANNING ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Heart size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Care & Planning
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Goals & Support Summary
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                Goals Summary
              </label>
              <textarea
                name="goals_summary"
                placeholder="ENTER CLIENT GOALS AND CARE PLAN SUMMARY..."
                value={clientData.goals_summary}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-bold text-slate-700 tracking-wide placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* ==================== SECTION 5: MEDICAL CONTACTS ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Stethoscope size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Medical Contacts
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Healthcare Provider Details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Doctor's Name
                </label>
                <input
                  type="text"
                  name="doctor_name"
                  placeholder="DR. SMITH"
                  value={clientData.doctor_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Doctor's Phone
                </label>
                <input
                  type="tel"
                  name="doctor_phone"
                  placeholder="+61 400 000 000"
                  value={clientData.doctor_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Doctor's Email
                </label>
                <input
                  type="email"
                  name="doctor_email"
                  placeholder="doctor@clinic.com"
                  value={clientData.doctor_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ==================== SECTION 6: NEXT OF KIN ==================== */}
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
                  Full Name
                </label>
                <input
                  type="text"
                  name="next_of_kin_name"
                  placeholder="JANE DOE"
                  value={clientData.next_of_kin_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="next_of_kin_phone"
                  placeholder="+61 400 000 000"
                  value={clientData.next_of_kin_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Relationship
                </label>
                <input
                  type="text"
                  name="next_of_kin_relationship"
                  placeholder="MOTHER, SPOUSE, ETC."
                  value={clientData.next_of_kin_relationship}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* ==================== SECTION 7: CLIENT STATUS ==================== */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                    Client Status
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Initial Profile Status
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${
                  clientData.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {clientData.is_active ? 'Active' : 'Inactive'}
                </span>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={clientData.is_active}
                    onChange={(e) => setClientData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                    disabled={isSubmitting}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
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
                  Adding Client...
                </>
              ) : (
                <>
                  <Plus size={16} /> Add Client
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

export default AddClient;