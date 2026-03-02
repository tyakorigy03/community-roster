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
  Send,
  Mail,
  Building,
  FileDown,
  Printer,
  Eye,
  Loader2,
  X,
  Plus
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto  py-4">
          <div className="flex items-center flex-col gap-3 md:flex-row justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/incidents')}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Incidents</span>
              </button>
              <div className="h-5 w-px bg-gray-300"></div>
              <span className="text-sm text-gray-500">Report ID: <span className="font-mono font-medium text-gray-900">{incident.id?.substring(0, 8)}...</span></span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowEmailModal(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Mail size={16} />
                Report this incident
              </button>
              <button 
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingPDF ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    Export PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Professional Header Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Blue Header Bar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">NDIS Incident Report</h1>
                <p className="text-blue-100">Blessing Community Support Services</p>
              </div>
              <div className={`px-4 py-2 rounded-lg ${severity.bg} ${severity.text} font-semibold border border-white/20`}>
                {severity.label}
              </div>
            </div>
          </div>

          {/* Report Info Bar */}
          <div className="bg-gray-50 px-8 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} />
                  <span>Incident Date: <span className="font-medium text-gray-900">{formatDate(incident.incident_date)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span>Time: <span className="font-medium text-gray-900">{formatTime(incident.incident_time)}</span></span>
                </div>
              </div>
              <div className="text-gray-500">
                Created: {formatDate(incident.created_at)}
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
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Client Details
            </h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700 w-1/3">Name</td>
                  <td className="py-3 px-4 text-gray-900">{client?.first_name} {client?.last_name}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">NDIS Number</td>
                  <td className="py-3 px-4 text-gray-900 font-mono">{client?.ndis_number || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Date of Birth</td>
                  <td className="py-3 px-4 text-gray-900">{client?.date_of_birth ? formatDate(client.date_of_birth) : 'N/A'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Address</td>
                  <td className="py-3 px-4 text-gray-900">{client?.address_line || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Contact Phone</td>
                  <td className="py-3 px-4 text-gray-900">{client?.phone_number || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Incident Details Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Incident Details
            </h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700 w-1/3">Incident ID</td>
                  <td className="py-3 px-4 text-gray-900 font-mono">{incident.id?.substring(0, 13)}...</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Date</td>
                  <td className="py-3 px-4 text-gray-900">{formatDate(incident.incident_date)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Time</td>
                  <td className="py-3 px-4 text-gray-900">{incident.incident_time ? formatTime(incident.incident_time) : 'N/A'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Location</td>
                  <td className="py-3 px-4 text-gray-900">{incident.location || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Hierarchy</td>
                  <td className="py-3 px-4 text-gray-900">
                    <span className="font-semibold">{hierarchy?.name || 'N/A'}</span>
                    {hierarchy?.code && <span className="text-gray-500 ml-2">({hierarchy.code})</span>}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Severity Rating</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${severity.bg} ${severity.text}`}>
                      {severity.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Witnesses</td>
                  <td className="py-3 px-4 text-gray-900">{incident.witnesses || 'No witnesses recorded'}</td>
                </tr>
                {incident.police_event_number && (
                  <tr>
                    <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Police Event Number</td>
                    <td className="py-3 px-4 text-gray-900 font-mono">{incident.police_event_number}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Incident Types */}
          {incidentTypes.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                Incident Classification
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incidentTypes.map((type, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="text-red-600 mt-0.5" size={18} />
                    <div>
                      <div className="font-semibold text-red-900">{type.name}</div>
                      {type.description && <div className="text-sm text-red-700">{type.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narrative Sections */}
          {incident.incident_summary && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                Incident Summary
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {incident.incident_summary}
                </p>
              </div>
            </div>
          )}

          {incident.antecedent && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                Antecedent (What was happening before)
              </h2>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {incident.antecedent}
                </p>
              </div>
            </div>
          )}

          {incident.incident_description && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                Detailed Incident Description
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {incident.incident_description}
                </p>
              </div>
            </div>
          )}

          {incident.deescalation_outcome && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                De-escalation Process & Outcome
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                  {incident.deescalation_outcome}
                </p>
              </div>
            </div>
          )}

          {/* PRN Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              PRN Medication
            </h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700 w-1/3">PRN Approved</td>
                  <td className="py-3 px-4 text-gray-900 capitalize">{incident.prn_approved || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">PRN Provided</td>
                  <td className="py-3 px-4 text-gray-900 capitalize">{incident.prn_provided || 'N/A'}</td>
                </tr>
                {incident.prn_notes && (
                  <tr>
                    <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Notes</td>
                    <td className="py-3 px-4 text-gray-900">{incident.prn_notes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Physical Intervention */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Physical Intervention – Restrictive Practice
            </h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700 w-1/3">Physical Hold Used</td>
                  <td className="py-3 px-4 text-gray-900 capitalize">{incident.physical_intervention || 'N/A'}</td>
                </tr>
                {incident.physical_intervention === 'yes' && (
                  <>
                    {incident.physical_intervention_type && (
                      <tr>
                        <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Type of Restraint</td>
                        <td className="py-3 px-4 text-gray-900 capitalize">{incident.physical_intervention_type}</td>
                      </tr>
                    )}
                    {incident.physical_intervention_duration && (
                      <tr>
                        <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Duration</td>
                        <td className="py-3 px-4 text-gray-900">{incident.physical_intervention_duration}</td>
                      </tr>
                    )}
                    {incident.client_injured && (
                      <tr>
                        <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Client Injured</td>
                        <td className="py-3 px-4 text-gray-900 capitalize">{incident.client_injured}</td>
                      </tr>
                    )}
                    {incident.staff_injured && (
                      <tr>
                        <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">Staff Injured</td>
                        <td className="py-3 px-4 text-gray-900 capitalize">{incident.staff_injured}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Emergency Assistance */}
          {emergencyAssistance.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                Emergency Assistance
              </h2>
              <div className="space-y-3">
                {emergencyAssistance.map((assist, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Phone className="text-blue-600" size={18} />
                    <div>
                      <div className="font-semibold text-blue-900">{assist.name}</div>
                      {assist.details && <div className="text-sm text-blue-700">{assist.details}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supporting Evidence */}
          {attachments.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
                Supporting Evidence
              </h2>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-500 group-hover:text-blue-600" size={20} />
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-blue-600">
                          {attachment.file_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(attachment.file_size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>
                    <Download className="text-gray-400 group-hover:text-blue-600" size={18} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Statement */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-gray-700 mb-4">
              This report has been completed in accordance with organisational and NDIS reporting requirements.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Completed By:</span>
                  <div className="text-gray-900 mt-1">{createdBy?.name || 'Unknown'}</div>
                  <div className="text-gray-600">{createdBy?.role || 'Staff'}</div>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Organisation:</span>
                  <div className="text-gray-900 mt-1">Blessing Community</div>
                  <div className="text-gray-600">Support Services</div>
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
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowEmailModal(true)} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
            <Send size={18} />
            Send Report
          </button>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete Report
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete Incident Report</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this incident report? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
{/* Email Modal */}
{showEmailModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
    <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-sm text-sm">

      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Send size={16} className="text-light" />
          <div>
            <h2 className="font-semibold  text-sm">
              Send Incident Report
            </h2>
            <p className="text-xs text-gray-50">
              Select departments to receive this report
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowEmailModal(false)}
          className="p-1 rounded hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto space-y-6">

        {/* Recipient Table */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-800 text-sm">
              Recipients
            </h3>
            <span className="text-xs text-gray-500">
              {selectedEmails.length} of {governmentEmails.length} selected
            </span>
          </div>

          {governmentEmails.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500 border border-gray-200 rounded">
              No government email addresses found
            </div>
          ) : (
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selectedEmails.length === governmentEmails.length}
                        onChange={() =>
                          setSelectedEmails(
                            selectedEmails.length === governmentEmails.length
                              ? []
                              : governmentEmails.map(e => e.id)
                          )
                        }
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Department
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Email
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {governmentEmails.map(email => (
                    <tr
                      key={email.id}
                      className={`border-b last:border-0 hover:bg-gray-50 ${
                        selectedEmails.includes(email.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(email.id)}
                          onChange={() => toggleEmailSelection(email.id)}
                        />
                      </td>

                      <td className="px-3 py-2 text-gray-800">
                        {email.department_name}
                      </td>

                      <td className="px-3 py-2 text-gray-600">
                        {email.email_address}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              setEmailForm({
                                id: email.id,
                                department_name: email.department_name,
                                email_address: email.email_address,
                              })
                            }
                            className="text-gray-500 hover:text-blue-600"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            onClick={() => deleteGovernmentEmail(email.id)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add / Edit Form */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="font-medium text-gray-800 text-sm mb-3">
            {emailForm.id ? 'Edit Department Email' : 'Add Department Email'}
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Department Name
              </label>
              <input
                type="text"
                value={emailForm.department_name}
                onChange={e =>
                  setEmailForm({ ...emailForm, department_name: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={emailForm.email_address}
                onChange={e =>
                  setEmailForm({ ...emailForm, email_address: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={saveGovernmentEmail}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {emailForm.id ? 'Update' : 'Add'}
            </button>

            {emailForm.id && (
              <button
                onClick={() =>
                  setEmailForm({ id: null, department_name: '', email_address: '' })
                }
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex justify-between items-center text-xs">
        <span className="text-gray-600">
          {selectedEmails.length} recipient(s) selected
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => setShowEmailModal(false)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={sendIncidentReport}
            disabled={!selectedEmails.length || sendingEmail}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
          >
            {sendingEmail ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
}