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
  FileText,
  Lock,
  Users,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";

function AddProgressNote() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const shift_id = queryParams.get("shift_id") || null;
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

      // If not admin, automatically set created_by to current staff
      if (!adminRole) {
        setProgressNoteData(prev => ({
          ...prev,
          created_by: currentStaff.id
        }));
      }
    }
  }, [currentStaff]);

  // Fetch shift data if shift_id is provided
  useEffect(() => {
    const fetchShiftData = async () => {
      if (!shift_id || !currentStaff?.tenant_id) return;
      
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
          .eq('tenant_id', currentStaff.tenant_id)
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
          setProgressNoteData(prev => ({
            ...prev,
            client_id: fetchedShift.client_id,
            event_date: new Date().toISOString().split('T')[0],
            shift_date: fetchedShift.shift_date,
            shift_start_time: fetchedShift.start_time?.substring(0, 5) || '',
            shift_end_time: fetchedShift.end_time?.substring(0, 5) || '',
            shift_type_id: fetchedShift.shift_type_id,
            subject: `Shift on ${formatDate(fetchedShift.shift_date)} - ${fetchedShift.shift_type?.name || 'General'}`
          }));

          toast.success('Shift data loaded successfully');
        }
      } catch (error) {
        console.error("Error fetching shift data:", error);
        toast.error("Failed to load shift data. Please fill manually.");
      }
    };

    fetchShiftData();
  }, [shift_id, currentStaff?.tenant_id]);

  // Fetch initial data
  useEffect(() => {
    if (currentStaff?.tenant_id) {
      fetchInitialData();
    }
  }, [currentStaff?.tenant_id, clientData]); // Added clientData to avoid refetching if already set by shift

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

      // Fetch clients only if we don't have client from shift
      if (!clientData) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, first_name, last_name, ndis_number")
          .eq("tenant_id", currentStaff.tenant_id)
          .eq("is_active", true)
          .order("first_name", { ascending: true });

        if (clientsError) throw clientsError;
        setClients(clientsData || []);
        setFilteredClients(clientsData?.slice(0, 10) || []);
      }

      // Fetch hierarchies
      const { data: hierarchiesData, error: hierarchiesError } = await supabase
        .from("hierarchy")
        .select("id, name, code")
        .eq("tenant_id", currentStaff.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(hierarchiesData || []);

      // Fetch shift types
      const { data: shiftTypesData, error: shiftTypesError } = await supabase
        .from("shift_types")
        .select("*")
        .eq("tenant_id", currentStaff.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (shiftTypesError) throw shiftTypesError;
      setShiftTypes(shiftTypesData || []);

      // Fetch staff list for admin users
      if (currentStaff?.role?.toLowerCase() === 'admin') {
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("id, name, email, role")
          .eq("tenant_id", currentStaff.tenant_id)
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      // Insert progress note
      const { data: progressNote, error: noteError } = await supabase
        .from("progress_notes")
        .insert([{
          shift_id: shift_id || null,
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
          key_areas: [],
          created_by: createdBy,
          tenant_id: currentStaff.tenant_id
        }])
        .select()
        .single();

      if (noteError) throw noteError;

      // Update shift with progress_note_id
      if (shift_id) {
        await supabase
          .from('shifts')
          .update({ progress_note_id: progressNote.id })
          .eq('id', shift_id)
          .eq('tenant_id', currentStaff.tenant_id);
      }

      toast.success("Progress note saved successfully!");

      // Navigate to progress notes list
      navigate("/progress-notes");

    } catch (err) {
      console.error(err);
      toast.error("Error saving progress note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading Form...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 animate-in fade-in duration-500">
      {/* Compact Header */}
      <div className="flex gap-3 flex-row justify-between items-center p-4 lg:px-6 lg:py-3 pt-safe border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-100/50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0">
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">New Progress Note</h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              Create New Entry • {new Date().toLocaleDateString('en-AU')}
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
                <Save size={13} /> Save
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Shift Info Banner */}
        {shiftData && (
          <div className="mb-6 bg-blue-600 border border-blue-700 rounded-[1.5rem] p-5 shadow-lg animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Lock size={18} className="text-white" />
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
                <p className="text-[11px] font-black text-white">{formatTime(shiftData.start_time)} - {formatTime(shiftData.end_time)}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          {/* Client & Basic Info */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                <User size={14} className="text-blue-600" />
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Client & Registry</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Selection */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                  Client Entity *
                  {shiftData && <Lock size={10} className="text-slate-300" />}
                </label>

                {shiftData ? (
                  <div className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 truncate">
                      {clientData?.first_name} {clientData?.last_name}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100">Locked</span>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-tight flex justify-between items-center hover:bg-white hover:border-blue-200 transition-all"
                    >
                      <span className={progressNoteData.client_id ? "text-slate-900 truncate" : "text-slate-300"}>
                        {getSelectedClientName()}
                      </span>
                      <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-2" />
                    </button>

                    {showClientDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                        <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full h-10 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                          {filteredClients.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matches</p>
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
                                className={`w-full p-3 text-left rounded-xl transition-all flex justify-between items-center ${
                                  progressNoteData.client_id === client.id 
                                    ? 'bg-blue-600 text-white' 
                                    : 'hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-[11px] font-black uppercase tracking-tight truncate">
                                    {client.first_name} {client.last_name}
                                  </div>
                                  <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
                                    progressNoteData.client_id === client.id ? 'text-white/60' : 'text-slate-400'
                                  }`}>
                                    {client.ndis_number || 'No NDIS'}
                                  </div>
                                </div>
                                {progressNoteData.client_id === client.id && (
                                  <CheckCircle size={14} className="flex-shrink-0 ml-2" />
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
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Entry Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    name="event_date"
                    value={progressNoteData.event_date}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Hierarchy */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Classification *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    name="hierarchy_id"
                    value={progressNoteData.hierarchy_id}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-tight appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select Hierarchy</option>
                    {hierarchies.map(hierarchy => (
                      <option key={hierarchy.id} value={hierarchy.id}>
                        {hierarchy.name} {hierarchy.code ? `[${hierarchy.code}]` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  placeholder="Brief description..."
                  value={progressNoteData.subject}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300 disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                <Clock size={14} className="text-blue-600" />
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Shift Details</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Shift Date */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                  Date
                  {shiftData && <Lock size={8} className="text-slate-300" />}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="date"
                    name="shift_date"
                    value={progressNoteData.shift_date}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    disabled={isSubmitting || !!shiftData}
                  />
                </div>
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                  Start
                  {shiftData && <Lock size={8} className="text-slate-300" />}
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="time"
                    name="shift_start_time"
                    value={progressNoteData.shift_start_time}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    disabled={isSubmitting || !!shiftData}
                  />
                </div>
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                  End
                  {shiftData && <Lock size={8} className="text-slate-300" />}
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="time"
                    name="shift_end_time"
                    value={progressNoteData.shift_end_time}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    disabled={isSubmitting || !!shiftData}
                  />
                </div>
              </div>

              {/* Shift Type */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                  Type *
                  {shiftData && shiftData.shift_type_id && <Lock size={8} className="text-slate-300" />}
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <select
                    name="shift_type_id"
                    value={progressNoteData.shift_type_id}
                    onChange={handleInputChange}
                    className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-tight appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
                    required
                    disabled={isSubmitting || (shiftData && shiftData.shift_type_id)}
                  >
                    <option value="">Select</option>
                    {shiftTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Other Specification */}
            {progressNoteData.shift_type_id && shiftTypes.find(t => t.id === progressNoteData.shift_type_id)?.requires_specification && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-1.5 block">Specification</label>
                <input
                  type="text"
                  name="other_shift_type_specification"
                  placeholder="Specify details..."
                  value={progressNoteData.other_shift_type_specification}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300 disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          {/* Progress Notes Content */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] uppercase tracking-tight text-slate-900 font-black">Progress Notes</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Detailed Documentation</p>
              </div>
              <FileText className="text-blue-500" size={16} />
            </div>

            <div className="p-5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-2 block">Notes *</label>
              <textarea
                name="shift_notes"
                placeholder="Enter comprehensive service delivery details..."
                value={progressNoteData.shift_notes}
                onChange={handleInputChange}
                rows="10"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none disabled:opacity-50"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Character Limit: Unbounded</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Ready</span>
              </div>
            </div>
          </div>

          {/* Admin Override */}
          {isAdmin && (
            <div className="bg-amber-50 border border-amber-100 rounded-[1.5rem] p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-0.5">Admin Override</p>
                  <h3 className="text-slate-900 text-[12px] font-black uppercase tracking-tight">Assign Author</h3>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    name="created_by"
                    value={progressNoteData.created_by}
                    onChange={handleInputChange}
                    className="w-full h-12 pl-10 pr-4 bg-white border border-amber-200 rounded-xl text-[11px] font-bold uppercase tracking-tight text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select Author...</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} [{staff.role || 'STAFF'}]
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed px-1">
                  Record will be credited to selected staff member
                </p>
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm sticky bottom-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed max-w-md">
                  Changes logged for audit. Authentication confirmed.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 sm:flex-none px-6 py-3 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Create Note
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

export default AddProgressNote;