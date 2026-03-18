import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Image,
  ChevronDown,
  Search,
  AlertTriangle
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import axios from "axios";
import { useUser } from "../context/UserContext";

function EditIncident() {
  const { id } = useParams();
  const { currentStaff: user } = useUser();
  const navigate = useNavigate();

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
  const [existingAttachments, setExistingAttachments] = useState([]);
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

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      // Check if user is admin
      const adminRole = user.role?.toLowerCase() === 'admin';
      setIsAdmin(adminRole);
    }
  }, [user]);

  // Fetch initial data and incident details
  useEffect(() => {
    fetchInitialData();
  }, [id]);

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
        .eq("is_active", true)
        .eq("tenant_id", user.tenant_id)
        .order("first_name", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
      setFilteredClients(clientsData?.slice(0, 10) || []);

      // Fetch hierarchies
      const { data: hierarchiesData, error: hierarchiesError } = await supabase
        .from("hierarchy")
        .select("id, name, code")
        .eq("is_active", true)
        .eq("tenant_id", user.tenant_id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(hierarchiesData || []);

      // Fetch incident types
      const { data: typesData, error: typesError } = await supabase
        .from("incident_types")
        .select("*")
        .eq("is_active", true)
        .eq("tenant_id", user.tenant_id)
        .order("sort_order", { ascending: true });

      if (typesError) throw typesError;
      setIncidentTypes(typesData || []);

      // Fetch emergency assistance types
      const { data: emergencyData, error: emergencyError } = await supabase
        .from("emergency_assistance_types")
        .select("*")
        .eq("is_active", true)
        .eq("tenant_id", user.tenant_id)
        .order("sort_order", { ascending: true });

      if (emergencyError) throw emergencyError;
      setEmergencyTypes(emergencyData || []);

      // Fetch staff list if admin
      if (user?.role?.toLowerCase() === 'admin') {
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("id, name, email, role")
          .eq("is_active", true)
          .eq("tenant_id", user.tenant_id)
          .order("name", { ascending: true });

        if (staffError) throw staffError;
        setStaffList(staffData || []);
      }

      // Fetch incident details
      await fetchIncidentDetails();

    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentDetails = async () => {
    try {
      // Fetch incident
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", user.tenant_id)
        .single();

      if (incidentError) throw incidentError;

      if (!incident) {
        toast.error("Incident not found");
        navigate("/incidents");
        return;
      }

      // Set form data
      setIncidentData({
        client_id: incident.client_id || "",
        event_date: incident.event_date || "",
        hierarchy_id: incident.hierarchy_id || "",
        subject: incident.subject || "",
        incident_date: incident.incident_date || "",
        incident_time: incident.incident_time || "",
        location: incident.location || "",
        witnesses: incident.witnesses || "",
        police_event_number: incident.police_event_number || "",
        incident_summary: incident.incident_summary || "",
        antecedent: incident.antecedent || "",
        incident_description: incident.incident_description || "",
        deescalation_outcome: incident.deescalation_outcome || "",
        incident_rating: incident.incident_rating || "",
        prn_approved: incident.prn_approved || "",
        prn_provided: incident.prn_provided || "",
        prn_notes: incident.prn_notes || "",
        physical_intervention: incident.physical_intervention || "",
        physical_intervention_type: incident.physical_intervention_type || "",
        physical_intervention_duration: incident.physical_intervention_duration || "",
        client_injured: incident.client_injured || "",
        staff_injured: incident.staff_injured || "",
        follow_up_required: incident.follow_up_required || "",
        management_contacted: incident.management_contacted || "",
        created_by: incident.created_by || ""
      });

      // Fetch incident types
      const { data: incidentTypesData, error: typesError } = await supabase
        .from("incident_type_relations")
        .select("incident_type_id")
        .eq("incident_id", id);

      if (!typesError && incidentTypesData) {
        setSelectedIncidentTypes(incidentTypesData.map(item => item.incident_type_id));
      }

      // Fetch emergency assistance
      const { data: emergencyData, error: emergencyError } = await supabase
        .from("incident_emergency_assistance")
        .select("assistance_type_id, details")
        .eq("incident_id", id);

      if (!emergencyError && emergencyData) {
        const emergencyIds = emergencyData.map(item => item.assistance_type_id);
        setSelectedEmergencyAssistance(emergencyIds);

        // Find other details if exists
        const otherItem = emergencyData.find(item => {
          const type = emergencyTypes.find(t => t.id === item.assistance_type_id);
          return type?.name === 'Others';
        });
        if (otherItem) {
          setOtherEmergencyDetails(otherItem.details || "");
        }
      }

      // Fetch existing attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("incident_attachments")
        .select("*")
        .eq("incident_id", id);

      if (!attachmentsError && attachmentsData) {
        setExistingAttachments(attachmentsData.map(att => ({
          id: att.id,
          name: att.file_name,
          url: att.file_url,
          type: att.file_type,
          size: att.file_size,
          status: 'completed',
          progress: 100
        })));
      }

    } catch (error) {
      console.error("Error fetching incident details:", error);
      toast.error("Failed to load incident details");
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

  const removeExistingAttachment = async (id) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from("incident_attachments")
        .delete()
        .eq("id", id)
        .eq("tenant_id", user.tenant_id);

      if (error) throw error;

      // Remove from state
      setExistingAttachments(prev => prev.filter(a => a.id !== id));
      toast.success("Attachment removed successfully");

    } catch (error) {
      console.error("Error removing attachment:", error);
      toast.error("Failed to remove attachment");
    }
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
      // Update incident with ALL fields
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .update({
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

          // Updated by
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("tenant_id", user.tenant_id)
        .select()
        .single();

      if (incidentError) {
        console.error("Database error:", incidentError);
        throw incidentError;
      }

      // Delete existing incident types and insert new ones
      await supabase.from("incident_type_relations").delete().eq("incident_id", id);

      if (selectedIncidentTypes.length > 0) {
        const incidentTypePromises = selectedIncidentTypes.map(typeId =>
          supabase.from("incident_type_relations").insert([{
            incident_id: id,
            incident_type_id: typeId,
            tenant_id: user.tenant_id
          }])
        );

        await Promise.all(incidentTypePromises);
      }

      // Delete existing emergency assistance and insert new ones
      await supabase.from("incident_emergency_assistance").delete().eq("incident_id", id);

      if (selectedEmergencyAssistance.length > 0) {
        const emergencyPromises = selectedEmergencyAssistance.map(typeId => {
          const emergencyType = emergencyTypes.find(t => t.id === typeId);
          return supabase.from("incident_emergency_assistance").insert([{
            incident_id: id,
            assistance_type_id: typeId,
            details: emergencyType?.name === 'Others' ? otherEmergencyDetails : null,
            tenant_id: user.tenant_id
          }]);
        });

        await Promise.all(emergencyPromises);
      }

      // Upload new attachments
      const completedAttachments = attachments.filter(a => a.status === 'completed');
      if (completedAttachments.length > 0) {
        const attachmentPromises = completedAttachments.map(attachment =>
          supabase.from("incident_attachments").insert([{
            incident_id: id,
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

      toast.success("Incident updated successfully!");

      // Navigate to incidents list
      navigate("/incidents");

    } catch (err) {
      console.error("Update error:", err);
      toast.error("Error updating incident. Please try again.");
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
    <div className="min-h-dvh bg-slate-50 md:p-8 pt-safe pb-safe">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Tactical Header */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 h-full w-64 bg-gradient-to-l from-white/5 to-transparent"></div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate(-1)}
                className="h-12 w-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all border border-white/10 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">Incident Modification</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5 inline-block">
                  Registry Update Protocol • ID: {id?.substring(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <AlertTriangle size={20} />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-blue-400">Security Clearance</p>
                <p className="text-[12px] font-black uppercase tracking-tight">{user?.name || 'Authorized Personnel'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 relative">
          <form className="space-y-12" onSubmit={handleSubmit}>
            {/* Section 1: Tactical Configuration */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Client & Incident Identification</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Individual (Client) *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight flex justify-between items-center hover:bg-white hover:border-blue-200 transition-all shadow-sm"
                    >
                      <span className={incidentData.client_id ? "text-slate-900" : "text-slate-300"}>
                        {incidentData.client_id ? getSelectedClientName() : "DETECT AND SELECT CLIENT"}
                      </span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>

                    {showClientDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-[1.5rem] overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="SEARCH REGISTRY..."
                              className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                          {filteredClients.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
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
                                className={`w-full p-4 text-left rounded-xl transition-all flex justify-between items-center group ${incidentData.client_id === client.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-600'
                                  }`}
                              >
                                <div>
                                  <div className="text-[11px] font-black uppercase tracking-tight truncate">
                                    {client.first_name} {client.last_name}
                                  </div>
                                  <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${incidentData.client_id === client.id ? 'text-white/60' : 'text-slate-400'}`}>
                                    NDIS • {client.ndis_number || 'PENDING'}
                                  </div>
                                </div>
                                {incidentData.client_id === client.id && (
                                  <div className="h-5 w-5 bg-white/20 rounded-full flex items-center justify-center">
                                    <div className="h-2 w-2 bg-white rounded-full" />
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Registry Event Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      name="event_date"
                      value={incidentData.event_date}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Hierarchy */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Organizational Unit (Hierarchy) *</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                      name="hierarchy_id"
                      value={incidentData.hierarchy_id}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">SELECT HIERARCHY UNIT</option>
                      {hierarchies.map(hierarchy => (
                        <option key={hierarchy.id} value={hierarchy.id}>
                          {hierarchy.name.toUpperCase()} {hierarchy.code ? `[${hierarchy.code.toUpperCase()}]` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Incident Subject / Brief</label>
                  <input
                    type="text"
                    name="subject"
                    placeholder="ENTER TACTICAL SUMMARY..."
                    value={incidentData.subject}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Type of Incident */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Incident Classification Categories *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {incidentTypes.map(type => (
                    <label key={type.id} className="relative cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedIncidentTypes.includes(type.id)}
                        onChange={() => handleIncidentTypeToggle(type.id)}
                        className="sr-only peer"
                        disabled={isSubmitting}
                      />
                      <div className="h-11 flex items-center justify-center px-4 rounded-2xl border border-slate-100 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 shadow-sm peer-checked:shadow-blue-600/20 group-hover:border-blue-200 text-center">
                        {type.name}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: General Information */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Temporal & Geographic Stamps</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                {/* Incident Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Incident Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      name="incident_date"
                      value={incidentData.incident_date}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Incident Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="time"
                      name="incident_time"
                      value={incidentData.incident_time}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      name="location"
                      placeholder="E.G., MAIN LIVING AREA"
                      value={incidentData.location}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Witnesses */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Active Witnesses</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      name="witnesses"
                      placeholder="LIST PERSONNEL OR OBSERVERS..."
                      value={incidentData.witnesses}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Police Number */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Police Case #</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      name="police_event_number"
                      placeholder="IF APPLICABLE..."
                      value={incidentData.police_event_number}
                      onChange={handleInputChange}
                      className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Assistance */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Emergency Response Protocols Activated
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {emergencyTypes.map(type => (
                    <label key={type.id} className="relative cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedEmergencyAssistance.includes(type.id)}
                        onChange={() => handleEmergencyAssistanceToggle(type.id)}
                        className="sr-only peer"
                        disabled={isSubmitting}
                      />
                      <div className="h-11 flex items-center justify-center px-4 rounded-2xl border border-slate-100 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all peer-checked:bg-rose-600 peer-checked:text-white peer-checked:border-rose-600 shadow-sm peer-checked:shadow-rose-600/20 group-hover:border-rose-200 text-center">
                        {type.name}
                      </div>
                    </label>
                  ))}
                </div>

                {selectedEmergencyAssistance.some(id => emergencyTypes.find(t => t.id === id)?.name === 'Others') && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Supplementary Response Details</label>
                    <textarea
                      placeholder="DESCRIBE SUPPLEMENTARY RESPONSE..."
                      value={otherEmergencyDetails}
                      onChange={(e) => setOtherEmergencyDetails(e.target.value)}
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-[11px] font-bold text-slate-600 leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-slate-300 uppercase"
                      rows="3"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Incident Narrative */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Incident Narrative Vault</h2>
              </div>

              <div className="grid grid-cols-1 gap-8 bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
                {/* Incident Summary */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tactical Summary (Brief)</label>
                  <textarea
                    name="incident_summary"
                    placeholder="PROVIDE A CONCISE BRIEFING OF THE INCIDENT..."
                    value={incidentData.incident_summary}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-[11px] font-bold text-slate-600 leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-slate-300 uppercase"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Antecedent */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Antecedent Protocols (Pre-Event)</label>
                    <textarea
                      name="antecedent"
                      placeholder="DESCRIBE TRIGGERS OR EVENTS PRECEDING THE INCIDENT..."
                      value={incidentData.antecedent}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-[11px] font-bold text-slate-600 leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-slate-300 uppercase"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Incident Description */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Incident Description</label>
                    <textarea
                      name="incident_description"
                      placeholder="PROVIDE A DETAILED LOG OF THE INCIDENT EVENTS..."
                      value={incidentData.incident_description}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-[11px] font-bold text-slate-600 leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-slate-300 uppercase"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* De-escalation and Outcome */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">De-escalation Strategy & Resolution</label>
                  <textarea
                    name="deescalation_outcome"
                    placeholder="DESCRIBE DE-ESCALATION MANEUVERS AND THE FINAL OUTCOME..."
                    value={incidentData.deescalation_outcome}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-[11px] font-bold text-slate-600 leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner placeholder:text-slate-300 uppercase"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Digital Evidence Protocols (Attachments) */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Paperclip size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Digital Evidence Upload Protocol</h2>
              </div>

              <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                    disabled={isSubmitting}
                  />

                  <div className="border-2 border-dashed border-slate-200 bg-white rounded-[2rem] p-12 text-center transition-all group-hover:border-blue-400 group-hover:bg-blue-50/10">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={28} />
                    </div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Deploy New Attachments</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DRAG & DROP OR SELECT FROM TERMINAL</p>
                  </div>
                </div>

                {/* Combined Attachments Display */}
                {(existingAttachments.length > 0 || attachments.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Existing */}
                    {existingAttachments.map(attachment => (
                      <div key={attachment.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between group shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                            {attachment.type?.startsWith('image/') ? <Image size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">{attachment.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{(attachment.size / 1024).toFixed(1)} KB • REGISTRY RECORD</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeExistingAttachment(attachment.id); }}
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-all"
                            disabled={isSubmitting}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* New */}
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between group shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            {attachment.type?.startsWith('image/') ? <Image size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">{attachment.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{(attachment.size / 1024).toFixed(1)} KB</p>
                              {attachment.status === 'uploading' && (
                                <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600" style={{ width: `${uploadProgress[attachment.id]}%` }} />
                                </div>
                              )}
                              {attachment.status === 'completed' && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">DEPLOYED</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeAttachment(attachment.id); }}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-all"
                          disabled={isSubmitting}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Severity Classification matrix */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Incident Rating Protocol</h2>
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-[2.5rem] bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/10 w-1/4">Low (Level 1)</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/10 w-1/4">Medium (Level 2)</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] border-r border-white/10 w-1/4 text-amber-400">High (Level 3)</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] w-1/4 text-rose-400">Critical (Level 4)</th>
                    </tr>
                  </thead>
                  <tbody className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-relaxed">
                    <tr className="bg-white">
                      <td className="p-6 border-r border-slate-50 align-top">
                        <ul className="space-y-2 list-none">
                          <li className="flex items-start gap-2"><div className="h-1 w-1 bg-slate-300 rounded-full mt-1.5 shrink-0" /> Minor incidents with minimal impact</li>
                          <li className="flex items-start gap-2"><div className="h-1 w-1 bg-slate-300 rounded-full mt-1.5 shrink-0" /> No injury or very minor injury</li>
                          <li className="flex items-start gap-2"><div className="h-1 w-1 bg-slate-300 rounded-full mt-1.5 shrink-0" /> Small property damage</li>
                        </ul>
                      </td>
                      <td className="p-6 border-r border-slate-50 align-top bg-slate-50/30">
                        <ul className="space-y-2 list-none">
                          <li className="flex items-start gap-2"><div className="h-1 w-1 bg-slate-300 rounded-full mt-1.5 shrink-0" /> Moderate impact / recurring issues</li>
                          <li className="flex items-start gap-2"><div className="h-1 w-1 bg-slate-300 rounded-full mt-1.5 shrink-0" /> Medical treatment required</li>
                          <li className="flex items-start gap-2"><div className="h-1 w-1 bg-slate-300 rounded-full mt-1.5 shrink-0" /> Significant property damage</li>
                        </ul>
                      </td>
                      <td className="p-6 border-r border-slate-50 align-top bg-amber-50/10">
                        <ul className="space-y-2 list-none text-amber-700/70">
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 bg-amber-400 rounded-full mt-1 shrink-0" /> Severe injury / High risk</li>
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 bg-amber-400 rounded-full mt-1 shrink-0" /> Hospitalization required</li>
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 bg-amber-400 rounded-full mt-1 shrink-0" /> Police involvement</li>
                        </ul>
                      </td>
                      <td className="p-6 align-top bg-rose-50/10">
                        <ul className="space-y-2 list-none text-rose-700/70">
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 bg-rose-500 rounded-full mt-1 shrink-0" /> Life threatening / Death</li>
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 bg-rose-500 rounded-full mt-1 shrink-0" /> Severe abuse or neglect</li>
                          <li className="flex items-start gap-2"><div className="h-1.5 w-1.5 bg-rose-500 rounded-full mt-1 shrink-0" /> Major criminal act</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-8 border-t border-slate-50 bg-slate-50/30">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-4 block">Final Rating Selection *</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {["low", "medium", "high", "critical"].map((rating) => (
                      <label key={rating} className="relative cursor-pointer group">
                        <input
                          type="radio"
                          name="incident_rating"
                          value={rating}
                          checked={incidentData.incident_rating === rating}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className={`h-14 flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest transition-all peer-checked:text-white shadow-sm group-hover:border-blue-300
                          ${rating === 'low' ? 'peer-checked:bg-slate-600 peer-checked:border-slate-600 peer-checked:shadow-slate-600/20 text-slate-500' : ''}
                          ${rating === 'medium' ? 'peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:shadow-blue-600/20 text-blue-500' : ''}
                          ${rating === 'high' ? 'peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:shadow-amber-500/20 text-amber-500' : ''}
                          ${rating === 'critical' ? 'peer-checked:bg-rose-600 peer-checked:border-rose-600 peer-checked:shadow-rose-600/20 text-rose-500' : ''}
                        `}>
                          {rating}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: PRN & Physical Intervention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* PRN Protocol */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                  <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">PRN Protocol (As Needed)</h2>
                </div>

                <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">PRN Authorized?</label>
                      <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        {['yes', 'no'].map((val) => (
                          <label key={val} className="flex-1 cursor-pointer">
                            <input
                              type="radio"
                              name="prn_approved"
                              value={val}
                              checked={incidentData.prn_approved === val}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="h-10 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-slate-900 peer-checked:text-white">
                              {val}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Administration Status</label>
                      <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                        {['provided', 'not provided', 'refused'].map((val) => (
                          <label key={val} className="min-w-[80px] flex-1 cursor-pointer">
                            <input
                              type="radio"
                              name="prn_provided"
                              value={val}
                              checked={incidentData.prn_provided === val}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="h-10 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:bg-blue-600 peer-checked:text-white px-2 text-center leading-none">
                              {val}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Administration Narrative / Notes</label>
                    <textarea
                      name="prn_notes"
                      placeholder="ENTER PHARMACOLOGICAL INTERVENTION DETAILS..."
                      value={incidentData.prn_notes}
                      onChange={handleInputChange}
                      className="w-full h-24 p-6 bg-white border border-slate-100 rounded-[2rem] text-[11px] font-bold text-slate-600 leading-relaxed focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Intervention */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Physical Intervention Protocol</h2>
                </div>

                <div className="bg-rose-50/10 p-8 rounded-[2.5rem] border border-rose-100/50 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Restriction / Holding Engaged?</label>
                    <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-[200px]">
                      {['yes', 'no'].map((val) => (
                        <label key={val} className="flex-1 cursor-pointer">
                          <input
                            type="radio"
                            name="physical_intervention"
                            value={val}
                            checked={incidentData.physical_intervention === val}
                            onChange={handleInputChange}
                            className="sr-only peer"
                          />
                          <div className={`h-10 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all peer-checked:text-white ${val === 'yes' ? 'peer-checked:bg-rose-600' : 'peer-checked:bg-slate-900'}`}>
                            {val}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {incidentData.physical_intervention === 'yes' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Technique Deployed</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["BLOCKED", "HOLD HANDS", "SEATED", "STANDING", "ESCORTED", "GROUND"].map(type => (
                            <label key={type} className="cursor-pointer">
                              <input
                                type="radio"
                                name="physical_intervention_type"
                                value={type.toLowerCase()}
                                checked={incidentData.physical_intervention_type === type.toLowerCase()}
                                onChange={handleInputChange}
                                className="sr-only peer"
                              />
                              <div className="h-10 flex items-center justify-center bg-white rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 peer-checked:bg-rose-600 peer-checked:text-white peer-checked:border-rose-600 transition-all">
                                {type}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Duration of Restraint</label>
                        <input
                          type="text"
                          name="physical_intervention_duration"
                          placeholder="E.G., 120 SECONDS"
                          value={incidentData.physical_intervention_duration}
                          onChange={handleInputChange}
                          className="w-full h-11 px-6 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-300"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Client Injury Status</label>
                          <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-100">
                            {['yes', 'no'].map((val) => (
                              <label key={val} className="flex-1 cursor-pointer">
                                <input type="radio" name="client_injured" value={val} checked={incidentData.client_injured === val} onChange={handleInputChange} className="sr-only peer" />
                                <div className={`h-8 flex items-center justify-center rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 peer-checked:text-white ${val === 'yes' ? 'peer-checked:bg-rose-500' : 'peer-checked:bg-slate-600'}`}> {val} </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Staff Injury Status</label>
                          <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-100">
                            {['yes', 'no'].map((val) => (
                              <label key={val} className="flex-1 cursor-pointer">
                                <input type="radio" name="staff_injured" value={val} checked={incidentData.staff_injured === val} onChange={handleInputChange} className="sr-only peer" />
                                <div className={`h-8 flex items-center justify-center rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 peer-checked:text-white ${val === 'yes' ? 'peer-checked:bg-rose-500' : 'peer-checked:bg-slate-600'}`}> {val} </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 7: Final Validation & Submission */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Save size={16} />
                </div>
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Follow-Up & Registry Authorization</h2>
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-10 space-y-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-full w-96 bg-gradient-to-l from-white/5 to-transparent skew-x-12 transform translate-x-32" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                  <div className="space-y-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Registry Follow-Up Escalation</label>
                      <div className="flex gap-4">
                        {['yes', 'no'].map((val) => (
                          <label key={val} className="flex-1 cursor-pointer group">
                            <input
                              type="radio"
                              name="follow_up_required"
                              value={val}
                              checked={incidentData.follow_up_required === val}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="h-12 flex items-center justify-center rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/40 group-hover:text-white peer-checked:bg-white peer-checked:text-slate-900 transition-all">
                              Follow-Up: {val}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Senior Management Confirmation</label>
                      <div className="flex gap-4">
                        {['yes', 'no'].map((val) => (
                          <label key={val} className="flex-1 cursor-pointer group">
                            <input
                              type="radio"
                              name="management_contacted"
                              value={val}
                              checked={incidentData.management_contacted === val}
                              onChange={handleInputChange}
                              className="sr-only peer"
                            />
                            <div className="h-12 flex items-center justify-center rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/40 group-hover:text-white peer-checked:bg-white peer-checked:text-slate-900 transition-all">
                              Notified: {val}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="bg-blue-600/10 rounded-3xl border border-blue-500/20 p-8 space-y-6 relative group overflow-hidden">
                      <div className="absolute -top-12 -right-12 h-32 w-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <Users size={24} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Administrative Overrule</p>
                          <h3 className="text-white text-[14px] font-black uppercase tracking-tight">Proxy Authentication</h3>
                        </div>
                      </div>

                      <div className="space-y-4 relative z-10">
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                          <select
                            name="created_by"
                            value={incidentData.created_by}
                            onChange={handleInputChange}
                            className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-tight text-white appearance-none focus:bg-white focus:text-slate-900 transition-all outline-none"
                            required
                          >
                            <option value="" className="text-slate-900">AUTHENTICATE REGISTRY AUTHOR...</option>
                            {staffList.map(staff => (
                              <option key={staff.id} value={staff.id} className="text-slate-900">
                                {staff.name.toUpperCase()} [{staff.role?.toUpperCase() || 'STAFF'}]
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                          Authorized as Admin: This modification will be logged under the specified personnel record.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-8 border-t border-white/10 relative z-10">
                  <div className="text-center sm:text-left">
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Final Authorization Required</p>
                    <p className="text-white/30 text-[8px] font-bold uppercase tracking-[0.2em]">Ensure all data matches verified fieldwork protocols</p>
                  </div>

                  <div className="flex gap-4 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => navigate("/incidents")}
                      className="flex-1 sm:flex-none h-14 px-10 rounded-2xl border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                      disabled={isSubmitting}
                    >
                      Abort Update
                    </button>

                    <button
                      type="submit"
                      className="flex-1 sm:flex-none h-14 px-12 bg-white hover:bg-blue-50 text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-white/5 flex items-center justify-center gap-3 group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Synchronizing...</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Update Registry Record</span>
                          <Save size={18} className="group-hover:scale-110 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditIncident;