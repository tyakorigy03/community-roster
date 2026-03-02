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
  X
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

const getStatusConfig = (status) => {
  const configs = {
    draft: { 
      color: 'bg-gray-100 text-gray-800', 
      icon: FileText, 
      label: 'Draft',
      description: 'This note is in draft mode and not yet submitted'
    },
    submitted: { 
      color: 'bg-blue-100 text-blue-800', 
      icon: ClockIcon, 
      label: 'Submitted',
      description: 'This note has been submitted for review'
    },
    approved: { 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle, 
      label: 'Approved',
      description: 'This note has been approved'
    },
    rejected: { 
      color: 'bg-red-100 text-red-800', 
      icon: XCircle, 
      label: 'Rejected',
      description: 'This note has been rejected'
    },
    review: { 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: AlertCircle, 
      label: 'Under Review',
      description: 'This note is currently under review'
    }
  };
  
  return configs[status] || configs.draft;
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
      className="flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{getFileIcon(attachment.file_type)}</div>
        <div>
          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {attachment.file_name}
          </div>
          <div className="text-xs text-gray-500">
            {formatFileSize(attachment.file_size)} • {attachment.file_type?.split('/')[1] || 'File'}
          </div>
        </div>
      </div>
      <Download size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
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
        // UPDATE
        await supabase
          .from("government_report_emails")
          .update({
            department_name: form.department_name,
            email_address: form.email_address,
          })
          .eq("id", form.id);
      } else {
        // CREATE
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
          createdBy:{
            name: staff.name,
            email: staff.email,
            role:  staff.role
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white shadow-sm">
                <Mail className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Send Progress Note Report
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Client: {client?.first_name} {client?.last_name} • {formatDate(noteData?.event_date)}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 transition-colors"
              disabled={sendingEmail}
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Email List Section */}
        <div className="p-6">
          {emails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No email addresses added yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Add government emails below to send reports
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-700">
                  Government Departments ({emails.length})
                </h4>
                <button
                  onClick={() => {
                    setForm({ department_name: '', email_address: '' });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>
              
              <div className="space-y-3">
                {emails.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-white border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50">
                          <Building className="text-blue-500" size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.department_name}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Mail size={12} />
                            {item.email_address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={sendingEmail}
                          onClick={() => sendProgressNoteEmail(item.email_address)}
                          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all ${
                            sendingEmail
                              ? 'bg-blue-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {sendingEmail ? (
                            <>
                              <Loader2 className="animate-spin" size={14} />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send size={14} />
                              Send
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setEditEmail(item)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => deleteGovernmentEmail(item.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Email Form */}
        <div className="border-t bg-gray-50/50 p-6">
          <div className="bg-white border p-5 shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {form.id ? (
                <>
                  <Edit2 size={18} />
                  Edit Email Address
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Add New Email Address
                </>
              )}
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., NDIS Commission, Health Department"
                  value={form.department_name}
                  onChange={(e) =>
                    setForm({ ...form, department_name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder="department@government.gov"
                  value={form.email_address}
                  onChange={(e) =>
                    setForm({ ...form, email_address: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveGovernmentEmail}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                >
                  {form.id ? "Update Email" : "Add to List"}
                </button>
                
                {form.id && (
                  <button
                    onClick={() => setForm({ department_name: '', email_address: '' })}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-white">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {emails.length > 0 && (
              <button
                onClick={() => {
                  // Optional: Add send to all functionality
                  const allEmails = emails.map(e => e.email_address);
                  // sendToAllEmails(allEmails);
                  toast.info('Send to all functionality coming soon');
                }}
                className="px-5 py-2.5 bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Send size={16} />
                Send to All
              </button>
            )}
          </div>
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

  // Fetch note data
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
    generateProgressNotePDF(note, attachments);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading progress note...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white shadow-lg">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mt-4">Progress Note Not Found</h2>
          <p className="text-gray-600 mt-2">
            The requested progress note could not be found.
          </p>
          <button
            onClick={()=>navigate(-1)}
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Back to Progress Notes
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(note.status || 'draft');
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between py-3 sm:py-6 gap-3 sm:gap-4">
            {/* Left section */}
            <div className="flex sm:items-center gap-2 sm:gap-4">
              <button
                onClick={()=>navigate(-1)}
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm sm:text-base"
              >
                <ArrowLeft size={18} className="mr-1" />
                Back
              </button>

              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  Progress Note
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {formatDate(note.event_date)} • {note.client?.first_name} {note.client?.last_name}
                </p>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3 relative">
              {/* Mobile menu icon */}
              <button
                className="sm:hidden p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Menu size={20} className="text-gray-600" />
              </button>

              {/* Desktop buttons */}
              <div className="hidden sm:flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="p-2 hover:bg-gray-100 transition-colors"
                  title="Send Email"
                >
                  <Mail size={18} className="text-gray-600" />
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className={`p-2 hover:bg-gray-100 transition-colors ${exportingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Export PDF"
                >
                  {exportingPDF ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <FileDown size={18} className="text-gray-600" />
                  )}
                </button>

                <Link
                  to={`/edit-progressnote/${id}`}
                  className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Edit size={16} />
                  Edit
                </Link>
              </div>

              {/* Mobile dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 shadow-lg flex flex-col z-20 sm:hidden">
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                  >
                    <Mail size={16} /> Email Report
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exportingPDF}
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 ${exportingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {exportingPDF ? 'Generating...' : <><FileDown size={16} /> Export PDF</>}
                  </button>
                  <Link
                    to={`/progress-notes/edit/${id}`}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit size={16} /> Edit
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 p-6">
              {/* Header */}
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {note.subject || `Progress Note - ${formatDate(note.event_date)}`}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium ${statusConfig.color}`}>
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        ID: {id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    Created: {formatDateTime(note.created_at)}
                    {note.updated_at && (
                      <div className="mt-1">
                        Last updated: {formatDateTime(note.updated_at)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-600">
                    <User size={16} className="mr-2 text-gray-400" />
                    <span className="font-medium">{note.client?.first_name} {note.client?.last_name}</span>
                    {note.client?.ndis_number && (
                      <span className="ml-2 text-sm bg-gray-100 text-gray-600 px-2 py-1">
                        NDIS: {note.client.ndis_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar size={16} className="mr-2 text-gray-400" />
                    <span>{formatDate(note.event_date)}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FileText size={16} className="mr-2 text-gray-400" />
                    <span>{note.hierarchy?.name || 'No hierarchy'}</span>
                    {note.hierarchy?.code && (
                      <span className="ml-2 text-sm text-gray-500">({note.hierarchy.code})</span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users size={16} className="mr-2 text-gray-400" />
                    <span>Staff: {note.staff?.name || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Shift Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClockIcon size={18} />
                  Shift Details
                </h3>
                <div className="bg-blue-50 border border-blue-100 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-blue-600 font-medium mb-1">Shift Date</div>
                      <div className="flex items-center text-gray-700">
                        <Calendar size={14} className="mr-2" />
                        {formatDate(note.shift_date)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 font-medium mb-1">Shift Times</div>
                      <div className="flex items-center text-gray-700">
                        <Clock size={14} className="mr-2" />
                        {formatTime(note.shift_start_time)} - {formatTime(note.shift_end_time)}
                        {note.break_minutes > 0 && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({note.break_minutes}m break)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 font-medium mb-1">Shift Type</div>
                      <div className="text-gray-700">
                        {note.shift_type?.name || 'General'}
                      </div>
                    </div>
                  </div>
                  
                  {note.other_shift_type_specification && (
                    <div className="mt-4 pt-4 border-t border-blue-100">
                      <div className="text-sm text-blue-600 font-medium mb-1">Additional Specification</div>
                      <p className="text-gray-700">{note.other_shift_type_specification}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Notes Content */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Progress Notes</h3>
                <div className="bg-gray-50 border border-gray-200 p-6">
                  <div className="prose max-w-none">
                    {note.shift_notes?.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 text-gray-700">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key Areas of Support */}
              {note.key_areas && note.key_areas.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Areas of Support</h3>
                  <div className="flex flex-wrap gap-2">
                    {note.key_areas.map((area, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Paperclip size={18} />
                    Attachments ({attachments.length})
                  </h3>
                  <div className="space-y-3">
                    {attachments.map(attachment => (
                      <AttachmentItem key={attachment.id} attachment={attachment} />
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-sm text-gray-500">
                    <div>Created by: <span className="font-medium">{note.staff?.name || 'Unknown'}</span></div>
                    {note.staff?.email && (
                      <div>Email: <span className="font-medium">{note.staff.email}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Status Information</h3>
              <div className={`inline-flex items-center gap-2 px-3 py-2 w-full ${statusConfig.color} mb-3`}>
                <StatusIcon size={16} />
                <span className="font-medium">{statusConfig.label}</span>
              </div>
              <p className="text-sm text-gray-600">
                {statusConfig.description}
              </p>
            </div>

            {/* Client Information */}
            <div className="bg-white border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Client Information</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <User size={14} className="mr-2 text-gray-400" />
                  <span className="font-medium">{note.client?.first_name} {note.client?.last_name}</span>
                </div>
                {note.client?.ndis_number && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">NDIS:</span> {note.client.ndis_number}
                  </div>
                )}
                {note.client?.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin size={14} className="mr-2 text-gray-400 mt-0.5" />
                    <span>{note.client.address}</span>
                  </div>
                )}
                {note.client?.phone && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {note.client.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Shift Information */}
            {note.shift && (
              <div className="bg-white border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Linked Shift</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={14} className="mr-2 text-gray-400" />
                    <span>{formatDate(note.shift.shift_date)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock size={14} className="mr-2 text-gray-400" />
                    <span>{formatTime(note.shift.start_time)} - {formatTime(note.shift.end_time)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Status:</span> {note.shift.status}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to={`/progress-notes/edit/${id}`}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Edit size={16} />
                  Edit Note
                </Link>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <Trash2 size={16} />
                  Delete Note
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className={`flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors w-full ${exportingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {exportingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FileDown size={16} />
                      <span>Export as PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 transition-colors w-full"
                >
                  <Mail size={16} />
                  Email Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Delete Progress Note</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this progress note? This action cannot be undone.
              </p>
              
              <div className="space-y-2 mb-6 p-3 bg-red-50 border border-red-100">
                <div className="text-sm text-red-700 font-medium">This will delete:</div>
                <ul className="text-sm text-red-600 space-y-1">
                  <li>• The progress note content</li>
                  <li>• All attached files ({attachments.length})</li>
                  <li>• All comments</li>
                  <li>• Link to shift (if any)</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete Permanently
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