import { createPortal } from "react-dom";
import React, { useState, useEffect } from "react";
import { X, Mail, Phone, MapPin, Calendar, User, FileText, Download, Eye, AlertCircle, DollarSign, ShieldCheck, ChevronRight, Briefcase } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

function StaffProfileModal({ staff, onClose }) {
  const { currentStaff } = useUser();
  const [documents, setDocuments] = useState([]);
  const [payRates, setPayRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const contentRef = React.useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  
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
    fetchStaffDetails();
  }, [staff.id]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const fetchStaffDetails = async () => {
    try {
      setLoading(true);
      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from("staff_documents")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("tenant_id", currentStaff?.tenant_id);

      if (docsError) throw docsError;
      setDocuments(docs || []);

      // Fetch assigned pay rates
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
      console.error("Error fetching staff details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString, short = false) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (short) return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center z-[60]"
      onClick={onClose}
      style={{
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
      }}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-[1.8rem] shadow-2xl w-full max-w-5xl h-[96vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        <div 
          className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 text-white relative flex-shrink-0 p-4 sm:p-6"
        >


          <div className="relative flex flex-row items-center gap-3 sm:gap-5">
            
            <div 
              className="relative group flex-shrink-0"
            >
              {staff.profile_picture ? (
                <img
                  src={staff.profile_picture}
                  alt={staff.name}
                  className="rounded-2xl object-cover border-4 border-white/10 shadow-2xl w-16 h-16 sm:w-20 sm:h-20"
                />
              ) : (
                <div 
                  className="rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black shadow-2xl shadow-blue-900/40 w-16 h-16 text-xl sm:w-20 sm:h-20 sm:text-2xl"
                >
                  {staff.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </div>
              )}

              <div 
                className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-xl flex items-center justify-center border-4 border-[#070b14] shadow-lg w-6 h-6 sm:w-7 sm:h-7"
              >
                <ShieldCheck 
                  className="text-white w-3 h-3"
                />
              </div>
            </div>

            {/* Staff Info - Collapses on mobile scroll only */}
            <div className="flex-1 text-left min-w-0 w-full">
              {/* Badges - Fade out on mobile scroll */}
              <div 
                className="flex flex-wrap items-center justify-start gap-2 mb-2"
              >
                <span className="px-2.5 py-1 bg-white/10 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-blue-300 border border-white/10 whitespace-nowrap">
                  Staff Member
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/20 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                  Active Member
                </span>
              </div>

              {/* Name - Shrinks on mobile scroll */}
              <h2 
                className="font-black tracking-tight text-white uppercase italic truncate text-xl sm:text-2xl lg:text-3xl mb-1.5"
              >
                {staff.name}
              </h2>

              {/* Details - Fade/collapse on mobile scroll */}
              <div 
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Briefcase size={12} className="text-blue-400 flex-shrink-0" />
                  <span className="truncate">{staff.role || "FIELD SPECIALIST"}</span>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                  <Mail size={12} className="text-blue-400 flex-shrink-0" />
                  <span className="truncate">{staff.email || "No email provided"}</span>
                </div>
              </div>
            </div>

            {/* Close Button - Always visible */}
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tactical Content Grid - Mobile Optimized */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 bg-slate-50/50"
        >

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

            {/* Left Column */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-5">
              <section>
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <User size={14} className="text-white" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    Personal Details
                  </h3>
                </div>

                <div className="space-y-2 sm:space-y-2.5">
                  {[
                    { icon: Phone, label: "Phone Number", value: staff.phone || "No phone listed" },
                    { icon: Calendar, label: "Date of Birth", value: formatDate(staff.dob) },
                    { icon: MapPin, label: "Home Address", value: staff.address || "Not provided" }
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

              {staff.next_of_kin && (
                <section>
                  <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                    <div className="h-7 w-7 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-900/20">
                      <ShieldCheck size={14} className="text-white" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                      Next of Kin
                    </h3>
                  </div>

                  <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>

                    <div className="relative space-y-3">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                          Emergency Contact
                        </p>
                        <p className="text-sm sm:text-base font-black uppercase italic tracking-tight truncate">
                          {staff.next_of_kin.name || "None"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                        <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                            Contact
                          </p>
                          <p className="text-[10px] font-black tracking-tight truncate">
                            {staff.next_of_kin.phone || "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                            Relation
                          </p>
                          <p className="text-[10px] font-black tracking-tight uppercase truncate">
                            {staff.next_of_kin.relationship || "N/A"}
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
                    <div className="h-7 w-7 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
                      <DollarSign size={14} className="text-white" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                      Pay Rates
                    </h3>
                  </div>

                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest">
                    {payRates.length} Assignments
                  </span>
                </div>

                <div className="bg-white rounded-xl sm:rounded-[1.6rem] border border-slate-100 shadow-sm overflow-hidden">
                  {/* Mobile Card View */}
                  <div className="block sm:hidden divide-y divide-slate-50">
                    {payRates.length === 0 ? (
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
                              {rate.pay_rate?.hourly_rate?.toFixed(2)}
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
                      {payRates.length === 0 ? (
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
                              {rate.pay_rate?.hourly_rate?.toFixed(2)}
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
                  <div className="h-7 w-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
                    <FileText size={14} className="text-white" />
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

                          <div className="flex items-center gap-2">
                            {uploaded ? (
                              <div className={`p-1 rounded-md ${expired ? "bg-rose-50" : "bg-emerald-50"}`}>
                                {expired ? (
                                  <AlertCircle size={10} className="text-rose-500" />
                                ) : (
                                  <ShieldCheck size={10} className="text-emerald-500" />
                                )}
                              </div>
                            ) : (
                              <div className="p-1 bg-slate-50 rounded-md">
                                <AlertCircle size={10} className="text-slate-300" />
                              </div>
                            )}

                            <p
                              className={`text-[8px] font-black uppercase tracking-widest ${
                                !uploaded
                                  ? "text-slate-300"
                                  : expired
                                  ? "text-rose-500"
                                  : "text-emerald-500"
                              }`}
                            >
                              {!uploaded ? "MISSING" : expired ? "EXPIRED" : "VERIFIED"}
                            </p>
                          </div>
                        </div>

                        {uploaded && (
                          <button
                            onClick={() => handleViewDocument(doc.file_url)}
                            className="h-9 w-9 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center justify-center border border-slate-100 group-hover:border-indigo-200 flex-shrink-0 ml-2"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        <div 
          className="border-t border-slate-100 bg-white flex justify-center sm:justify-end flex-shrink-0 p-4 sm:p-5"
        >
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