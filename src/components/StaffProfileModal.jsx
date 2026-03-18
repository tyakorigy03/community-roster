import { createPortal } from "react-dom";
import React, { useState, useEffect } from "react";
import { X, Mail, Phone, MapPin, Calendar, User, FileText, Download, Eye, AlertCircle, DollarSign, ShieldCheck, ChevronRight, Briefcase, Upload } from "lucide-react";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

function StaffProfileModal({ staff, onClose }) {
  const { currentStaff } = useUser();
  const [documents, setDocuments] = useState([]);
  const [payRates, setPayRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState(null);
  const contentRef = React.useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [uploadState, setUploadState] = useState({});
  const fileInputRefs = React.useRef({});
  
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

  // Fetch all data when component mounts
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch fresh staff data first
        const { data: staffDataResult, error: staffError } = await supabase
          .from("staff")
          .select("*")
          .eq("id", staff.id)
          .eq("tenant_id", currentStaff?.tenant_id)
          .single();

        if (staffError) throw staffError;
        setStaffData(staffDataResult);

        // Then fetch other data in parallel
        await Promise.all([
          fetchDocuments(),
          fetchPayRates()
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (staff?.id && currentStaff?.tenant_id) {
      fetchAllData();
    }
  }, [staff?.id, currentStaff?.tenant_id]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: docs, error: docsError } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("tenant_id", currentStaff?.tenant_id);

      if (docsError) throw docsError;
      setDocuments(docs || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const fetchPayRates = async () => {
    try {
      const { data: rates, error: ratesError } = await supabase
        .from("staff_pay_rates")
        .select(`
          *,
          pay_rate:pay_rate_id(*)
        `)
        .eq("staff_id", staff.id)
        .eq("tenant_id", currentStaff?.tenant_id)
        .order("effective_from", { ascending: false });

      if (ratesError) throw ratesError;
      setPayRates(rates || []);
    } catch (error) {
      console.error("Error fetching pay rates:", error);
    }
  };

  const formatDate = (dateString, short = false) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      if (short) return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (error) {
      return "N/A";
    }
  };

  const isDocumentExpired = (expiryDate) => {
    if (!expiryDate) return false;
    try {
      return new Date(expiryDate) < new Date();
    } catch (error) {
      return false;
    }
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
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleUploadClick = (docName) => {
    fileInputRefs.current[docName]?.click();
  };

  const handleFileChange = async (docName, file) => {
    if (!file) return;

    try {
      setUploadState(prev => ({
        ...prev,
        [docName]: { isUploading: true, progress: 0 }
      }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "blessingcommunity");
      
      const isPdf = file.type === "application/pdf";
      
      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/dazbtduwj/upload",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadState(prev => ({
              ...prev,
              [docName]: { isUploading: true, progress }
            }));
          }
        }
      );

      const fileUrl = isPdf 
        ? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}` 
        : res.data.secure_url;

      const existingDoc = documents.find(d => d.document_name === docName);
      
      if (existingDoc) {
        const { error } = await supabase
          .from("staff_documents")
          .update({ file_url: fileUrl, updated_at: new Date().toISOString() })
          .eq("id", existingDoc.id);
        if (error) throw error;

        setDocuments(prev => prev.map(d =>
          d.document_name === docName ? { ...d, file_url: fileUrl } : d
        ));
      } else {
        const { data: newDoc, error } = await supabase
          .from("staff_documents")
          .insert([{
            staff_id: staff.id,
            document_name: docName,
            file_url: fileUrl,
            tenant_id: currentStaff?.tenant_id
          }])
          .select()
          .single();
        if (error) throw error;

        setDocuments(prev => [...prev, newDoc]);
      }

      // You can add a simple alert or console log instead of toast
      console.log(`${docName} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      // You can add a simple alert instead of toast
      console.error(`Failed to upload ${docName}`);
    } finally {
      setUploadState(prev => ({
        ...prev,
        [docName]: { isUploading: false, progress: 0 }
      }));
    }
  };

  // Show loading state
  if (loading || !staffData) {
    return createPortal(
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[60]"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-slate-600">Loading staff details...</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div 
        className="bg-white sm:rounded-[1.8rem] md:shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[85dvh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 relative flex-shrink-0 p-3 sm:p-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2.5 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all border border-slate-200 shadow-sm z-10"
          >
            <X size={14} strokeWidth={3} />
          </button>

          <div className="relative flex flex-row items-center gap-3 sm:gap-5">
            <div className="relative group flex-shrink-0">
              {staffData.profile_picture ? (
                <img
                  src={staffData.profile_picture}
                  alt={staffData.name || "Staff member"}
                  className="rounded-2xl object-cover border-4 border-slate-50 shadow-sm w-16 h-16 sm:w-20 sm:h-20"
                />
              ) : (
                <div className="rounded-2xl flex items-center justify-center bg-slate-100 text-slate-600 font-black shadow-sm w-16 h-16 text-xl sm:w-20 sm:h-20 sm:text-2xl">
                  {staffData.name ? staffData.name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?"}
                </div>
              )}

              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-xl flex items-center justify-center border-4 border-white shadow-sm w-6 h-6 sm:w-7 sm:h-7">
                <ShieldCheck className="text-white w-3 h-3" />
              </div>
            </div>

            <div className="flex-1 text-left min-w-0 w-full">
              <h2 className="font-black tracking-tight text-slate-900 uppercase truncate text-xl sm:text-2xl lg:text-3xl">
                {staffData.name || "Unknown Staff"}
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 lg:p-5 space-y-3 sm:space-y-5 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-5">
              <section>
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <div className="h-7 w-7 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    <User size={14} className="text-slate-600" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    Personal Details
                  </h3>
                </div>

                <div className="space-y-2 sm:space-y-2.5">
                  {[
                    { icon: Briefcase, label: "Job Role", value: staffData.role || "Not assigned" },
                    { icon: Mail, label: "Email Address", value: staffData.email || "No email" },
                    { icon: Phone, label: "Phone Number", value: staffData.phone || "No phone listed" },
                    { icon: Calendar, label: "Date of Birth", value: formatDate(staffData.dob) },
                    { icon: MapPin, label: "Home Address", value: staffData.address || "Not provided" }
                  ].map((field, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 group hover:border-blue-200 transition-all"
                    >
                      <div className="h-9 w-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all flex-shrink-0">
                        <field.icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          {field.label}
                        </p>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                          {field.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {staffData.next_of_kin && Object.keys(staffData.next_of_kin).length > 0 && (
                <section>
                  <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                    <div className="h-7 w-7 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                      <ShieldCheck size={14} className="text-slate-600" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                      Next of Kin
                    </h3>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-[1.6rem] p-4 sm:p-5 shadow-sm relative overflow-hidden">
                    <div className="relative space-y-3">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                          Emergency Contact
                        </p>
                        <p className="text-sm sm:text-base font-black uppercase tracking-tight truncate text-slate-900">
                          {staffData.next_of_kin.name || "None"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                            Contact
                          </p>
                          <p className="text-[10px] font-black tracking-tight truncate text-slate-600">
                            {staffData.next_of_kin.phone || "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                            Relation
                          </p>
                          <p className="text-[10px] font-black tracking-tight uppercase truncate text-slate-600">
                            {staffData.next_of_kin.relationship || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-5">
              {/* Payroll */}
              <section>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                      <DollarSign size={14} className="text-slate-600" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                      Pay Rates
                    </h3>
                  </div>

                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest">
                    {payRates?.length || 0} Assignments
                  </span>
                </div>

                <div className="bg-white rounded-xl sm:rounded-[1.6rem] border border-slate-100 shadow-sm overflow-hidden">
                  {/* Mobile Card View */}
                  <div className="block sm:hidden divide-y divide-slate-50">
                    {!payRates || payRates.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <AlertCircle className="mx-auto text-slate-200 mb-2" size={28} />
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                          No pay rates assigned
                        </p>
                      </div>
                    ) : (
                      payRates.map((rate, idx) => (
                        <div key={idx} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                                {rate.pay_rate?.name || "Standard Rate"}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                {rate.pay_rate?.day_type || "Standard"}
                              </p>
                            </div>
                            {rate.is_default ? (
                              <span className="px-2 py-0.5 bg-blue-500 text-white text-[7px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-500/20">
                                Primary
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[7px] font-black uppercase tracking-widest rounded-lg">
                                Override
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="text-[11px] font-black text-slate-700">
                              <span className="text-slate-300 font-bold">$</span>
                              {rate.pay_rate?.hourly_rate?.toFixed(2) || "0.00"}
                              <span className="text-[8px] text-slate-400 ml-1">/HR</span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                              <Calendar size={11} className="text-blue-400" />
                              {formatDate(rate.effective_from, true)}
                              <ChevronRight size={9} className="text-slate-300" />
                              {rate.effective_to ? formatDate(rate.effective_to, true) : "Current"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <table className="hidden sm:table w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Rate Type
                        </th>
                        <th className="px-4 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Hourly Rate
                        </th>
                        <th className="px-4 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Period
                        </th>
                        <th className="px-4 py-3 text-right text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                      {!payRates || payRates.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-10 text-center">
                            <AlertCircle className="mx-auto text-slate-200 mb-2" size={28} />
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                              No pay rate records found
                            </p>
                          </td>
                        </tr>
                      ) : (
                        payRates.map((rate, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-3">
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                                {rate.pay_rate?.name || "Standard Rate"}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                {rate.pay_rate?.day_type || "Standard"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-[11px] font-black text-slate-700">
                              <span className="text-slate-300 font-bold">$</span>
                              {rate.pay_rate?.hourly_rate?.toFixed(2) || "0.00"}
                              <span className="text-[8px] text-slate-400 ml-1">/HR</span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                <Calendar size={11} className="text-blue-400" />
                                {formatDate(rate.effective_from, true)}
                                <ChevronRight size={9} className="text-slate-300" />
                                {rate.effective_to ? formatDate(rate.effective_to, true) : "Current"}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              {rate.is_default ? (
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-[7px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-500/20">
                                  Primary
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[7px] font-black uppercase tracking-widest rounded-lg">
                                  Override
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Regulatory */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <div className="h-7 w-7 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    <FileText size={14} className="text-slate-600" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    Staff Documents
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {documentFields.map((docName) => {
                    const { uploaded, expired, doc } = getDocumentStatus(docName);

                    return (
                      <div
                        key={docName}
                        className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-[1.4rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate mb-1">
                            {docName}
                          </p>

                          <p className={`text-[7px] font-black uppercase tracking-widest ${
                            !uploaded ? "text-slate-300" : expired ? "text-rose-500" : "text-emerald-500"
                          }`}>
                            {!uploaded ? "Missing" : expired ? "Expired" : "Verified"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <input
                            type="file"
                            ref={el => fileInputRefs.current[docName] = el}
                            onChange={(e) => e.target.files && handleFileChange(docName, e.target.files[0])}
                            className="hidden"
                            accept="image/*,application/pdf"
                          />
                          
                          {uploadState[docName]?.isUploading ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                              <span className="text-[7px] font-black text-blue-600">{uploadState[docName].progress}%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUploadClick(docName)}
                              className="h-8 w-8 bg-white text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all flex items-center justify-center border border-slate-200 hover:border-blue-600 shadow-sm"
                              title="Upload Document"
                            >
                              <Upload size={14} />
                            </button>
                          )}

                          {uploaded && doc?.file_url && (
                            <button
                              onClick={() => handleViewDocument(doc.file_url)}
                              className="h-8 w-8 bg-white text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all flex items-center justify-center border border-slate-200 hover:border-slate-900 shadow-sm"
                              title="View Document"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-blue-50 hidden md:flex justify-center sm:justify-end flex-shrink-0 p-3 sm:p-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.28em] rounded-xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Dismiss
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default StaffProfileModal;