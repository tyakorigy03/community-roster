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
import StaffProfileModal from "../components/StaffProfileModal";
import ClientProfileModal from "../components/ClientProfileModal";

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
    clockedIn: 0,
    activeClients: 0,
    totalClients: 0,
  });
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [pendingShifts, setPendingShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'logs'
  const [clockFilter, setClockFilter] = useState('in');
  const [docFilter, setDocFilter] = useState('expired'); // 'expired' or 'missing'
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [incompleteStaff, setIncompleteStaff] = useState([]);
  const [missingClientDocs, setMissingClientDocs] = useState([]);

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

      // Fetch recent staff shifts (clock logs) directly to ensure we don't miss any active staff
      const { data: recentLogsData } = await supabase
        .from('staff_shifts')
        .select(`
          *,
          staff:staff_id(name),
          shift:shift_id(
            shift_date,
            start_time,
            client:client_id(first_name, last_name)
          )
        `)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Map these logs to a format the UI expects
      const formattedLogs = (recentLogsData || []).map(log => ({
        id: log.id,
        staff_name: log.staff?.name || 'Unknown',
        client_name: log.shift?.client 
          ? `${log.shift.client.first_name} ${log.shift.client.last_name}`
          : 'No Client',
        clock_in_time: log.clock_in_time,
        clock_out_time: log.clock_out_time,
        shift_date: log.shift?.shift_date || getTodayLocal(),
        start_time: log.shift?.start_time,
        shift_status: log.status
      }));

      // For the attendance card, we'll use these recent logs
      setTodayShifts(formattedLogs);

      // Fetch "Shifts Today" count separately
      const { count: shiftsTodayCount } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('shift_date', today)
        .eq('tenant_id', currentStaff.tenant_id);

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

      // Fetch currently clocked-in staff count
      const { count: clockedInCount } = await supabase
        .from('staff_shifts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'clocked_in')
        .eq('tenant_id', currentStaff.tenant_id);

      // --- CLIENT DATA FETCH ---
      const { count: activeClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id);

      const { count: totalClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentStaff.tenant_id);

      // Fetch clients missing NDIS Plan (documents with owner_type='client' and document_type='NDIS_PLAN')
      const { data: allClientsData } = await supabase
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          documents!left(id, document_type)
        `)
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id);

      const clientsMissingDocs = (allClientsData || [])
        .filter(c => !c.documents?.some(d => d.document_type === 'NDIS_PLAN'))
        .map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          type: 'Missing NDIS Plan'
        }));

      setMissingClientDocs(clientsMissingDocs);

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

      // Fetch all staff to check for missing documents
      const { data: allStaffData } = await supabase
        .from('staff')
        .select(`
          id, 
          name,
          documents:staff_documents(id)
        `)
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id);

      const staffWithMissingDocs = (allStaffData || [])
        .filter(s => (s.documents?.length || 0) < 8)
        .map(s => ({
          id: s.id,
          name: s.name,
          count: s.documents?.length || 0
        }));

      setIncompleteStaff(staffWithMissingDocs);

      setStats({
        activeStaff: clockedInCount || 0,
        shiftsToday: shiftsTodayCount || 0,
        pendingShifts: formattedPendingShifts.length,
        totalStaff: totalStaffCount || 0,
        clockedIn: clockedInCount || 0,
        activeClients: activeClientsCount || 0,
        totalClients: totalClientsCount || 0,
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

  const handleStaffClick = (staff) => {
    setSelectedStaff(staff);
    setShowProfileModal(true);
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
      <div className="flex items-center justify-center min-h-[50dvh]">
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
            <button 
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1.5 text-[9px] lg:text-[11px] font-bold uppercase tracking-widest transition-all rounded-lg ${viewMode === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setViewMode('logs')}
              className={`px-3 py-1.5 text-[9px] lg:text-[11px] font-bold uppercase tracking-widest transition-all rounded-lg ${viewMode === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Recent Logs
            </button>
          </div>
          <Link to="/shifts" className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
            <Calendar size={13} />
            <span className="hidden sm:inline">Schedule</span>
          </Link>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {viewMode === 'overview' ? (
          <>
            {/* Today's Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Today's Status Stats - Always first */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col h-full order-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Today's Status</h3>
                  <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                    <LayoutDashboard size={16} />
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Active Staff</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{stats.activeStaff}</span>
                        <span className="text-[8px] font-bold text-green-600 uppercase tracking-tighter">On Duty</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Today's Shifts</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{stats.shiftsToday}</span>
                        <span className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter">Scheduled</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Registry Staff</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-slate-900">{stats.totalStaff}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Registry Clients</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-slate-900">{stats.totalClients}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Documents Area - Reordered second for mobile priority */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col h-full order-2 md:order-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Compliance Tracker</h3>
                  <div className="bg-orange-50 p-1.5 rounded-lg text-orange-600">
                    <FileText size={16} />
                  </div>
                </div>
                
                <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setDocFilter('expired')}
                    className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${docFilter === 'expired' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <span>Expiring</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] ${docFilter === 'expired' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                      {expiringDocuments.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setDocFilter('missing')}
                    className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${docFilter === 'missing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <span>Incomplete</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] ${docFilter === 'missing' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                      {incompleteStaff.length + missingClientDocs.length}
                    </span>
                  </button>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[250px] pr-1.5 custom-scrollbar">
                  {docFilter === 'expired' ? (
                    /* Expiring Items (Currently only Staff) */
                    expiringDocuments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <CircleCheckBig size={24} className="text-slate-300 mb-2" />
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No Expiring Docs</p>
                      </div>
                    ) : (
                      expiringDocuments.map((doc) => (
                        <div 
                          key={doc.id} 
                          onClick={() => handleStaffClick(doc.staff)}
                          className="bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-300 transition-all flex items-start gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[7px] font-black uppercase rounded">Staff</span>
                              <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight truncate">{doc.document_name}</p>
                            </div>
                            <p className="text-[9px] font-medium text-slate-500 uppercase">{doc.staff?.name}</p>
                            <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest mt-1.5">Expires: {formatDate(doc.expiry_date)}</p>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    /* Incomplete Items (Unified Staff & Clients) */
                    [
                      ...incompleteStaff.map(s => ({ ...s, entityType: 'staff' })),
                      ...missingClientDocs.map(c => ({ ...c, entityType: 'client' }))
                    ].length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <CircleCheckBig size={24} className="text-slate-300 mb-2" />
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">All Complete</p>
                      </div>
                    ) : (
                      [
                        ...incompleteStaff.map(s => ({ ...s, entityType: 'staff' })),
                        ...missingClientDocs.map(c => ({ ...c, entityType: 'client' }))
                      ].map((item, idx) => (
                        <div 
                          key={`${item.entityType}-${item.id}`} 
                          onClick={async () => {
                            if (item.entityType === 'staff') {
                              handleStaffClick(item);
                            } else {
                              // Fetch full client details for the modal
                              const { data: clientData } = await supabase
                                .from('clients')
                                .select('*, documents(*)')
                                .eq('id', item.id)
                                .single();
                              
                              if (clientData) {
                                setSelectedClient(clientData);
                                setShowClientModal(true);
                              }
                            }
                          }}
                          className="bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded ${item.entityType === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                              {item.entityType === 'staff' ? 'Staff' : 'Client'}
                            </span>
                            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight truncate">{item.name}</p>
                          </div>
                          
                          {item.entityType === 'staff' ? (
                            <>
                              <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-1">Uploaded: {item.count}/8 Documents</p>
                              <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.count/8)*100}%` }}></div>
                              </div>
                            </>
                          ) : (
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">{item.type}</p>
                          )}
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>

              {/* Attendance Area - Reordered third for mobile priority */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col h-full order-3 md:order-2">
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
                      <div 
                        key={shift.id} 
                        onClick={() => handleStaffClick({ id: shift.staff_id, name: shift.staff_name })}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-blue-300 transition-all"
                      >
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
          </>
        ) : (
          /* Recent Logs View */
          <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">System activity</h3>
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Recent Activity Logs</h2>
              </div>
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600 shadow-sm">
                <Clock size={18} />
              </div>
            </div>

            <div className="space-y-4">
              {todayShifts.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No recent activity found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="border-b border-slate-100">
                         <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                         <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Client</th>
                         <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                         <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Clock In</th>
                         <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Clock Out</th>
                         <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {todayShifts.map((log) => (
                         <tr key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="py-4 text-[11px] font-black text-slate-900 uppercase tracking-tight">{log.staff_name}</td>
                           <td className="py-4 text-[10px] font-bold text-slate-500 uppercase">{log.client_name}</td>
                           <td className="py-4 text-[10px] font-bold text-slate-500 uppercase">{formatDate(log.shift_date)}</td>
                           <td className="py-4 text-[10px] font-bold text-blue-600 uppercase italic">{formatTime(log.clock_in_time)}</td>
                           <td className="py-4 text-[10px] font-bold text-slate-500 uppercase italic">{log.clock_out_time ? formatTime(log.clock_out_time) : 'Active'}</td>
                           <td className="py-4">
                             <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${
                               log.shift_status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                               log.shift_status === 'clocked_in' ? 'bg-blue-50 text-blue-600' : 
                               'bg-slate-50 text-slate-400'
                             }`}>
                               {log.shift_status}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedShift && showApprovalModal && (
        <ShiftApprovalModal
          shift={selectedShift}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedShift(null);
          }}
          onApproved={fetchDashboardData}
        />
      )}

      {selectedStaff && showProfileModal && (
        <StaffProfileModal
          staff={selectedStaff}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedStaff(null);
          }}
        />
      )}
      {/* Client Profile Modal */}
      <ClientProfileModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
      />
    </div>
  );
}

export default Index;