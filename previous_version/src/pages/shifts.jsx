import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload,
  Edit,
  Calendar,
  Clock,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import ShiftModal from './addshift';

const addDays = (base, days) => {
  const n = new Date(base);
  n.setDate(n.getDate() + days);
  return n;
};

const formatDayLabel = (isoDate, short = false) => {
  const d = new Date(isoDate);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  if (short) {
    return `${days[d.getDay()].substring(0, 1)} ${day}`;
  }
  
  return `${days[d.getDay()]} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
};

const generateWeekDates = (startDateIso) => {
  const base = startDateIso ? new Date(startDateIso) : new Date();
  const dayOfWeek = base.getDay();
  const monday = addDays(base, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(monday, i);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
};

// Calculate total hours for a day
const calculateDailyHours = (shifts) => {
  return shifts.reduce((total, shift) => {
    const start = parseTime(shift.start_time);
    const end = parseTime(shift.end_time);
    const breakHours = (shift.break_minutes || 0) / 60;
    const hours = (end - start - breakHours);
    return total + (hours > 0 ? hours : 0);
  }, 0);
};

// Parse time string to decimal hours
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

// Format hours display
const formatHours = (hours) => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0 && minutes === 0) return '0h';
  
  if (wholeHours === 0) return `${minutes}m`;
  if (minutes === 0) return `${wholeHours}h`;
  
  return `${wholeHours}h ${minutes}m`;
};

// Color palette for shifts
const SHIFT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

// Get a color for shift based on index
const getShiftColor = (index) => {
  return SHIFT_COLORS[index % SHIFT_COLORS.length];
};

// Mobile Shift Card Component
function MobileShiftCard({ shift, index, onEdit, totalShifts }) {
  const duration = () => {
    const start = parseTime(shift.start_time);
    const end = parseTime(shift.end_time);
    const breakHours = (shift.break_minutes || 0) / 60;
    const hours = end - start - breakHours;
    return hours > 0 ? formatHours(hours) : '0h';
  };

  return (
    <div 
      className="relative mb-2"
      onClick={() => onEdit(shift)}
    >
      <div 
        className="p-3 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
        style={{ borderLeftColor: shift.color || getShiftColor(index) }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="font-semibold text-gray-700 truncate flex-1 mr-2">
            {shift.client_name || shift.shift_type_name || 'Shift'}
          </div>
          {totalShifts > 1 && (
            <div className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded whitespace-nowrap">
              {index + 1}/{totalShifts}
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500 truncate mb-2">
          {shift.shift_type_name || 'No type'}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="text-sm text-gray-600 flex items-center">
            <Clock size={12} className="mr-1" />
            {shift.start_time} - {shift.end_time}
          </div>
          {shift.break_minutes > 0 && (
            <div className="text-sm text-gray-500">
              ({shift.break_minutes}m break)
            </div>
          )}
        </div>
        
        <div className="text-sm font-medium text-blue-600 mb-1">{duration()}</div>
        
        {shift.staff_name && (
          <div className="text-sm text-gray-500 truncate">
            Staff: {shift.staff_name}
          </div>
        )}
      </div>
      <div className="absolute top-3 right-3">
        <Edit size={14} className="text-gray-400 hover:text-blue-600" />
      </div>
    </div>
  );
}

// Single Shift Card Component (Desktop)
function ShiftCard({ shift, index, onEdit, totalShifts }) {
  const duration = () => {
    const start = parseTime(shift.start_time);
    const end = parseTime(shift.end_time);
    const breakHours = (shift.break_minutes || 0) / 60;
    const hours = end - start - breakHours;
    return hours > 0 ? formatHours(hours) : '0h';
  };

  return (
    <div 
      className="relative group mb-1"
      onClick={() => onEdit(shift)}
    >
      <div 
        className="p-2 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer text-left"
        style={{ borderLeftColor: shift.color || getShiftColor(index) }}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="font-semibold text-sm text-gray-700 truncate">
            {shift.client_name || shift.shift_type_name || 'Shift'}
          </div>
          {totalShifts > 1 && (
            <div className="text-xs font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
              {index + 1}/{totalShifts}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate mb-1">
          {shift.shift_type_name || 'No type'}
        </div>
        <div className="text-xs text-gray-600">
          {shift.start_time} - {shift.end_time}
          {shift.break_minutes ? ` (${shift.break_minutes}m break)` : ''}
        </div>
        <div className="text-xs font-medium text-blue-600 mt-1">{duration()}</div>
        {shift.staff_name && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            Staff: {shift.staff_name}
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit size={12} className="text-gray-400 hover:text-blue-600" />
      </div>
    </div>
  );
}

// RosterRow Component (Desktop)
function RosterRow({ employee, weekDates, getShifts, onAddShift, onEditShift }) {
  return (
    <div className="hidden lg:flex items-stretch py-3 px-2 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
      {/* Employee Column */}
      <div className="w-48 flex-shrink-0 flex items-center p-3 rounded-lg mr-4 border-l-4 border-blue-500 bg-gray-50">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3 flex-shrink-0">
          {employee.name
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-700 truncate">{employee.name}</div>
          <div className="text-sm text-gray-500">{Math.round(employee.totalHours * 10) / 10}h total</div>
          <div className="text-xs text-gray-400 truncate">{employee.role || 'Staff'}</div>
        </div>
      </div>

      {/* Days Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-h-32">
          {weekDates.map(d => {
            const cellShifts = getShifts(employee.id, d);
            const dailyHours = calculateDailyHours(cellShifts);
            
            return (
              <div 
                key={`${employee.id}-${d}`} 
                className="flex-1 min-w-32 px-2 border-l border-gray-100 first:border-l-0"
              >
                <div className="h-full flex flex-col">
                  {/* Add Shift Button */}
                  <button
                    onClick={() => onAddShift(employee.id, d)}
                    className="w-full h-8 mb-1 border border-dashed border-gray-300 rounded flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                  >
                    <Plus size={14} className="text-gray-400 group-hover:text-blue-500" />
                    <span className="text-xs text-gray-500 ml-1 group-hover:text-blue-600">Add</span>
                  </button>

                  {/* Shifts Container */}
                  <div className="flex-1 overflow-y-auto max-h-48">
                    {cellShifts.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-xs text-gray-400 text-center p-2">
                          No shifts
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {cellShifts.map((s, index) => (
                          <ShiftCard
                            key={s.id}
                            shift={s}
                            index={index}
                            totalShifts={cellShifts.length}
                            onEdit={onEditShift}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Daily Hours Summary */}
                  {cellShifts.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-700 text-center">
                        {formatHours(dailyHours)}
                      </div>
                      <div className="text-[10px] text-gray-500 text-center">
                        {cellShifts.length} shift{cellShifts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Mobile Employee Day View
function MobileEmployeeDay({ employee, date, getShifts, onAddShift, onEditShift, isExpanded, onToggle }) {
  const cellShifts = getShifts(employee.id, date);
  const dailyHours = calculateDailyHours(cellShifts);
  const isToday = new Date(date).toDateString() === new Date().toDateString();

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <div 
        className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3 flex-shrink-0">
            {employee.name
              .split(' ')
              .map(p => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-700">{employee.name}</div>
            <div className="text-sm text-gray-500 flex items-center">
              {formatDayLabel(date, true)}
              {isToday && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                  Today
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-medium text-gray-700">{formatHours(dailyHours)}</div>
            <div className="text-xs text-gray-500">
              {cellShifts.length} shift{cellShifts.length !== 1 ? 's' : ''}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          {/* Add Shift Button */}
          <button
            onClick={() => onAddShift(employee.id, date)}
            className="w-full mb-4 p-3 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Plus size={20} className="text-gray-400 mb-1" />
            <span className="text-sm text-gray-600">Add Shift</span>
          </button>

          {/* Shifts List */}
          {cellShifts.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 mb-2">No shifts scheduled</div>
              <div className="text-sm text-gray-500">Click "Add Shift" to schedule a shift</div>
            </div>
          ) : (
            <div className="space-y-3">
              {cellShifts.map((s, index) => (
                <MobileShiftCard
                  key={s.id}
                  shift={s}
                  index={index}
                  totalShifts={cellShifts.length}
                  onEdit={onEditShift}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main WeeklyRoster Component
export default function WeeklyRoster() {
  const [weekDates, setWeekDates] = useState(generateWeekDates());
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('week'); // 'week' or 'employee'
  const [expandedDayIndex, setExpandedDayIndex] = useState(null);
  const [expandedEmployees, setExpandedEmployees] = useState({});

  // Fetch data on mount and when week changes
  useEffect(() => {
    fetchData();
  }, [weekDates]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, role, email, phone")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (staffError) throw staffError;
      
      // Format staff for dropdown
      const formattedStaff = staffData.map(staff => ({
        id: staff.id,
        name: staff.name,
        role: staff.role || 'Staff',
        email: staff.email,
        phone: staff.phone
      }));
      
      setStaffList(formattedStaff);

      // Calculate date range for the week
      const startDate = weekDates[0];
      const endDate = weekDates[6];

      // Fetch shifts for this week with related data
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shifts")
        .select(`
          *,
          staff:staff_id(name),
          client:client_id(first_name, last_name),
          shift_type:shift_type_id(name)
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (shiftsError) throw shiftsError;

      // Format shifts with display names
      const formattedShifts = (shiftsData || []).map(shift => ({
        ...shift,
        staff_name: shift.staff?.name || null,
        client_name: shift.client ? `${shift.client.first_name} ${shift.client.last_name}` : null,
        shift_type_name: shift.shift_type?.name || null
      }));

      setShifts(formattedShifts);

      // Calculate employee hours and format employees
      const employeeMap = new Map();
      
      formattedStaff.forEach(staff => {
        const staffShifts = formattedShifts.filter(s => s.staff_id === staff.id);
        const totalHours = staffShifts.reduce((total, shift) => {
          const start = parseTime(shift.start_time);
          const end = parseTime(shift.end_time);
          const breakHours = (shift.break_minutes || 0) / 60;
          return total + (end - start - breakHours);
        }, 0);

        employeeMap.set(staff.id, {
          id: staff.id,
          name: staff.name,
          totalHours: totalHours,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
        });
      });

      // Add unassigned shifts as "Unassigned" employee
      const unassignedShifts = formattedShifts.filter(s => !s.staff_id);
      if (unassignedShifts.length > 0) {
        const unassignedHours = unassignedShifts.reduce((total, shift) => {
          const start = parseTime(shift.start_time);
          const end = parseTime(shift.end_time);
          const breakHours = (shift.break_minutes || 0) / 60;
          return total + (end - start - breakHours);
        }, 0);

        employeeMap.set('unassigned', {
          id: 'unassigned',
          name: 'Unassigned Shifts',
          totalHours: unassignedHours,
          role: 'Open Shifts',
        });
      }

      setEmployees(Array.from(employeeMap.values()));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load roster data");
    } finally {
      setLoading(false);
    }
  };

  const shiftsByEmployeeDate = useMemo(() => {
    const map = new Map();
    for (const s of shifts) {
      const employeeId = s.staff_id || 'unassigned';
      const key = `${employeeId}::${s.shift_date}`;
      if (!map.has(key)) map.set(key, []);
      const shiftWithColor = {
        ...s,
        color: s.color || getShiftColor(map.get(key).length)
      };
      map.get(key).push(shiftWithColor);
    }
    return map;
  }, [shifts]);

  const openAddShift = (employeeId, date) => {
    // If employeeId is 'unassigned', set staff_id to null
    const staffId = employeeId === 'unassigned' ? null : employeeId;
    
    setEditingShift({
      id: undefined,
      staff_id: staffId,
      shift_date: date,
      start_time: '09:00',
      end_time: '17:00',
      break_minutes: 0,
      status: 'scheduled',
    });
    setModalVisible(true);
  };

  const openEditShift = (shift) => {
    setEditingShift({ 
      ...shift,
      staff_id: shift.staff_id || null
    });
    setModalVisible(true);
  };

  const handleSaveShift = async (shiftData) => {
    try {
      if (shiftData.id) {
        // Update existing shift
        const { data, error } = await supabase
          .from('shifts')
          .update({
            client_id: shiftData.client_id,
            staff_id: shiftData.staff_id || null,
            shift_date: shiftData.shift_date,
            start_time: shiftData.start_time,
            end_time: shiftData.end_time,
            break_minutes: shiftData.break_minutes,
            shift_type_id: shiftData.shift_type_id || null,
            status: shiftData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', shiftData.id)
          .select()
          .single();

        if (error) throw error;
        
        // Update local state
        setShifts(prev => prev.map(s => 
          s.id === shiftData.id ? { ...s, ...data } : s
        ));
        toast.success('Shift updated successfully');
      } else {
        // Create new shift
        const { data, error } = await supabase
          .from('shifts')
          .insert([{
            client_id: shiftData.client_id,
            staff_id: shiftData.staff_id || null,
            shift_date: shiftData.shift_date,
            start_time: shiftData.start_time,
            end_time: shiftData.end_time,
            break_minutes: shiftData.break_minutes,
            shift_type_id: shiftData.shift_type_id || null,
            status: 'scheduled',
            created_by: 1, // TODO: Replace with actual user ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Add to local state
        setShifts(prev => [...prev, data]);
        toast.success('Shift created successfully');
      }
      
      // Refresh data
      await fetchData();
      setModalVisible(false);
      setEditingShift(null);
      
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error(`Failed to save shift: ${error.message}`);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!shiftId) return;
    
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shiftId);

        if (error) throw error;
        
        // Remove from local state
        setShifts(prev => prev.filter(s => s.id !== shiftId));
        toast.success('Shift deleted successfully');
        
        // Refresh data
        await fetchData();
        setModalVisible(false);
        setEditingShift(null);
      } catch (error) {
        console.error('Error deleting shift:', error);
        toast.error(`Failed to delete shift: ${error.message}`);
      }
    }
  };

  const handlePrevWeek = () => {
    const monday = new Date(weekDates[0]);
    const prevMonday = addDays(monday, -7);
    setWeekDates(generateWeekDates(prevMonday.toISOString()));
  };

  const handleNextWeek = () => {
    const monday = new Date(weekDates[0]);
    const nextMonday = addDays(monday, 7);
    setWeekDates(generateWeekDates(nextMonday.toISOString()));
  };

  const handleGoToToday = () => {
    setWeekDates(generateWeekDates());
  };

  const handleDeleteAllShifts = async () => {
    if (window.confirm('Are you sure you want to delete ALL shifts for this week? This cannot be undone.')) {
      try {
        const startDate = weekDates[0];
        const endDate = weekDates[6];
        
        const { error } = await supabase
          .from('shifts')
          .delete()
          .gte('shift_date', startDate)
          .lte('shift_date', endDate);

        if (error) throw error;
        
        setShifts([]);
        toast.success('All shifts for this week deleted');
        
        // Refresh data
        await fetchData();
      } catch (error) {
        console.error('Error deleting shifts:', error);
        toast.error(`Failed to delete shifts: ${error.message}`);
      }
    }
  };

  const calculateTotalWeeklyHours = () => {
    return employees.reduce((total, emp) => total + (emp.totalHours || 0), 0);
  };

  const getShiftsForCell = (employeeId, date) => {
    return shiftsByEmployeeDate.get(`${employeeId}::${date}`) || [];
  };

  const toggleEmployeeExpanded = (employeeId, date) => {
    const key = `${employeeId}-${date}`;
    setExpandedEmployees(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  const handlePublishRoster = async () => {
  // Confirm action
  if (!window.confirm('Are you sure you want to publish this roster? All staff members will receive an email with their shifts.')) {
    return;
  }

  try {
    // Show loading toast
    const loadingToast = toast.loading('Publishing roster and sending emails...');

    // Call the edge function
    const response = await fetch(
      `https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/publish-roster`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          startDate: weekDates[0],
          endDate: weekDates[6]
        })
      }
    );
    const data = await response.json();
    toast.dismiss(loadingToast);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to publish roster');
    }
    toast.success(
      `${data.message}\n${data.emailsSent} email${data.emailsSent !== 1 ? 's' : ''} sent successfully!`,
      { duration: 5000 }
    );
    if (data.errors && data.errors.length > 0) {
      toast.warning(
        `${data.errors.length} email${data.errors.length !== 1 ? 's' : ''} failed to send. Check console for details.`,
        { duration: 5000 }
      );
      console.error('Email errors:', data.errors);
    }

  } catch (error) {
    console.error('Error publishing roster:', error);
    toast.error(error.message || 'Failed to publish roster');
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 rounded-t-3xl">
      {/* Header */}
 <div className="sticky top-0 z-30 bg-white border-b  rounded-t-3xl border-gray-200 px-3 py-3 sm:px-6 lg:px-8 lg:py-5">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    {/* Title + Mobile Toggle */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-700">
          Weekly Roster
        </h2>

        {/* Date range */}
        <p className="mt-1 text-xs sm:text-sm text-gray-500 hidden sm:block">
          {formatDayLabel(weekDates[0])} - {formatDayLabel(weekDates[6])}
        </p>
        <p className="mt-1 text-xs text-gray-500 sm:hidden">
          {formatDayLabel(weekDates[0], true)} - {formatDayLabel(weekDates[6], true)}
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

        {/* Week Navigation */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={handlePrevWeek}
            className="flex-1 p-3 hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={handleGoToToday}
            className="flex-1 p-3 text-sm text-gray-700 hover:bg-gray-100"
          >
            Today
          </button>

          <button
            onClick={handleNextWeek}
            className="flex-1 p-3 hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 py-2 text-center text-blue-700">
            <div className="font-semibold">{employees.length}</div>
            <div className="text-xs">Staff</div>
          </div>

          <div className="rounded-lg bg-green-50 py-2 text-center text-green-700">
            <div className="font-semibold">
              {Math.round(calculateTotalWeeklyHours())}
            </div>
            <div className="text-xs">Hours</div>
          </div>
        </div>

        {/* Action */}
        <Link
          to="/addstaff"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Staff
        </Link>
      </div>
    </div>

    {/* ================= DESKTOP CONTROLS ================= */}
    <div className="hidden lg:flex items-center gap-4">

      {/* Week Navigation */}
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
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-100"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm">
        <div className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700">
          <span className="font-semibold">{employees.length}</span> Staff
        </div>

        <div className="rounded-lg bg-green-50 px-3 py-1 text-green-700">
          <span className="font-semibold">
            {Math.round(calculateTotalWeeklyHours())}
          </span>{" "}
          Hours
        </div>
      </div>

      {/* Action */}
      <Link
        to="/addstaff"
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        <Plus size={16} />
        Add Staff
      </Link>
    </div>
  </div>
</div>


      {/* Mobile Day Selector */}
      <div className="lg:hidden bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {weekDates.map((date, index) => (
            <button
              key={date}
              onClick={() => {
                setExpandedDayIndex(index === expandedDayIndex ? null : index);
                setMobileView('week');
              }}
              className={`flex-shrink-0 px-4 py-3 border-b-2 transition-colors ${
                expandedDayIndex === index
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium">{formatDayLabel(date, true)}</div>
              <div className="text-xs text-gray-500">
                {new Date(date).getDate() === new Date().getDate() && 'Today'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Day View */}
      <div className="lg:hidden">
        {expandedDayIndex !== null ? (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {formatDayLabel(weekDates[expandedDayIndex])}
              </h3>
              <div className="text-sm text-gray-500">
                Showing all shifts for this day
              </div>
            </div>
            
            <div className="space-y-4">
              {employees.map(employee => {
                const key = `${employee.id}-${weekDates[expandedDayIndex]}`;
                return (
                  <MobileEmployeeDay
                    key={key}
                    employee={employee}
                    date={weekDates[expandedDayIndex]}
                    getShifts={getShiftsForCell}
                    onAddShift={openAddShift}
                    onEditShift={openEditShift}
                    isExpanded={expandedEmployees[key]}
                    onToggle={() => toggleEmployeeExpanded(employee.id, weekDates[expandedDayIndex])}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center py-8 text-gray-500">
              Select a day to view shifts
            </div>
          </div>
        )}
      </div>

      {/* Desktop Roster Grid */}
      <div className="hidden lg:block px-6 py-4">
        {/* Roster Grid Header */}
        <div className="flex mb-2 px-2 bg-white rounded-t-lg border border-gray-200">
          <div className="w-48 px-4 py-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Employee Name
            </div>
          </div>
          <div className="flex-1">
            <div className="flex">
              {weekDates.map(d => (
                <div key={d} className="flex-1 min-w-32 px-2 py-3 border-l border-gray-100 first:border-l-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                    {formatDayLabel(d)}
                  </div>
                  <div className="text-xs text-gray-400 text-center mt-1">
                    {new Date(d).getDate() === new Date().getDate() && 
                     new Date(d).getMonth() === new Date().getMonth() && 
                     new Date(d).getFullYear() === new Date().getFullYear() && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                        Today
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roster Rows */}
        <div className="bg-white rounded-b-lg shadow border border-gray-200 overflow-hidden">
          {employees.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">No staff members found</div>
              <Link 
                to="/addstaff" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> Add Your First Staff Member
              </Link>
            </div>
          ) : (
            employees.map(employee => (
              <RosterRow
                key={employee.id}
                employee={employee}
                weekDates={weekDates}
                getShifts={getShiftsForCell}
                onAddShift={openAddShift}
                onEditShift={openEditShift}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 sm:px-6 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{shifts.length}</span> shifts scheduled this week
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleDeleteAllShifts}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete All Shifts</span>
              <span className="sm:hidden">Delete All</span>
            </button>
            
            <button
              onClick={handlePublishRoster}
              className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Publish Roster</span>
              <span className="sm:hidden">Publish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shift Modal */}
      <ShiftModal
        visible={modalVisible}
        shift={editingShift}
        onClose={() => {
          setModalVisible(false);
          setEditingShift(null);
        }}
        onSave={handleSaveShift}
        onDelete={() => handleDeleteShift(editingShift?.id)}
        staffList={staffList}
      />
    </div>
  );
}