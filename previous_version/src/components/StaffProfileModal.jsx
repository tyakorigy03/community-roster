import React, { useState, useEffect } from "react";
import { X, Mail, Phone, MapPin, Calendar, User, FileText, Download, Eye, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

function StaffProfileModal({ staff, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchDocuments();
  }, [staff.id]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", staff.id);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
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

  const getDocumentStatus = (docName) => {
    const doc = documents.find(d => d.document_name === docName);
    if (!doc) return { uploaded: false, expired: false, doc: null };
    return {
      uploaded: true,
      expired: isDocumentExpired(doc.expiry_date),
      doc
    };
  };

  const handleViewDocument = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0  flex items-center justify-center p-4 z-50" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {staff.profile_picture ? (
              <img
                src={staff.profile_picture}
                alt={staff.name}
                className="rounded-full h-16 w-16 object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="rounded-full h-16 w-16 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl">
                {staff.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{staff.name}</h2>
              <p className="text-gray-600">{staff.role || "Staff Member"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Personal Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{staff.email || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{staff.phone || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">{formatDate(staff.dob)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="text-gray-500" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{staff.address || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next of Kin */}
          {staff.next_of_kin && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Next of Kin</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{staff.next_of_kin.name || "N/A"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{staff.next_of_kin.phone || "N/A"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Relationship</p>
                  <p className="font-medium">{staff.next_of_kin.relationship || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Documents</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Document</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Expiry Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documentFields.map((docName) => {
                    const { uploaded, expired, doc } = getDocumentStatus(docName);
                    
                    return (
                      <tr key={docName} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{docName}</td>
                        <td className="px-4 py-3">
                          {uploaded ? (
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
                          {doc?.expiry_date ? formatDate(doc.expiry_date) : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {uploaded ? (
                            <button
                              onClick={() => handleViewDocument(doc.file_url)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffProfileModal;   