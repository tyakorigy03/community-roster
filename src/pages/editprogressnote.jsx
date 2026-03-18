import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Save,
  X,
  Calendar,
  Clock,
  ChevronDown,
  FileText,
  Search,
  User,
  Lock,
  Users,
  FileEdit,
  AlertCircle,
  CheckCircle
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
          .eq("tenant_id", currentStaff.tenant_id)
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
            .eq('tenant_id', currentStaff.tenant_id)
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
  }, [id, currentStaff?.tenant_id, navigate]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, first_name, last_name, ndis_number")
          .eq("is_active", true)
          .eq("tenant_id", currentStaff.tenant_id)
          .order("first_name", { ascending: true });

        if (clientsError) throw clientsError;
        setClients(clientsData || []);
        setFilteredClients(clientsData?.slice(0, 10) || []);

        // Fetch hierarchies
        const { data: hierarchiesData, error: hierarchiesError } = await supabase
          .from("hierarchy")
          .select("id, name, code")
          .eq("is_active", true)
          .eq("tenant_id", currentStaff.tenant_id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (hierarchiesError) throw hierarchiesError;
        setHierarchies(hierarchiesData || []);

        // Fetch shift types
        const { data: shiftTypesData, error: shiftTypesError } = await supabase
          .from("shift_types")
          .select("*")
          .eq("is_active", true)
          .eq("tenant_id", currentStaff.tenant_id)
          .order("sort_order", { ascending: true });

        if (shiftTypesError) throw shiftTypesError;
        setShiftTypes(shiftTypesData || []);

        // Fetch staff list for admin users
        if (currentStaff?.role?.toLowerCase() === 'admin') {
          const { data: staffData, error: staffError } = await supabase
            .from("staff")
            .select("id, name, email, role")
            .eq("is_active", true)
            .eq("tenant_id", currentStaff.tenant_id)
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
          created_by: progressNoteData.created_by ? progressNoteData.created_by : currentStaff.id,
          ...(isAdmin ? { created_by: createdBy } : {})
        })
        .eq("id", id)
        .eq("tenant_id", currentStaff.tenant_id)
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
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading Note Editor...</div>
        </div>
      </div>
    );
  }

  if (!progressNote) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white border border-slate-100 rounded-[2rem] p-10 shadow-xl">
          <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Note Not Found</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            The requested progress note could not be located
          </p>
          <button
            onClick={() => navigate("/progress-notes")}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            Return to Notes
          </button>
        </div>
      </div>
    );
  }

  // Check if user can edit
  const canEdit = isAdmin || isAuthor;

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
            <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">Edit Progress Note</h2>
            <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
              ID: {id?.substring(0, 8)} • Modification Interface
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
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
          )}
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Permission Warning */}
        {!canEdit && (
          <div className="mb-6 bg-white border border-red-100 rounded-[1.5rem] p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Lock size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-red-900 uppercase tracking-tight mb-1">Read-Only Mode</h3>
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-wide leading-relaxed">
                  You don't have permission to edit this note. Only the author or administrators can make changes.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column: Core Identity */}
            <div className="lg:col-span-1 space-y-4 lg:space-y-6">
              {/* Client Info */}
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black">Client Entity</div>
                    <div className="text-[13px] font-black text-slate-900 uppercase tracking-tight truncate mt-0.5">
                      {clientData ? `${clientData.first_name} ${clientData.last_name}` : 'No Client'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">NDIS Ref</span>
                    <span className="text-[10px] text-slate-700 font-bold">{clientData?.ndis_number || 'N/A'}</span>
                  </div>
                  {shiftData && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">
                        Linked: Shift {shiftData.id.substring(0, 8)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Administrative Actions */}
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-4 flex items-center gap-2">
                  <Calendar size={12} className="text-blue-600" /> System Control
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1.5">Entry Date</label>
                    <input
                      type="date"
                      name="event_date"
                      value={progressNoteData.event_date}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
                      required
                      disabled={isSubmitting || !canEdit}
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1.5">Classification</label>
                    <select
                      name="hierarchy_id"
                      value={progressNoteData.hierarchy_id}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100 appearance-none"
                      required
                      disabled={isSubmitting || !canEdit}
                    >
                      <option value="">Select Hierarchy</option>
                      {hierarchies.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Author & Audit */}
              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Audit Trail</div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-[8px] font-bold text-green-600 uppercase tracking-widest">Verified</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">Author</div>
                    <div className="text-[11px] font-black text-slate-900 uppercase truncate">
                      {progressNote.staff?.name || 'Unknown'}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Users size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Admin Override</span>
                      </div>
                      <select
                        name="created_by"
                        value={progressNoteData.created_by}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                        required
                        disabled={isSubmitting}
                      >
                        <option value="">Reassign Author</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Content */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* Note Content */}
              <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-[11px] uppercase tracking-tight text-slate-900 font-black">Service Execution Log</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Detailed Documentation</p>
                  </div>
                  <FileText className="text-blue-500" size={16} />
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={progressNoteData.subject}
                      onChange={handleInputChange}
                      placeholder="Brief headline of the shift / event..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] text-slate-900 placeholder:text-slate-300 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
                      disabled={isSubmitting || !canEdit}
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Detailed Observations *</label>
                    <textarea
                      name="shift_notes"
                      value={progressNoteData.shift_notes}
                      onChange={handleInputChange}
                      placeholder="Input comprehensive service delivery details..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-[11px] text-slate-700 placeholder:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none leading-relaxed min-h-[300px] disabled:opacity-50 disabled:bg-slate-100"
                      required
                      disabled={isSubmitting || !canEdit}
                    />
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Character Limit: Unbounded</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Ready</span>
                  </div>
                </div>
              </div>

              {/* Tactical Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-100 rounded-2xl p-4">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Shift Start</div>
                  <div className="flex items-center gap-2 text-slate-900 text-[11px] font-bold">
                    <Clock size={12} className="text-blue-600" />
                    {progressNoteData.shift_start_time || '--:--'}
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Shift End</div>
                  <div className="flex items-center gap-2 text-slate-900 text-[11px] font-bold">
                    <Clock size={12} className="text-blue-600" />
                    {progressNoteData.shift_end_time || '--:--'}
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 md:col-span-2">
                  <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Operation Mode</div>
                  <div className="flex items-center gap-2 text-slate-900 text-[10px] font-black uppercase truncate">
                    {shiftTypes.find(t => t.id === progressNoteData.shift_type_id)?.name || 'Standard Protocol'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Master Control Panel */}
          <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed max-w-md">
                  Changes will be logged for audit. Authentication confirmed.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => navigate("/progress-notes")}
                  className="flex-1 md:flex-none px-6 py-3 border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                {canEdit && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Syncing
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Update Note
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
  );
}

export default EditProgressNote;