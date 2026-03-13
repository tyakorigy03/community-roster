import { 
  CircleCheckBig, 
  Clock, 
  Info, 
  LayoutDashboard, 
  Plus, 
  CircleAlert, 
  FileText, 
  MapPin, 
  Camera, 
  X, 
  Check, 
  User, 
  Calendar 
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import LocationIQ from "../components/locationIQ";
import { ShiftApprovalModal } from "./modal/ShiftApprovalModal";

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

const getTodayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function Index() {
  const { currentStaff } = useUser();
  const [stats, setStats] = useState({
    activeStaff: 0,
    shiftsToday: 0,
    pendingShifts: 0,
    totalStaff: 0,
  });
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [pendingShifts, setPendingShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockFilter, setClockFilter] = useState('in');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => {
    if (currentStaff?.tenant_id) {
      fetchDashboardData();
    }
  }, [currentStaff]);

  const fetchDashboardData = async () => {
    if (!currentStaff?.tenant_id) return;
    try {
      setLoading(true);
      
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id);

      const { count: totalStaffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentStaff.tenant_id);

      const today = getTodayLocal();

      const { data: todayShiftsData } = await supabase
        .from('shifts')
        .select(`
          *,
          staff:staff_id(name),
          client:client_id(first_name, last_name),
          staff_shifts!left(clock_in_time, clock_out_time, status)
        `)
        .eq('shift_date', today)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('start_time');

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

      const { data: pendingShiftsData } = await supabase
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
        .eq('tenant_id', currentStaff.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);

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

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiryDateStr = thirtyDaysFromNow.toISOString().split('T')[0];

      const { data: documentsData } = await supabase
        .from('staff_documents')
        .select(`
            *,
            staff:staff_id(name)
        `)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', expiryDateStr)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('expiry_date');

      setExpiringDocuments(documentsData || []);

      setStats({
        activeStaff: staffCount || 0,
        shiftsToday: formattedTodayShifts.length,
        pendingShifts: formattedPendingShifts.length,
        totalStaff: totalStaffCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleShiftApproval = (shift) => {
    setSelectedShift(shift);
    setShowApprovalModal(true);
  };

  const handleApproveSuccess = () => {
    fetchDashboardData();
  };

  const getFilteredShifts = () => {
    switch (clockFilter) {
      case 'in':
        return todayShifts.filter(s => s.clock_in_time && !s.clock_out_time);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Loading System...</p>
        </div>
      </div>
    );
  }

  const filteredShifts = getFilteredShifts();

  return (
    <div className="animate-in fade-in duration-500">
      {/* Sticky Header */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-20 min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm lg:text-lg font-bold text-slate-900 uppercase tracking-tight truncate">Dashboard Overview</h2>
          <p className="text-[9px] lg:text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-none mt-1 truncate">Live Updates</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
          <div className="bg-slate-100/50 p-1 rounded-xl flex">
            <button className="px-3 py-1.5 text-[9px] lg:text-[11px] font-bold uppercase tracking-widest bg-white text-blue-600 shadow-sm rounded-lg transition-all">Overview</button>
            <button className="px-3 py-1.5 text-[9px] lg:text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Recent Logs</button>
          </div>
          <Link to="/shifts" className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
            <Calendar size={13} />
            <span className="hidden sm:inline">Schedule</span>
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Today's Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Today's Status Stats */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Today's Status</h3>
              <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                <LayoutDashboard size={16} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Active</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{stats.activeStaff}</span>
                  <span className="text-[8px] font-bold text-green-600 uppercase tracking-tighter">On Duty</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Today</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{stats.shiftsToday}</span>
                  <span className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter">Shifts</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Review</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{stats.pendingShifts}</span>
                  <span className="text-[8px] font-bold text-orange-600 uppercase tracking-tighter">Pending</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{stats.totalStaff}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Staff</span>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Documents Area */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Staff Documents</h3>
              <div className="bg-orange-50 p-1.5 rounded-lg text-orange-600">
                <FileText size={16} />
              </div>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[250px] pr-1.5 custom-scrollbar">
              {expiringDocuments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CircleCheckBig size={24} className="text-slate-300 mb-2" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">All Documents Up-to-Date</p>
                </div>
              ) : (
                expiringDocuments.map((doc) => (
                  <div key={doc.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight truncate">{doc.document_type}</p>
                    <p className="text-[9px] font-medium text-slate-500 uppercase mt-1">{doc.staff?.name}</p>
                    <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest mt-1.5">Expires: {formatDate(doc.expiry_date)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attendance Area */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Attendance</h3>
              <div className="bg-green-50 p-1.5 rounded-lg text-green-600">
                <Clock size={16} />
              </div>
            </div>
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
              {['In', 'Out', 'Late'].map((f) => (
                <button
                  key={f}
                  onClick={() => setClockFilter(f.toLowerCase())}
                  className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all ${clockFilter === f.toLowerCase() ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[250px] pr-1.5 custom-scrollbar">
              {filteredShifts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock size={24} className="text-slate-300 mb-2" />
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No Logs Yet</p>
                </div>
              ) : (
                filteredShifts.map((shift) => (
                  <div key={shift.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight truncate">{shift.staff_name}</p>
                    <p className="text-[9px] font-medium text-slate-500 uppercase mt-0.5 truncate">{shift.client_name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">
                        {shift.clock_in_time ? formatTime(shift.clock_in_time) : shift.start_time}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50/50 backdrop-blur-sm border border-blue-100 text-blue-700 rounded text-[7px] font-bold uppercase tracking-widest">Current</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Shifts Review Section */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Shifts Review</h3>
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Shifts to Approve</h2>
            </div>
            <div className="bg-yellow-50 p-2 rounded-xl text-yellow-600 shadow-sm">
              <CircleAlert size={18} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pendingShifts.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CircleCheckBig size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">No Shifts Awaiting Review</p>
              </div>
            ) : (
              pendingShifts.map((shift) => (
                <div 
                  key={shift.id} 
                  onClick={() => handleShiftApproval(shift)}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-blue-200 transition-all block cursor-pointer group"
                >
                  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">{shift.staff_name}</p>
                  <p className="text-[9px] font-medium text-slate-500 uppercase mt-1 mb-3">{shift.client_name}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-[8px] font-bold text-yellow-700 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Review Performance</span>
                    <Plus size={12} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staff Reports Section */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Staff Reports</h3>
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Notes to Review</h2>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600 shadow-sm">
              <FileText size={18} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CircleCheckBig size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">All Notes Reviewed</p>
            </div>
          </div>
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