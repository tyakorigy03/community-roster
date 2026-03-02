import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Save, 
  X, 
  Calendar,
  Clock,
  ChevronDown,
  Search,
  User,
  Lock,
  Users,
  FileEdit
} from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";

function EditProgressNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const shift_id = queryParams.get("shift_id") || null;
  
  const [progressNote, setProgressNote] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [staffId, setStaffId] = useState(null);

  const { currentStaff } = useUser();

  // Form state
  const [progressNoteData, setProgressNoteData] = useState({
    client_id: "",
    event_date: "",
    hierarchy_id: "",
    subject: "",
    shift_date: "",
    shift_start_time: "",
    shift_end_time: "",
    shift_type_id: "",
    other_shift_type_specification: "",
    shift_notes: "",
    created_by: ""
  });
  
  // UI states
  const [clients, setClients] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Set staff ID and check if admin
  useEffect(() => {
    if (currentStaff) {
      setStaffId(currentStaff.id);
      
      // Check if user is admin
      const adminRole = currentStaff.role?.toLowerCase() === 'admin';
      setIsAdmin(adminRole);
    }
  }, [currentStaff]);

  // Fetch progress note data
  useEffect(() => {
    const fetchProgressNote = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        // Fetch progress note with related data
        const { data: noteData, error: noteError } = await supabase
          .from("progress_notes")
          .select(`
            *,
            client:client_id(first_name, last_name, ndis_number),
            hierarchy:hierarchy_id(name, code),
            shift_type:shift_type_id(name, requires_specification),
            staff:created_by(name, email, role)
          `)
          .eq("id", id)
          .single();

        if (noteError) throw noteError;

        if (!noteData) {
          toast.error("Progress note not found");
          navigate("/progress-notes");
          return;
        }

        setProgressNote(noteData);
        
        // Set client data
        if (noteData.client) {
          setClientData({
            id: noteData.client_id,
            first_name: noteData.client.first_name,
            last_name: noteData.client.last_name,
            ndis_number: noteData.client.ndis_number
          });
        }

        // Check if current user is the author
        if (currentStaff) {
          setIsAuthor(noteData.created_by === currentStaff.id);
        }

        // Set form data
        setProgressNoteData({
          client_id: noteData.client_id || "",
          event_date: noteData.event_date ? new Date(noteData.event_date).toISOString().split('T')[0] : "",
          hierarchy_id: noteData.hierarchy_id || "",
          subject: noteData.subject || "",
          shift_date: noteData.shift_date ? new Date(noteData.shift_date).toISOString().split('T')[0] : "",
          shift_start_time: noteData.shift_start_time || "",
          shift_end_time: noteData.shift_end_time || "",
          shift_type_id: noteData.shift_type_id || "",
          other_shift_type_specification: noteData.other_shift_type_specification || "",
          shift_notes: noteData.shift_notes || "",
          created_by: noteData.created_by || (currentStaff?.role?.toLowerCase() === 'admin' ? "" : currentStaff?.id || "")
        });

        // Fetch shift data if linked
        if (noteData.shift_id) {
          const { data: shiftData, error: shiftError } = await supabase
            .from('shifts')
            .select(`
              *,
              client:client_id(first_name, last_name, ndis_number),
              shift_type:shift_type_id(name, id)
            `)
            .eq('id', noteData.shift_id)
            .single();

          if (!shiftError && shiftData) {
            setShiftData(shiftData);
          }
        }

      } catch (error) {
        console.error("Error fetching progress note:", error);
        toast.error("Failed to load progress note");
        navigate("/progress-notes");
      } finally {
        setLoading(false);
      }
    };

    fetchProgressNote();
  }, [id, currentStaff, navigate]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
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

        // Fetch shift types
        const { data: shiftTypesData, error: shiftTypesError } = await supabase
          .from("shift_types")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (shiftTypesError) throw shiftTypesError;
        setShiftTypes(shiftTypesData || []);

        // Fetch staff list for admin users
        if (currentStaff?.role?.toLowerCase() === 'admin') {
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
      }
    };

    if (id) {
      fetchInitialData();
    }
  }, [id, currentStaff]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProgressNoteData(prev => ({ ...prev, [name]: value }));
  };

  const getSelectedClientName = () => {
    if (clientData) {
      return `${clientData.first_name} ${clientData.last_name}`;
    }
    
    if (!progressNoteData.client_id) return "Select a client";
    const client = clients.find(c => c.id === progressNoteData.client_id);
    return client ? `${client.first_name} ${client.last_name}` : "Select a client";
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-AU');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU') + ' ' + date.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check permissions
    if (!isAdmin && !isAuthor) {
      toast.error("You don't have permission to edit this progress note");
      return;
    }
    
    // Validate required fields
    if (!progressNoteData.client_id) {
      toast.error("Please select a client");
      return;
    }
    
    if (!progressNoteData.event_date) {
      toast.error("Please select event date");
      return;
    }
    
    if (!progressNoteData.hierarchy_id) {
      toast.error("Please select hierarchy");
      return;
    }
    
    if (!progressNoteData.shift_notes) {
      toast.error("Please enter shift notes");
      return;
    }

    // Validate created_by for admin
    if (isAdmin && !progressNoteData.created_by) {
      toast.error("Please select who is reporting this note");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the selected created_by for admin, or current staff for non-admin
      const createdBy = isAdmin ? progressNoteData.created_by : staffId;

      // Update progress note
      const { data: updatedNote, error: noteError } = await supabase
        .from("progress_notes")
        .update({
          client_id: progressNoteData.client_id,
          event_date: progressNoteData.event_date,
          hierarchy_id: progressNoteData.hierarchy_id,
          subject: progressNoteData.subject,
          shift_date: progressNoteData.shift_date,
          shift_start_time: progressNoteData.shift_start_time,
          shift_end_time: progressNoteData.shift_end_time,
          shift_type_id: progressNoteData.shift_type_id,
          other_shift_type_specification: progressNoteData.other_shift_type_specification,
          shift_notes: progressNoteData.shift_notes,
          updated_at: new Date().toISOString(),
          updated_by: currentStaff.id,
          created_by: progressNoteData.created_by?progressNoteData.created_by:currentStaff.id,
          ...(isAdmin ? { created_by: createdBy } : {})
        })
        .eq("id", id)
        .select()
        .single();

      if (noteError) throw noteError;

      toast.success("Progress note updated successfully!");
      
      // Navigate to progress notes list
      navigate("/progress-notes");

    } catch (err) {
      console.error(err);
      toast.error("Error updating progress note. Please try again.");
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

  if (!progressNote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-700 mb-2">Progress note not found</div>
          <button
            onClick={() => navigate("/progress-notes")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
          >
            Back to Progress Notes
          </button>
        </div>
      </div>
    );
  }

  // Check if user can edit
  const canEdit = isAdmin || isAuthor;

  return (
    <div className="min-h-screen bg-slate-100 md:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="md:shadow border border-gray-300 bg-white p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 py-1 border-b mb-6 border-gray-400 gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} className="mr-1" /> Back 
            </button>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <FileEdit size={18} className="text-blue-600" />
                <h1 className="text-xl font-semibold text-slate-800">
                  Edit Progress Note
                </h1>
              </div>
              {shift_id && (
                <div className="flex items-center justify-center gap-2 mt-1 text-xs text-green-600">
                  <Lock size={12} />
                  <span>Linked to Shift: {shift_id.substring(0, 8)}...</span>
                </div>
              )}
              <div className="text-xs text-slate-500 mt-1">
                ID: {id}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Last updated: {progressNote.updated_at ? formatDateTime(progressNote.updated_at) : 'Never'}
            </div>
          </div>

          {/* Permission Warning */}
          {!canEdit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <Lock size={16} />
                <span className="font-medium">You don't have permission to edit this progress note.</span>
              </div>
              <p className="text-xs text-red-600 mt-1">
                Only the author or administrators can edit progress notes.
              </p>
            </div>
          )}

          {/* Shift Info Banner */}
          {shiftData && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-blue-600" />
                    <span className="font-medium text-blue-800">Client: {clientData?.first_name} {clientData?.last_name}</span>
                  </div>
                  <div className="text-xs text-blue-600">
                    Shift Date: {formatDate(shiftData.shift_date)} | 
                    Time: {formatTime(shiftData.start_time)} - {formatTime(shiftData.end_time)}
                    {shiftData.shift_type?.name && ` | Type: ${shiftData.shift_type.name}`}
                  </div>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1">
                  Linked to shift
                </div>
              </div>
            </div>
          )}

          {/* Created Info */}
          {progressNote.staff && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-gray-600" />
                    <span className="font-medium text-gray-800">
                      Created by: {progressNote.staff.name} 
                      {progressNote.staff.email && ` (${progressNote.staff.email})`}
                      {progressNote.staff.role && ` - ${progressNote.staff.role}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Created on: {formatDateTime(progressNote.created_at)}
                  </div>
                </div>
                {isAuthor && (
                  <div className="text-xs bg-gray-100 text-gray-700 px-3 py-1">
                    You created this note
                  </div>
                )}
              </div>
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Section 1: Client & Basic Info */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">Client & Basic Info</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                    Client *
                    {shiftData && <Lock size={12} className="text-gray-400" />}
                  </label>
                  {shiftData ? (
                    <div className="relative">
                      <div className="w-full p-2.5 border border-slate-300 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center">
                          <User size={14} className="text-gray-500 mr-2" />
                          <span className="text-gray-900">
                            {clientData?.first_name} {clientData?.last_name}
                          </span>
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1">
                          Linked to shift
                        </div>
                      </div>
                      <input type="hidden" name="client_id" value={progressNoteData.client_id} />
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => canEdit && setShowClientDropdown(!showClientDropdown)}
                        className={`w-full p-2.5 border border-slate-300 text-left flex justify-between items-center ${
                          canEdit ? 'hover:bg-gray-50' : 'bg-gray-50 cursor-not-allowed'
                        }`}
                        disabled={!canEdit}
                      >
                        <span className={progressNoteData.client_id ? "text-gray-900" : "text-gray-500"}>
                          {getSelectedClientName()}
                        </span>
                        {canEdit && <ChevronDown size={14} className="text-gray-500" />}
                      </button>
                      
                      {showClientDropdown && canEdit && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 shadow-lg max-h-100">
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
                                    setProgressNoteData(prev => ({ ...prev, client_id: client.id }));
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
                                  {progressNoteData.client_id === client.id && (
                                    <div className="w-2 h-2 bg-blue-600"></div>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Date */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Event Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      name="event_date"
                      value={progressNoteData.event_date}
                      onChange={handleInputChange}
                      className={`w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      required
                      disabled={isSubmitting || !canEdit}
                    />
                  </div>
                </div>

                {/* Hierarchy */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Hierarchy *</label>
                  <select
                    name="hierarchy_id"
                    value={progressNoteData.hierarchy_id}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                    required
                    disabled={isSubmitting || !canEdit}
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
                    placeholder="Enter progress note subject"
                    value={progressNoteData.subject}
                    onChange={handleInputChange}
                    className={`p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isSubmitting || !canEdit}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Shift Details */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base border-b border-slate-200 font-semibold text-slate-700 mb-4">Shift Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shift Date */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                    Date of shift
                    {shiftData && <Lock size={12} className="text-gray-400" />}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      name="shift_date"
                      value={progressNoteData.shift_date}
                      onChange={handleInputChange}
                      className={`w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        shiftData || !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isSubmitting || shiftData || !canEdit}
                      readOnly={shiftData}
                    />
                  </div>
                </div>

                {/* Shift Start Time */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                    Shift start time
                    {shiftData && <Lock size={12} className="text-gray-400" />}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="time"
                      name="shift_start_time"
                      value={progressNoteData.shift_start_time}
                      onChange={handleInputChange}
                      className={`w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        shiftData || !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isSubmitting || shiftData || !canEdit}
                      readOnly={shiftData}
                    />
                  </div>
                </div>

                {/* Shift End Time */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                    Shift end time
                    {shiftData && <Lock size={12} className="text-gray-400" />}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="time"
                      name="shift_end_time"
                      value={progressNoteData.shift_end_time}
                      onChange={handleInputChange}
                      className={`w-full pl-10 p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        shiftData || !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isSubmitting || shiftData || !canEdit}
                      readOnly={shiftData}
                    />
                  </div>
                </div>

                {/* Shift Type */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-2">
                    Shift type *
                    {shiftData && shiftData.shift_type_id && <Lock size={12} className="text-gray-400" />}
                  </label>
                  <select
                    name="shift_type_id"
                    value={progressNoteData.shift_type_id}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      (shiftData && shiftData.shift_type_id) || !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                    required
                    disabled={isSubmitting || (shiftData && shiftData.shift_type_id) || !canEdit}
                  >
                    <option value="">Select shift type</option>
                    {shiftTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Other Shift Type Specification (conditional) */}
              {progressNoteData.shift_type_id && shiftTypes.find(t => t.id === progressNoteData.shift_type_id)?.requires_specification && (
                <div className="mt-6">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    If Other, please specify
                  </label>
                  <input
                    type="text"
                    name="other_shift_type_specification"
                    placeholder="Specify other shift type..."
                    value={progressNoteData.other_shift_type_specification}
                    onChange={handleInputChange}
                    className={`w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isSubmitting || !canEdit}
                  />
                </div>
              )}
            </div>

            {/* Section 3: Progress Notes Content */}
            <div className="border border-slate-200 p-6">
              <h2 className="text-base font-semibold border-b border-slate-200 text-slate-700 mb-4">Progress Notes Content</h2>
              
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Shift notes *
                </label>
                <textarea
                  name="shift_notes"
                  placeholder="Enter detailed shift notes..."
                  value={progressNoteData.shift_notes}
                  onChange={handleInputChange}
                  rows="8"
                  className={`w-full p-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                  required
                  disabled={isSubmitting || !canEdit}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Mandatory field. Provide detailed notes about the shift.
                </p>
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
                        value={progressNoteData.created_by}
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
                      As an admin, you can update the staff member who reported this note.
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
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/progress-notes")}
                    className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  
                  {canEdit && (
                    <button
                      type="submit"
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin h-5 w-5 rounded-full border-b-2 border-white"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save size={18} /> Update Progress Note
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditProgressNote;