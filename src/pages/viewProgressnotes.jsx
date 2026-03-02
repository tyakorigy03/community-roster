import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Users,
  Clock as ClockIcon,
  Printer,
  Share2,
  MessageSquare,
  Paperclip,
  Menu,
  ExternalLink,
  FileDown,
  Mail,
  Plus,
  Building,
  Edit2,
  Send,
  Loader2,
  X,
  ChevronRight
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { generateProgressNotePDF } from '../utils/progressNotePdf';

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateTime = (dateString, timeString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  if (timeString) {
    const [hours, minutes] = timeString.split(':');
    date.setHours(parseInt(hours), parseInt(minutes));
  }

  return date.toLocaleDateString('en-AU', options);
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getStatusConfig = (note) => {
  if (note.is_draft) {
    return {
      color: 'bg-slate-100 text-slate-700',
      icon: FileText,
      label: 'Draft',
      description: 'Note in draft mode'
    };
  }
  if (note.is_submitted) {
    return {
      color: 'bg-blue-100 text-blue-700',
      icon: Clock,
      label: 'Submitted',
      description: 'Submitted for review'
    };
  }
  return {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    label: 'Published',
    description: 'Verified and published record'
  };
};

// Attachment Component
function AttachmentItem({ attachment }) {
  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('pdf')) return '📄';
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
      className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{getFileIcon(attachment.file_type)}</div>
        <div>
          <div className="text-[11px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
            {attachment.file_name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {formatFileSize(attachment.file_size)} • {attachment.file_type?.split('/')[1] || 'File'}
          </div>
        </div>
      </div>
      <Download size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
    </a>
  );
}

