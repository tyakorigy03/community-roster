import React, { useState, useRef } from "react";
import { ArrowLeft, Plus, Loader2, Upload, FileText, Image, X } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase"; // import supabase client
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

function AddStaff() {
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
    profilePicture: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRefs = useRef({});
  const profileInputRef = useRef(null);

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
    
    setStaffData(prev => ({ 
      ...prev, 
      profilePicture: file 
    }));
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
    
    // Reset the file input
    if (fileInputRefs.current[docName]) {
      fileInputRefs.current[docName].value = "";
    }
  };

  const removeProfilePicture = () => {
    setStaffData(prev => ({ 
      ...prev, 
      profilePicture: null 
    }));
    setProfileUploadProgress(0);
    
    // Reset the file input
    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
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
            
            // Update document-specific progress if docName is provided
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
      
      // Mark upload as complete
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
      
      return isPdf? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}` :  res.data.secure_url;
    } catch (error) {
      // Mark upload as failed
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
      // Upload profile picture with progress
      let profilePicUrl = "";
      if (staffData.profilePicture) {
        profilePicUrl = await uploadFileToCloudinary(
          staffData.profilePicture,
          (progress) => setProfileUploadProgress(progress)
        );
      }

      // Insert staff info
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .insert([{
          name: staffData.name,
          dob: staffData.dob,
          phone: staffData.phone,
          email: staffData.email,
          address: staffData.address,
          next_of_kin: staffData.nextOfKin,
          profile_picture: profilePicUrl
        }])
        .select()
        .single();

      if (staffError) throw staffError;

      // Upload documents and insert into staff_documents table
      for (const docName of documentFields) {
        const doc = staffData.documents[docName];
        if (doc.file) {
          const url = await uploadFileToCloudinary(
            doc.file,
            null, // Progress handled inside the function for documents
            docName
          );
          const { error: docError } = await supabase
            .from("staff_documents")
            .insert([{
              staff_id: staff.id,
              document_name: docName,
              file_url: url,
              expiry_date: doc.expiry || null
            }]);
          if (docError) throw docError;
        }
      }

      toast.success("Staff added successfully!");
      
      // Reset form
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
        profilePicture: null
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

  // Get file icon based on type
  const getFileIcon = (fileName) => {
    if (!fileName) return <FileText size={14} />;
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <Image size={14} />;
    }
    return <FileText size={14} />;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-4xl rounded-xl shadow border border-gray-300 bg-white p-8">
        <div className="header flex justify-between px-3 py-1 border-b mb-6 border-gray-400">
          <h2 className="text-2xl font-semibold text-slate-800 text-center">
            Add Staff
          </h2>  
          <Link to={'/staff'} className="flex items-center hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} className="mr-1" /> Back 
          </Link>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Staff Name", name: "name", type: "text" },
              { label: "Date of Birth", name: "dob", type: "date" },
              { label: "Phone Number", name: "phone", type: "text" },
              { label: "Email", name: "email", type: "email" },
              { label: "Address", name: "address", type: "text" },
            ].map((field) => (
              <div key={field.name} className="flex flex-col">
                <label className="text-[11px] text-slate-600 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.label}
                  value={staffData[field.name]}
                  onChange={handleInputChange}
                  className="p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 text-sm"
                  required
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
          
          {/* Next of Kin */}
          <div className="border border-slate-200 rounded p-4">
            <h4 className="text-[12px] font-semibold text-slate-700 mb-3">
              Next of Kin
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-[11px] text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={staffData.nextOfKin.name}
                  onChange={handleNextOfKinChange}
                  className="p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Jane Doe"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[11px] text-slate-600 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={staffData.nextOfKin.phone}
                  onChange={handleNextOfKinChange}
                  className="p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-600"
                  placeholder="+61..."
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[11px] text-slate-600 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  name="relationship"
                  value={staffData.nextOfKin.relationship}
                  onChange={handleNextOfKinChange}
                  className="p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Brother, Mother, Spouse"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Profile Picture with Improved Styling */}
          <div className="flex flex-col">
            <label className="text-[11px] text-slate-600 mb-1">Profile Picture</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 transition-all ${
                isDragging 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-slate-300 hover:border-blue-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
            >
              {staffData.profilePicture ? (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded">
                  <div className="flex items-center space-x-2">
                    <Image size={18} className="text-slate-600" />
                    <span className="text-sm text-slate-700 truncate max-w-xs">
                      {staffData.profilePicture.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {profileUploadProgress > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${profileUploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {profileUploadProgress}%
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={removeProfilePicture}
                      className="text-slate-500 hover:text-red-600 transition-colors p-1"
                      disabled={isSubmitting}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 mb-2">
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
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="profile-upload"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-medium cursor-pointer transition-colors"
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

          {/* Documents Table with Improved Styling */}
          <div className="overflow-x-auto">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">Documents</h3>
            <table className="w-full text-sm border border-slate-300 rounded">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left text-nowrap">Document</th>
                  <th className="px-3 py-2 text-left text-nowrap">Upload File</th>
                  <th className="px-3 py-2 text-left text-nowrap">Expiry Date</th>
                  <th className="px-3 py-2 text-left text-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {documentFields.map((doc) => (
                  <tr key={doc} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-slate-700">{doc}</td>
                    <td className="px-3 py-2">
                      {staffData.documents[doc].file ? (
                        <div className="flex items-center justify-between min-w-[150px] bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="flex items-center space-x-2 truncate">
                            {getFileIcon(staffData.documents[doc].fileName)}
                            <span className="text-sm text-slate-700 truncate max-w-[150px]">
                              {staffData.documents[doc].fileName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => removeDocument(doc)}
                              className="text-slate-500 hover:text-red-600 transition-colors p-1"
                              disabled={isSubmitting}
                              title="Remove file"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="border-2 min-w-[150px] border-dashed border-slate-300 rounded p-2 hover:border-blue-400 transition-colors cursor-pointer"
                          onClick={() => fileInputRefs.current[doc]?.click()}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, doc)}
                        >
                          <input
                            ref={el => fileInputRefs.current[doc] = el}
                            type="file"
                            accept="image/*,application/pdf,.doc,.docx"
                            onChange={(e) =>
                              e.target.files && handleDocumentChange(doc, e.target.files[0])
                            }
                            className="hidden"
                            disabled={isSubmitting}
                          />
                          <div className="flex flex-col items-center text-center">
                            <Upload size={16} className="text-slate-400 mb-1" />
                            <p className="text-xs text-slate-600">
                              Click or drag file
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Images, PDF, DOC
                            </p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={staffData.documents[doc].expiry}
                        onChange={(e) =>
                          handleDocumentExpiryChange(doc, e.target.value)
                        }
                        className="p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 text-sm w-full"
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {staffData.documents[doc].isUploading ? (
                        <div className="flex flex-col items-end">
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${staffData.documents[doc].uploadProgress}%` }}
                            ></div>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Uploading: {staffData.documents[doc].uploadProgress}%
                          </div>
                        </div>
                      ) : staffData.documents[doc].file ? (
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                            Ready
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            Pending
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Adding Staff...
              </>
            ) : (
              <>
                <Plus size={16} /> Add Staff
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddStaff;