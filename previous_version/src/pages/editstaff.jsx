import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, FileText, Image, X, Save, Eye, Download } from "lucide-react";
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
    profilePictureFile: null
  });

  // Fetch staff data on component mount
  useEffect(() => {
    if (id) {
      fetchStaffData();
    }
  }, [id]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      
      // Fetch staff basic info
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("id", id)
        .single();

      if (staffError) throw staffError;

      // Fetch staff documents
      const { data: documents, error: docError } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", id);

      if (docError) throw docError;

      // Format documents data
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

      // Parse next_of_kin if it's a string
      let nextOfKin = {
        name: "",
        phone: "",
        relationship: ""
      };

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
        profilePictureFile: null
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
    
    setStaffData(prev => ({ 
      ...prev, 
      profilePictureFile: file 
    }));
    setProfileUploadProgress(0);
  };

  const removeDocument = async (docName) => {
    const doc = staffData.documents[docName];
    
    // If document exists in database, delete it
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

    // Update local state
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
    
    // Reset the file input
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
    
    // Reset the file input
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
      // Upload new profile picture if changed
      let profilePicUrl = staffData.profile_picture;
      if (staffData.profilePictureFile) {
        profilePicUrl = await uploadFileToCloudinary(
          staffData.profilePictureFile,
          (progress) => setProfileUploadProgress(progress)
        );
      }

      // Update staff info
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

      // Update or insert documents
      for (const docName of documentFields) {
        const doc = staffData.documents[docName];
        
        if (doc.file) {
          // Upload new document
          const url = await uploadFileToCloudinary(
            doc.file,
            null,
            docName
          );

          if (doc.id) {
            // Update existing document
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
            // Insert new document
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
          // Update expiry date for existing document
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
          <p className="mt-2 text-slate-600">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-4xl rounded-xl shadow border border-gray-300 bg-white p-8">
        <div className="header flex justify-between px-3 py-1 border-b mb-6 border-gray-400">
          <h2 className="text-2xl font-semibold text-slate-800 text-center">
            Edit Staff: {staffData.name}
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
                  value={staffData.next_of_kin?.name || ""}
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
                  value={staffData.next_of_kin?.phone || ""}
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
                  value={staffData.next_of_kin?.relationship || ""}
                  onChange={handleNextOfKinChange}
                  className="p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Brother, Mother, Spouse"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Profile Picture */}
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
              {staffData.profile_picture || staffData.profilePictureFile ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 p-3 rounded space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-3">
                    {staffData.profile_picture && !staffData.profilePictureFile ? (
                      <>
                        <img 
                          src={staffData.profile_picture} 
                          alt="Profile" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-sm text-slate-700">
                            Existing photo
                          </div>
                          <div className="text-xs text-slate-500">
                            Click to replace
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Image size={18} className="text-slate-600" />
                        <span className="text-sm text-slate-700 truncate max-w-xs">
                          {staffData.profilePictureFile?.name || "New photo"}
                        </span>
                      </div>
                    )}
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
                    
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={removeProfilePicture}
                        className="text-slate-500 hover:text-red-600 transition-colors p-1"
                        disabled={isSubmitting}
                        title="Remove photo"
                      >
                        <X size={16} />
                      </button>
                    </div>
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

          {/* Documents Table */}
          <div className="overflow-x-auto">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">Documents</h3>
            <table className="w-full text-sm border border-slate-300 rounded">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left text-nowrap">Document</th>
                  <th className="px-3 py-2 text-left text-nowrap">File</th>
                  <th className="px-3 py-2 text-left text-nowrap">Expiry Date</th>
                  <th className="px-3 py-2 text-left text-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentFields.map((doc) => {
                  const docData = staffData.documents[doc];
                  const hasFile = docData.file || docData.existing_url;
                  
                  return (
                    <tr key={doc} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-700">{doc}</td>
                      
                      <td className="px-3 py-2">
                        {hasFile ? (
                          <div className="flex items-center justify-between min-w-[150px] bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="flex items-center space-x-2 truncate">
                              {getFileIcon(docData.fileName)}
                              <span className="text-sm text-slate-700 truncate max-w-[150px]">
                                {docData.fileName || `Existing ${doc}`}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              {docData.existing_url && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleViewDocument(docData.existing_url)}
                                    className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                    disabled={isSubmitting}
                                    title="View document"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDocument(docData.existing_url, `${doc}_${staffData.name}`)}
                                    className="text-green-500 hover:text-green-700 transition-colors p-1"
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
                                className="text-slate-500 hover:text-red-600 transition-colors p-1"
                                disabled={isSubmitting}
                                title="Remove document"
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
                          value={docData.expiry}
                          onChange={(e) =>
                            handleDocumentExpiryChange(doc, e.target.value)
                          }
                          className="p-2 border border-slate-300 rounded focus:outline-none focus:border-blue-600 text-sm w-full"
                          disabled={isSubmitting}
                        />
                      </td>
                      
                      <td className="px-3 py-2">
                        {docData.isUploading ? (
                          <div className="flex flex-col items-end">
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${docData.uploadProgress}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Uploading: {docData.uploadProgress}%
                            </div>
                          </div>
                        ) : hasFile ? (
                          <div className="flex items-center justify-end">
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                              {docData.file ? "New" : "Existing"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              Not uploaded
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/staff")}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-semibold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Update Staff
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