import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  X, 
  FileText, 
  Image, 
  Trash2, 
  Download,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Heart,
  Stethoscope,
  Users,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import axios from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";

function EditClient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentStaff: user } = useUser();
  
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
  const [existingProfilePhoto, setExistingProfilePhoto] = useState("");
  const [ndisPlanDocument, setNdisPlanDocument] = useState(null);
  const [existingNdisDocument, setExistingNdisDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [documentUploadProgress, setDocumentUploadProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const profileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  // Fetch client data on mount
  useEffect(() => {
    if (id && user?.tenant_id) {
      fetchClientData();
    }
  }, [id, user?.tenant_id]);

  const fetchClientData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch client data
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", user.tenant_id)
        .single();

      if (clientError) throw clientError;

      if (!client) {
        toast.error("Client not found");
        navigate("/clients");
        return;
      }

      // Set client data
      setClientData({
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        date_of_birth: client.date_of_birth || "",
        phone_number: client.phone_number || "",
        email: client.email || "",
        address_line: client.address_line || "",
        city: client.city || "",
        state: client.state || "",
        postcode: client.postcode || "",
        ndis_number: client.ndis_number || "",
        diagnosis: client.diagnosis || "",
        goals_summary: client.goals_summary || "",
        doctor_name: client.doctor_name || "",
        doctor_phone: client.doctor_phone || "",
        doctor_email: client.doctor_email || "",
        next_of_kin_name: client.next_of_kin_name || "",
        next_of_kin_phone: client.next_of_kin_phone || "",
        next_of_kin_relationship: client.next_of_kin_relationship || "",
        is_active: client.is_active !== undefined ? client.is_active : true,
      });

      // Set existing profile photo
      if (client.profile_photo_url) {
        setExistingProfilePhoto(client.profile_photo_url);
      }

      // Fetch existing NDIS document if available
      if (client.ndis_plan_document_id) {
        const { data: document, error: docError } = await supabase
          .from("documents")
          .select("*")
          .eq("id", client.ndis_plan_document_id)
          .eq("tenant_id", user.tenant_id)
          .single();

        if (!docError && document) {
          setExistingNdisDocument({
            id: document.id,
            name: document.document_name || "NDIS Plan",
            url: document.file_url,
            size: 0,
          });
        }
      }

    } catch (error) {
      console.error("Error fetching client data:", error);
      toast.error("Failed to load client data");
      navigate("/clients");
    } finally {
      setIsLoading(false);
    }
  };

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
    setExistingProfilePhoto("");
    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
  };

  const removeNdisPlanDocument = () => {
    setNdisPlanDocument(null);
    setExistingNdisDocument(null);
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
      let profilePhotoUrl = existingProfilePhoto;
      
      // Upload new profile photo if provided
      if (profilePhoto) {
        profilePhotoUrl = await uploadFileToCloudinary(
          profilePhoto,
          setProfileUploadProgress
        );
      }

      let ndisPlanDocumentId = existingNdisDocument?.id || null;
      
      // Upload new NDIS plan document if provided
      if (ndisPlanDocument) {
        const ndisPlanDocumentUrl = await uploadFileToCloudinary(
          ndisPlanDocument,
          setDocumentUploadProgress
        );

        // If we have an existing document, update it
        if (existingNdisDocument) {
          const { error: docError } = await supabase
            .from("documents")
            .update({
              document_name: `NDIS_Plan_${clientData.ndis_number}_${Date.now()}`,
              file_url: ndisPlanDocumentUrl,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingNdisDocument.id)
            .eq("tenant_id", user.tenant_id);

          if (docError) throw docError;
        } else {
          // Create new document record
          const { data: document, error: docError } = await supabase
            .from("documents")
            .insert([{
              document_name: `NDIS_Plan_${clientData.ndis_number}`,
              file_url: ndisPlanDocumentUrl,
              document_type: "NDIS_PLAN",
              uploaded_at: new Date().toISOString(),
              owner_type: 'client',
              owner_id: id,
              tenant_id: user.tenant_id
            }])
            .select()
            .single();

          if (docError) throw docError;
          ndisPlanDocumentId = document.id;
        }
      }

      // Update client info
      const { error: clientError } = await supabase
        .from("clients")
        .update({
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
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("tenant_id", user.tenant_id);

      if (clientError) throw clientError;

      toast.success("Client updated successfully!");
      navigate("/clients");

    } catch (err) {
      console.error(err);
      toast.error("Error updating client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("tenant_id", user.tenant_id);

      if (error) throw error;

      toast.success("Client deleted successfully!");
      navigate("/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
            LOADING CLIENT DATA...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 p-0 animate-in fade-in duration-500">
      
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 lg:px-6 lg:py-4 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-4 min-w-0">
          <Link 
            to="/clients" 
            className="p-2 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          
          <div className="min-w-0">
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
              Edit Client Profile
            </h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              {clientData.first_name} {clientData.last_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 bg-red-50 border border-red-100 text-red-600 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete</span>
          </button>
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
                  {profilePhoto || existingProfilePhoto ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {existingProfilePhoto && !profilePhoto ? (
                          <img 
                            src={existingProfilePhoto} 
                            alt="Profile" 
                            className="rounded-2xl h-16 w-16 object-cover border-2 border-slate-100 shadow-sm"
                          />
                        ) : (
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Image size={24} />
                          </div>
                        )}
                        
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">
                            {profilePhoto ? profilePhoto.name : 'Current Profile Photo'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {profilePhoto ? `${(profilePhoto.size / 1024).toFixed(2)} KB` : 'Click to replace'}
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
                  {ndisPlanDocument || existingNdisDocument ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <FileText size={24} />
                        </div>
                        
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">
                            {ndisPlanDocument ? ndisPlanDocument.name : existingNdisDocument.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                              {ndisPlanDocument ? `${(ndisPlanDocument.size / 1024).toFixed(2)} KB` : 'Current Document'}
                            </p>
                            {existingNdisDocument?.url && !ndisPlanDocument && (
                              <a 
                                href={existingNdisDocument.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase hover:text-blue-700 transition-colors"
                              >
                                <Download size={10} />
                                Download
                              </a>
                            )}
                          </div>
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
                    Set Profile Activity Status
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

          {/* ==================== SUBMIT BUTTONS ==================== */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/clients")}
              className="w-full sm:w-auto px-6 py-3 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center">
                * Required Fields
              </p>
              
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
                    <Save size={16} /> Update Client
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                <AlertCircle size={32} />
              </div>
              
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                Delete Client?
              </h2>
              
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8 px-4">
                You are about to permanently remove{' '}
                <span className="text-slate-900 font-black">
                  {clientData.first_name} {clientData.last_name}
                </span>
                . This action is irreversible.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteClient}
                  className="w-full py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Confirm Deletion
                </button>
                
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-4 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditClient;