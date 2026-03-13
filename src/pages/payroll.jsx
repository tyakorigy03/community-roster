import { DollarSign, Download, Calendar, AlertCircle, Clock, Users, X, FileText, ChevronLeft, ChevronRight, Menu, Filter, Search, ChevronDown, Shield, CreditCard, ArrowUpRight, TrendingUp, Plus, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { generatePayrollReportPDF } from "../utils/payrollReportPdf";
import { AssignRateToStaffModal } from "./modal/staffRate";

// Helper function to format dates
const formatDate = (dateString, short = false) => {
  const date = new Date(dateString + 'T00:00:00');
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Helper to format date as YYYY-MM-DD in local timezone
const formatDateToLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};



function DateRangeModal({ isOpen, onClose, onApply, currentPeriod, currentDates }) {
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod || "week");
  const [startDate, setStartDate] = useState(currentDates?.start || "");
  const [endDate, setEndDate] = useState(currentDates?.end || "");

  const handleApply = () => {
    onApply({
      period: selectedPeriod,
      startDate,
      endDate
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                <Calendar className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Date Range</h2>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest opacity-80">Cycle Configuration</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Shield size={12} className="text-blue-500" />
              Payroll Period
            </label>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-xs font-black uppercase tracking-widest appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 outline-none transition-all cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedPeriod === "custom" && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Apply Configuration
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffDetailPanel({ isOpen, onClose, staff, start_date, end_date, tenant_id }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      fetchStaffShifts();
    }
  }, [isOpen, staff]);

  const fetchStaffShifts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          client:client_id(first_name, last_name),
          shift_type:shift_type_id(name),
          staff_shifts!inner(status, approved)
        `)
        .eq('staff_id', staff.staff_id)
        .eq('tenant_id', tenant_id)
        .or('status.in.(completed,approved),approved.eq.true', { foreignTable: 'staff_shifts' })
        .gte('shift_date', start_date)
        .lte('shift_date', end_date)
        .order('shift_date', { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching staff shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden p-0.5">
              {staff.profile_picture ? (
                <img src={staff.profile_picture} className="w-full h-full object-cover rounded-[14px]" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-black text-slate-400 bg-slate-50 uppercase">
                  {staff.staff_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{staff.staff_name}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{staff.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Hours</p>
              <div className="text-2xl font-black text-blue-900">{staff.billable_hours?.toFixed(1)}h</div>
            </div>
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Gross Pay</p>
              <div className="text-2xl font-black text-emerald-900">${staff.gross_pay?.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Engagement Details</h3>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Email</span>
                <span className="font-black text-slate-700">{staff.email}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                <span className="font-black text-slate-700">{staff.phone}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Current Rates</span>
                <span className="font-black text-blue-600">{staff.hourly_rate}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
              Shift Chronology
              <span className="text-[9px] lowercase font-bold text-slate-300">Period activity only</span>
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-5 w-5 border-2 border-slate-200 border-t-blue-600 rounded-full"></div>
              </div>
            ) : shifts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No shift activity found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shifts.map((shift) => (
                  <div key={shift.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                        <Clock size={14} className="text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{formatDate(shift.shift_date, true)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{shift.client?.first_name} {shift.client?.last_name} · {shift.shift_type?.name || 'General'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-slate-900">{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${shift.staff_shifts?.[0]?.status === 'approved' || shift.status === 'approved' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {shift.staff_shifts?.[0]?.status || shift.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="w-full h-11 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
          >
            Back to Payroll
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Payroll Page Component
export default function PayrollPage() {
  const { currentStaff } = useUser();
  const [payrollData, setPayrollData] = useState([]);
  const [showDateRange, setShowDateRange] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payrollPeriod, setPayrollPeriod] = useState("week");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [stats, setStats] = useState({
    averageHoursPerStaff: 0,
    averagePayPerStaff: 0,
    roleSummary: {},
    missingRateCount: 0
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffDetail, setShowStaffDetail] = useState(false);
  const [staffForDetail, setStaffForDetail] = useState(null);

  useEffect(() => {
    // Initialize date range to current week
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    setDateRange({
      start: formatDateToLocal(start),
      end: formatDateToLocal(end)
    });
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchPayrollData();
    }
  }, [dateRange]);

  // Fetch payroll data using PostgreSQL function
  const fetchPayrollData = async () => {
    try {
      setLoading(true);

      // Call the PostgreSQL function to get payroll summary
      const { data, error } = await supabase
        .rpc('get_staff_pay_summary', {
          start_date: dateRange.start,
          end_date: dateRange.end,
          p_tenant_id: currentStaff.tenant_id
        });

      if (error) throw error;

      const processedData = (data || []).map(record => ({
        staff_id: record.staff_id,
        staff_name: record.name,
        profile_picture: record.profile_picture,
        billable_hours: record.total_hours,
        hourly_rate: record.hourly_rate_display, // Aggregated rate string
        gross_pay: record.total_pay,
        email: record.email,
        phone: record.phone,
        role: record.role,
      }));

      setPayrollData(processedData);

      // Calculate additional stats
      calculateAdvancedStats(processedData);

    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };
  const calculateAdvancedStats = (data) => {
    if (data.length === 0) {
      setStats({
        averageHoursPerStaff: 0,
        averagePayPerStaff: 0,
        roleSummary: {}
      });
      return;
    }

    const averageHoursPerStaff = totalHours / data.length;
    const averagePayPerStaff = totalAmount / data.length;

    // Group by role
    const roleSummary = {};
    data.forEach(record => {
      const role = record.role || 'Other';
      if (!roleSummary[role]) {
        roleSummary[role] = {
          count: 0,
          totalHours: 0,
          totalPay: 0
        };
      }
      roleSummary[role].count++;
      roleSummary[role].totalHours += record.billable_hours || 0;
      roleSummary[role].totalPay += record.gross_pay || 0;
    });

    setStats({
      averageHoursPerStaff,
      averagePayPerStaff,
      roleSummary,
      missingRateCount: data.filter(r => !r.hourly_rate || r.hourly_rate === 'No Rate').length
    });
  };

  const handleDateRangeApply = (range) => {
    setPayrollPeriod(range.period);

    const today = new Date();
    let start, end;

    switch (range.period) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'custom':
        if (range.startDate && range.endDate) {
          setDateRange({
            start: range.startDate,
            end: range.endDate
          });
          return;
        }
        break;
      default:
        return;
    }

    setDateRange({
      start: formatDateToLocal(start),
      end: formatDateToLocal(end)
    });
  };

  const handlePrevWeek = () => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() - 7);

    setDateRange({
      start: formatDateToLocal(start),
      end: formatDateToLocal(end)
    });
  };

  const handleNextWeek = () => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() + 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() + 7);

    setDateRange({
      start: formatDateToLocal(start),
      end: formatDateToLocal(end)
    });
  };

  const handleGoToToday = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    setDateRange({
      start: formatDateToLocal(start),
      end: formatDateToLocal(end)
    });
  };

  const handleExportCSV = () => {
    if (!payrollData.length) {
      toast.warning("No data to export");
      return;
    }

    const headers = [
      "Staff",
      "Email",
      "Phone",
      "Role",
      "Total Hours",
      "Hourly Rate",
      "Total Pay"
    ];

    const rows = payrollData.map(r => [
      r.staff_name,
      r.email,
      `="${r.phone}"`,                 // phone forced to text
      r.role,
      r.billable_hours.toFixed(1),
      r.hourly_rate,         // string, aggregated
      r.gross_pay.toFixed(2)
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row =>
        row.map(cell => `"${cell ?? ""}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll_summary_${dateRange.start}_to_${dateRange.end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Payroll data exported");
  };


  const totalAmount = payrollData.reduce((sum, row) => sum + (row.gross_pay || 0), 0);
  const totalHours = payrollData.reduce((sum, row) => sum + (row.billable_hours || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">

        {/* LEFT */}
        <div className="min-w-0">
          <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
            Employee Disbursement
          </h2>

          <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
            Operational → Payroll Ledger · {payrollData.length} Staff
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap self-end md:self-center">

          {/* Date Navigation */}
          <div className="flex items-center bg-slate-100/50 rounded-xl border border-slate-200/50 p-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={() => setShowDateRange(true)}
              className="px-3 py-1.5 text-[9px] lg:text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-white rounded-lg transition-all flex items-center gap-2"
            >
              <Calendar size={14} />
              <span className="hidden sm:inline">Cycle Control</span>
            </button>

            <button
              onClick={handleNextWeek}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all flex items-center gap-2"
            title="Export CSV"
          >
            <Download size={14} />
            <span className="hidden lg:inline text-[9px] lg:text-[11px] font-black uppercase tracking-widest">
              Export
            </span>
          </button>

          <Link
            to="/payroll/rates"
            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all flex items-center gap-2"
            title="Base Rates"
          >
            <DollarSign size={14} />
            <span className="hidden lg:inline text-[9px] lg:text-[11px] font-black uppercase tracking-widest">
              Base Rates
            </span>
          </Link>

          <button
            onClick={() =>
              generatePayrollReportPDF({
                payrollData,
                dateRange,
                totalAmount,
                totalHours,
                stats,
              })
            }
            className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <FileText size={14} />
            <span className="hidden lg:inline">PDF Summary</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Modern High-Density Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active Personnel', value: payrollData.length, sub: 'Employees', icon: Users, color: 'text-blue-600', hover: 'group-hover:bg-blue-600' },
            { label: 'Total Man-Hours', value: Math.round(totalHours), sub: 'Hours', icon: Clock, color: 'text-indigo-600', hover: 'group-hover:bg-indigo-600' },
            { label: 'Gross Disbursement', value: `$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, sub: 'USD', icon: DollarSign, color: 'text-emerald-600', hover: 'group-hover:bg-emerald-600' },
            {
              label: 'Rate Alerts',
              value: stats.missingRateCount,
              sub: 'Missing',
              icon: AlertCircle,
              color: stats.missingRateCount > 0 ? 'text-rose-600' : 'text-slate-400',
              hover: stats.missingRateCount > 0 ? 'hover:bg-rose-50' : 'hover:bg-slate-50',
              pulse: stats.missingRateCount > 0
            }
          ].map((stat, i) => (
            <div key={i} className={`bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group ${stat.pulse ? 'ring-2 ring-rose-500/20 animate-pulse' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 bg-white rounded-xl shadow-sm transition-all ${stat.color} ${stat.hover} group-hover:text-white`}><stat.icon size={18} /></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-black text-slate-900 tracking-tight ${typeof stat.value === 'string' && stat.value.length > 5 ? "text-sm" : "text-lg"}`}>{stat.value}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{stat.sub}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payroll Ledger Table */}
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Ledger...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  <tr>
                    <th className="px-4 md:px-6 py-4 text-left">Internal Personnel</th>
                    <th className="px-6 py-4 text-left hidden md:table-cell">Contact Credentials</th>
                    <th className="px-6 py-4 text-left hidden lg:table-cell">Classification</th>
                    <th className="px-4 md:px-6 py-4 text-left">Operational Hours</th>
                    <th className="px-4 md:px-6 py-4 text-left hidden sm:table-cell">Configured Rate</th>
                    <th className="px-4 md:px-6 py-4 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {payrollData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm transition-transform hover:scale-110 duration-500">
                            <CreditCard className="text-slate-300" size={32} />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Cycle Empty</h3>
                          <p className="text-xs font-medium text-slate-400 leading-relaxed">No completed shift data has been synchronized for this period.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payrollData.map((record) => {
                      const isMissingRate = !record.hourly_rate || record.hourly_rate <= 0;
                      return (
                        <tr 
                          key={record.staff_id} 
                          className={`group even:bg-slate-50/30 transition-colors cursor-pointer hover:bg-slate-100/50 ${isMissingRate ? 'bg-rose-50/30' : ''}`}
                          onClick={() => {
                            setStaffForDetail(record);
                            setShowStaffDetail(true);
                          }}
                        >
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="h-8 w-8 md:h-9 md:w-9 bg-slate-100 rounded-lg md:rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                {record.profile_picture ? (
                                  <img src={record.profile_picture} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase bg-slate-50">
                                    {record.staff_name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{record.staff_name}</div>
                                <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate hidden sm:block">Active Staff</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">{record.email}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{record.phone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-black text-slate-700 uppercase hidden lg:table-cell">{record.role}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black text-blue-600">
                              <Clock size={10} className="opacity-50 hidden sm:block" />
                              {record.billable_hours?.toFixed(1) || 0}h
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                            {isMissingRate || record.hourly_rate === 'No Rate' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Don't trigger row click
                                  setSelectedStaff(record);
                                  setShowAssignModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 md:py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[8px] md:text-[9px] font-black uppercase tracking-widest animate-pulse hover:bg-rose-200 transition-all"
                              >
                                <Plus size={10} />
                                Link Rate
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Don't trigger row click
                                  setSelectedStaff(record);
                                  setShowAssignModal(true);
                                }}
                                className="group/rate flex items-center gap-1.5 text-[10px] md:text-[11px] font-black text-slate-900"
                              >
                                <span className="text-slate-400 group-hover/rate:text-blue-500 transition-colors">
                                  {record.hourly_rate}
                                </span>
                                <span className="text-slate-400 group-hover/rate:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={10} /></span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg md:rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] md:text-[11px] font-black transition-all group-hover:shadow-md group-hover:scale-105">
                              ${record.gross_pay?.toFixed(2) || '0.00'}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Period Summary Footer Card */}
        {payrollData.length > 0 && (
          <div className="mt-8 bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-white/10 rounded-[1.8rem] backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                  <TrendingUp className="text-emerald-400" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Cycle Final Summary</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Aggregated Operational Disbursement</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-10">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Personnel</p>
                  <div className="text-3xl font-black">{payrollData.length}</div>
                </div>
                <div className="w-[1px] h-12 bg-white/10 hidden lg:block"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Man-Hours</p>
                  <div className="text-3xl font-black">{totalHours.toFixed(1)}<span className="text-sm font-bold text-slate-400 ml-1">h</span></div>
                </div>
                <div className="w-[1px] h-12 bg-white/10 hidden lg:block"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Gross Total</p>
                  <div className="text-3xl font-black text-emerald-400">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => generatePayrollReportPDF({ payrollData, dateRange, totalAmount, totalHours, stats })}
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                >
                  Finalize & Export PDF <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DateRangeModal
        isOpen={showDateRange}
        onClose={() => setShowDateRange(false)}
        onApply={handleDateRangeApply}
        currentPeriod={payrollPeriod}
        currentDates={dateRange}
      />

      <AssignRateToStaffModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedStaff(null);
        }}
        staffId={selectedStaff?.staff_id}
        staffName={selectedStaff?.staff_name}
        onSuccess={fetchPayrollData}
      />

      <StaffDetailPanel
        isOpen={showStaffDetail}
        onClose={() => {
          setShowStaffDetail(false);
          setStaffForDetail(null);
        }}
        staff={staffForDetail}
        start_date={dateRange.start}
        end_date={dateRange.end}
        tenant_id={currentStaff?.tenant_id}
      />
    </div>
  );
}
