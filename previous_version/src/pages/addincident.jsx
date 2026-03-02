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
  Image,
  Paperclip,
  ChevronDown,
  Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import axios from "axios";
import { useUser } from "../context/UserContext";

function AddIncident() {
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
  const [staffId,setStaffId]=useState(null);
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

  // Set created_by to current user when component loads
  useEffect(() => {
    if (user?.id) {
      setIncidentData(prev => ({
        ...prev,
        created_by: user.id
      }));
    }
  }, [user]);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

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
        .order("first_name", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
      setFilteredClients(clientsData?.slice(0, 10) || []);

      // Fetch hierarchies
      const { data: hierarchiesData, error: hierarchiesError } = await supabase
        .from("hierarchy")
        .select("id, name, code")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(hierarchiesData || []);

      // Fetch incident types
      const { data: typesData, error: typesError } = await supabase
        .from("incident_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (typesError) throw typesError;
      setIncidentTypes(typesData || []);

      // Fetch emergency assistance types
      const { data: emergencyData, error: emergencyError } = await supabase
        .from("emergency_assistance_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (emergencyError) throw emergencyError;
      setEmergencyTypes(emergencyData || []);
      if (user?.role?.toLowerCase() === 'admin') {
              const { data: staffData, error: staffError } = await supabase
                .from("staff")
                .select("id, name, email, role")
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
            incident_type_id: typeId
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
            details: emergencyType?.name === 'Others' ? otherEmergencyDetails : null
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
            uploaded_by: user?.id
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
        created_by : staffId || '',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 md:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="md:shadow border border-gray-300 bg-white p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 py-1 border-b mb-6 border-gray-400 gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} className="mr-1" /> Back 
            </button>
            <h1 className="text-xl font-semibold text-slate-800 text-center">
              Incident Log
            </h1>
            <div className="text-xs text-slate-500">
              Created: {new Date().toLocaleDateString('en-AU')}
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Section 1: Client & Incident Details */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">Client & Incident Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Client *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                      className="w-full p-2.5 border border-slate-300 text-left flex justify-between items-center hover:bg-gray-50"
                    >
                      <span className={incidentData.client_id ? "text-gray-900" : "text-gray-500"}>
                        {getSelectedClientName()}
                      </span>
                      <ChevronDown size={14} className="text-gray-500" />
                    </button>
                    
                    {showClientDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 shadow-lg max-h-60 overflow-auto">
                        <div className="p-2 border-b border-slate-200">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search clients..."
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto">
                          {filteredClients.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No clients found
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
                                className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 border-slate-200 flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {client.first_name} {client.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    NDIS: {client.ndis_number || 'N/A'}
                                  </div>
                                </div>
                                {incidentData.client_id === client.id && (
                                  <div className="w-2 h-2 bg-blue-600"></div>
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
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Event Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      name="event_date"
                      value={incidentData.event_date}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Hierarchy */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Hierarchy *</label>
                  <select
                    name="hierarchy_id"
                    value={incidentData.hierarchy_id}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Please select Hierarchy</option>
                    {hierarchies.map(hierarchy => (
                      <option key={hierarchy.id} value={hierarchy.id}>
                        {hierarchy.name} {hierarchy.code ? `(${hierarchy.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    placeholder="Enter incident subject"
                    value={incidentData.subject}
                    onChange={handleInputChange}
                    className="p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Type of Incident */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Type of Incident *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {incidentTypes.map(type => (
                    <label
                      key={type.id}
                      className="flex items-center space-x-2 p-3 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIncidentTypes.includes(type.id)}
                        onChange={() => handleIncidentTypeToggle(type.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        disabled={isSubmitting}
                      />
                      <span className="text-xs text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: General Information */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">General Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incident Date */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Incident Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      name="incident_date"
                      value={incidentData.incident_date}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="time"
                      name="incident_time"
                      value={incidentData.incident_time}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="location"
                      placeholder="Enter incident location"
                      value={incidentData.location}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Witnesses */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Witnesses</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="witnesses"
                      placeholder="Enter witness names"
                      value={incidentData.witnesses}
                      onChange={handleInputChange}
                      className="w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Assistance */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Emergency Assistance
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {emergencyTypes.map(type => (
                    <label
                      key={type.id}
                      className="flex items-center space-x-2 p-3 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmergencyAssistance.includes(type.id)}
                        onChange={() => handleEmergencyAssistanceToggle(type.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        disabled={isSubmitting}
                      />
                      <span className="text-xs text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Police Event Number (conditionally shown) */}
              {selectedEmergencyAssistance.some(id => {
                const type = emergencyTypes.find(t => t.id === id);
                return type?.name === 'Police';
              }) && (
                <div className="mt-6">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Police Event Number
                  </label>
                  <input
                    type="text"
                    name="police_event_number"
                    placeholder="Enter police event number"
                    value={incidentData.police_event_number}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Other Emergency Details (conditionally shown) */}
              {selectedEmergencyAssistance.some(id => {
                const type = emergencyTypes.find(t => t.id === id);
                return type?.name === 'Others';
              }) && (
                <div className="mt-6">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Other Emergency Details
                  </label>
                  <textarea
                    value={otherEmergencyDetails}
                    onChange={(e) => setOtherEmergencyDetails(e.target.value)}
                    placeholder="Please specify other emergency assistance details"
                    rows="2"
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>

            {/* Section 3: Incident Narrative */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">Incident Narrative</h2>
              
              <div className="space-y-6">
                {/* Incident Summary */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Incident Summary
                  </label>
                  <textarea
                    name="incident_summary"
                    placeholder="Provide a brief summary of the incident..."
                    value={incidentData.incident_summary}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Antecedent */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Antecedent - What was happening before the incident?
                  </label>
                  <textarea
                    name="antecedent"
                    placeholder="Describe what was happening before the incident..."
                    value={incidentData.antecedent}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Incident Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Describe the incident
                  </label>
                  <textarea
                    name="incident_description"
                    placeholder="Provide a detailed description of the incident..."
                    value={incidentData.incident_description}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {/* De-escalation and Outcome */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    De-escalation process and Outcome of incident
                  </label>
                  <textarea
                    name="deescalation_outcome"
                    placeholder="Describe the de-escalation process and outcome..."
                    value={incidentData.deescalation_outcome}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Attachments */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">Attachments</h2>
              
              <div className="border-2 border-dashed border-slate-300 p-6 hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  disabled={isSubmitting}
                />
                
                {attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Upload size={28} className="text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600 mb-2">
                      Drag & drop files here, or click to browse
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium cursor-pointer transition-colors"
                      disabled={isSubmitting}
                    >
                      Add File
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                      Supported: documents, reports, photos, etc.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
                        </p>
                        <p className="text-xs text-slate-500">
                          Click "Add File" to add more
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-100 text-blue-600 text-sm font-medium hover:bg-blue-200 transition-colors"
                        disabled={isSubmitting}
                      >
                        <Plus size={16} className="inline mr-1" />
                        Add File
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center justify-between bg-slate-50 p-3">
                          <div className="flex items-center space-x-3">
                            {attachment.type?.startsWith('image/') ? (
                              <Image size={20} className="text-slate-600" />
                            ) : (
                              <FileText size={20} className="text-slate-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-700 truncate max-w-xs">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(attachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {attachment.status === 'uploading' && uploadProgress[attachment.id] > 0 && (
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-slate-200 h-1.5">
                                  <div 
                                    className="bg-blue-600 h-1.5 transition-all duration-300"
                                    style={{ width: `${uploadProgress[attachment.id]}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500">
                                  {uploadProgress[attachment.id]}%
                                </span>
                              </div>
                            )}
                            
                            {attachment.status === 'completed' && (
                              <span className="text-xs text-green-600 font-medium">
                                ✓ Uploaded
                              </span>
                            )}
                            
                            {attachment.status === 'failed' && (
                              <span className="text-xs text-red-600 font-medium">
                                ✗ Failed
                              </span>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => removeAttachment(attachment.id)}
                              className="text-slate-500 hover:text-red-600 transition-colors p-1"
                              disabled={isSubmitting}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Incident Rating Section */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">
                Incident Rating Table
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="bg-green-600 text-white p-3 border">Low</th>
                      <th className="bg-orange-500 text-white p-3 border">Medium</th>
                      <th className="bg-yellow-400 text-slate-900 p-3 border">High</th>
                      <th className="bg-red-600 text-white p-3 border">Critical</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="align-top">
                      {/* LOW */}
                      <td className="p-3 border">
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Agitation / Hyperarousal</li>
                          <li>Food refusal</li>
                          <li>Disruption of routine</li>
                          <li>Physical threats</li>
                          <li>Verbal abuse / swearing</li>
                          <li>Non-compliance to support direction</li>
                          <li>Sleep disturbance</li>
                          <li>Awake but not disturbing others</li>
                        </ul>
                      </td>

                      {/* MEDIUM */}
                      <td className="p-3 border">
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Absconding (habitual)</li>
                          <li>Incident involving another person</li>
                          <li>Medication error</li>
                          <li>Medication refusal</li>
                          <li>PRN administration</li>
                          <li>Property damage (minor)</li>
                          <li>Verbal abuse (persistent more than 10 mins)</li>
                          <li>Indecent behaviour (acts of sexual nature)</li>
                          <li>Sleep disturbance (awake disturbing others)</li>
                          <li>Bowel not opened for 3 days</li>
                          <li>Seizures (known and well managed as EMP)</li>
                        </ul>
                      </td>

                      {/* HIGH */}
                      <td className="p-3 border">
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Hospitalization</li>
                          <li>Falls</li>
                          <li>Infections</li>
                          <li>Absconding requiring missing person's report</li>
                          <li>Assault requiring medical support</li>
                          <li>Extreme property damage</li>
                          <li>Illicit substance or alcohol possession / use</li>
                          <li>Severe injuries</li>
                          <li>Unexplained injuries</li>
                          <li>Self-harm or harm to others</li>
                          <li>Suicidal thoughts</li>
                          <li>Financial misconduct</li>
                          <li>Bowel not opened for more than 3 days</li>
                          <li>Seizures (requiring emergencies or hospitalization)</li>
                          <li>CTO related</li>
                        </ul>
                      </td>

                      {/* CRITICAL */}
                      <td className="p-3 border">
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Death</li>
                          <li>Serious injury</li>
                          <li>Abuse and neglect</li>
                          <li>Unlawful sexual or physical contact with client</li>
                          <li>Sexual misconduct and grooming of clients</li>
                          <li>Use of unauthorised restrictive practices</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Incident Rating Selection */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Rating of Incident *
                </label>
                <div className="flex flex-wrap gap-4">
                  {["Low", "Medium", "High", "Critical"].map(level => (
                    <label key={level} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="incident_rating"
                        value={level.toLowerCase()}
                        checked={incidentData.incident_rating === level.toLowerCase()}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* PRN Section */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">PRN</h2>

              {/* PRN Approved */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  PRN Approved? *
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="prn_approved"
                        value={val.toLowerCase()}
                        checked={incidentData.prn_approved === val.toLowerCase()}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PRN Provided */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  PRN Provided? *
                </label>
                <div className="flex flex-wrap gap-4">
                  {["Provided", "Not Provided", "Refused"].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="prn_provided"
                        value={val.toLowerCase()}
                        checked={incidentData.prn_provided === val.toLowerCase()}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PRN Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  PRN Notes
                </label>
                <textarea
                  name="prn_notes"
                  placeholder="Enter PRN notes..."
                  value={incidentData.prn_notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Physical Intervention Section */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">
                Physical Intervention – Restrictive Practice
              </h2>

              {/* Did you physically hold the client? */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Did you physically hold the client? *
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="physical_intervention"
                        value={val.toLowerCase()}
                        checked={incidentData.physical_intervention === val.toLowerCase()}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type of restraint (conditionally shown) */}
              {incidentData.physical_intervention === 'yes' && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Type of restraint *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Blocked", "Hold client's hands", "Seated", "Standing", "Escorted", "Tackled to ground"].map(type => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="physical_intervention_type"
                          value={type.toLowerCase()}
                          checked={incidentData.physical_intervention_type === type.toLowerCase()}
                          onChange={handleInputChange}
                          className="text-blue-600"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration (conditionally shown) */}
              {incidentData.physical_intervention === 'yes' && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    How long did the intervention last?
                  </label>
                  <input
                    type="text"
                    name="physical_intervention_duration"
                    placeholder="e.g., 5 minutes, 10 seconds"
                    value={incidentData.physical_intervention_duration}
                    onChange={handleInputChange}
                    className="w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Injury Status (conditionally shown) */}
              {incidentData.physical_intervention === 'yes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Client injured */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Client injured? *
                    </label>
                    <div className="flex gap-4">
                      {["Yes", "No"].map(val => (
                        <label key={val} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="client_injured"
                            value={val.toLowerCase()}
                            checked={incidentData.client_injured === val.toLowerCase()}
                            onChange={handleInputChange}
                            className="text-blue-600"
                          />
                          <span className="text-sm">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Staff injured */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Staff injured? *
                    </label>
                    <div className="flex gap-4">
                      {["Yes", "No"].map(val => (
                        <label key={val} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="staff_injured"
                            value={val.toLowerCase()}
                            checked={incidentData.staff_injured === val.toLowerCase()}
                            onChange={handleInputChange}
                            className="text-blue-600"
                          />
                          <span className="text-sm">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Follow Up Section */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">Follow Up</h2>

              {/* Follow up required */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Follow up required?
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="follow_up_required"
                        value={val.toLowerCase()}
                        checked={incidentData.follow_up_required === val.toLowerCase()}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Management contacted */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Was On Call / House Manager / Senior Management Contacted? *
                </label>
                <div className="flex gap-4">
                  {["Yes", "No"].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="management_contacted"
                        value={val.toLowerCase()}
                        checked={incidentData.management_contacted === val.toLowerCase()}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{val}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
                  {/* Section: Reported By (Admin Only) */}
          {isAdmin && (
                          <div className="border border-slate-200 p-6 bg-amber-50">
                            <div className="flex items-center gap-2 mb-4">
                              <Users className="text-amber-600" size={18} />
                              <h2 className="text-base font-semibold text-slate-700">Reported By</h2>
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 font-medium">
                                Admin Only
                              </span>
                            </div>
                            
                            <div className="bg-white p-4 border border-amber-200">
                              <div className="flex flex-col">
                                <label className="text-xs font-medium text-slate-600 mb-1">
                                  Select Staff Member *
                                </label>
                                <div className="relative">
                                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <select
                                    name="created_by"
                                    value={incidentData.created_by}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    required
                                    disabled={isSubmitting}
                                  >
                                    <option value="">Select staff who is reporting this note</option>
                                    {staffList.map(staff => (
                                      <option key={staff.id} value={staff.id}>
                                        {staff.name} {staff.email ? `(${staff.email})` : ''} - {staff.role || 'Staff'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
                                  <span className="text-amber-600 font-bold">ℹ</span>
                                  As an admin, you can create progress notes on behalf of other staff members. 
                                  Select the staff member who actually performed this shift.
                                </p>
                              </div>
                            </div>
                          </div>
             )}
            

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-xs text-slate-500">
                  * Required fields must be completed
                </p>
                
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-5 w-5 rounded-full border-b-2 border-white"></div>
                      Logging Incident...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Log Incident
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddIncident;