import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Save,
  Upload,
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Search,
  Lock,
  ChevronDown,
  Check,
  Circle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import axios from "axios";
import { useUser } from "../context/UserContext";

function AddIncident() {
  const { currentStaff: user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const shift_id = queryParams.get("shift_id") || null;

  const [shiftData, setShiftData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [staffId, setStaffId] = useState(null);

  // Form state - Updated with ALL fields
  const [incidentData, setIncidentData] = useState({
    // Client & Incident Details
    client_id: "",
    event_date: "",
    hierarchy_id: "",
    subject: "",

    // General Information
    incident_date: "",
    incident_time: "",
    location: "",
    witnesses: "",
    police_event_number: "",

    // Incident Narrative
    incident_summary: "",
    antecedent: "",
    incident_description: "",
    deescalation_outcome: "",

    // Incident Rating
    incident_rating: "",

    // PRN
    prn_approved: "",
    prn_provided: "",
    prn_notes: "",

    // Physical Intervention
    physical_intervention: "",
    physical_intervention_type: "",
    physical_intervention_duration: "",
    client_injured: "",
    staff_injured: "",

    // Follow Up
    follow_up_required: "",
    management_contacted: "",

    // Automatically set to current user - no need for UI field
    created_by: ""
  });

  // Multi-select states
  const [selectedIncidentTypes, setSelectedIncidentTypes] = useState([]);
  const [selectedEmergencyAssistance, setSelectedEmergencyAssistance] = useState([]);
  const [otherEmergencyDetails, setOtherEmergencyDetails] = useState("");

  // File attachments
  const [attachments, setAttachments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  // Data for dropdowns
  const [clients, setClients] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [emergencyTypes, setEmergencyTypes] = useState([]);

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    if (user) {
      setStaffId(user.id);

      // Check if user is admin
      const adminRole = user.role?.toLowerCase() === 'admin';
      setIsAdmin(adminRole);
      // If not admin, automatically set created_by to current staff
      if (!adminRole) {
        setIncidentData(prev => ({
          ...prev,
          created_by: user.id
        }));
      }
    }
  }, [user]);


  const fileInputRef = useRef(null);

  // Fetch shift data if shift_id is provided
  useEffect(() => {
    const fetchShiftData = async () => {
      if (!shift_id || !user?.tenant_id) return;
      
      // Avoid redundant fetching if already loaded
      if (shiftData?.id === shift_id) return;

      try {
        const { data: fetchedShift, error: shiftError } = await supabase
          .from('shifts')
          .select(`
            *,
            client:client_id(first_name, last_name, ndis_number),
            staff:staff_id(name),
            shift_type:shift_type_id(name, id)
          `)
          .eq('id', shift_id)
          .eq('tenant_id', user.tenant_id)
          .single();

        if (shiftError) throw shiftError;

        if (fetchedShift) {
          setShiftData(fetchedShift);
          setClientData({
            id: fetchedShift.client_id,
            first_name: fetchedShift.client?.first_name,
            last_name: fetchedShift.client?.last_name,
            ndis_number: fetchedShift.client?.ndis_number
          });

          // Auto-fill form with shift data
          setIncidentData(prev => ({
            ...prev,
            client_id: fetchedShift.client_id,
            incident_date: fetchedShift.shift_date,
            incident_time: fetchedShift.start_time?.substring(0, 5) || '',
            event_date: new Date().toISOString().split('T')[0],
            subject: `Incident during Shift on ${new Date(fetchedShift.shift_date).toLocaleDateString('en-AU')} - ${fetchedShift.client?.first_name} ${fetchedShift.client?.last_name}`,
            location: fetchedShift.location || ''
          }));

          toast.success('Shift data linked to incident report');
        }
      } catch (error) {
        console.error("Error fetching shift data:", error);
        toast.error("Failed to load linked shift data.");
      }
    };

    fetchShiftData();
  }, [shift_id, user?.tenant_id]);

  // Fetch initial data
  useEffect(() => {
    if (user?.tenant_id) {
      fetchInitialData();
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client =>
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ndis_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients.slice(0, 10));
    }
  }, [searchTerm, clients]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, ndis_number")
        .eq("tenant_id", user.tenant_id)
        .eq("is_active", true)
        .order("first_name", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
      setFilteredClients(clientsData?.slice(0, 10) || []);

      // Fetch hierarchies
      const { data: hierarchiesData, error: hierarchiesError } = await supabase
        .from("hierarchy")
        .select("id, name, code")
        .eq("tenant_id", user.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(hierarchiesData || []);

      // Fetch incident types
      const { data: typesData, error: typesError } = await supabase
        .from("incident_types")
        .select("*")
        .eq("tenant_id", user.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (typesError) throw typesError;
      setIncidentTypes(typesData || []);

      // Fetch emergency assistance types
      const { data: emergencyData, error: emergencyError } = await supabase
        .from("emergency_assistance_types")
        .select("*")
        .eq("tenant_id", user.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (emergencyError) throw emergencyError;
      setEmergencyTypes(emergencyData || []);
      if (user?.role?.toLowerCase() === 'admin') {
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("id, name, email, role")
          .eq("tenant_id", user.tenant_id)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (staffError) throw staffError;
        setStaffList(staffData || []);
      }

    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIncidentData(prev => ({ ...prev, [name]: value }));
  };

  const handleIncidentTypeToggle = (typeId) => {
    setSelectedIncidentTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const handleEmergencyAssistanceToggle = (typeId) => {
    setSelectedEmergencyAssistance(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const handleFileUpload = async (files) => {
    const newAttachments = [];

    for (const file of Array.from(files)) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      newAttachments.push({
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending'
      });

      setAttachments(prev => [...prev, {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending'
      }]);
    }

    // Upload files
    for (const attachment of newAttachments) {
      await uploadFile(attachment);
    }
  };

  const uploadFile = async (attachment) => {
    try {
      setUploadProgress(prev => ({ ...prev, [attachment.id]: 0 }));

      const formData = new FormData();
      formData.append("file", attachment.file);
      formData.append("upload_preset", "blessingcommunity");

      // Set resource type based on file type
      if (!attachment.file.type.startsWith("image/")) {
        formData.append("resource_type", "raw");
      }
      const isPdf = attachment.file.type.includes('pdf');

      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/dazbtduwj/upload",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({ ...prev, [attachment.id]: percentCompleted }));

            setAttachments(prev => prev.map(a =>
              a.id === attachment.id
                ? { ...a, progress: percentCompleted, status: percentCompleted === 100 ? 'completed' : 'uploading' }
                : a
            ));
          }
        }
      );

      setAttachments(prev => prev.map(a =>
        a.id === attachment.id
          ? {
            ...a,
            url: isPdf
              ? `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/swift-action?id=${res.data.public_id}&filename=${res.data.original_filename}`
              : res.data.secure_url,
            status: 'completed'
          }
          : a
      ));

    } catch (error) {
      console.error("Upload error:", error);
      setAttachments(prev => prev.map(a =>
        a.id === attachment.id
          ? { ...a, status: 'failed', error: error.message }
          : a
      ));
      toast.error(`Failed to upload ${attachment.name}`);
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  };

  const getSelectedClientName = () => {
    if (!incidentData.client_id) return "Select a client";
    const client = clients.find(c => c.id === incidentData.client_id);
    return client ? `${client.first_name} ${client.last_name}` : "Select a client";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      { field: incidentData.client_id, message: "Please select a client" },
      { field: incidentData.event_date, message: "Please select event date" },
      { field: incidentData.hierarchy_id, message: "Please select hierarchy" },
      { field: selectedIncidentTypes.length > 0, message: "Please select at least one incident type" },
      { field: incidentData.incident_date, message: "Please select incident date" },
      { field: incidentData.incident_rating, message: "Please select incident rating" },
      { field: incidentData.prn_approved, message: "Please select if PRN is approved" },
      { field: incidentData.prn_provided, message: "Please select if PRN was provided" },
      { field: incidentData.physical_intervention, message: "Please select if physical intervention occurred" },
      { field: incidentData.management_contacted, message: "Please select if management was contacted" },
      { field: incidentData.created_by, message: "Unable to identify user. Please refresh and try again." },
    ];

    for (const { field, message } of requiredFields) {
      if (!field) {
        toast.error(message);
        return;
      }
    }

    // Validate physical intervention fields if applicable
    if (incidentData.physical_intervention === 'yes') {
      if (!incidentData.physical_intervention_type) {
        toast.error("Please select type of restraint");
        return;
      }
      if (!incidentData.client_injured || !incidentData.staff_injured) {
        toast.error("Please select injury status for both client and staff");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Insert incident with ALL fields including created_by
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .insert([{
          // Client & Incident Details
          client_id: incidentData.client_id,
          event_date: incidentData.event_date,
          hierarchy_id: incidentData.hierarchy_id,
          subject: incidentData.subject,

          // General Information
          incident_date: incidentData.incident_date,
          incident_time: incidentData.incident_time,
          location: incidentData.location,
          witnesses: incidentData.witnesses,
          police_event_number: incidentData.police_event_number,

          // Incident Narrative
          incident_summary: incidentData.incident_summary,
          antecedent: incidentData.antecedent,
          incident_description: incidentData.incident_description,
          deescalation_outcome: incidentData.deescalation_outcome,

          // New fields
          incident_rating: incidentData.incident_rating,
          prn_approved: incidentData.prn_approved,
          prn_provided: incidentData.prn_provided,
          prn_notes: incidentData.prn_notes,
          physical_intervention: incidentData.physical_intervention,
          physical_intervention_type: incidentData.physical_intervention_type,
          physical_intervention_duration: incidentData.physical_intervention_duration,
          client_injured: incidentData.client_injured,
          staff_injured: incidentData.staff_injured,
          follow_up_required: incidentData.follow_up_required,
          management_contacted: incidentData.management_contacted,

          // Automatically set to current user
          created_by: incidentData.created_by,
          tenant_id: user.tenant_id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (incidentError) {
        console.error("Database error:", incidentError);

        // Check if error is due to missing columns
        if (incidentError.message.includes("column") && incidentError.message.includes("does not exist")) {
          toast.error("Database schema needs update. Please add the new fields to the incidents table.");
        } else {
          throw incidentError;
        }
        return;
      }

      // Insert incident types
      if (selectedIncidentTypes.length > 0) {
        const incidentTypePromises = selectedIncidentTypes.map(typeId =>
          supabase.from("incident_type_relations").insert([{
            incident_id: incident.id,
            incident_type_id: typeId,
            tenant_id: user.tenant_id
          }])
        );

        await Promise.all(incidentTypePromises);
      }

      // Insert emergency assistance
      if (selectedEmergencyAssistance.length > 0) {
        const emergencyPromises = selectedEmergencyAssistance.map(typeId => {
          const emergencyType = emergencyTypes.find(t => t.id === typeId);
          return supabase.from("incident_emergency_assistance").insert([{
            incident_id: incident.id,
            assistance_type_id: typeId,
            details: emergencyType?.name === 'Others' ? otherEmergencyDetails : null,
            tenant_id: user.tenant_id
          }]);
        });

        await Promise.all(emergencyPromises);
      }

      // Upload attachments
      const completedAttachments = attachments.filter(a => a.status === 'completed');
      if (completedAttachments.length > 0) {
        const attachmentPromises = completedAttachments.map(attachment =>
          supabase.from("incident_attachments").insert([{
            incident_id: incident.id,
            file_name: attachment.name,
            file_url: attachment.url,
            file_type: attachment.type,
            file_size: attachment.size,
            uploaded_by: user?.id,
            tenant_id: user.tenant_id
          }])
        );

        await Promise.all(attachmentPromises);
      }

      toast.success("Incident logged successfully!");

      // Reset form
      setIncidentData({
        client_id: "",
        event_date: "",
        hierarchy_id: "",
        subject: "",
        incident_date: "",
        incident_time: "",
        location: "",
        witnesses: "",
        police_event_number: "",
        incident_summary: "",
        antecedent: "",
        incident_description: "",
        deescalation_outcome: "",
        incident_rating: "",
        prn_approved: "",
        prn_provided: "",
        prn_notes: "",
        physical_intervention: "",
        physical_intervention_type: "",
        physical_intervention_duration: "",
        client_injured: "",
        staff_injured: "",
        follow_up_required: "",
        management_contacted: "",
        created_by: staffId || '',
      });
      setSelectedIncidentTypes([]);
      setSelectedEmergencyAssistance([]);
      setOtherEmergencyDetails("");
      setAttachments([]);
      setUploadProgress({});

      // Navigate to incidents list
      navigate("/incidents");

    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Error logging incident. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 animate-in fade-in duration-500">
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
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">New Incident Report</h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              File New Report • {new Date().toLocaleDateString('en-AU')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving
              </>
            ) : (
              <>
                <Save size={13} /> Save Report
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Shift Info Banner */}
        {shiftData && (
          <div className="mb-6 bg-blue-600 border border-blue-700 rounded-[1.5rem] p-5 shadow-lg animate-in slide-in-from-top-4 duration-500 text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-blue-200 uppercase tracking-[0.2em] mb-0.5">Linked Shift</p>
                  <h3 className="text-[13px] font-black uppercase tracking-tight text-white flex items-center gap-2">
                    {clientData?.first_name} {clientData?.last_name}
                    <span className="text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full">ID: {shift_id?.substring(0, 8)}</span>
                  </h3>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Session</p>
                <p className="text-[11px] font-black text-white">{shiftData.start_time?.substring(0, 5)} - {shiftData.end_time?.substring(0, 5)}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          {/* Section 1: Client & Incident Information */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                  Client Profile
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Information Details
                </p>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 pl-1 flex items-center gap-2">
                    Client Name *
                    {shiftData && <Lock size={10} className="text-slate-300" />}
                  </label>
                  <div className="relative">
                    {shiftData ? (
                      <div className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 truncate">
                          {clientData?.first_name} {clientData?.last_name}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100">Linked</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowClientDropdown(!showClientDropdown)}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex justify-between items-center hover:bg-white hover:border-blue-200 transition-all shadow-sm"
                      >
                        <span className={incidentData.client_id ? "text-slate-900" : "text-slate-300"}>
                          {incidentData.client_id ? getSelectedClientName() : "Search and select client"}
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                      </button>
                    )}

                    {showClientDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-[1.5rem] overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search for client..."
                              className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {filteredClients.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 italic text-[10px] font-black uppercase tracking-widest">
                              No Matches Detected
                            </div>
                          ) : (
                            filteredClients.map(client => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  setIncidentData(prev => ({ ...prev, client_id: client.id }));
                                  setShowClientDropdown(false);
                                  setSearchTerm("");
                                }}
                                className="w-full p-4 text-left hover:bg-blue-50 transition-all border-b last:border-b-0 border-slate-50 flex justify-between items-center group"
                              >
                                <div>
                                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600">
                                    {client.first_name} {client.last_name}
                                  </div>
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    NDIS Number: {client.ndis_number || 'UNKNOWN'}
                                  </div>
                                </div>
                                {incidentData.client_id === client.id && (
                                  <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center text-white scale-75 shadow-lg shadow-blue-600/20">
                                    <ArrowLeft size={12} className="rotate-180" />
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Date */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Report Date *</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      name="event_date"
                      value={incidentData.event_date}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Hierarchy */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Category *</label>
                  <div className="relative">
                    <select
                      name="hierarchy_id"
                      value={incidentData.hierarchy_id}
                      onChange={handleInputChange}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="" className="text-slate-300">Select Category</option>
                      {hierarchies.map(hierarchy => (
                        <option key={hierarchy.id} value={hierarchy.id}>
                          {hierarchy.name.toUpperCase()} {hierarchy.code ? `[${hierarchy.code}]` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Subject</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="subject"
                      placeholder="Incident subject..."
                      value={incidentData.subject}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Type of Incident */}
              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Incident Types *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {incidentTypes.map(type => (
                    <label
                      key={type.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer shadow-sm group ${selectedIncidentTypes.includes(type.id)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/20'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIncidentTypes.includes(type.id)}
                        onChange={() => handleIncidentTypeToggle(type.id)}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <div className={`h-4 w-4 rounded-md border-2 flex items-center justify-center transition-all ${selectedIncidentTypes.includes(type.id) ? 'bg-white border-white text-blue-600' : 'border-slate-200'
                        }`}>
                        {selectedIncidentTypes.includes(type.id) && <Check size={10} strokeWidth={4} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: When & Where */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                    When & Where
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Temporal & Geographic Context
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incident Date */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Date of Incident *</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      name="incident_date"
                      value={incidentData.incident_date}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Occurrence Time</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      name="incident_time"
                      value={incidentData.incident_time}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Location</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="location"
                      placeholder="..."
                      value={incidentData.location}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Witnesses */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Witnesses</label>
                  <div className="relative">
                    <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="witnesses"
                      placeholder="..."
                      value={incidentData.witnesses}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Assistance */}
              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  External Emergency Interconnect
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {emergencyTypes.map(type => (
                    <label
                      key={type.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer shadow-sm group ${selectedEmergencyAssistance.includes(type.id)
                        ? 'bg-rose-500 border-rose-500 text-white shadow-rose-500/20'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmergencyAssistance.includes(type.id)}
                        onChange={() => handleEmergencyAssistanceToggle(type.id)}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <div className={`h-4 w-4 rounded-md border-2 flex items-center justify-center transition-all ${selectedEmergencyAssistance.includes(type.id) ? 'bg-white border-white text-rose-500' : 'border-slate-200'
                        }`}>
                        {selectedEmergencyAssistance.includes(type.id) && <Check size={10} strokeWidth={4} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditional Inputs */}
              {(selectedEmergencyAssistance.some(id => emergencyTypes.find(t => t.id === id)?.name === 'Police') ||
                selectedEmergencyAssistance.some(id => emergencyTypes.find(t => t.id === id)?.name === 'Others')) && (
                  <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                    {selectedEmergencyAssistance.some(id => emergencyTypes.find(t => t.id === id)?.name === 'Police') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                          Police Event Reference
                        </label>
                        <input
                          type="text"
                          name="police_event_number"
                          placeholder="ENTER POLICE REFERENCE TOKEN"
                          value={incidentData.police_event_number}
                          onChange={handleInputChange}
                          className="w-full h-11 px-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
                          disabled={isSubmitting}
                        />
                      </div>
                    )}

                    {selectedEmergencyAssistance.some(id => emergencyTypes.find(t => t.id === id)?.name === 'Others') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                          Ancillary Emergency Intelligence
                        </label>
                        <textarea
                          value={otherEmergencyDetails}
                          onChange={(e) => setOtherEmergencyDetails(e.target.value)}
                          placeholder="SPECIFY ADDITIONAL INTERVENTION DETAILS"
                          rows="2"
                          className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm resize-none placeholder:text-slate-300"
                          disabled={isSubmitting}
                        />
                      </div>
                )}
                  </div>
                )}
            </div>

            {/* Section 3: Incident Narrative */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                    Incident Narrative
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Detailed Event Documentation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Incident Summary */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Incident Summary
                  </label>
                  <textarea
                    name="incident_summary"
                    placeholder="Briefly summarize what happened..."
                    value={incidentData.incident_summary}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-300 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Antecedent */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    What happened before? (Antecedents)
                  </label>
                  <textarea
                    name="antecedent"
                    placeholder="What triggered the incident?..."
                    value={incidentData.antecedent}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-300 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Incident Description */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Detailed Description
                  </label>
                  <textarea
                    name="incident_description"
                    placeholder="Describe the incident in detail..."
                    value={incidentData.incident_description}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-300 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* De-escalation and Outcome */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    Resolution & Outcome
                  </label>
                  <textarea
                    name="deescalation_outcome"
                    placeholder="How was it resolved?..."
                    value={incidentData.deescalation_outcome}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-300 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Attachments */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Paperclip size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                    Attachments
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Evidence & Documentation
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:bg-white hover:border-blue-400 transition-all group overflow-hidden relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  disabled={isSubmitting}
                />

                {attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-4">
                    <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={24} className="text-blue-600" />
                    </div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-2">
                      Upload Photos or Documents
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-5">
                      Drag & drop or Click to browse
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
                      disabled={isSubmitting}
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50">
                      <div>
                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">
                          {attachments.length} Protocol Object{attachments.length !== 1 ? 's' : ''} Synced
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          Evidence Buffer Active
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                        disabled={isSubmitting}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center justify-between bg-white/80 backdrop-blur-sm p-4 rounded-[1.5rem] border border-white shadow-sm hover:shadow-md transition-all group/item">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover/item:text-blue-600 transition-colors">
                              {attachment.type?.startsWith('image/') ? (
                                <ImageIcon size={18} />
                              ) : (
                                <FileText size={18} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[150px]">
                                {attachment.name}
                              </p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {(attachment.size / 1024).toFixed(0)} KB • Binary
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {attachment.status === 'uploading' && uploadProgress[attachment.id] > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${uploadProgress[attachment.id]}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-blue-600">
                                  {uploadProgress[attachment.id]}%
                                </span>
                              </div>
                            )}

                            {attachment.status === 'completed' && (
                              <div className="h-6 w-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Plus size={12} className="rotate-45 hidden" />
                                <span className="text-[10px] scale-75 font-black">OK</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => removeAttachment(attachment.id)}
                              className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center"
                              disabled={isSubmitting}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Severity Guide */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                    Severity Guide
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Rating Reference
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="bg-emerald-500 text-white p-3 text-[9px] font-black uppercase tracking-widest border-r border-emerald-400/30">Low</th>
                        <th className="bg-amber-500 text-white p-3 text-[9px] font-black uppercase tracking-widest border-r border-amber-400/30">Medium</th>
                        <th className="bg-orange-500 text-white p-3 text-[9px] font-black uppercase tracking-widest border-r border-orange-400/30">High</th>
                        <th className="bg-rose-600 text-white p-3 text-[9px] font-black uppercase tracking-widest">Critical</th>
                      </tr>
                    </thead>

                    <tbody className="bg-slate-50/30">
                      <tr className="align-top divide-x divide-slate-100">
                        {/* LOW */}
                        <td className="p-4">
                          <ul className="space-y-2">
                            {["Agitation / Hyperarousal", "Food refusal", "Disruption of routine", "Physical threats", "Verbal abuse / swearing", "Non-compliance to direction", "Sleep disturbance", "Awake but not disturbing"].map(item => (
                              <li key={item} className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-start gap-2">
                                <span className="h-1 w-1 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* MEDIUM */}
                        <td className="p-4">
                          <ul className="space-y-2">
                            {["Absconding (habitual)", "Another person involved", "Medication error", "Medication refusal", "PRN administration", "Property damage (minor)", "Persistent Verbal abuse", "Indecent behaviour", "Bowel issues (3 days)", "Known Seizures"].map(item => (
                              <li key={item} className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-start gap-2">
                                <span className="h-1 w-1 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* HIGH */}
                        <td className="p-4">
                          <ul className="space-y-2">
                            {["Hospitalization", "Falls / Infections", "Missing person's report", "Assault requiring medical", "Extreme property damage", "Illicit substance use", "Severe / Unexplained injuries", "Self-harm", "Suicidal thoughts", "Financial misconduct"].map(item => (
                              <li key={item} className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-start gap-2">
                                <span className="h-1 w-1 bg-orange-400 rounded-full mt-1.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* CRITICAL */}
                        <td className="p-4">
                          <ul className="space-y-2">
                            {["Death", "Serious injury", "Abuse and neglect", "Unlawful contact with client", "Sexual misconduct", "Unauthorised restrictive"].map(item => (
                              <li key={item} className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-start gap-2">
                                <span className="h-1 w-1 bg-rose-400 rounded-full mt-1.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Incident Rating Selection */}
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">
                  Incident Rating *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["Low", "Medium", "High", "Critical"].map(level => {
                    const colors = {
                      Low: 'hover:border-emerald-200 peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-checked:shadow-emerald-600/20',
                      Medium: 'hover:border-amber-200 peer-checked:bg-amber-600 peer-checked:border-amber-600 peer-checked:shadow-amber-600/20',
                      High: 'hover:border-orange-200 peer-checked:bg-orange-600 peer-checked:border-orange-600 peer-checked:shadow-orange-600/20',
                      Critical: 'hover:border-rose-200 peer-checked:bg-rose-600 peer-checked:border-rose-600 peer-checked:shadow-rose-600/20'
                    };
                    return (
                      <label key={level} className="relative cursor-pointer group">
                        <input
                          type="radio"
                          name="incident_rating"
                          value={level.toLowerCase()}
                          checked={incidentData.incident_rating === level.toLowerCase()}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className={`h-11 flex items-center justify-center rounded-2xl border border-slate-100 bg-white transition-all shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-600 peer-checked:text-white ${colors[level]} relative gap-2`}>
                          {incidentData.incident_rating === level.toLowerCase() && <Check size={12} strokeWidth={4} />}
                          {level}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

            {/* Section 6: PRN & Interventions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* PRN Section */}
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="p-2 bg-blue-500 text-white rounded-xl">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                      PRN Information
                    </h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Medication Details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                  {/* PRN Approved */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PRN Authorized? *</label>
                    <div className="flex gap-2">
                      {["yes", "no"].map(val => (
                        <label key={val} className="flex-1 relative cursor-pointer">
                          <input
                            type="radio"
                            name="prn_approved"
                            value={val}
                            checked={incidentData.prn_approved === val}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className="h-10 flex items-center justify-center rounded-xl border border-white bg-white text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-sm peer-checked:shadow-blue-600/20 gap-2">
                            {incidentData.prn_approved === val && <Check size={12} strokeWidth={4} />}
                            {val}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* PRN Provided */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment Status *</label>
                    <div className="flex flex-col gap-2">
                      {["provided", "not provided", "refused"].map(val => (
                        <label key={val} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="prn_provided"
                            value={val}
                            checked={incidentData.prn_provided === val}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className="h-10 flex items-center justify-center rounded-xl border border-white bg-white text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-sm peer-checked:shadow-blue-600/20 gap-2">
                            {incidentData.prn_provided === val && <Check size={12} strokeWidth={4} />}
                            {val}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PRN Notes */}
                <div className="space-y-2 relative z-10">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PRN Notes</label>
                  <textarea
                    name="prn_notes"
                    placeholder="Enter PRN details..."
                    value={incidentData.prn_notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Physical Intervention Section */}
              <div className="bg-slate-900 rounded-[1.5rem] p-5 lg:p-6 text-white shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="p-2 bg-rose-500 text-white rounded-xl">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-white/90 uppercase tracking-wide">
                      Restrictive Intervention
                    </h3>
                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                      Safety Protocol
                    </p>
                  </div>
                </div>

                {/* Did you physically hold the client? */}
                <div className="space-y-3 relative z-10">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Physical Restraint Applied? *</label>
                  <div className="flex gap-2">
                    {["yes", "no"].map(val => (
                      <label key={val} className="flex-1 relative cursor-pointer">
                        <input
                          type="radio"
                          name="physical_intervention"
                          value={val}
                          checked={incidentData.physical_intervention === val}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="h-10 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-rose-600 peer-checked:text-white peer-checked:border-rose-600 shadow-sm peer-checked:shadow-rose-600/40 gap-2">
                          {incidentData.physical_intervention === val && <Check size={12} strokeWidth={4} />}
                          {val}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type of restraint (conditionally shown) */}
                {incidentData.physical_intervention === 'yes' && (
                  <div className="space-y-3 pt-2 relative z-10">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Restraint Classification *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Blocked", "Hold Hands", "Seated", "Standing", "Escorted", "Grounded"].map(type => (
                        <label key={type} className="relative cursor-pointer">
                          <input
                            type="radio"
                            name="physical_intervention_type"
                            value={type.toLowerCase()}
                            checked={incidentData.physical_intervention_type === type.toLowerCase()}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className="h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-rose-600 peer-checked:text-white peer-checked:border-rose-600 shadow-sm gap-2">
                            {incidentData.physical_intervention_type === type.toLowerCase() && <Check size={12} strokeWidth={4} />}
                            {type}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration & Injury Status (conditionally shown) */}
                {incidentData.physical_intervention === 'yes' && (
                  <div className="space-y-6 pt-4 relative z-10 border-t border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tactical Duration</label>
                      <input
                        type="text"
                        name="physical_intervention_duration"
                        placeholder="E.G., 5 MINUTES"
                        value={incidentData.physical_intervention_duration}
                        onChange={handleInputChange}
                        className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-tight text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-white/10"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Client Casualty?</label>
                        <div className="flex gap-2">
                          {["yes", "no"].map(val => (
                            <label key={val} className="flex-1 relative cursor-pointer">
                              <input
                                type="radio"
                                name="client_injured"
                                value={val}
                                checked={incidentData.client_injured === val}
                                onChange={handleInputChange}
                                className="sr-only peer"
                              />
                              <div className="h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-rose-600 peer-checked:text-white gap-2">
                                {incidentData.client_injured === val && <Check size={10} strokeWidth={4} />}
                                {val}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Staff Casualty?</label>
                        <div className="flex gap-2">
                          {["yes", "no"].map(val => (
                            <label key={val} className="flex-1 relative cursor-pointer">
                              <input
                                type="radio"
                                name="staff_injured"
                                value={val}
                                checked={incidentData.staff_injured === val}
                                onChange={handleInputChange}
                                className="sr-only peer"
                              />
                              <div className="h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-rose-600 peer-checked:text-white gap-2">
                                {incidentData.staff_injured === val && <Check size={10} strokeWidth={4} />}
                                {val}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 7: Follow-Up & Reporting */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Save size={18} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                    Follow-Up & Reporting
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Authorization & Next Steps
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Follow-Up Required?</label>
                  <div className="flex gap-2">
                    {["yes", "no"].map(val => (
                      <label key={val} className="flex-1 relative cursor-pointer">
                        <input
                          type="radio"
                          name="follow_up_required"
                          value={val}
                          checked={incidentData.follow_up_required === val}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="h-11 flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-blue-600 peer-checked:text-white shadow-sm peer-checked:shadow-blue-600/20 gap-2">
                          {incidentData.follow_up_required === val && <Check size={12} strokeWidth={4} />}
                          {val}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Management Contacted? *</label>
                  <div className="flex gap-2">
                    {["yes", "no"].map(val => (
                      <label key={val} className="flex-1 relative cursor-pointer">
                        <input
                          type="radio"
                          name="management_contacted"
                          value={val}
                          checked={incidentData.management_contacted === val}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="h-11 flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-blue-600 peer-checked:text-white shadow-sm peer-checked:shadow-blue-600/20 gap-2">
                          {incidentData.management_contacted === val && <Check size={12} strokeWidth={4} />}
                          {val}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Proxy Authentication (Admin Only) */}
            {isAdmin && (
              <div className="bg-amber-50/50 p-5 lg:p-6 rounded-[1.5rem] border border-amber-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-200/50">
                  <div className="p-2 bg-amber-600 text-white rounded-xl">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                      Proxy Authentication
                    </h3>
                    <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                      Admin Access Required
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Log for Staff Member *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                      name="created_by"
                      value={incidentData.created_by}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-10 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">SELECT STAFF MEMBER</option>
                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}


            {/* Form Footer Actions */}
            <div className="py-8 lg:py-10 border-t border-slate-100 mt-6 lg:mt-10">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3 order-2 sm:order-1">
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Validation Check: Ready to submit
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto h-14 px-10 bg-slate-900 hover:bg-black text-white rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-slate-900/10 group disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Saving Incident...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-black uppercase tracking-widest">Save Incident</span>
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
}

export default AddIncident;