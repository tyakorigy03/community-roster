import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Download,
  Calendar,
  Heart,
  FileCheck,
  Upload,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

function AttachmentItem({ attachment }) {
  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{getFileIcon(attachment.file_type)}</div>
        <div className="min-w-0">
          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-[11px] uppercase truncate">
            {attachment.document_name || attachment.file_name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase">
             {attachment.file_type?.split('/')[1] || 'File'}
          </div>
        </div>
      </div>
      <Download size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
    </a>
  );
}

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString('en-AU');
};

const calculateAge = (dobString) => {
  if (!dobString) return "N/A";
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const ClientProfileModal = ({ isOpen, onClose, client }) => {
  const { currentStaff } = useUser();
  const [clientData, setClientData] = useState(client);
  const [loading, setLoading] = useState(false);
  const [uploadState, setUploadState] = useState({ isUploading: false, progress: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (client?.id && isOpen) {
      fetchFreshClientData();
    }
  }, [client?.id, isOpen]);

  const fetchFreshClientData = async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          file:ndis_plan_document_id (
            id,
            file_url,
            document_name,
            document_type
          ),
          documents(*)
        `)
        .eq('id', client.id)
        .single();

      if (error) throw error;
      if (data) {
        setClientData(data);
      }
    } catch (error) {
      console.error("Error fetching fresh client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentStaff?.tenant_id) return;

    try {
      setUploadState({ isUploading: true, progress: 0 });
      
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
            setUploadState({ isUploading: true, progress });
          }
        }
      );

      const fileUrl = isPdf 
        ? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}` 
        : res.data.secure_url;

      // 1. Insert into documents table
      const { data: docRecord, error: docError } = await supabase
        .from("documents")
        .insert([{
          document_name: `NDIS_Plan_${clientData.ndis_number || clientData.id}`,
          file_url: fileUrl,
          document_type: "NDIS_PLAN",
          tenant_id: currentStaff.tenant_id,
          owner_type: 'client',
          owner_id: clientData.id
        }])
        .select()
        .single();

      if (docError) throw docError;

      // 2. Update clients table
      const { error: clientUpdateError } = await supabase
        .from("clients")
        .update({ ndis_plan_document_id: docRecord.id })
        .eq("id", clientData.id);

      if (clientUpdateError) throw clientUpdateError;

      // 3. Refresh display
      await fetchFreshClientData();
      
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadState({ isUploading: false, progress: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center md:p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white md:rounded-[2rem] shadow-2xl w-full max-w-2xl h-full md:h-auto md:max-h-[80dvh] overflow-hidden flex flex-col border border-slate-100">
        {/* Modal Header */}
        <div className="p-2 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {clientData?.profile_photo_url ? (
              <img
                src={clientData.profile_photo_url}
                alt={`${clientData.first_name}`} 
                className="rounded-2xl h-14 w-14 object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="rounded-2xl h-14 w-14 flex items-center justify-center bg-blue-600 text-white font-black text-lg shadow-lg shadow-blue-200">
                {clientData?.first_name?.[0]}{clientData?.last_name?.[0]}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate leading-tight">
                {clientData?.first_name} {clientData?.last_name}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-full md:rounded-xl border border-slate-100 transition-all shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar relative">
          {loading && !uploadState.isUploading && (
            <div className="absolute inset-x-0 top-0 bg-blue-50/50 backdrop-blur-[1px] py-1 flex justify-center z-10 border-b border-blue-100">
               <Loader2 size={12} className="animate-spin text-blue-600 mr-2" />
               <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Updating Local File...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Personal File</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formal Age</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase">{calculateAge(clientData?.date_of_birth)} YRS</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Birth Date</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase">{formatDate(clientData?.date_of_birth)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">NDIS Number</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase font-mono">{clientData?.ndis_number || 'PENDING'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Support Directives</h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Primary Goals</p>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{clientData?.goals_summary || 'No directives recorded'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Communication</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Phone size={14}/></div>
                    <div>
                      <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Mobile</p>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{clientData?.phone_number || 'UNLISTED'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={14}/></div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Email</p>
                      <p className="text-[11px] font-black text-slate-900 truncate uppercase">{clientData?.email || 'UNLISTED'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">NDIS Documentation</h3>
                <div className="space-y-4">
                  {/* Primary NDIS Plan Row */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-[1.4rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate mb-1">
                        NDIS Service Plan
                      </p>
                      <p className={`text-[7px] font-black uppercase tracking-widest ${
                        !clientData?.file ? "text-slate-300" : "text-emerald-500"
                      }`}>
                        {!clientData?.file ? "Missing" : "Verified"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                       <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                      />

                      {uploadState.isUploading ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                          <span className="text-[7px] font-black text-blue-600">{uploadState.progress}%</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 w-8 bg-white text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all flex items-center justify-center border border-slate-200 hover:border-blue-600 shadow-sm"
                          title="Upload new document"
                        >
                          <Upload size={14} />
                        </button>
                      )}

                      {clientData?.file?.file_url && (
                        <button
                          onClick={() => window.open(clientData.file.file_url, '_blank')}
                          className="h-8 w-8 bg-white text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all flex items-center justify-center border border-slate-200 hover:border-slate-900 shadow-sm"
                          title="View document"
                        >
                          <Loader2 size={14} className="hidden" /> {/* Loader reference just in case */}
                          <FileText size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {clientData?.documents && clientData.documents.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Supplementary Data</p>
                      {clientData.documents
                        .filter(d => d.document_type !== "NDIS_PLAN")
                        .map((doc, i) => (
                           <AttachmentItem key={i} attachment={doc} />
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all font-black"
          >
            Dismiss
          </button>
          <Link
            to={`/edit-client/${clientData?.id}`}
            className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            Modify Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientProfileModal;
