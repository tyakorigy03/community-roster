import React, { useState, useRef } from "react";
import { ArrowLeft, Plus, Upload, X, FileText, Image } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

function AddClient() {
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
            uploaded_at: new Date().toISOString()
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
          is_active: clientData.is_active
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
            .eq('id', ndisPlanDocumentId);

     if (error) throw documentUpdateError;

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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 md:p-4">
      <div className="w-full max-w-6xl md:rounded-xl md:shadow border border-gray-300 bg-white p-8">
        <div className="header flex  justify-between px-3 py-1 border-b mb-6 border-gray-400">
              <Link to={'/clients'} className="flex items-center hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} className="mr-1" /> Back 
          </Link>
          <h2 className="text-2xl font-semibold text-slate-800 text-center">
            Add New Client
          </h2>  
        
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Section 1: Core Identity */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Core Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Photo */}
        <div className="col-span-1 md:col-span-2">
  <label className="block text-sm font-medium text-slate-600 mb-2">
    Profile Photo
  </label>

  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 hover:border-blue-400 transition-colors">
    {profilePhoto ? (
      <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg">
        {/* File info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image size={20} className="text-slate-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {profilePhoto.name}
              </p>
              <p className="text-xs text-slate-500">
                {(profilePhoto.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            {profileUploadProgress > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-24 bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${profileUploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {profileUploadProgress}%
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={removeProfilePhoto}
              className="text-slate-500 hover:text-red-600 transition-colors p-2"
              disabled={isSubmitting}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center text-center px-2">
        <Upload size={28} className="text-slate-400 mb-3" />
        <p className="text-sm text-slate-600 mb-2">
          Drag & drop a profile photo, or click to browse
        </p>

        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) =>
            e.target.files && handleProfilePhoto(e.target.files[0])
          }
          className="hidden"
          id="profile-upload"
          disabled={isSubmitting}
        />

        <label
          htmlFor="profile-upload"
          className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium cursor-pointer transition-colors text-center"
        >
          Browse Files
        </label>

        <p className="text-xs text-slate-500 mt-2">
          Supports: JPG, PNG, GIF, WEBP
        </p>
      </div>
    )}
  </div>
</div>


              {/* Name Fields */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  placeholder="John"
                  value={clientData.first_name}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  placeholder="Doe"
                  value={clientData.last_name}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={clientData.date_of_birth}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="+61 400 000 000"
                  value={clientData.phone_number}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="john.doe@example.com"
                  value={clientData.email}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600 mb-1">Address Line *</label>
                <input
                  type="text"
                  name="address_line"
                  placeholder="123 Main Street"
                  value={clientData.address_line}
                  onChange={handleInputChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Sydney"
                  value={clientData.city}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  placeholder="NSW"
                  value={clientData.state}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Postcode</label>
                <input
                  type="text"
                  name="postcode"
                  placeholder="2000"
                  value={clientData.postcode}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Section 3: NDIS Information */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">NDIS Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">NDIS Number *</label>
                <input
                  type="text"
                  name="ndis_number"
                  placeholder="NDIS-XXXX-XXXX"
                  value={clientData.ndis_number}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600 mb-1">Diagnosis</label>
                <textarea
                  name="diagnosis"
                  placeholder="Enter diagnosis details..."
                  value={clientData.diagnosis}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* NDIS Plan Document */}
           <div className="col-span-1 md:col-span-2">
  <label className="block text-sm font-medium text-slate-600 mb-2">
    NDIS Plan Document
  </label>

  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 hover:border-blue-400 transition-colors">
    {ndisPlanDocument ? (
      <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* File info */}
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={20} className="text-slate-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {ndisPlanDocument.name}
              </p>
              <p className="text-xs text-slate-500">
                {(ndisPlanDocument.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {documentUploadProgress > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-24 bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${documentUploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {documentUploadProgress}%
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={removeNdisPlanDocument}
              className="text-slate-500 hover:text-red-600 transition-colors p-2"
              disabled={isSubmitting}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center text-center px-2">
        <Upload size={28} className="text-slate-400 mb-3" />
        <p className="text-sm text-slate-600 mb-2">
          Upload NDIS Plan Document (PDF, DOC, etc.)
        </p>

        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) =>
            e.target.files && handleNdisPlanDocument(e.target.files[0])
          }
          className="hidden"
          id="document-upload"
          disabled={isSubmitting}
        />

        <label
          htmlFor="document-upload"
          className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium cursor-pointer transition-colors text-center"
        >
          Browse Files
        </label>

        <p className="text-xs text-slate-500 mt-2">
          Supports: PDF, DOC, DOCX, TXT
        </p>
      </div>
    )}
  </div>
</div>

            </div>
          </div>

          {/* Section 4: Care & Planning */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Care & Planning</h3>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-600 mb-1">Goals Summary</label>
              <textarea
                name="goals_summary"
                placeholder="Enter client goals and care plan summary..."
                value={clientData.goals_summary}
                onChange={handleInputChange}
                rows="4"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Section 5: Medical Contacts */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Medical Contacts</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Doctor's Name</label>
                <input
                  type="text"
                  name="doctor_name"
                  placeholder="Dr. Smith"
                  value={clientData.doctor_name}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Doctor's Phone</label>
                <input
                  type="tel"
                  name="doctor_phone"
                  placeholder="+61 400 000 000"
                  value={clientData.doctor_phone}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600 mb-1">Doctor's Email</label>
                <input
                  type="email"
                  name="doctor_email"
                  placeholder="doctor@clinic.com"
                  value={clientData.doctor_email}
                  onChange={handleInputChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Section 6: Next of Kin */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Next of Kin</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  name="next_of_kin_name"
                  placeholder="Jane Doe"
                  value={clientData.next_of_kin_name}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="next_of_kin_phone"
                  placeholder="+61 400 000 000"
                  value={clientData.next_of_kin_phone}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Relationship</label>
                <input
                  type="text"
                  name="next_of_kin_relationship"
                  placeholder="Mother, Spouse, etc."
                  value={clientData.next_of_kin_relationship}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-700">Client Status</h3>
                <p className="text-sm text-slate-500 mt-1">Set the initial status for this client</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={clientData.is_active}
                    onChange={(e) => setClientData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                    disabled={isSubmitting}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Adding Client...
                </>
              ) : (
                <>
                  <Plus size={20} /> Add Client
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 text-center mt-3">
              Fields marked with * are required
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddClient;