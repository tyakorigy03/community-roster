import { CheckCircle, Clock, Info, LayoutDashboard, Plus, AlertCircle, FileText, MapPin, Camera, X, Check, User, Calendar } from "lucide-react";
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

// Shift Approval Modal Component
function ShiftApprovalModal({ isOpen, onClose, shift, onApprove }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !shift) return null;

  const clockInLocation = shift.clock_in_location ? JSON.parse(shift.clock_in_location) : null;
  const clockOutLocation = shift.clock_out_location ? JSON.parse(shift.clock_out_location) : null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_shifts')
        .update({
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Shift Approval</h2>
            <p className="text-sm text-gray-500 mt-1">Review and approve this shift</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Shift Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Info size={16} /> Shift Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Staff:</span>
                <span className="text-sm font-medium text-gray-900">{shift.staff_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Client:</span>
                <span className="text-sm font-medium text-gray-900">{shift.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Date:</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(shift.shift_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Scheduled:</span>
                <span className="text-sm font-medium text-gray-900">
                  {shift.start_time} - {shift.end_time}
                </span>
              </div>
            </div>
          </div>

          {/* Clock In Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-green-600" /> Clock In
            </h3>
            <div className="bg-green-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Time:</span>
                <span className="text-sm font-medium text-gray-900">{formatTime(shift.clock_in_time)}</span>
              </div>
              
              {clockInLocation && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={14} />
                    Location:
                  </div>
                  <div className="bg-white rounded p-2 text-xs text-gray-700">
                    <LocationIQ lat={clockInLocation.latitude} lon={clockInLocation.longitude} />
                    <a
                      href={`https://www.google.com/maps?q=${clockInLocation.latitude},${clockInLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View on Map →
                    </a>
                  </div>
                </div>
              )}
              
              {shift.clock_in_photo_url && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Camera size={14} />
                    Photo:
                  </div>
                  <img
                    src={shift.clock_in_photo_url}
                    alt="Clock In"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Clock Out Details */}
          {shift.clock_out_time && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-red-600" /> Clock Out
              </h3>
              <div className="bg-red-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Time:</span>
                  <span className="text-sm font-medium text-gray-900">{formatTime(shift.clock_out_time)}</span>
                </div>
                
                {clockOutLocation && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin size={14} />
                      Location:
                    </div>
                    <div className="bg-white rounded p-2 text-xs text-gray-700">
                      <LocationIQ lat={clockOutLocation.latitude} lon={clockOutLocation.longitude} />
                      <a
                        href={`https://www.google.com/maps?q=${clockOutLocation.latitude},${clockOutLocation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View on Map →
                      </a>
                    </div>
                  </div>
                )}
                
                {shift.clock_out_photo_url && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Camera size={14} />
                      Photo:
                    </div>
                    <img
                      src={shift.clock_out_photo_url}
                      alt="Clock Out"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hours Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Hours Summary</h3>
            <div className="text-2xl font-bold text-blue-600">
              {shift.clock_in_time && shift.clock_out_time ? (
                <>
                  {((new Date(shift.clock_out_time) - new Date(shift.clock_in_time)) / (1000 * 60 * 60)).toFixed(2)} hours
                </>
              ) : (
                'In Progress'
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Approving...
              </>
            ) : (
              <>
                <Check size={20} />
                Approve Shift
              </>
            )}
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
    totalStaff:0,
  });
  const [expiringDocuments, setExpiringDocuments] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [pendingShifts, setPendingShifts] = useState([]);
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
        payrollProcessed: 0 ,
        totalStaff:staffCount1
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredShifts = getFilteredShifts();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center px-4 md:px-6 py-3 border-b border-gray-300">
        {/* Title */}
        <div className="flex items-center gap-2">
          <LayoutDashboard />
          <h2 className="text-gray-700 uppercase font-bold text-sm md:text-base">
            Dashboard
          </h2>
        </div>

        {/* Tabs */}
        <div className="rounded-3xl overflow-hidden flex w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 py-2 text-xs bg-blue-600 text-gray-50">
            Dashboard
          </button>
          <button className="flex-1 md:flex-none px-4 py-2 text-xs bg-gray-300 text-gray-700">
            Activities
          </button>
        </div>

        {/* Action */}
        <Link
          to={'/shifts'}
          className="px-5 py-2 bg-blue-600 text-gray-50 rounded-3xl flex items-center justify-center gap-2 w-full md:w-auto"
        >
           manage shifts
        </Link>
      </div>

      {/* Widgets */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Statistics */}
          <div className="rounded-xl shadow border border-gray-300 p-5 bg-white">
            <h2 className="flex items-center font-semibold text-gray-500 gap-2 mb-6">
              <Info size={18} /> Statistics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col rounded-xl bg-blue-50 p-4 items-center justify-center text-center">
                <h2 className="text-blue-600 text-lg md:text-xl">
                  {stats.activeStaff}
                </h2>
                <p className="text-gray-600 text-sm">Staff Active</p>
              </div>

              <div className="flex flex-col rounded-xl bg-green-50 p-4 items-center justify-center text-center">
                <h2 className="text-green-600 text-lg md:text-xl">
                  {stats.shiftsToday}
                </h2>
                <p className="text-gray-600 text-sm">Shifts Today</p>
              </div>

              <div className="flex flex-col rounded-xl bg-yellow-50 p-4 items-center justify-center text-center">
                <h2 className="text-yellow-600 text-lg md:text-xl">
                  {stats.pendingShifts}
                </h2>
                <p className="text-gray-600 text-sm">Pending Approval</p>
              </div>

              <div className="flex flex-col rounded-xl bg-purple-50 p-4 items-center justify-center text-center">
                {/* <h2 className="text-purple-600 text-lg md:text-xl">
                  ${stats.payrollProcessed.toFixed(0)}
                </h2>
                <p className="text-gray-600 text-sm">Payroll (Month)</p> */}
                  <h2 className="text-yellow-600 text-lg md:text-xl">
                  {stats.totalStaff}
                </h2>
                <p className="text-gray-600 text-sm">total staff</p>
              </div>
            </div>
          </div>

          {/* Expiring Documents */}
          <div className="rounded-xl shadow border border-gray-300 p-5 bg-white">
            <h2 className="flex items-center font-semibold text-gray-500 gap-2 mb-6">
              <FileText size={18} /> Expiring Documents
            </h2>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {expiringDocuments.length === 0 ? (
                <div className="px-3 py-3 flex flex-col sm:flex-row gap-3 items-center rounded-xl bg-gray-100 text-center sm:text-left">
                  <CheckCircle size={40} className="text-gray-400" />
                  <p className="text-gray-600 text-sm">
                    No documents are expiring in the next 30 days.
                  </p>
                </div>
              ) : (
                expiringDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="px-3 py-3 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200"
                  >
                    <AlertCircle size={24} className="text-orange-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.document_type || 'Document'}
                      </p>
                      <p className="text-xs text-gray-600">{doc.staff_name}</p>
                      <p className="text-xs text-orange-600 mt-1">
                        Expires: {formatDate(doc.expiry_date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Time Clock */}
          <div className="rounded-xl shadow border border-gray-300 p-5 bg-white">
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex items-center gap-2 text-gray-500 font-semibold">
                <Clock size={18} /> Time Clock
              </div>
              <div className="rounded-3xl md:ml-[auto] overflow-hidden flex flex-wrap">
                {["in", "break", "out", "late"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setClockFilter(filter)}
                    className={`px-4 py-1 text-xs ${
                      clockFilter === filter
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredShifts.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto text-gray-300" size={48} />
                  <p className="mt-2 text-gray-500 text-sm">
                    No {clockFilter} shifts today
                  </p>
                </div>
              ) : (
                filteredShifts.map((shift) => {
                  const initials = shift.staff_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={shift.id}
                      className="px-3 py-2 flex items-center gap-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>

                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-gray-600 font-medium text-sm truncate">
                          {shift.staff_name}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {shift.clock_in_time 
                            ? `In: ${formatTime(shift.clock_in_time)}`
                            : `Starts: ${shift.start_time}`
                          }
                        </p>
                      </div>

                      <p className="text-gray-600 text-xs hidden sm:block">
                        {shift.client_name}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pending Shifts for Approval */}
          <div className="rounded-xl shadow border border-gray-300 p-5 bg-white md:col-span-2 xl:col-span-3">
            <h2 className="flex items-center font-semibold text-gray-500 gap-2 mb-6">
              <AlertCircle size={18} /> Pending Shift Approvals
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingShifts.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <CheckCircle className="mx-auto text-gray-300" size={48} />
                  <p className="mt-2 text-gray-500 text-sm">
                    No shifts pending approval
                  </p>
                </div>
              ) : (
                pendingShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleShiftApproval(shift)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900 text-sm">
                          {shift.staff_name}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Pending
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar size={12} />
                        {formatDate(shift.shift_date)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock size={12} />
                        {formatTime(shift.clock_in_time)} - {formatTime(shift.clock_out_time)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Client: {shift.client_name}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftApproval(shift);
                      }}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Review & Approve
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Shift Approval Modal */}
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