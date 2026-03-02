import { supabase } from '../lib/supabase';

/**
 * Service module for managing shift-staff assignments
 */

/**
 * Assign multiple staff members to a shift
 * @param {string} shiftId - The shift ID
 * @param {string[]} staffIds - Array of staff IDs to assign
 * @param {string} assignedBy - ID of user making the assignment
 * @returns {Promise<Object>} Result with success status and data
 */
export const assignStaffToShift = async (shiftId, staffIds, assignedBy = null) => {
    try {
        // Remove duplicates
        const uniqueStaffIds = [...new Set(staffIds)];

        // Prepare assignment records
        const assignments = uniqueStaffIds.map(staffId => ({
            shift_id: shiftId,
            staff_id: staffId,
            assigned_by: assignedBy,
            assigned_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('shift_staff_assignments')
            .upsert(assignments, { onConflict: 'shift_id,staff_id' })
            .select();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error assigning staff to shift:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Assign multiple staff members to multiple shifts (Batch Operation)
 * @param {string[]} shiftIds - Array of shift IDs
 * @param {string[]} staffIds - Array of staff IDs to assign
 * @param {string} assignedBy - ID of user making the assignment
 * @returns {Promise<Object>} Result with success status
 */
export const assignStaffToShifts = async (shiftIds, staffIds, assignedBy = null) => {
    try {
        if (!shiftIds?.length || !staffIds?.length) return { success: true };

        const uniqueStaffIds = [...new Set(staffIds)];
        const assignments = [];

        // Create cross-product of shifts and staff
        for (const shiftId of shiftIds) {
            for (const staffId of uniqueStaffIds) {
                assignments.push({
                    shift_id: shiftId,
                    staff_id: staffId,
                    assigned_by: assignedBy,
                    assigned_at: new Date().toISOString()
                });
            }
        }

        const { error } = await supabase
            .from('shift_staff_assignments')
            .upsert(assignments, { onConflict: 'shift_id,staff_id' });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error batch assigning staff:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Remove a staff member from a shift
 * @param {string} shiftId - The shift ID
 * @param {string} staffId - The staff ID to remove
 * @returns {Promise<Object>} Result with success status
 */
export const removeStaffFromShift = async (shiftId, staffId) => {
    try {
        const { error } = await supabase
            .from('shift_staff_assignments')
            .delete()
            .eq('shift_id', shiftId)
            .eq('staff_id', staffId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error removing staff from shift:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all staff assignments for a shift
 * @param {string} shiftId - The shift ID
 * @returns {Promise<Object>} Result with assigned staff data
 */
export const getShiftAssignments = async (shiftId) => {
    try {
        const { data, error } = await supabase
            .from('shift_staff_assignments')
            .select(`
        *,
        staff:staff_id (
          id,
          name,
          email,
          role
        )
      `)
            .eq('shift_id', shiftId)
            .order('assigned_at', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching shift assignments:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Get all shift assignments for a staff member within a date range
 * @param {string} staffId - The staff ID
 * @param {Object} dateRange - Object with start and end dates
 * @returns {Promise<Object>} Result with shifts data
 */
export const getStaffAssignments = async (staffId, dateRange = {}) => {
    try {
        let query = supabase
            .from('shift_staff_assignments')
            .select(`
        *,
        shift:shift_id (
          *,
          client:client_id (
            id,
            first_name,
            last_name
          ),
          shift_type:shift_type_id (
            id,
            name
          )
        )
      `)
            .eq('staff_id', staffId);

        if (dateRange.start) {
            query = query.gte('shift.shift_date', dateRange.start);
        }
        if (dateRange.end) {
            query = query.lte('shift.shift_date', dateRange.end);
        }

        const { data, error } = await query.order('shift.shift_date', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching staff assignments:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Copy a shift to other staff members
 * @param {string} sourceShiftId - The shift to copy from
 * @param {string[]} targetStaffIds - Array of staff IDs to copy to
 * @param {Object} options - Copy options (status, notes, etc.)
 * @returns {Promise<Object>} Result with created shifts
 */
export const copyShiftToStaff = async (sourceShiftId, targetStaffIds, options = {}) => {
    try {
        // Fetch the source shift
        const { data: sourceShift, error: fetchError } = await supabase
            .from('shifts')
            .select('*')
            .eq('id', sourceShiftId)
            .single();

        if (fetchError) throw fetchError;

        // Get currently assigned staff to avoid duplicates
        const { data: existingAssignments } = await supabase
            .from('shift_staff_assignments')
            .select('staff_id')
            .eq('shift_id', sourceShiftId);

        const existingStaffIds = existingAssignments?.map(a => a.staff_id) || [];
        const newStaffIds = targetStaffIds.filter(id => !existingStaffIds.includes(id));

        if (newStaffIds.length === 0) {
            return {
                success: false,
                error: 'All selected staff are already assigned to this shift',
                data: []
            };
        }

        // Create new shifts for each target staff
        const newShifts = newStaffIds.map(staffId => ({
            client_id: sourceShift.client_id,
            staff_id: staffId, // Keep for backward compatibility
            shift_date: sourceShift.shift_date,
            start_time: sourceShift.start_time,
            end_time: sourceShift.end_time,
            break_minutes: sourceShift.break_minutes,
            shift_type_id: sourceShift.shift_type_id,
            status: options.status || 'scheduled', // Default to scheduled/draft
            created_at: new Date().toISOString()
        }));

        const { data: createdShifts, error: createError } = await supabase
            .from('shifts')
            .insert(newShifts)
            .select();

        if (createError) throw createError;

        // Create assignments for the new shifts
        const assignments = createdShifts.map(shift => ({
            shift_id: shift.id,
            staff_id: shift.staff_id,
            assigned_by: options.assignedBy,
            assigned_at: new Date().toISOString()
        }));

        await supabase
            .from('shift_staff_assignments')
            .insert(assignments);

        return { success: true, data: createdShifts };
    } catch (error) {
        console.error('Error copying shift to staff:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Replace all staff assignments for a shift
 * @param {string} shiftId - The shift ID
 * @param {string[]} staffIds - New array of staff IDs
 * @param {string} assignedBy - ID of user making the change
 * @returns {Promise<Object>} Result with success status
 */
export const replaceShiftStaff = async (shiftId, staffIds, assignedBy = null) => {
    try {
        // Remove all existing assignments
        await supabase
            .from('shift_staff_assignments')
            .delete()
            .eq('shift_id', shiftId);

        // Add new assignments
        if (staffIds && staffIds.length > 0) {
            return await assignStaffToShift(shiftId, staffIds, assignedBy);
        }

        return { success: true, data: [] };
    } catch (error) {
        console.error('Error replacing shift staff:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check for scheduling conflicts when assigning staff
 * @param {string[]} staffIds - Staff IDs to check
 * @param {string} shiftDate - Date of the shift
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @param {string} excludeShiftId - Optional shift ID to exclude from conflict check
 * @returns {Promise<Object>} Result with conflicts array
 */
export const checkStaffConflicts = async (staffIds, shiftDate, startTime, endTime, excludeShiftId = null) => {
    try {
        let query = supabase
            .from('shift_staff_assignments')
            .select(`
        staff_id,
        shift:shift_id (
          id,
          shift_date,
          start_time,
          end_time,
          client:client_id (
            first_name,
            last_name
          )
        )
      `)
            .in('staff_id', staffIds)
            .eq('shift.shift_date', shiftDate);

        if (excludeShiftId) {
            query = query.neq('shift_id', excludeShiftId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Check for time overlaps
        const conflicts = data.filter(assignment => {
            const shift = assignment.shift;
            // Simple time overlap check (can be enhanced for overnight shifts)
            return (
                (startTime >= shift.start_time && startTime < shift.end_time) ||
                (endTime > shift.start_time && endTime <= shift.end_time) ||
                (startTime <= shift.start_time && endTime >= shift.end_time)
            );
        });

        return { success: true, conflicts };
    } catch (error) {
        console.error('Error checking staff conflicts:', error);
        return { success: false, error: error.message, conflicts: [] };
    }
};
