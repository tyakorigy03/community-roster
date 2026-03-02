import { DollarSign, Download, Calendar, Clock, X,  FileText , ChevronLeft, ChevronRight, Menu, Filter, Search, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { generatePayrollReportPDF } from "../utils/payrollReportPdf";

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



// Date Range Modal Component
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Date Range</h2>
              <p className="text-xs text-gray-500">Choose payroll period</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payroll Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {selectedPeriod === "custom" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Payroll Page Component
export default function PayrollPage() {
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
  roleSummary: {}
});
  
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
        end_date: dateRange.end
      });

    if (error) throw error;

    // Transform the data to match your frontend structure
    const processedData = (data || []).map(record => ({
      staff_id: record.staff_id,
      staff_name: record.name,
      profile_picture: record.profile_picture,
      billable_hours: record.total_hours,
      hourly_rate: record.hourly_rate,
      gross_pay: record.total_pay,
      email: record.email,
      phone: record.phone,
      role: record.role,
    }));

    setPayrollData(processedData);
    
    // Calculate additional stats for PDF
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
    roleSummary
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
    r.billable_hours.toFixed(2),
    r.hourly_rate.toFixed(2),         // numeric, safe
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b rounded-t-3xl border-gray-200 px-3 py-3 sm:px-6 lg:px-8 lg:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Title + Mobile Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">
                Payroll Overview
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 hidden sm:block">
                {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </p>
              <p className="mt-1 text-xs text-gray-500 sm:hidden">
                {formatDate(dateRange.start, true)} - {formatDate(dateRange.end, true)}
              </p>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* ================= MOBILE MENU ================= */}
          <div
            className={`lg:hidden transition-all duration-200 ${
              isMobileMenuOpen ? "block" : "hidden"
            }`}
          >
            <div className="flex flex-col gap-4 pt-2">
              {/* Date Navigation */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={handlePrevWeek}
                  className="flex-1 p-3 hover:bg-gray-100"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  onClick={() => setShowDateRange(true)}
                  className="flex-1 p-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2"
                >
                  <Filter size={16} />
                  Range
                </button>

                <button
                  onClick={handleNextWeek}
                  className="flex-1 p-3 hover:bg-gray-100"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-blue-50 py-2 text-center text-blue-700">
                  <div className="font-semibold">{payrollData.length}</div>
                  <div className="text-xs">Staff</div>
                </div>

                <div className="rounded-lg bg-green-50 py-2 text-center text-green-700">
                  <div className="font-semibold">{Math.round(totalHours)}</div>
                  <div className="text-xs">Hours</div>
                </div>

                <div className="rounded-lg bg-purple-50 py-2 text-center text-purple-700">
                  <div className="font-semibold">${totalAmount.toFixed(0)}</div>
                  <div className="text-xs">Total</div>
                </div>
              </div>

              {/* Action Buttons */}
            <div className="flex flex-col gap-2">
  <Link
    to="/payroll/rates"
    className="flex items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-700 hover:bg-gray-50"
  >
    <DollarSign size={18} />
    Manage payroll rate
  </Link>
  <button 
    onClick={handleExportCSV}
    className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-white hover:bg-gray-700"
  >
    <Download size={18} />
    Export CSV
  </button>
  <button 
    onClick={() => generatePayrollReportPDF({
      payrollData,
      dateRange,
      totalAmount,
      totalHours,
      stats
    })}
    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
  >
    <FileText size={18} /> {/* Add FileText import */}
    Export PDF
  </button>
</div>
            </div>
          </div>

          {/* ================= DESKTOP CONTROLS ================= */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Date Navigation */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={handlePrevWeek}
                className="p-2 hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                onClick={handleGoToToday}
                className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                Today
              </button>

              <button
                onClick={() => setShowDateRange(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 border-x"
              >
                <Filter size={16} />
                Filter
              </button>

              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-gray-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700">
                <span className="font-semibold">{payrollData.length}</span> Staff
              </div>

              <div className="rounded-lg bg-green-50 px-3 py-1 text-green-700">
                <span className="font-semibold">{Math.round(totalHours)}</span> Hours
              </div>

              <div className="rounded-lg bg-purple-50 px-3 py-1 text-purple-700">
                <span className="font-semibold">${totalAmount.toFixed(0)}</span> Total
              </div>
            </div>

            {/* Action Buttons */}
          <div className="flex items-center gap-2">
  <Link
    to="/payroll/rates"
    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
  >
    <DollarSign className="w-4 h-4" />
    Manage payroll rate
  </Link>
  <button 
    onClick={handleExportCSV}
    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
  >
    <Download className="w-4 h-4" />
    Export CSV
  </button>
  <button 
    onClick={() => generatePayrollReportPDF({
      payrollData,
      dateRange,
      totalAmount,
      totalHours,
      stats
    })}
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
  >
    <FileText className="w-4 h-4" />
    Export PDF
  </button>
</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Payroll Table - UPDATED FOR AGGREGATED DATA WITHOUT STATUS/APPROVE */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading payroll data...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payrollData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Calendar className="text-gray-300 w-10 h-10 mb-3" />
                          <p className="text-gray-500 text-sm font-medium">No payroll records</p>
                          <p className="text-gray-400 text-xs mt-1">Completed shifts will appear here automatically</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payrollData.map((record) => (
                      <tr key={record.staff_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {record.profile_picture && (
                              <img 
                                src={record.profile_picture} 
                                alt={record.staff_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{record.staff_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{record.email}</div>
                          <div className="text-xs text-gray-500">{record.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{record.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {record.billable_hours?.toFixed(2) || 0}h
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">${record.hourly_rate}/hr</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">${record.gross_pay?.toFixed(2) || '0.00'}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Card - UPDATED WITHOUT APPROVAL COUNTER */}
        {payrollData.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{payrollData.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gross Pay</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</p>
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
    </div>
  );
}