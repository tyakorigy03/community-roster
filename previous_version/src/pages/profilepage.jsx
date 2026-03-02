import React, { useState, useEffect, useRef } from "react";
import { Loader2, Upload, FileText, Image, X, Save, Eye, Download, User, Mail, Phone, MapPin, Calendar, Edit2, AlertCircle } from "lucide-react";
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
  const {currentStaff:user}=useUser();
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
        .single();

      if (staffError) throw staffError;

      if (!staff) {
        showToast("Staff profile not found", "error");
        return;
      }

      const { data: documents, error: docError } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", staff.id);

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
          .eq("id", doc.id);

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
        .eq("id", staffData.id);

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
              .eq("id", doc.id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from("staff_documents")
              .insert([{
                staff_id: staffData.id,
                document_name: docName,
                file_url: url,
                expiry_date: doc.expiry || null
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
            .eq("id", doc.id);

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
    if (type==='error') {
        toast.error(message)
    }else if (type==='success') {
        toast.success(message)
    }else{
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const docStats = getDocumentsStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-32"></div>
          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16">
              <div className="relative">
                {staffData.profile_picture ? (
                  <img
                    src={staffData.profile_picture}
                    alt={staffData.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-4xl border-4 border-white shadow-lg">
                    {staffData.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-700">{staffData.name}</h1>
                <p className="text-gray-600 mt-1">{staffData.role}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Mail size={14} />
                  <span>{staffData.email}</span>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 size={16} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-800">{docStats.uploaded}/{docStats.total}</p>
              </div>
              <FileText className="text-blue-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired Documents</p>
                <p className="text-2xl font-bold text-red-600">{docStats.expired}</p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profile Status</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
              <User className="text-green-600" size={32} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('personal')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'personal'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Personal Information
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'documents'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Documents
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {isEditing && (
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-all ${
                        isDragging 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-300 hover:border-blue-400"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e)}
                    >
                      {staffData.profilePictureFile ? (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex items-center space-x-2">
                            <Image size={18} className="text-gray-600" />
                            <span className="text-sm text-gray-700 truncate max-w-xs">
                              {staffData.profilePictureFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={removeProfilePicture}
                            className="text-gray-500 hover:text-red-600 transition-colors p-1"
                            title="Remove photo"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <Upload size={24} className="text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 mb-2">
                            Drag & drop an image here, or click to browse
                          </p>
                          <input
                            ref={profileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              e.target.files && handleProfilePicture(e.target.files[0])
                            }
                            className="hidden"
                            id="profile-upload"
                          />
                          <label
                            htmlFor="profile-upload"
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium cursor-pointer transition-colors"
                          >
                            Browse Files
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={staffData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="text-gray-500" size={18} />
                        <span className="text-gray-800">{staffData.name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                      <Mail className="text-gray-500" size={18} />
                      <span className="text-gray-600">{staffData.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={staffData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="text-gray-500" size={18} />
                        <span className="text-gray-800">{staffData.phone || "N/A"}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="dob"
                        value={staffData.dob}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="text-gray-500" size={18} />
                        <span className="text-gray-800">{formatDate(staffData.dob)}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        value={staffData.address}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="text-gray-500" size={18} />
                        <span className="text-gray-800">{staffData.address || "N/A"}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Next of Kin</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={staffData.next_of_kin?.name || ""}
                          onChange={handleNextOfKinChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-800">{staffData.next_of_kin?.name || "N/A"}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Contact Number</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={staffData.next_of_kin?.phone || ""}
                          onChange={handleNextOfKinChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-800">{staffData.next_of_kin?.phone || "N/A"}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Relationship</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="relationship"
                          value={staffData.next_of_kin?.relationship || ""}
                          onChange={handleNextOfKinChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-800">{staffData.next_of_kin?.relationship || "N/A"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Document</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Expiry Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentFields.map((docName) => {
                      const doc = staffData.documents[docName];
                      const hasFile = doc.file || doc.existing_url;
                      const expired = doc.existing_url && isDocumentExpired(doc.expiry);
                      
                      return (
                        <tr key={docName} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-700">{docName}</td>
                          
                          <td className="px-4 py-3">
                            {hasFile ? (
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                expired 
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {expired ? (
                                  <>
                                    <AlertCircle size={12} />
                                    Expired
                                  </>
                                ) : (
                                  "Uploaded"
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle size={12} />
                                Not Uploaded
                              </span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="date"
                                value={doc.expiry}
                                onChange={(e) => handleDocumentExpiryChange(docName, e.target.value)}
                                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full"
                              />
                            ) : (
                              <span className="text-gray-800">
                                {doc.expiry ? formatDate(doc.expiry) : "N/A"}
                              </span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasFile && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleViewDocument(doc.existing_url)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                    title="View document"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDocument(doc.existing_url, `${docName}_${staffData.name}`)}
                                    className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                    title="Download document"
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
                                      className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                      title="Remove document"
                                    >
                                      <X size={14} />
                                    </button>
                                  ) : (
                                    <>
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
                                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors cursor-pointer inline-flex items-center"
                                        title="Upload document"
                                      >
                                        <Upload size={14} />
                                      </label>
                                    </>
                                  )}
                                </>
                              )}
                              
                              {!hasFile && !isEditing && (
                                <span className="text-gray-500 text-sm">-</span>
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
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
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