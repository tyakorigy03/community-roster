import { CheckCircle, Clock, Info, LayoutDashboard, Plus, AlertCircle, FileText, MapPin, Camera, X, Check, User, Calendar, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import LocationIQ from "../components/locationIQ";

// Helper to format date
const formatDate = (dateString) => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to format time
const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Helper to get today's date
const getTodayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse location strings (JSON or comma-separated)
const parseLocation = (loc) => {
  if (!loc) return null;
  try {
    if (typeof loc === 'object') return loc;
    return JSON.parse(loc);
  } catch (e) {
    const parts = loc.split(',');
    if (parts.length === 2) {
      return { latitude: parseFloat(parts[0]), longitude: parseFloat(parts[1]) };
    }
    return null;
  }
};

// Shift Approval Modal Component
function ShiftApprovalModal({ isOpen, onClose, shift, onApprove }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !shift) return null;

  const clockInLocation = parseLocation(shift.clock_in_location);
  const clockOutLocation = parseLocation(shift.clock_out_location);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_shifts')
        .update({
          approved: true,
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', shift.id);

      if (error) throw error;

      toast.success('Shift approved successfully');
      onApprove();
      onClose();
    } catch (error) {
      console.error('Error approving shift:', error);
      toast.error('Failed to approve shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="glass-card rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="premium-gradient px-10 py-8 flex justify-between items-start text-white relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Shift Authorization</h2>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-[0.2em] mt-2">Audit activity logs</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 relative z-10"
            disabled={loading}
          >
            <X size={22} />
          </button>
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[#020617]/50">
          {/* Shift Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 p-6 rounded-[1.75rem] border border-white/5 shadow-inner">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Staff Member</p>
              <p className="text-base font-black text-white uppercase tracking-tight">{shift.staff_name}</p>
            </div>
            <div className="bg-white/5 p-6 rounded-[1.75rem] border border-white/5 shadow-inner">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Client name</p>
              <p className="text-base font-black text-white uppercase tracking-tight">{shift.client_name}</p>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg"><Clock size={16} className="text-indigo-400" /></div> Verification timeline
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Clock In */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">Arrival: {formatTime(shift.clock_in_time)}</span>
                </div>

                {shift.clock_in_photo_url && (
                  <div className="aspect-video rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl bg-slate-900 group relative">
                    <img src={shift.clock_in_photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Clock In" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/60 to-transparent"></div>
                  </div>
                )}

                {clockInLocation && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[10px] font-bold text-slate-400">
                    <div className="flex items-start gap-3 mb-3">
                      <MapPin size={14} className="text-indigo-400 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <LocationIQ lat={clockInLocation.latitude} lon={clockInLocation.longitude} />
                      </div>
                    </div>
                    <a href={`https://www.google.com/maps?q=${clockInLocation.latitude},${clockInLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">View Coordinates <ChevronRight size={10} /></a>
                  </div>
                )}
              </div>

              {/* Clock Out */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]"></div>
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">Departure: {shift.clock_out_time ? formatTime(shift.clock_out_time) : 'Active'}</span>
                </div>

                {shift.clock_out_photo_url && (
                  <div className="aspect-video rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl bg-slate-900 group relative">
                    <img src={shift.clock_out_photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Clock Out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/60 to-transparent"></div>
                  </div>
                )}

                {clockOutLocation && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[10px] font-bold text-slate-400">
                    <div className="flex items-start gap-3 mb-3">
                      <MapPin size={14} className="text-indigo-400 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <LocationIQ lat={clockOutLocation.latitude} lon={clockOutLocation.longitude} />
                      </div>
                    </div>
                    <a href={`https://www.google.com/maps?q=${clockOutLocation.latitude},${clockOutLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">View Coordinates <ChevronRight size={10} /></a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/10 p-8 rounded-[2.5rem] border border-indigo-500/20 flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Total Service Time</p>
              <h4 className="text-3xl font-black text-white uppercase tracking-tighter">
                {shift.clock_in_time && shift.clock_out_time ? (
                  <>{((new Date(shift.clock_out_time) - new Date(shift.clock_in_time)) / (1000 * 60 * 60)).toFixed(2)} Hrs</>
                ) : 'In Progress'}
              </h4>
            </div>
            <FileText className="text-indigo-500/20 relative z-10" size={56} />
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-[#020617]/80 border-t border-white/5 flex gap-6">
          <button
            onClick={onClose}
            className="flex-1 px-8 py-5 bg-white/5 border border-white/10 text-slate-400 rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
            disabled={loading}
          >
            Cancel Review
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 px-8 py-5 bg-indigo-600 text-white rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <><Check size={18} /> Approve Shift</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [stats, setStats] = useState({
    activeStaff: 0,
    shiftsToday: 0,
    pendingShifts: 0,
    payrollProcessed: 0,
    totalStaff: 0,
  });
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [pendingShifts, setPendingShifts] = useState([]);
  const [pendingNotes, setPendingNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockFilter, setClockFilter] = useState('in');
  const [selectedShift, setSelectedShift] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch pending progress notes
      const { data: pendingNotesData, error: notesError } = await supabase
        .from('progress_notes')
        .select(`
            *,
            client:client_id(first_name, last_name),
            staff:created_by(name)
        `)
        .eq('is_draft', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notesError) throw notesError;
      setPendingNotes(pendingNotesData || []);

      // Fetch active staff count
      const { count: staffCount, error: staffError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);


      if (staffError) throw staffError;
      const { count: staffCount1, error: staffError1 } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })

      if (staffError1) throw staffError1;

      // Get today's date
      const today = getTodayLocal();

      // Fetch today's shifts
      const { data: todayShiftsData, error: todayError } = await supabase
        .from('shifts')
        .select(`
          *,
          staff:staff_id(name),
          client:client_id(first_name, last_name),
          staff_shifts!left(clock_in_time, clock_out_time, status)
        `)
        .eq('shift_date', today)
        .order('start_time');

      if (todayError) throw todayError;

      // Format today's shifts
      const formattedTodayShifts = (todayShiftsData || []).map(shift => {
        const staffShift = shift.staff_shifts && shift.staff_shifts.length > 0
          ? shift.staff_shifts[0]
          : null;

        return {
          ...shift,
          staff_name: shift.staff?.name || 'Unassigned',
          client_name: shift.client
            ? `${shift.client.first_name} ${shift.client.last_name}`
            : 'No Client',
          clock_in_time: staffShift?.clock_in_time,
          clock_out_time: staffShift?.clock_out_time,
          shift_status: staffShift?.status || 'upcoming'
        };
      });

      setTodayShifts(formattedTodayShifts);

      // Fetch pending shifts (completed but not approved)
      const { data: pendingShiftsData, error: pendingError } = await supabase
        .from('staff_shifts')
        .select(`
          *,
          shift:shift_id(
            *,
            client:client_id(first_name, last_name)
          ),
          staff:staff_id(name)
        `)
        .eq('status', 'completed')
        .eq('approved', false)
        .not('clock_out_time', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingError) throw pendingError;

      // Format pending shifts
      const formattedPendingShifts = (pendingShiftsData || []).map(staffShift => ({
        ...staffShift,
        staff_name: staffShift.staff?.name || 'Unknown',
        client_name: staffShift.shift?.client
          ? `${staffShift.shift.client.first_name} ${staffShift.shift.client.last_name}`
          : 'No Client',
        shift_date: staffShift.shift?.shift_date,
        start_time: staffShift.shift?.start_time,
        end_time: staffShift.shift?.end_time
      }));

      setPendingShifts(formattedPendingShifts);


      const todayStr = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiryDateStr = thirtyDaysFromNow.toISOString().split('T')[0];

      const { data: documentsData, error: documentsError } = await supabase
        .from('staff_documents')
        .select(`
            *,
            staff:staff_id(name)
        `)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', expiryDateStr)
        .order('expiry_date');

      const formattedDocuments = (documentsData || []).map(doc => ({
        ...doc,
        staff_name: doc.staff?.name || 'Unknown',
        status: doc.expiry_date < todayStr ? 'Expired' : 'Expiring Soon'
      }));


      setExpiringDocuments(formattedDocuments);

      // Set stats
      setStats({
        activeStaff: staffCount || 0,
        shiftsToday: formattedTodayShifts.length,
        pendingShifts: formattedPendingShifts.length,
        payrollProcessed: 0,
        totalStaff: staffCount1
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredShifts = () => {
    switch (clockFilter) {
      case 'in':
        return todayShifts.filter(s => s.clock_in_time && !s.clock_out_time);
      case 'break':
        return []; // Implement break logic if needed
      case 'out':
        return todayShifts.filter(s => s.clock_out_time);
      case 'late':
        return todayShifts.filter(s => {
          if (!s.clock_in_time) return false;
          const clockIn = new Date(s.clock_in_time);
          const scheduled = new Date(`${s.shift_date}T${s.start_time}`);
          return clockIn > scheduled;
        });
      default:
        return todayShifts;
    }
  };

  const handleShiftApproval = (shift) => {
    setSelectedShift(shift);
    setShowApprovalModal(true);
  };

  const handleApproveSuccess = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">SYNICING DASHBOARD DATA...</div>
        </div>
      </div>
    );
  }

  const filteredShifts = getFilteredShifts();

  return (
    <div className="p-0 animate-fadeIn">
      {/* Dashboard Top Header - Glassmorphic */}
      <div className="flex items-center justify-between gap-6 px-8 py-6 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-20 min-w-0">
        {/* Title */}
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter truncate">
            Enterprise Hub
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mt-1.5 truncate">
            Real-time Command Center
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5">
            <button className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] rounded-xl transition-all">
              Overview
            </button>
            <button className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
              Logistics
            </button>
          </div>

          <Link
            to="/shifts"
            className="px-6 py-3 bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all flex items-center gap-3 shadow-2xl"
          >
            <Calendar size={15} className="text-indigo-400" />
            <span className="hidden sm:inline">Fleet Schedule</span>
          </Link>
        </div>
      </div>


      <div className="p-6 lg:p-10 space-y-10">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between group overflow-hidden relative">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Pulse</h3>
              <div className="bg-indigo-500/10 p-2.5 rounded-2xl text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500"><LayoutDashboard size={20} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 group/stat hover:bg-white/10 transition-all duration-300">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Active</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tighter">{stats.activeStaff}</span>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter px-2 py-0.5 bg-emerald-500/10 rounded-full">On Call</span>
                </div>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 group/stat hover:bg-white/10 transition-all duration-300">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Today</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tighter">{stats.shiftsToday}</span>
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter px-2 py-0.5 bg-indigo-500/10 rounded-full">Shifts</span>
                </div>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 group/stat hover:bg-white/10 transition-all duration-300">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Review</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tighter">{stats.pendingShifts}</span>
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter px-2 py-0.5 bg-amber-500/10 rounded-full">Pending</span>
                </div>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 group/stat hover:bg-white/10 transition-all duration-300">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tighter">{stats.totalStaff}</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter px-2 py-0.5 bg-white/5 rounded-full">Resources</span>
                </div>
              </div>
            </div>
            {/* Background decorative element */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-all duration-700"></div>
          </div>

          {/* Expiring Documents Widget */}
          <div className="glass-card rounded-[2.5rem] p-8 flex flex-col h-full group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Compliance Matrix</h3>
              <div className="bg-rose-500/10 p-2.5 rounded-2xl text-rose-400 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500"><FileText size={20} /></div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {expiringDocuments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                  <CheckCircle size={32} className="text-emerald-500/40 mb-3" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Harmonized</p>
                </div>
              ) : (
                expiringDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center gap-5 group/item hover:bg-white/10 transition-all duration-300">
                    <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 group-hover/item:bg-rose-500 group-hover/item:text-white transition-all duration-500">
                      <AlertCircle size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-white uppercase truncate tracking-tight">{doc.document_type || 'Credential'}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{doc.staff_name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full ${doc.status === 'Expired' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{doc.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Time Clock Widget */}
          <div className="glass-card rounded-[2.5rem] p-8 flex flex-col h-full group">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Real-time Feed</h3>
              <div className="bg-emerald-500/10 p-2.5 rounded-2xl text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500"><Clock size={20} /></div>
            </div>

            <div className="flex gap-2 mb-6 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              {["in", "out", "late"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setClockFilter(filter)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${clockFilter === filter ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {filteredShifts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                  <Clock size={32} className="text-slate-600 mb-3" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zero Latency</p>
                </div>
              ) : (
                filteredShifts.map((shift) => (
                  <div key={shift.id} className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center gap-5 group/item hover:bg-white/10 transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-500 flex-shrink-0">
                      {shift.staff_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-white uppercase truncate tracking-tight">{shift.staff_name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{shift.client_name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pending Shift Approvals Section */}
        <div className="glass-card rounded-[3rem] p-10 lg:p-12 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Fleet Logistics</h3>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter shadow-indigo-500/20">Mission Authorizations</h2>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-500 border border-amber-500/20 shadow-lg group-hover:bg-amber-500 group-hover:text-white transition-all duration-500"><AlertCircle size={22} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            {pendingShifts.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <CheckCircle className="mx-auto text-emerald-500/30 mb-4" size={56} />
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Vacuum: Clear</p>
              </div>
            ) : (
              pendingShifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => handleShiftApproval(shift)}
                  className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-500 cursor-pointer group/card hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] animate-fadeIn"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm border border-indigo-500/20 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-all duration-500 shadow-inner">
                      {shift.staff_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">Audit Req</span>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-black text-white uppercase truncate tracking-tight mb-1">{shift.staff_name}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{shift.client_name}</p>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={14} className="text-indigo-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{formatDate(shift.shift_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">
                          {((new Date(shift.clock_out_time) - new Date(shift.clock_in_time)) / (1000 * 60 * 60)).toFixed(1)}H Log
                        </span>
                      </div>
                    </div>

                    <button className="w-full py-3.5 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover/card:bg-indigo-600 group-hover/card:shadow-lg group-hover/card:shadow-indigo-600/20 transition-all duration-500 flex items-center justify-center gap-2 border border-white/5">
                      Analyze Entry <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Decorative glow */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[100px] -ml-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>
        </div>

        {/* Pending Progress Notes Section */}
        <div className="glass-card rounded-[3rem] p-10 lg:p-12 group overflow-hidden relative">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Central Repository</h3>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Intellectual Assets</h2>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-lg group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500"><FileText size={22} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            {pendingNotes.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <CheckCircle className="mx-auto text-emerald-500/30 mb-4" size={56} />
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Knowledge Base Synchronized</p>
              </div>
            ) : (
              pendingNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-500 group/card shadow-inner animate-fadeIn"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-sm border border-emerald-500/20 group-hover/card:bg-emerald-600 group-hover/card:text-white transition-all duration-500 shadow-inner">
                      {note.staff?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S'}
                    </div>
                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${note.is_draft ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                      {note.is_draft ? 'Unpublished' : 'Finalized'}
                    </span>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-black text-white uppercase truncate tracking-tight mb-1">{note.client?.first_name} {note.client?.last_name}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">{formatDate(note.event_date)}</p>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 min-h-[3em] italic">
                      {note.subject || 'No telemetry captured'}
                    </p>

                    <Link to={`/progress-notes/${note.id}`} className="block w-full py-3.5 bg-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover/card:bg-emerald-600 group-hover/card:shadow-lg group-hover/card:shadow-emerald-600/20 transition-all duration-500 flex items-center justify-center gap-2 border border-white/5 text-center">
                      Review Intel <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[100px] -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>
        </div>
      </div>

      <ShiftApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        shift={selectedShift}
        onApprove={handleApproveSuccess}
      />
    </div>
  );
}

export default Index;