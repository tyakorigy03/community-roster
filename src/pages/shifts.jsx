import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Send,
  Calendar,
  AlertCircle,
  Copy,
  Users as UsersIcon,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useUser } from '../context/UserContext';
import ShiftModal from './addshift';
import ShiftDetailsModal from '../components/ShiftDetailsModal';
import { assignStaffToShift, replaceShiftStaff, copyShiftToStaff, assignStaffToShifts } from '../services/shiftAssignments';

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
    let end = parseTime(shift.end_time);

    // Handle overnight shifts
    if (end < start) {
      end += 24;
    }

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



// Single Shift Card Component (Desktop)
function ShiftCard({ shift, index, onEdit, totalShifts }) {
  const duration = () => {
    const start = parseTime(shift.start_time);
    let end = parseTime(shift.end_time);
    if (end < start) end += 24;
    const breakHours = (shift.break_minutes || 0) / 60;
    const hours = end - start - breakHours;
    return hours > 0 ? formatHours(hours) : '0h';
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('shiftId', shift.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add a ghost effect class or something if needed
  };

  return (
    <div
      className="relative group w-full min-w-0 overflow-hidden"
      onClick={() => onEdit(shift)}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <div
        className="w-full p-1 bg-white/90 backdrop-blur-sm rounded-md border-l-[2px] shadow-sm hover:shadow-md transition-all cursor-move text-left border border-gray-100 overflow-hidden"
        style={{ borderLeftColor: shift.color || getShiftColor(index) }}
      >
        <div className="flex justify-between items-start mb-0.5">
          <div className="font-black text-[9px] text-gray-800 truncate pr-1 tracking-tight uppercase leading-none w-full">
            {shift.client_name || 'No Client'}
          </div>
        </div>

        <div className="flex justify-between items-center mb-0.5 overflow-hidden">
          <div className="text-[8px] text-gray-400 font-bold truncate tracking-widest uppercase leading-none min-w-0 flex-1">
            {shift.shift_type_name || 'Std'}
          </div>
          {shift.approved && (
            <span className="flex-shrink-0 text-[7px] font-black px-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded leading-none ml-1" title="Approved">
              A
            </span>
          )}
          {shift.execution_status === 'completed' && !shift.approved && (
            <span className="flex-shrink-0 text-[7px] font-black px-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded leading-none ml-1" title="Completed / Pending Approval">
              C
            </span>
          )}
          {shift.status === 'scheduled' && !shift.approved && shift.execution_status !== 'completed' && (
            <span className="flex-shrink-0 text-[7px] font-black px-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded leading-none ml-1" title="Draft">
              D
            </span>
          )}
        </div>

        {shift.hasConflict && (
          <div className="mb-0.5 flex items-center gap-0.5 text-[7px] font-black text-red-600 bg-red-50 px-0.5 rounded border border-red-100 uppercase">
            Conflict
          </div>
        )}

        <div className="text-[8.5px] font-black text-gray-600 leading-tight">
          {shift.start_time}-{shift.end_time}
        </div>

        <div className="flex justify-between items-center mt-0.5">
          <div className="text-[9px] font-black text-blue-600">{duration()}</div>
          {totalShifts > 1 && (
            <div className="text-[7px] font-black px-0.5 bg-gray-50 text-gray-400 rounded">
              {index + 1}/{totalShifts}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// RosterRow Component (Desktop)
function RosterRow({ rowItem, viewBy, weekDates, getShifts, onAddShift, onEditShift, onDropShift }) {
  const [isOver, setIsOver] = React.useState(null); // stores the date being hovered

  const name = viewBy === 'staff' ? rowItem.name : `${rowItem.first_name} ${rowItem.last_name}`;
  const subText = viewBy === 'staff' ? (rowItem.role || 'Staff') : (rowItem.ndis_number ? `NDIS: ${rowItem.ndis_number}` : 'Client');
  const totalDisplay = viewBy === 'staff' ? `${Math.round(rowItem.totalHours * 10) / 10}h total` : '';

  const handleDragOver = (e, date) => {
    e.preventDefault();
    setIsOver(date);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setIsOver(null);
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    setIsOver(null);
    const shiftId = e.dataTransfer.getData('shiftId');
    if (shiftId) {
      onDropShift(shiftId, rowItem.id, date);
    }
  };

  return (
    <div className="hidden lg:flex items-stretch border-b border-gray-100 bg-white hover:bg-blue-50/20 transition-all duration-300 group">
      {/* Entity Column (Sticky) */}
      <div className="w-36 sticky left-0 z-20 flex-shrink-0 flex items-center p-2 bg-white border-r border-gray-100 group-hover:bg-blue-50/50 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black mr-2 flex-shrink-0 shadow-sm">
          {name
            .split(' ')
            .filter(Boolean)
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-black text-gray-800 truncate uppercase tracking-tight">{name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="text-[8px] text-gray-400 font-bold truncate tracking-widest uppercase">{subText}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex min-h-[80px] w-full p-2">
          {weekDates.map(d => {
            const cellShifts = getShifts(rowItem.id, d);
            const dailyHours = calculateDailyHours(cellShifts);

            return (
              <div
                key={`${rowItem.id}-${d}`}
                className={`flex-1 min-w-0 px-1 border-l border-gray-100 first:border-l-0 transition-colors overflow-hidden ${isOver === d ? 'bg-blue-50/50 border-2 border-dashed border-blue-200 -m-[1px] z-10' : ''
                  }`}
                onDragOver={(e) => handleDragOver(e, d)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, d)}
              >
                <div className="h-full flex flex-col">
                  {/* Add Shift Button */}
                  <button
                    onClick={() => onAddShift(rowItem.id, d)}
                    className="w-full h-7 mb-1 bg-gray-50 border border-dashed border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                  >
                    <Plus size={12} className="text-gray-300 group-hover:text-blue-500 m-auto" />
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



// Main WeeklyRoster Component
export default function WeeklyRoster() {
  const { currentStaff } = useUser();
  const [weekDates, setWeekDates] = useState(generateWeekDates());
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState('week'); // 'week' or 'employee'
  const [expandedDayIndex, setExpandedDayIndex] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const dates = generateWeekDates();
    const idx = dates.indexOf(today);
    return idx !== -1 ? idx : 0;
  });
  const [expandedEmployees, setExpandedEmployees] = useState({});
  const [viewBy, setViewBy] = useState('staff'); // 'staff' or 'client'
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [viewingShift, setViewingShift] = useState(null);
  const [clients, setClients] = useState([]);

  // Helper functions for new UI
  const changeWeek = (direction) => {
    const monday = new Date(weekDates[0]);
    const newMonday = addDays(monday, direction * 7);
    setWeekDates(generateWeekDates(newMonday.toISOString()));
  };

  const formatDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = { day: 'numeric', month: 'short' };
    return `${startDate.toLocaleDateString('en-AU', options)} - ${endDate.toLocaleDateString('en-AU', options)}`;
  };

  // Fetch data on mount and when week changes
  useEffect(() => {
    if (currentStaff?.tenant_id) {
      fetchData();
    }
    // Auto-select today on mobile if present in current week
    const today = new Date().toISOString().split('T')[0];
    const idx = weekDates.indexOf(today);
    if (idx !== -1) {
      setExpandedDayIndex(idx);
    }
  }, [weekDates, currentStaff]);

  const fetchData = async () => {
    if (!currentStaff?.tenant_id) return;
    try {
      setLoading(true);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, ndis_number")
        .eq("is_active", true)
        .eq("tenant_id", currentStaff.tenant_id)
        .order("first_name", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, role, email, phone")
        .eq("is_active", true)
        .eq("tenant_id", currentStaff.tenant_id)
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
          shift_type:shift_type_id(name),
          staff_shifts(*)
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (shiftsError) throw shiftsError;

      // Format shifts with display names and actual execution status
      const formattedShifts = (shiftsData || []).map(shift => {
        const staffShift = shift.staff_shifts?.[0];
        return {
          ...shift,
          staff_name: shift.staff?.name || null,
          client_name: shift.client ? `${shift.client.first_name} ${shift.client.last_name}` : null,
          shift_type_name: shift.shift_type?.name || null,
          execution_status: staffShift?.status || 'pending',
          approved: staffShift?.approved || false,
          clock_out_time: staffShift?.clock_out_time || null
        };
      });

      setShifts(formattedShifts);

      // Calculate employee hours and format employees
      const employeeMap = new Map();

      formattedStaff.forEach(staff => {
        const staffShifts = formattedShifts.filter(s => s.staff_id === staff.id);
        const totalHours = staffShifts.reduce((total, shift) => {
          const start = parseTime(shift.start_time);
          let end = parseTime(shift.end_time);
          if (end < start) end += 24;
          const breakHours = (shift.break_minutes || 0) / 60;
          const hours = end - start - breakHours;
          return total + (hours > 0 ? hours : 0);
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
          let end = parseTime(shift.end_time);
          if (end < start) end += 24;
          const breakHours = (shift.break_minutes || 0) / 60;
          const hours = end - start - breakHours;
          return total + (hours > 0 ? hours : 0);
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

  const handleCleanConflicts = async () => {
    const conflicts = shifts.filter(s => s.hasConflict);
    if (conflicts.length === 0) {
      toast.info('No conflicts detected in the current roster.');
      return;
    }

    if (!window.confirm(`Found ${conflicts.length} overlapping shifts. Would you like to automatically remove the newer duplicates?`)) {
      return;
    }

    try {
      setLoading(true);
      // Logic: group by staff/date, find overlaps, mark for deletion
      const groups = {};
      shifts.forEach(s => {
        if (!s.staff_id) return;
        const key = `${s.staff_id}::${s.shift_date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });

      const toDelete = [];
      Object.values(groups).forEach(dayShifts => {
        if (dayShifts.length < 2) return;
        // Simple overlap check
        for (let i = 0; i < dayShifts.length; i++) {
          for (let j = i + 1; j < dayShifts.length; j++) {
            const s1 = dayShifts[i];
            const s2 = dayShifts[j];
            const start1 = parseTime(s1.start_time);
            let end1 = parseTime(s1.end_time); if (end1 < start1) end1 += 24;
            const start2 = parseTime(s2.start_time);
            let end2 = parseTime(s2.end_time); if (end2 < start2) end2 += 24;

            if ((start1 < end2) && (end1 > start2)) {
              // Mark the one with later created_at (or just the second one)
              const secondId = s2.created_at > s1.created_at ? s2.id : s1.id;
              if (!toDelete.includes(secondId)) toDelete.push(secondId);
            }
          }
        }
      });

      if (toDelete.length > 0) {
        const { error } = await supabase.from('shifts').delete().in('id', toDelete).eq('tenant_id', currentStaff.tenant_id);
        if (error) throw error;
        toast.success(`Removed ${toDelete.length} conflicting shifts.`);
        await fetchData();
      }
    } catch (error) {
      console.error('Error cleaning conflicts:', error);
      toast.error('Failed to clean conflicts');
    } finally {
      setLoading(false);
    }
  };

  // Conflict detection
  const hasOverlap = (shift, allShifts) => {
    if (!shift.staff_id) return false;
    const sameStaffShifts = allShifts.filter(s =>
      s.staff_id === shift.staff_id &&
      s.shift_date === shift.shift_date &&
      s.id !== shift.id
    );

    const sStart = parseTime(shift.start_time);
    let sEnd = parseTime(shift.end_time);
    if (sEnd < sStart) sEnd += 24;

    return sameStaffShifts.some(other => {
      const oStart = parseTime(other.start_time);
      let oEnd = parseTime(other.end_time);
      if (oEnd < oStart) oEnd += 24;

      // Check for overlap: (StartA < EndB) and (EndA > StartB)
      return (sStart < oEnd) && (sEnd > oStart);
    });
  };

  const shiftsByRowDate = useMemo(() => {
    const map = new Map();
    for (const s of shifts) {
      const rowId = viewBy === 'staff' ? (s.staff_id || 'unassigned') : (s.client_id || 'unassigned');
      const key = `${rowId}::${s.shift_date}`;
      if (!map.has(key)) map.set(key, []);
      const shiftWithMeta = {
        ...s,
        color: s.color || getShiftColor(map.get(key).length),
        hasConflict: hasOverlap(s, shifts)
      };
      map.get(key).push(shiftWithMeta);
    }
    return map;
  }, [shifts, viewBy]);

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
    setViewingShift(null);
    setDetailsVisible(false);
    setEditingShift({
      ...shift,
      staff_id: shift.staff_id || null
    });
    setModalVisible(true);
  };

  const openViewShift = (shift) => {
    setViewingShift(shift);
    setDetailsVisible(true);
  };

  const handleSaveShift = async (shiftData) => {
    try {
      if (shiftData.id) {
        // Update existing shift
        const { data, error } = await supabase
          .from('shifts')
          .update({
            client_id: shiftData.client_id,
            staff_id: shiftData.staff_ids?.[0] || null, // Keep first staff for backward compatibility
            shift_date: shiftData.shift_date,
            start_time: shiftData.start_time,
            end_time: shiftData.end_time,
            break_minutes: shiftData.break_minutes,
            shift_type_id: shiftData.shift_type_id || null,
            status: shiftData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', shiftData.id)
          .eq('tenant_id', currentStaff.tenant_id)
          .select()
          .single();

        if (error) throw error;

        // Update staff assignments
        if (shiftData.staff_ids && shiftData.staff_ids.length > 0) {
          await replaceShiftStaff(shiftData.id, shiftData.staff_ids, currentStaff.id, { tenant_id: currentStaff.tenant_id });
        }

        toast.success('Shift updated successfully');
      } else {
        // Create new shift(s)
        const shiftsToInsert = [];
        const baseShift = {
          client_id: shiftData.client_id,
          staff_id: shiftData.staff_ids?.[0] || null, // Keep first staff for backward compatibility
          start_time: shiftData.start_time,
          end_time: shiftData.end_time,
          break_minutes: shiftData.break_minutes,
          shift_type_id: shiftData.shift_type_id || null,
          status: 'scheduled',
          created_by: currentStaff.id,
          tenant_id: currentStaff.tenant_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (shiftData.is_recurring && shiftData.repeat_until) {
          let currentShiftDate = new Date(shiftData.shift_date);
          const endDate = new Date(shiftData.repeat_until);
          const selectedDays = shiftData.selected_days || [];

          while (currentShiftDate <= endDate) {
            const dayOfWeek = currentShiftDate.getDay();

            // Determine if we should create a shift on this date
            let shouldCreate = false;

            if (shiftData.frequency === 'daily') {
              // Daily: create every day
              shouldCreate = true;
            } else if (shiftData.frequency === 'weekly' || shiftData.frequency === 'fortnightly') {
              // Weekly/Fortnightly: only create if day matches selection

              // For fortnightly, we need to check if we are in an "even" week relative to start
              let isWeekValid = true;
              if (shiftData.frequency === 'fortnightly') {
                const start = new Date(shiftData.shift_date);
                // Calculate difference in days
                const diffTime = Math.abs(currentShiftDate - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // Calculate week number (0-indexed)
                const weekNum = Math.floor(diffDays / 7);
                // Only allow even weeks (0, 2, 4...)
                if (weekNum % 2 !== 0) {
                  isWeekValid = false;
                }
              }

              if (isWeekValid) {
                // If no days selected, default to the original shift date's day of week
                if (selectedDays.length === 0) {
                  const originalDayOfWeek = new Date(shiftData.shift_date).getDay();
                  shouldCreate = (dayOfWeek === originalDayOfWeek);
                } else {
                  shouldCreate = selectedDays.includes(dayOfWeek);
                }
              }
            }

            if (shouldCreate) {
              shiftsToInsert.push({
                ...baseShift,
                shift_date: currentShiftDate.toISOString().split('T')[0]
              });
            }

            // Always increment by 1 day (filtering happens above)
            currentShiftDate.setDate(currentShiftDate.getDate() + 1);
          }
        } else {
          // Single shift
          shiftsToInsert.push({
            ...baseShift,
            shift_date: shiftData.shift_date
          });
        }

        const { data: createdShifts, error } = await supabase
          .from('shifts')
          .insert(shiftsToInsert)
          .select();

        if (error) throw error;

        // Create staff assignments for all created shifts
        if (shiftData.staff_ids && shiftData.staff_ids.length > 0 && createdShifts) {
          const shiftIds = createdShifts.map(s => s.id);
          await assignStaffToShifts(shiftIds, shiftData.staff_ids, currentStaff.id, { tenant_id: currentStaff.tenant_id });
        }
        toast.success(shiftsToInsert.length > 1
          ? `Successfully created ${shiftsToInsert.length} shifts`
          : 'Shift created successfully');
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

  const handleCopyShiftToStaff = async (shiftId, targetStaffIds) => {
    try {
      const result = await copyShiftToStaff(shiftId, targetStaffIds, { 
        status: 'scheduled',
        tenant_id: currentStaff.tenant_id,
        assignedBy: currentStaff.id
      });

      if (result.success) {
        toast.success(`Shift copied to ${targetStaffIds.length} staff member(s)`);
        await fetchData();
        setDetailsVisible(false);
      } else {
        toast.error(result.error || 'Failed to copy shift');
      }
    } catch (error) {
      console.error('Error copying shift:', error);
      toast.error('Failed to copy shift');
    }
  };

  const handleDropShift = async (shiftId, targetRowId, targetDate) => {
    try {
      const shiftToMove = shifts.find(s => s.id === shiftId);
      if (!shiftToMove) return;

      const updateData = {
        shift_date: targetDate,
        updated_at: new Date().toISOString()
      };

      if (viewBy === 'staff') {
        updateData.staff_id = targetRowId === 'unassigned' ? null : targetRowId;
      } else {
        updateData.client_id = targetRowId === 'unassigned' ? null : targetRowId;
      }

      const { error } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', shiftId)
        .eq('tenant_id', currentStaff.tenant_id);

      if (error) throw error;

      toast.success('Shift re-assigned');
      await fetchData();
    } catch (error) {
      console.error('Error moving shift:', error);
      toast.error('Failed to move shift');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!shiftId) return;

    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shiftId)
          .eq('tenant_id', currentStaff.tenant_id);

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
          .lte('shift_date', endDate)
          .eq('tenant_id', currentStaff.tenant_id);

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

  const getShiftsForCell = (rowId, date) => {
    return shiftsByRowDate.get(`${rowId}::${date}`) || [];
  };

  const handleCopyLastWeek = async () => {
    if (!window.confirm('Copy all shifts from last week to this week? This will create new draft shifts.')) return;

    try {
      setLoading(true);
      const prevMonday = addDays(new Date(weekDates[0]), -7);
      const prevSunday = addDays(new Date(weekDates[6]), -7);

      const { data: prevShifts, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('shift_date', prevMonday.toISOString().split('T')[0])
        .lte('shift_date', prevSunday.toISOString().split('T')[0])
        .eq('tenant_id', currentStaff.tenant_id);

      if (error) throw error;

      if (!prevShifts || prevShifts.length === 0) {
        toast.info('No shifts found in the previous week to copy.');
        return;
      }

      const newShifts = prevShifts.map(s => {
        const oldDate = new Date(s.shift_date);
        const newDate = addDays(oldDate, 7);

        const { id, created_at, updated_at, ...cleanShift } = s;
        return {
          ...cleanShift,
          shift_date: newDate.toISOString().split('T')[0],
          status: 'scheduled', // Copy as draft
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const { error: insertError } = await supabase.from('shifts').insert(newShifts);
      if (insertError) throw insertError;

      toast.success(`Successfully copied ${newShifts.length} shifts from last week.`);
      await fetchData();
    } catch (error) {
      console.error('Error copying shifts:', error);
      toast.error('Failed to copy shifts');
    } finally {
      setLoading(false);
    }
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

      // Update statuses to published
      const startDate = weekDates[0];
      const endDate = weekDates[6];

      const { data: updatedShifts, error: updateError, count } = await supabase
        .from('shifts')
        .update({ status: 'published' })
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .eq('status', 'scheduled')
        .eq('tenant_id', currentStaff.tenant_id)
        .select('*', { count: 'exact' });

      if (updateError) throw updateError;

      if (count === 0) {
        toast.info('No draft shifts found to publish for this week.');
        // Still proceed to call the edge function in case some were already published 
        // but user wants to re-send emails, though the logic below depends on response.
      }

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
            endDate: weekDates[6],
            tenant_id: currentStaff.tenant_id
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

  return (
    <>
      <div className="h-full  flex flex-col bg-gray-50 overflow-hidden font-sans">
        {/* --- UNIFIED COMPACT HEADER --- */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
          <div className="max-w-[1600px] mx-auto px-3 py-2 flex  gap-2 flex-row items-center justify-between">

            {/* LEFT SIDE */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 lg:gap-6  w-auto">

              {/* Logo + Title */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Calendar size={16} />
                </div>
                <div>
                  <h1 className="text-sm hidden md:block sm:text-base font-black text-gray-900 leading-tight tracking-tight uppercase">
                    <span>Blessing community</span>   <span className="text-blue-600">Roster</span>
                  </h1>
                  <div className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.15em] leading-none">
                    Console
                  </div>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={() => changeWeek(-1)}
                  className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm active:scale-95"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="px-1 py-0.5 flex flex-col items-center min-w-[110px]">
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                    Current Week
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-gray-700 text-center">
                    {formatDateRange(weekDates[0], weekDates[6])}
                  </div>
                </div>

                <button
                  onClick={() => changeWeek(1)}
                  className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm active:scale-95"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Today Button */}
              <button
                onClick={handleGoToToday}
                className="px-2 py-1 text-[9px] font-black text-gray-500 hover:text-blue-600 transition-all uppercase tracking-widest hidden sm:block"
              >
                Today
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 mt-2 sm:mt-0">

              {/* View Toggle */}
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                {["staff", "client"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setViewBy(type)}
                    className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${viewBy === type ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-1 text-[9px]">
                <div className="flex flex-col items-end">
                  <div className="font-black text-gray-900">{employees.length} Staff</div>
                  <div className="text-gray-400 font-bold leading-none capitalize text-[8px]">
                    active roster
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-[9px]">
                  {Math.round(calculateTotalWeeklyHours())}h
                </div>
              </div>

              {/* Shift Button */}
              <button
                onClick={() => openAddShift(null, new Date().toISOString())}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-[10px] font-black shadow-sm active:translate-y-0.5"
              >
                <Plus size={12} />
                <span>SHIFT</span>
              </button>
            </div>
          </div>
        </header>


        {/* --- ROSTER GRID (SCROLLABLE AREA) --- */}
        <main className="flex-1 overflow-auto bg-gray-50 relative custom-scrollbar">
          <div className="w-full">
            {/* Desktop Roster Header (Sticky at top of scroll area) */}
            <div className="hidden lg:block sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
              <div className="flex">
                <div className="w-36 sticky left-0 z-40 flex-shrink-0 p-2 flex flex-col justify-center border-r border-gray-100 bg-white/95 backdrop-blur-md">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">
                    Workforce
                  </div>
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">hours</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex w-full">
                    {weekDates.map((date, i) => {
                      const isToday = new Date(date).toDateString() === new Date().toDateString();
                      const dayName = new Date(date).toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
                      const dayNum = new Date(date).getDate();

                      return (
                        <div key={i} className={`flex-1 min-w-0 px-1 border-l border-transparent first:border-l-0 text-center py-1 overflow-hidden`}>
                          <div className={`text-[8px] font-black tracking-widest truncate ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                            {dayName}
                          </div>
                          <div className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black transition-all ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-800 hover:bg-gray-100'
                            }`}>
                            {dayNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* Roster Data Rows */}
            <div className="hidden lg:block">
              {(viewBy === 'staff' ? employees : clients).length === 0 ? (
                <div className="text-center py-20 bg-white border-b border-gray-200">
                  <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-4">Empty Roster Database</div>
                  <Link
                    to={viewBy === 'staff' ? "/addstaff" : "/addclient"}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-black text-xs"
                  >
                    <Plus size={14} /> INITIALIZE {viewBy === 'staff' ? 'STAFF' : 'CLIENT'}
                  </Link>
                </div>
              ) : (
                (viewBy === 'staff' ? employees : clients).map(rowItem => (
                  <RosterRow
                    key={rowItem.id}
                    rowItem={rowItem}
                    viewBy={viewBy}
                    weekDates={weekDates}
                    getShifts={getShiftsForCell}
                    onAddShift={openAddShift}
                    onEditShift={openViewShift}
                    onDropShift={handleDropShift}
                  />
                ))
              )}
            </div>

            {/* Mobile Management View */}
            <div className="lg:hidden bg-gray-50/50">
              {/* Day Selector Strip - High Density */}
              <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200 overflow-x-auto no-scrollbar py-1 px-2">
                <div className="flex gap-1">
                  {weekDates.map((date, index) => {
                    const dayDate = new Date(date);
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    const isSelected = expandedDayIndex === index;

                    return (
                      <button
                        key={date}
                        onClick={() => setExpandedDayIndex(index)}
                        className={`flex-shrink-0 w-10 h-12 rounded-xl transition-all flex flex-col items-center justify-center border ${isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                          : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                          }`}
                      >
                        <div
                          className={`text-[8px] font-black uppercase tracking-tighter mb-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-400'
                            }`}
                        >
                          {dayDate.toLocaleDateString('en-AU', { weekday: 'short' })}
                        </div>
                        <div className="text-sm font-black leading-none">
                          {dayDate.getDate()}
                        </div>
                        {isToday && !isSelected && (
                          <div className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* Daily Management List */}
              <div className="p-3 space-y-4 pb-20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">
                    {new Date(weekDates[expandedDayIndex || 0]).toLocaleDateString('en-AU', { dateStyle: 'long' })}
                  </h3>
                  <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {shifts.filter(s => s.shift_date === weekDates[expandedDayIndex || 0]).length} SHIFTS
                  </div>
                </div>

                {(viewBy === 'staff' ? employees : clients).map(rowItem => {
                  const displayName = viewBy === 'staff'
                    ? (rowItem.name || 'Unassigned')
                    : `${rowItem.first_name || ''} ${rowItem.last_name || ''}`.trim() || 'No Client';

                  const initials = displayName
                    .split(' ')
                    .filter(Boolean)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '??';

                  const dayShifts = getShiftsForCell(rowItem.id, weekDates[expandedDayIndex || 0]);

                  return (
                    <div key={rowItem.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-3 bg-gray-50/50 flex items-center justify-between border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-900 uppercase tracking-tight">{displayName}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{viewBy === 'staff' ? (rowItem.role || 'Staff') : 'Client'}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => openAddShift(rowItem.id, weekDates[expandedDayIndex || 0])}
                          className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm active:scale-90 transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="p-2">
                        {dayShifts.length === 0 ? (
                          <div className="py-4 text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">
                            No shifts scheduled
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayShifts.map((s, idx) => (
                              <div
                                key={s.id}
                                onClick={() => openEditShift(s)}
                                className="p-3 rounded-xl border-l-4 bg-gray-50/30 border-gray-200 shadow-sm"
                                style={{ borderLeftColor: s.color || getShiftColor(idx) }}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-[11px] font-black text-gray-900 uppercase">
                                    {viewBy === 'staff' ? (s.client_name || 'No Client') : (s.staff_name || 'Unassigned')}
                                  </div>
                                  <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg italic">
                                    {s.start_time} - {s.end_time}
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {s.shift_type_name || 'Standard'}
                                  </div>
                                  {s.hasConflict && (
                                    <div className="text-[9px] font-black text-red-600 flex items-center gap-1">
                                      <AlertCircle size={10} /> CONFLICT
                                    </div>
                                  )}
                                  <div className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${s.status === 'published' ? 'bg-blue-100 text-blue-600' :
                                    s.status === 'completed' ? 'bg-green-100 text-green-600' :
                                      'bg-amber-100 text-amber-600'
                                    }`}>
                                    {s.status === 'published' ? 'Live' : s.status === 'completed' ? 'Done' : 'Draft'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main >
        {/* --- FOOTER UTILITIES (GLASSMORPHIC) --- */}
        <footer className="flex-shrink-0 bg-white/80 backdrop-blur-md border-t border-gray-200 p-3 z-50">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">

            {/* Left Section */}
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">
                Status:{" "}
                <span className="text-blue-600 ml-1">{shifts.length} Live Shifts</span>
              </div>

              {/* Mobile Status */}
              <div className="sm:hidden text-[10px] font-black text-blue-600 uppercase tracking-widest">
                {shifts.length} Shifts
              </div>

              {shifts.some((s) => s.hasConflict) && (
                <button
                  onClick={handleCleanConflicts}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-black uppercase tracking-tighter hover:bg-red-100 transition-all"
                >
                  <Sparkles size={14} />
                  <span className="hidden sm:inline">Clean Conflicts</span>
                </button>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">

              <button
                onClick={handleCopyLastWeek}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
              >
                <Copy size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Copy Last Week</span>
              </button>

              <button
                onClick={handleDeleteAllShifts}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
              >
                <Trash2 size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Clear Week</span>
              </button>

              <button
                onClick={handlePublishRoster}
                className="flex items-center justify-center gap-2 px-3 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-[10px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-200"
              >
                <Send size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Publish Roster</span>
              </button>

            </div>
          </div>
        </footer>

        {/* Modal Portal */}
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

        <ShiftDetailsModal
          visible={detailsVisible}
          shift={viewingShift}
          onClose={() => {
            setDetailsVisible(false);
            setViewingShift(null);
          }}
          onEdit={openEditShift}
          onDelete={handleDeleteShift}
          onUpdateStatus={async (id, status) => {
            const { error } = await supabase.from('shifts').update({ status }).eq('id', id).eq('tenant_id', currentStaff.tenant_id);
            if (error) toast.error('Failed to update status');
            else {
              toast.success(`Shift marked as ${status}`);
              fetchData();
              setDetailsVisible(false);
            }
          }}
          staffList={staffList}
          onCopyToStaff={handleCopyShiftToStaff}
          onApprove={async (id) => {
            try {
              const { error } = await supabase
                .from('staff_shifts')
                .update({ approved: true, updated_at: new Date().toISOString() })
                .eq('shift_id', id)
                .eq('tenant_id', currentStaff.tenant_id);

              if (error) throw error;
              toast.success('Shift Tactical Approval Secured');
              fetchData();
              setDetailsVisible(false);
            } catch (err) {
              console.error('Approval fail:', err);
              toast.error('Approval Authorization Failure');
            }
          }}
        />
      </div>

      {loading && (
        <div className="fixed inset-0 z-[1000] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">LOADING SHIFTS DATA...</div>
          </div>
        </div>
      )}
    </>
  );
}