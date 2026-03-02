import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Download,
  Edit,
  Trash2,
  MapPin,
  Users,
  Phone,
  FileText,
  AlertTriangle,
  Shield,
  Pill,
  Activity,
  Mail,
  Building,
  FileDown,
  Printer,
  Eye,
  Loader2,
  X,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Send,
  CheckCircle2,
  ShieldCheck,
  FileSearch,
  History,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { generateIncidentReportPDF } from '../utils/incidentReportPdf';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getSeverityBadge = (rating) => {
  const configs = {
    low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low Risk' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium Risk' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High Risk' },
    critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical Risk' }
  };
  return configs[rating] || configs.medium;
};

export default function ProfessionalIncidentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState(null);
  const [client, setClient] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [createdBy, setCreatedBy] = useState(null);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [emergencyAssistance, setEmergencyAssistance] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [governmentEmails, setGovernmentEmails] = useState([]);
  const [emailForm, setEmailForm] = useState({ id: null, department_name: '', email_address: '' });
  const [selectedEmails, setSelectedEmails] = useState([]);

  useEffect(() => {
    if (id) {
      fetchIncidentData();
    }
  }, [id]);

  useEffect(() => {
    fetchGovernmentEmails();
  }, []);

  const fetchIncidentData = async () => {
    try {
      setLoading(true);

      // Fetch incident details
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (incidentError) throw incidentError;

      if (!incidentData) {
        toast.error('Incident not found');
        navigate('/incidents');
        return;
      }

      setIncident(incidentData);

      // Fetch client details
      if (incidentData.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('first_name, last_name, ndis_number, date_of_birth, address_line, phone_number')
          .eq('id', incidentData.client_id)
          .single();
        setClient(clientData);
      }

      // Fetch hierarchy details
      if (incidentData.hierarchy_id) {
        const { data: hierarchyData } = await supabase
          .from('hierarchy')
          .select('name, code, description')
          .eq('id', incidentData.hierarchy_id)
          .single();
        setHierarchy(hierarchyData);
      }

      // Fetch created by user details
      if (incidentData.created_by) {
        const { data: userData } = await supabase
          .from('staff')
          .select('name, email, role')
          .eq('id', incidentData.created_by)
          .single();
        setCreatedBy(userData);
      }

      // Fetch incident types
      const { data: incidentTypesData } = await supabase
        .from('incident_type_relations')
        .select(`
          incident_type_id,
          incident_types (name, description)
        `)
        .eq('incident_id', id);

      setIncidentTypes(incidentTypesData?.map(item => item.incident_types) || []);

      // Fetch emergency assistance
      const { data: emergencyData } = await supabase
        .from('incident_emergency_assistance')
        .select(`
          assistance_type_id,
          details,
          emergency_assistance_types (name)
        `)
        .eq('incident_id', id);

      setEmergencyAssistance(emergencyData?.map(item => ({
        name: item.emergency_assistance_types?.name,
        details: item.details
      })) || []);

      // Fetch attachments
      const { data: attachmentsData } = await supabase
        .from('incident_attachments')
        .select('*')
        .eq('incident_id', id)
        .order('uploaded_at', { ascending: false });

      setAttachments(attachmentsData || []);

    } catch (error) {
      console.error('Error fetching incident data:', error);
      toast.error('Failed to load incident');
      navigate('/incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);

      // Delete related records first
      await supabase.from('incident_attachments').delete().eq('incident_id', id);
      await supabase.from('incident_type_relations').delete().eq('incident_id', id);
      await supabase.from('incident_emergency_assistance').delete().eq('incident_id', id);

      // Delete the incident
      const { error } = await supabase.from('incidents').delete().eq('id', id);

      if (error) throw error;

      toast.success('Incident deleted successfully');
      navigate('/incidents');

    } catch (error) {
      console.error('Error deleting incident:', error);
      toast.error('Failed to delete incident');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      await generateIncidentReportPDF({
        incident,
        client,
        hierarchy,
        createdBy,
        incidentTypes,
        emergencyAssistance,
        attachments
      });
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const fetchGovernmentEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('government_report_emails')
        .select('*')
        .eq('report_type', 'incident')
        .eq('is_active', true)
        .order('department_name');

      if (error) throw error;
      setGovernmentEmails(data || []);
    } catch (error) {
      console.error('Error fetching government emails:', error);
      toast.error('Failed to load government emails');
    }
  };

  const saveGovernmentEmail = async () => {
    if (!emailForm.department_name || !emailForm.email_address) {
      toast.error('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.email_address)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      if (emailForm.id) {
        // Update existing
        const { error } = await supabase
          .from('government_report_emails')
          .update({
            department_name: emailForm.department_name,
            email_address: emailForm.email_address,
          })
          .eq('id', emailForm.id);

        if (error) throw error;
        toast.success('Email updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('government_report_emails')
          .insert({
            department_name: emailForm.department_name,
            email_address: emailForm.email_address,
            report_type: 'incident',
            is_active: true,
          });

        if (error) throw error;
        toast.success('Email added successfully');
      }

      setEmailForm({ id: null, department_name: '', email_address: '' });
      fetchGovernmentEmails();
    } catch (error) {
      console.error('Error saving email:', error);
      toast.error('Failed to save email');
    }
  };

  const deleteGovernmentEmail = async (emailId) => {
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
      const { error } = await supabase
        .from('government_report_emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;
      toast.success('Email deleted successfully');
      fetchGovernmentEmails();

      // Remove from selected if it was selected
      setSelectedEmails(prev => prev.filter(id => id !== emailId));
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    }
  };

  const toggleEmailSelection = (emailId) => {
    setSelectedEmails(prev => {
      if (prev.includes(emailId)) {
        return prev.filter(id => id !== emailId);
      } else {
        return [...prev, emailId];
      }
    });
  };

  const sendIncidentReport = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    try {
      setSendingEmail(true);

      // Get selected email addresses
      const recipients = governmentEmails
        .filter(email => selectedEmails.includes(email.id))
        .map(email => email.email_address);

      // Prepare payload for the edge function
      const payload = {
        to: recipients,
        incident: {
          id: incident.id,
          incident_date: incident.incident_date,
          incident_time: incident.incident_time,
          location: incident.location,
          rating: incident.incident_rating,
          summary: incident.incident_summary,
          description: incident.incident_description,
          antecedent: incident.antecedent,
          deescalation: incident.deescalation_outcome,
          prn_approved: incident.prn_approved,
          prn_provided: incident.prn_provided,
          prn_notes: incident.prn_notes,
          physical_intervention: incident.physical_intervention,
          physical_intervention_type: incident.physical_intervention_type,
          physical_intervention_duration: incident.physical_intervention_duration,
          client_injured: incident.client_injured,
          staff_injured: incident.staff_injured,
          follow_up_required: incident.follow_up_required,
          management_contacted: incident.management_contacted,
          police_event_number: incident.police_event_number,
          witnesses: incident.witnesses,
          subject: incident.subject,
        },
        client: {
          first_name: client?.first_name || '',
          last_name: client?.last_name || '',
          ndis_number: client?.ndis_number || '',
          date_of_birth: client?.date_of_birth || '',
          address_line: client?.address_line || '',
          phone_number: client?.phone_number || '',
        },
        hierarchy: {
          code: hierarchy?.code || '',
          name: hierarchy?.name || '',
          description: hierarchy?.description || '',
        },
        createdBy: {
          name: createdBy?.name || 'Unknown',
          email: createdBy?.email || '',
          role: createdBy?.role || 'Staff',
        },
        incidentTypes: incidentTypes.map(type => ({
          name: type.name,
          description: type.description || '',
        })),
        emergencyAssistance: emergencyAssistance.map(assist => ({
          name: assist.name,
          details: assist.details || '',
        })),
        attachments: attachments.map(att => ({
          file_name: att.file_name,
          file_url: att.file_url,
          file_size: att.file_size,
        })),
      };

      const response = await fetch(
        'https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/report-incident',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(`Incident report sent to ${recipients.length} recipient(s)`);
        setShowEmailModal(false);
        setSelectedEmails([]);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending incident report:', error);
      toast.error('Failed to send incident report');
    } finally {
      setSendingEmail(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading incident report...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Incident Not Found</h2>
          <p className="text-gray-600 mb-6">The requested incident could not be found.</p>
          <button
            onClick={() => navigate('/incidents')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  const severity = getSeverityBadge(incident.incident_rating);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl shadow-slate-900/10">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/incidents')}
                className="h-9 px-3 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <ArrowLeft size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Return to Ledger</span>
              </button>
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Incident Token</span>
                <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight font-mono">{incident.id?.substring(0, 16)}...</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEmailModal(true)}
                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 border border-slate-700"
              >
                <Send size={14} />
                Dispatch Report
              </button>

              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {exportingPDF ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <FileDown size={14} />
                )}
                Initialize Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tactical Overview Header */}
        <div className="relative bg-white rounded-[2.5rem] p-1 shadow-2xl shadow-slate-200/50 border border-slate-100 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="relative flex flex-col md:flex-row gap-8 p-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">Incident Report</h1>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mt-2">Critical Event Protocol</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-10">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Temporal Occurrence</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                      <Calendar size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{formatDate(incident.incident_date)}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatTime(incident.incident_time)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Severity Classification</p>
                  <div className="flex items-center">
                    <div className={`px-4 h-9 flex items-center rounded-xl ${severity.bg} ${severity.text} text-[10px] font-black uppercase tracking-widest border border-white/20 shadow-sm`}>
                      {severity.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-px bg-slate-100 hidden md:block"></div>

            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 leading-none">Reporting Entity</p>
              <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                  <Building size={24} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Blessing Community</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Support Services Matrix</p>
                  <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-100 self-start">
                    <CheckCircle2 size={8} /> Verified Authorized Body
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Report Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">

          {/* Introduction */}
          <div className="pb-6 border-b border-gray-200">
            <p className="text-gray-700">
              Please find below a formal incident report submitted via the Blessing Community Incident Management System.
            </p>
          </div>

          {/* Client Details Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <User size={16} />
              </div>
              <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Client Identity Profile</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Legal Designation</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{client?.first_name} {client?.last_name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">NDIS Registry Token</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight font-mono">{client?.ndis_number || 'UNAVAILABLE'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Temporal Origin</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{client?.date_of_birth ? formatDate(client.date_of_birth) : 'NOT RECORDED'}</span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Geographic Coordinates</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{client?.address_line || 'NO BASE DEFINED'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Tactical Interconnect</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{client?.phone_number || 'UNLINKED'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Details Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <FileSearch size={16} />
              </div>
              <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Operational Findings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Report Token</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight font-mono">{incident.id?.substring(0, 16)}...</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Temporal Stamp</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{formatDate(incident.incident_date)} @ {incident.incident_time ? formatTime(incident.incident_time) : 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Operational Zone</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{incident.location || 'STATION UNKNOWN'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Organizational Node</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{hierarchy?.name || 'ROOT'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Witness Log</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{incident.witnesses || 'NO EXTERNAL WITNESSES'}</span>
                </div>
              </div>

              {incident.police_event_number && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-rose-600">LEO Case Reference</label>
                  <div className="h-11 px-4 bg-white border border-rose-100 rounded-2xl flex items-center shadow-sm">
                    <span className="text-[11px] font-black text-rose-700 uppercase tracking-tight font-mono">{incident.police_event_number}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Incident Types */}
          {incidentTypes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Protocol Classification</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incidentTypes.map((type, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:border-blue-200 transition-all group">
                    <div className="h-8 w-8 bg-white text-rose-500 rounded-xl flex items-center justify-center shadow-sm border border-rose-50 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{type.name}</div>
                      {type.description && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{type.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narrative Sections */}
          <div className="space-y-8 pt-4">
            {incident.incident_summary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <History size={12} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Abstract / Synopsis</h3>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 text-[12px] font-bold text-slate-700 leading-relaxed whitespace-pre-line shadow-inner">
                  {incident.incident_summary}
                </div>
              </div>
            )}

            {incident.antecedent && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Info size={12} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Antecedent Matrix</h3>
                </div>
                <div className="bg-amber-50/30 border border-amber-100/50 rounded-[2rem] p-6 text-[12px] font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                  {incident.antecedent}
                </div>
              </div>
            )}

            {incident.incident_description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                    <FileSearch size={12} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tactical Description</h3>
                </div>
                <div className="bg-rose-50/30 border border-rose-100/50 rounded-[2rem] p-6 text-[12px] font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                  {incident.incident_description}
                </div>
              </div>
            )}

            {incident.deescalation_outcome && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={12} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Neutralization & Resolution</h3>
                </div>
                <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-[2rem] p-6 text-[12px] font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                  {incident.deescalation_outcome}
                </div>
              </div>
            )}
          </div>

          {/* PRN Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Plus size={16} />
              </div>
              <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Chemical Intervention (PRN)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">PRN Authorization</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight capitalize">{incident.prn_approved || 'NONE'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Deployment Status</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight capitalize">{incident.prn_provided || 'NONE'}</span>
                </div>
              </div>

              {incident.prn_notes && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Deployment Log</label>
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-[11px] font-bold text-slate-700 leading-relaxed">
                    {incident.prn_notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Physical Intervention */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Restrictive Practice / Intervention</h2>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] border ${incident.physical_intervention === 'yes' ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Mechanical / Physical Hold</label>
                <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                  <span className={`text-[11px] font-black uppercase tracking-tight ${incident.physical_intervention === 'yes' ? 'text-rose-600' : 'text-slate-900'}`}>{incident.physical_intervention || 'NO DATA'}</span>
                </div>
              </div>

              {incident.physical_intervention === 'yes' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Restraint Classification</label>
                    <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight capitalize">{incident.physical_intervention_type}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Tactical Duration</label>
                    <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{incident.physical_intervention_duration}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Casualty Status (Subject)</label>
                    <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                      <span className={`text-[11px] font-black uppercase tracking-tight ${incident.client_injured === 'yes' ? 'text-rose-600' : 'text-emerald-600'}`}>{incident.client_injured === 'yes' ? 'INJURY DETECTED' : 'CLEAR'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Casualty Status (Staff)</label>
                    <div className="h-11 px-4 bg-white border border-slate-100 rounded-2xl flex items-center shadow-sm">
                      <span className={`text-[11px] font-black uppercase tracking-tight ${incident.staff_injured === 'yes' ? 'text-rose-600' : 'text-emerald-600'}`}>{incident.staff_injured === 'yes' ? 'INJURY DETECTED' : 'CLEAR'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Emergency Assistance */}
          {emergencyAssistance.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Phone size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Emergency Interconnect Log</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyAssistance.map((assist, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-[1.5rem] group">
                    <div className="h-10 w-10 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-sm border border-blue-50 group-hover:scale-110 transition-transform">
                      <Phone size={18} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{assist.name}</div>
                      {assist.details && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{assist.details}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supporting Evidence */}
          {attachments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <FileSearch size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Digital Evidence Vault</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:border-blue-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white text-slate-400 rounded-xl flex items-center justify-center shadow-sm border border-slate-50 group-hover:text-blue-600 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 truncate max-w-[150px]">
                          {attachment.file_name}
                        </div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">
                          {(attachment.file_size / 1024).toFixed(0)} KB • Binary Data
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                      <Download size={14} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Statement */}
          <div className="pt-8 border-t border-slate-100 space-y-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] text-center italic">
              Formal declaration of compliance with Organizational and NDIS regulatory frameworks.
            </p>
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-white/5 to-transparent"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
                    <ShieldCheck size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated Personnel</p>
                    <p className="text-[12px] font-black text-white uppercase tracking-tight">{createdBy?.name || 'IDENTITY UNKNOWN'}</p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">{createdBy?.role || 'SYSTEM OPERATOR'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
                    <Building size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authorized Agency</p>
                    <p className="text-[12px] font-black text-white uppercase tracking-tight">Blessing Community</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Support Services Infrastructure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 bg-gray-100 rounded-lg px-8 py-4 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} Blessing Community Support Services. All rights reserved.
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex justify-center gap-6">
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex-1 max-w-[200px] h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Send size={14} />
            Dispatch
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 max-w-[200px] h-12 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            Purge Report
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="p-10 text-center">
              <div className="h-20 w-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Purge Request</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                Confirming the permanent thermal deletion of this incident report from the centralized ledger. This action is terminal.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-12 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Initialize Deletion
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="h-12 bg-white text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                >
                  Abort Protocol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl rounded-[3rem] border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-8 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 h-full w-64 bg-gradient-to-l from-white/5 to-transparent"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Send size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Dispatch Core</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incident Transmission Protocol</p>
                </div>
              </div>

              <button
                onClick={() => setShowEmailModal(false)}
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/10 relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto space-y-6">

              {/* Recipient Table */}
              <div className="flex-1 min-h-0 flex flex-col pt-2">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                      <Users size={12} />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      Authorized Recipients
                    </h3>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    {selectedEmails.length} / {governmentEmails.length} Active
                  </span>
                </div>

                {governmentEmails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
                    <Mail size={32} className="opacity-20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Recipients Database Empty</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm flex-1 min-h-0 flex flex-col">
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                          <tr>
                            <th className="px-6 py-4 w-12 text-left">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500"
                                checked={selectedEmails.length === governmentEmails.length && governmentEmails.length > 0}
                                onChange={() =>
                                  setSelectedEmails(
                                    selectedEmails.length === governmentEmails.length
                                      ? []
                                      : governmentEmails.map(e => e.id)
                                  )
                                }
                              />
                            </th>
                            <th className="px-6 py-4 text-left">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                            </th>
                            <th className="px-6 py-4 text-left">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transmission Node</span>
                            </th>
                            <th className="px-6 py-4 text-right">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operations</span>
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                          {governmentEmails.map(email => (
                            <tr
                              key={email.id}
                              className={`group hover:bg-slate-50 transition-colors ${selectedEmails.includes(email.id) ? 'bg-blue-50/30' : ''
                                }`}
                            >
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500 transition-all"
                                  checked={selectedEmails.includes(email.id)}
                                  onChange={() => toggleEmailSelection(email.id)}
                                />
                              </td>

                              <td className="px-6 py-4">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{email.department_name}</span>
                              </td>

                              <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{email.email_address}</span>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      setEmailForm({
                                        id: email.id,
                                        department_name: email.department_name,
                                        email_address: email.email_address,
                                      })
                                    }
                                    className="h-8 w-8 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center border border-slate-100 transition-all"
                                  >
                                    <Edit size={12} />
                                  </button>

                                  <button
                                    onClick={() => deleteGovernmentEmail(email.id)}
                                    className="h-8 w-8 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center border border-slate-100 transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Add / Edit Form */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                    <Plus size={12} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                    {emailForm.id ? 'Modify Node Definition' : 'Append New transmission Node'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Departmental Identity
                    </label>
                    <input
                      type="text"
                      value={emailForm.department_name}
                      placeholder="E.G. NDIS QUALITY CONTROL"
                      onChange={e =>
                        setEmailForm({ ...emailForm, department_name: e.target.value.toUpperCase() })
                      }
                      className="w-full h-11 px-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-sm placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Transmission Protocol (Email)
                    </label>
                    <input
                      type="email"
                      value={emailForm.email_address}
                      placeholder="CORE.OPS@AGENCY.GOV"
                      onChange={e =>
                        setEmailForm({ ...emailForm, email_address: e.target.value })
                      }
                      className="w-full h-11 px-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-sm placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveGovernmentEmail}
                    className="h-11 px-8 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2"
                  >
                    <Save size={14} />
                    {emailForm.id ? 'Update Node' : 'Register Node'}
                  </button>

                  {emailForm.id && (
                    <button
                      onClick={() =>
                        setEmailForm({ id: null, department_name: '', email_address: '' })
                      }
                      className="h-11 px-6 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-8 flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-blue-600">Queue Status</span>
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                  {selectedEmails.length} Targeted Transmission(s)
                </span>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="h-12 px-8 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:text-slate-600 transition-all"
                >
                  Abort Dispatch
                </button>

                <button
                  onClick={sendIncidentReport}
                  disabled={!selectedEmails.length || sendingEmail}
                  className="h-12 px-10 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2 disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {sendingEmail ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Send size={14} />
                  )}
                  Initialize Transmission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}