// Email Modal Component
function EmailModal({
  isOpen,
  onClose,
  noteData,
  attachments = [],
  client,
  staff,
  hierarchy,
  shift
}) {
  const [emails, setEmails] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [form, setForm] = useState({
    id: null,
    department_name: "",
    email_address: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchGovernmentEmails();
    }
  }, [isOpen]);

  const fetchGovernmentEmails = async () => {
    try {
      const { data, error } = await supabase
        .from("government_report_emails")
        .select("*")
        .eq("report_type", "progress_note")
        .order("department_name");

      if (!error) setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to load email addresses');
    }
  };

  const saveGovernmentEmail = async () => {
    if (!form.department_name || !form.email_address) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (form.id) {
        await supabase
          .from("government_report_emails")
          .update({
            department_name: form.department_name,
            email_address: form.email_address,
          })
          .eq("id", form.id);
      } else {
        await supabase
          .from("government_report_emails")
          .insert({
            department_name: form.department_name,
            email_address: form.email_address,
            report_type: "progress_note",
          });
      }

      toast.success('Email saved successfully');
      setForm({ id: null, department_name: "", email_address: "" });
      fetchGovernmentEmails();
    } catch (error) {
      console.error('Error saving email:', error);
      toast.error('Failed to save email');
    }
  };

  const setEditEmail = (item) => {
    setForm({
      id: item.id,
      department_name: item.department_name,
      email_address: item.email_address,
    });
  };

  const deleteGovernmentEmail = async (id) => {
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
      await supabase
        .from("government_report_emails")
        .delete()
        .eq("id", id);

      toast.success('Email deleted successfully');
      fetchGovernmentEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    }
  };

  const sendProgressNoteEmail = async (emailAddress) => {
    setSendingEmail(true);
    try {
      const response = await fetch("https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/dynamic-responder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailAddress,
          note: noteData,
          attachments,
          client,
          staff,
          hierarchy,
          shift,
          reportType: "Progress Note Report",
          createdBy: {
            name: staff.name,
            email: staff.email,
            role: staff.role
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Progress note sent to ${emailAddress}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending progress note email:', error);
      toast.error(`Failed to send to ${emailAddress}`);
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <Mail className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Transmit Report
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Entity: {client?.first_name} {client?.last_name} • Ref: {noteData?.id?.substring(0, 8)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 transition-all"
            disabled={sendingEmail}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* Email List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                Authorized Recipients ({emails.length})
              </h4>
            </div>

            {emails.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-50 rounded-2xl mb-4">
                  <Mail className="text-slate-300" size={20} />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No Recipients</p>
                <p className="text-[9px] text-slate-300 mt-1 uppercase font-bold">Add government departments below</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {emails.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-100 rounded-2xl p-4 transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 group relative"
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditEmail(item)}
                        className="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => deleteGovernmentEmail(item.id)}
                        className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex flex-col h-full justify-between gap-3 pr-12">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building size={12} className="text-blue-500" />
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                            {item.department_name}
                          </p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold truncate">{item.email_address}</p>
                      </div>

                      <button
                        disabled={sendingEmail}
                        onClick={() => sendProgressNoteEmail(item.email_address)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-[0.98]"
                      >
                        {sendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        {sendingEmail ? 'Sending' : 'Deploy Report'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registration Form */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-blue-600 font-black mb-4 flex items-center gap-2">
              {form.id ? <Edit2 size={12} /> : <Plus size={12} />}
              {form.id ? 'Modify Registry' : 'Register New Entity'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black">Department Name</label>
                <input
                  type="text"
                  placeholder="E.g. NDIS Commission"
                  value={form.department_name}
                  onChange={(e) => setForm({ ...form, department_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] text-slate-900 placeholder:text-slate-300 font-black uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black">Official Email</label>
                <input
                  type="email"
                  placeholder="ops@gov.au"
                  value={form.email_address}
                  onChange={(e) => setForm({ ...form, email_address: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] text-slate-900 placeholder:text-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveGovernmentEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
              >
                {form.id ? 'Update' : 'Register'}
              </button>

              {form.id && (
                <button
                  onClick={() => setForm({ id: null, department_name: '', email_address: '' })}
                  className="px-6 py-3 border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
          >
            Close
          </button>

          {emails.length > 0 && (
            <button
              onClick={() => toast.info('Batch transmission available in future update')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
            >
              <Send size={12} />
              Send All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Progress Note Detail Component
export default function ProgressNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNoteData();
    }
  }, [id]);

  const fetchNoteData = async () => {
    try {
      setLoading(true);

      const { data: noteData, error: noteError } = await supabase
        .from('progress_notes')
        .select(`
          *,
          client:client_id(first_name, last_name, ndis_number, address:address_line, phone:phone_number),
          staff:created_by(name, email, role),
          hierarchy:hierarchy_id(name, code, description),
          shift_type:shift_type_id(name, description),
          shift:shift_id(shift_date, start_time, end_time, status)
        `)
        .eq('id', id)
        .single();

      if (noteError) throw noteError;

      if (!noteData) {
        toast.error('Progress note not found');
        navigate('/progress-notes');
        return;
      }

      setNote(noteData);

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('progress_note_attachments')
        .select('*')
        .eq('progress_note_id', id)
        .order('uploaded_at', { ascending: false });

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

    } catch (error) {
      console.error('Error fetching progress note:', error);
      toast.error('Failed to load progress note');
      navigate('/progress-notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supabase
        .from('progress_note_attachments')
        .delete()
        .eq('progress_note_id', id);

      await supabase
        .from('progress_note_comments')
        .delete()
        .eq('progress_note_id', id);

      const { error } = await supabase
        .from('progress_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (note?.shift_id) {
        await supabase
          .from('shifts')
          .update({ progress_note_id: null })
          .eq('id', note.shift_id);
      }

      toast.success('Progress note deleted successfully');
      navigate('/progress-notes');

    } catch (error) {
      console.error('Error deleting progress note:', error);
      toast.error('Failed to delete progress note');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await generateProgressNotePDF(note, attachments);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleUpdateStatus = async (type) => {
    try {
      let updateData = {};
      if (type === 'approve') {
        updateData = { is_submitted: false, is_draft: false }; // Published state
      } else if (type === 'reject') {
        updateData = { is_submitted: false, is_draft: true }; // Revert to draft
      }

      const { error } = await supabase
        .from('progress_notes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success(`Note ${type === 'approve' ? 'approved' : 'returned to draft'}`);
      // Refresh data
      fetchNoteData();
    } catch (error) {
      console.error(`Error updating status:`, error);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">LOADING PROGRESS NOTE...</div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white border border-slate-100 rounded-[2rem] p-10 shadow-xl">
          <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Note Not Found</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            The requested progress note could not be located
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            Return to Notes
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(note);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50 animate-in fade-in duration-500">
      {/* Compact Header */}
      <div className="flex gap-3 flex-row justify-between items-center p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-100/50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0">
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">Progress Note</h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              {note.client?.first_name} {note.client?.last_name} • {formatDate(note.event_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEmailModal(true)}
            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-green-600 rounded-xl transition-all hidden sm:flex"
            title="Email Report"
          >
            <Mail size={14} />
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className={`p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-xl transition-all hidden sm:flex ${exportingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Export PDF"
          >
            {exportingPDF ? (
              <div className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FileDown size={14} />
            )}
          </button>

          <Link
            to={`/edit-progressnote/${id}`}
            className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Edit size={13} /> <span className="hidden sm:inline">Edit</span>
          </Link>

          {/* Admin Approval Actions */}
          {note.is_draft && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <button
                onClick={() => handleUpdateStatus('reject')}
                className="p-2 bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all"
                title="Reject Note"
              >
                <XCircle size={14} />
              </button>
              <button
                onClick={() => handleUpdateStatus('approve')}
                className="px-3 py-2 bg-green-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <CheckCircle size={13} /> <span className="hidden sm:inline">Approve</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 bg-white border border-slate-200 text-slate-400 rounded-xl transition-all"
          >
            <Menu size={14} />
          </button>

          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <div className="absolute right-4 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl flex flex-col z-50 sm:hidden overflow-hidden">
              <button
                onClick={() => { setShowEmailModal(true); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-tight border-b border-slate-50"
              >
                <Mail size={14} /> Email Report
              </button>
              <button
                onClick={() => { handleExportPDF(); setMenuOpen(false); }}
                disabled={exportingPDF}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-tight ${exportingPDF ? 'opacity-50' : ''}`}
              >
                {exportingPDF ? 'Exporting...' : <><FileDown size={14} /> Export PDF</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Status & Overview Card */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-lg lg:text-xl font-black text-slate-900 uppercase tracking-tight mb-3 leading-tight">
                    {note.subject || `Progress Note - ${formatDate(note.event_date)}`}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusConfig.color}`}>
                      <StatusIcon size={10} />
                      {statusConfig.label}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      ID: {id.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-right">
                  <div>Created: {formatDateTime(note.created_at)}</div>
                  {note.updated_at && (
                    <div className="mt-1">Updated: {formatDateTime(note.updated_at)}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <User size={14} className="text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Client</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate mt-1">{note.client?.first_name} {note.client?.last_name}</p>
                    {note.client?.ndis_number && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">NDIS: {note.client.ndis_number}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Calendar size={14} className="text-blue-600" />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Event Date</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase mt-1">{formatDate(note.event_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <FileText size={14} className="text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Hierarchy</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate mt-1">{note.hierarchy?.name || 'None'}</p>
                    {note.hierarchy?.code && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Code: {note.hierarchy.code}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Users size={14} className="text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Staff</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate mt-1">{note.staff?.name || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shift Details */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ClockIcon size={14} />
                Shift Details
              </h3>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1.5">Shift Date</div>
                    <div className="flex items-center text-slate-900 text-[11px] font-bold uppercase">
                      <Calendar size={12} className="mr-2" />
                      {formatDate(note.shift_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1.5">Shift Times</div>
                    <div className="flex items-center text-slate-900 text-[11px] font-bold uppercase">
                      <Clock size={12} className="mr-2" />
                      {formatTime(note.shift_start_time)} - {formatTime(note.shift_end_time)}
                      {note.break_minutes > 0 && (
                        <span className="ml-2 text-[9px] text-slate-400">
                          ({note.break_minutes}m)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1.5">Shift Type</div>
                    <div className="text-slate-900 text-[11px] font-bold uppercase">
                      {note.shift_type?.name || 'General'}
                    </div>
                  </div>
                </div>

                {note.other_shift_type_specification && (
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <div className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-1.5">Additional Details</div>
                    <p className="text-[11px] text-slate-700 font-bold">{note.other_shift_type_specification}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Notes Content */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Progress Notes</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <div className="prose max-w-none">
                  {note.shift_notes?.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 text-[11px] text-slate-700 leading-relaxed font-medium">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Areas */}
            {note.key_areas && note.key_areas.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Key Support Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {note.key_areas.map((area, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-tight"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Paperclip size={14} />
                  Attachments ({attachments.length})
                </h3>
                <div className="space-y-3">
                  {attachments.map(attachment => (
                    <AttachmentItem key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6">
            {/* Status Info */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Status Info</h3>
              <div className={`inline-flex items-center gap-2 px-3 py-2 w-full rounded-xl ${statusConfig.color} mb-3`}>
                <StatusIcon size={14} />
                <span className="text-[11px] font-black uppercase tracking-tight">{statusConfig.label}</span>
              </div>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide">
                {statusConfig.description}
              </p>
            </div>

            {/* Client Information */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Client Info</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <User size={14} className="text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate">{note.client?.first_name} {note.client?.last_name}</p>
                  </div>
                </div>
                {note.client?.ndis_number && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">NDIS Number</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase">{note.client.ndis_number}</p>
                  </div>
                )}
                {note.client?.address && (
                  <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <MapPin size={14} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                      <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{note.client.address}</p>
                    </div>
                  </div>
                )}
                {note.client?.phone && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-[11px] font-bold text-slate-900">{note.client.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to={`/edit-progressnote/${id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-all rounded-xl border border-transparent hover:border-blue-100 group"
                >
                  <div className="flex items-center gap-2">
                    <Edit size={14} />
                    <span className="text-[11px] font-black uppercase tracking-tight">Edit Note</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-red-600 hover:bg-red-50 transition-all rounded-xl border border-transparent hover:border-red-100 w-full group"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 size={14} />
                    <span className="text-[11px] font-black uppercase tracking-tight">Delete Note</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-200 group-hover:text-red-600 transition-colors" />
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className={`flex items-center justify-between gap-2 px-4 py-3 text-slate-600 hover:bg-slate-50 transition-all rounded-xl border border-transparent hover:border-slate-100 w-full group ${exportingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {exportingPDF ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[11px] font-black uppercase tracking-tight">Exporting...</span>
                      </>
                    ) : (
                      <>
                        <FileDown size={14} />
                        <span className="text-[11px] font-black uppercase tracking-tight">Export PDF</span>
                      </>
                    )}
                  </div>
                  {!exportingPDF && <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-600 transition-colors" />}
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-green-600 hover:bg-green-50 transition-all rounded-xl border border-transparent hover:border-green-100 w-full group"
                >
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    <span className="text-[11px] font-black uppercase tracking-tight">Email Report</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-200 group-hover:text-green-600 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Delete Progress Note?</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8 px-4">
                This will permanently remove the note and all associated data. This action cannot be undone.
              </p>

              <div className="space-y-2 mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <div className="text-[9px] text-red-700 font-black uppercase tracking-widest mb-2">This will delete:</div>
                <ul className="text-[10px] text-red-600 font-bold space-y-1 uppercase tracking-tight">
                  <li>• Progress note content</li>
                  <li>• All attachments ({attachments.length})</li>
                  <li>• All comments</li>
                  <li>• Shift linkage</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedClient(null);
                  }}
                  className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        noteData={note}
        attachments={attachments}
        client={note.client}
        staff={note.staff}
        hierarchy={note.hierarchy}
        shift={note.shift}
      />
    </div>
  );
}