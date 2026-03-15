import { X, User, Calendar, Clock, Users, ChevronDown, Check, CheckCircle2, Sparkles, Repeat, Loader2, Save, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { useUser } from "../context/UserContext";

// Helper functions
const TODAY_ISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

const formatHours = (hours) => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0 && minutes === 0) return '0h';
  if (wholeHours === 0) return `${minutes}m`;
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
};

// Shift Form Modal Component (Add/Edit)
export default function ShiftModal({ visible, shift, onClose, onSave, onDelete, staffList = [] }) {
  const { currentStaff } = useUser();
  const [formData, setFormData] = useState({
    client_id: '',
    staff_ids: [],
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 0,
    shift_type_id: '',
    status: 'scheduled',
    is_recurring: false,
    frequency: 'weekly',
    repeat_until: '',
    selected_days: [],
    notes: '',
  });

  const [clients, setClients] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (visible) {
      fetchInitialData();
    }
  }, [visible]);

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

  useEffect(() => {
    if (shift) {
      setFormData({
        id: shift.id,
        client_id: shift.client_id || '',
        staff_ids: shift.staff_ids || (shift.staff_id ? [shift.staff_id] : []),
        shift_date: shift.shift_date || TODAY_ISO(),
        start_time: shift.start_time || '09:00',
        end_time: shift.end_time || '17:00',
        break_minutes: shift.break_minutes || 0,
        shift_type_id: shift.shift_type_id || '',
        status: shift.status || 'scheduled',
        is_recurring: shift.is_recurring || false,
        frequency: shift.frequency || 'weekly',
        repeat_until: shift.repeat_until || '',
        selected_days: shift.selected_days || [],
        notes: shift.notes || '',
      });
      if (shift.client_id) {
        const client = clients.find(c => c.id === shift.client_id);
        if (client) setSearchTerm(`${client.first_name} ${client.last_name}`);
      }
    } else {
      setFormData({
        client_id: '',
        staff_ids: [],
        shift_date: TODAY_ISO(),
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 0,
        shift_type_id: '',
        status: 'scheduled',
        is_recurring: false,
        frequency: 'weekly',
        repeat_until: '',
        selected_days: [],
        notes: '',
      });
      setSearchTerm('');
    }
  }, [shift, visible, clients]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, ndis_number")
        .eq("is_active", true)
        .eq("tenant_id", currentStaff.tenant_id)
        .order("first_name", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      const { data: shiftTypesData, error: shiftTypesError } = await supabase
        .from("shift_types")
        .select("*")
        .eq("is_active", true)
        .eq("tenant_id", currentStaff.tenant_id)
        .order("sort_order", { ascending: true });

      if (shiftTypesError) throw shiftTypesError;
      setShiftTypes(shiftTypesData || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) return alert("Please select a client");
    if (!formData.shift_date) return alert("Please select shift date");
    if (formData.is_recurring && !formData.repeat_until) return alert("Please select an end date for the recurring shift");

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving shift:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                {shift?.id ? 'Edit Shift' : 'Create Shift'}
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {shift?.id ? 'Update existing shift details' : 'Schedule a new service'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* CLIENT & STAFF SECTION */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-1 flex items-center gap-2">
              <Users size={12} /> Client & Staffing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search client..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={searchTerm}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {showClientDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1 animate-in fade-in slide-in-from-top-2">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setFormData(f => ({ ...f, client_id: c.id }));
                          setSearchTerm(`${c.first_name} ${c.last_name}`);
                          setShowClientDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-700">{c.first_name} {c.last_name}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{c.ndis_number || 'No NDIS'}</span>
                        </div>
                        {formData.client_id === c.id && <Check size={16} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Shift Type
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <select
                    name="shift_type_id"
                    value={formData.shift_type_id}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Shift Type...</option>
                    {shiftTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* DATE & TIME SECTION */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-2">
              <Clock size={12} /> Shift Timing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="date"
                    name="shift_date"
                    value={formData.shift_date}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="group col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Assigned Staff {formData.staff_ids.length > 0 && `(${formData.staff_ids.length})`}
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left flex items-center justify-between"
                  >
                    <span className="text-slate-400">
                      {formData.staff_ids.length === 0 ? 'Select staff members...' : `${formData.staff_ids.length} staff selected`}
                    </span>
                    <ChevronDown size={16} className="text-slate-300" />
                  </button>
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />

                  {showStaffDropdown && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto p-2">
                      <div className="flex items-center justify-between p-2 border-b border-slate-100 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(f => ({ ...f, staff_ids: staffList.map(s => s.id) }));
                          }}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(f => ({ ...f, staff_ids: [] }));
                          }}
                          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                        >
                          Clear All
                        </button>
                      </div>

                      {staffList.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData(f => ({
                              ...f,
                              staff_ids: f.staff_ids.includes(s.id)
                                ? f.staff_ids.filter(id => id !== s.id)
                                : [...f.staff_ids, s.id]
                            }));
                          }}
                          className="w-full px-3 py-2.5 text-left hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${formData.staff_ids.includes(s.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-slate-300 group-hover:border-blue-400'
                              }`}>
                              {formData.staff_ids.includes(s.id) && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-700">{s.name}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{s.role || 'Staff'}</span>
                            </div>
                          </div>
                        </button>
                      ))}

                      {staffList.length === 0 && (
                        <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          No staff available
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Staff Chips */}
                {formData.staff_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.staff_ids.map(staffId => {
                      const staff = staffList.find(s => s.id === staffId);
                      if (!staff) return null;
                      return (
                        <div
                          key={staffId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-tight group hover:bg-blue-100 transition-colors"
                        >
                          <User size={10} />
                          <span>{staff.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(f => ({
                                ...f,
                                staff_ids: f.staff_ids.filter(id => id !== staffId)
                              }));
                            }}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">End Time</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="group col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Break (min)</label>
                <input
                  type="number"
                  name="break_minutes"
                  value={formData.break_minutes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* RECURRING SECTION */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500/20"
                />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Repeat size={12} /> Repeat Shift
                </span>
              </label>
            </div>

            {formData.is_recurring && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency</label>
                    <select
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Repeat Until</label>
                    <input
                      type="date"
                      name="repeat_until"
                      value={formData.repeat_until}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Day of Week Selector - Only for weekly/fortnightly */}
                {(formData.frequency === 'weekly' || formData.frequency === 'fortnightly') && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Repeat On Days
                    </label>
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                      {[
                        { label: 'Sunday', value: 0 },
                        { label: 'Monday', value: 1 },
                        { label: 'Tuesday', value: 2 },
                        { label: 'Wednesday', value: 3 },
                        { label: 'Thursday', value: 4 },
                        { label: 'Friday', value: 5 },
                        { label: 'Saturday', value: 6 },
                      ].map((day) => {
                        const isSelected = formData.selected_days.includes(day.value);
                        return (
                          <label key={day.value} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-300 bg-white'
                              }`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() => {
                                setFormData(f => ({
                                  ...f,
                                  selected_days: isSelected
                                    ? f.selected_days.filter(d => d !== day.value)
                                    : [...f.selected_days, day.value].sort()
                                }));
                              }}
                            />
                            <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                              {day.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              Status & Notes
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Shift Status</label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="scheduled">Draft (Scheduled)</option>
                  <option value="published">Live (Published)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
              </div>
            </div>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Shift notes or instructions..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
  
          {/* Duration */}
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 hidden sm:block">
              Total Duration
            </span>
            <span className="text-sm font-black text-blue-600 leading-none">
              {(() => {
                const start = parseTime(formData.start_time);
                let end = parseTime(formData.end_time);
                if (end < start) end += 24;
                const hours = end - start - (formData.break_minutes / 60);
                return hours > 0 ? formatHours(hours) : "0h";
              })()}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-3 sm:px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
            >
              <X size={16} className="sm:hidden" />
              <span className="hidden sm:inline">Cancel</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-4 sm:px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin sm:hidden" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} className="sm:hidden" />
                  <span className="hidden sm:inline">
                    {shift?.id ? "Update Shift" : "Save Shift"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}