import { createPortal } from "react-dom";
import React, { useState } from 'react';
import {
    X,
    User,
    Calendar,
    Clock,
    CheckCircle2,
    Trash2,
    Edit3,
    ExternalLink,
    MapPin,
    Clock3,
    AlertCircle,
    Copy,
    UserPlus,
    Users,
    Check,
    Camera, // added Camera icon
    Loader2
} from 'lucide-react';
import LocationIQ from './locationIQ';
import ManualLogModal from './ManualLogModal';

export default function ShiftDetailsModal({
    visible,
    shift,
    onClose,
    onEdit,
    onDelete,
    onUpdateStatus,
    staffList = [],
    onCopyToStaff,
    readOnly = false,
    canManualLog = true
}) {
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [selectedStaffForCopy, setSelectedStaffForCopy] = useState([]);
    const [showManualLog, setShowManualLog] = useState(false);

    if (!visible || !shift) return null;

    const parseLocation = (loc) => {
        if (!loc) return null;
        try {
            if (typeof loc === 'object') return loc;
            return JSON.parse(loc);
        } catch (e) {
            // Handle comma separated if needed
            const parts = loc.split(',');
            if (parts.length === 2) {
                return { latitude: parts[0].trim(), longitude: parts[1].trim() };
            }
            return null;
        }
    };

    const clockInLoc = parseLocation(shift.clock_in_location);
    const clockOutLoc = parseLocation(shift.clock_out_location);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-AU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'approved':
                return { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', label: 'Approved' };
            case 'published':
                return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Live / Published' };
            case 'completed':
                return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', label: 'Completed' };
            case 'cancelled':
                return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Cancelled' };
            case 'in-progress':
                return { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', label: 'In Progress' };
            default:
                if (shift.approved) {
                    return { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', label: 'Approved' };
                }
                return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Draft' };
        }
    };

    const getShiftStatus = (s) => {
        if (s.approved) return 'approved';
        return s.execution_status || s.status;
    };

    const statusObj = getStatusConfig(getShiftStatus(shift));

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className={`relative w-full max-h-[80vh] flex flex-col ${(shift.clock_in_photo_url || shift.clock_out_photo_url || shift.clock_in_location || shift.clock_out_location) ? 'max-w-4xl' : 'max-w-xl'} bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300`}>
                {/* Header - Tactical Design */}
                <div className="relative p-4 sm:p-6 bg-slate-900 border-b border-slate-700 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-all z-10"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight leading-none">
                                Service Details
                            </h2>
                            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                                {shift.shift_type_name || 'Standard Service'} • #{shift.id?.slice(0, 8)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between px-6 py-2 bg-slate-50 border-b border-slate-100 gap-2 shrink-0">
                    <div className={`px-2.5 py-0.5 rounded-full border ${statusObj.bg} ${statusObj.color} ${statusObj.border} text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusObj.color.replace('text-', 'bg-')} animate-pulse`} />
                        {statusObj.label}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {!readOnly && (
                            <>
                                <button
                                    onClick={() => setShowCopyModal(true)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                                    title="Copy this shift"
                                >
                                    <Copy size={12} /> <span className="hidden sm:inline">Copy to Staff</span>
                                </button>

                                {shift.status === 'scheduled' && (
                                    <button
                                        onClick={() => onUpdateStatus(shift.id, 'published')}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                                    >
                                        <ExternalLink size={12} /> <span className="hidden sm:inline">Publish</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => onUpdateStatus(shift.id, shift.status === 'completed' ? 'published' : 'completed')}
                                    className={`p-1.5 transition-all rounded-xl border ${shift.status === 'completed' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                    title={shift.status === 'completed' ? 'Mark as Live' : 'Mark as Completed'}
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                                <button
                                    onClick={() => onEdit(shift)}
                                    className="p-1.5 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all rounded-xl"
                                    title="Edit Shift"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(shift.id)}
                                    className="p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all rounded-xl"
                                    title="Delete Shift"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}

                        {canManualLog && (
                            <button
                                onClick={() => setShowManualLog(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                <Camera size={12} /> <span className="hidden sm:inline">Manual Log</span>
                            </button>
                        )}

                        {shift.status === 'completed' && !shift.approved && onApprove && (
                            <button
                                onClick={handleApprove}
                                disabled={approving}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
                            >
                                {approving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                <span>Approve Shift</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 h-full min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Primary Column */}
                        <div className="space-y-4">
                            {/* Entity Info */}
                            <div className="space-y-3">
                                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 group hover:bg-blue-50 transition-colors">
                                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                                        <User size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Client</span>
                                    </div>
                                    <div className="font-black text-slate-900 text-sm leading-tight">{shift.client_name || 'Not Specified'}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Primary Recipient</div>
                                </div>

                                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                        <Users size={14} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            Assigned Staff {shift.assigned_staff?.length > 0 && `(${shift.assigned_staff.length})`}
                                        </span>
                                    </div>

                                    {shift.assigned_staff && shift.assigned_staff.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {shift.assigned_staff.map((staff, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-indigo-100">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                        <User size={12} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-slate-900 text-[11px] truncate">{staff.staff_name || 'Unknown'}</div>
                                                        <div className="text-[8px] text-slate-400 font-bold uppercase truncate">{staff.role || 'Staff Member'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-indigo-100">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <User size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-900 text-[11px] truncate">{shift.staff_name || 'Unassigned'}</div>
                                                <div className="text-[8px] text-slate-400 font-bold uppercase truncate">
                                                    {shift.staff_name ? 'Staff Member' : 'Open Pool'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Time & Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all shrink-0">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date</div>
                                        <div className="text-xs font-black text-slate-900 truncate">{formatDate(shift.shift_date)}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all shrink-0">
                                        <Clock size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Window</div>
                                        <div className="text-xs font-black text-slate-900 truncate">
                                            {shift.start_time} - {shift.end_time}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Service Notes */}
                            {shift.notes && (
                                <div className="space-y-1.5">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Service Notes</div>
                                    <div className="p-3 bg-amber-50/30 border border-amber-100/50 rounded-2xl text-[11px] text-slate-600 italic leading-snug">
                                        "{shift.notes}"
                                    </div>
                                </div>
                            )}

                            {shift.hasConflict && (
                                <div className="flex items-start gap-2.5 p-3 bg-red-50 rounded-2xl border border-red-100">
                                    <AlertCircle className="text-red-500 flex-shrink-0" size={16} />
                                    <div>
                                        <div className="text-[10px] font-black text-red-700 uppercase tracking-tight">Schedule Conflict</div>
                                        <div className="text-[9px] text-red-500 font-bold mt-0.5 leading-tight">
                                            This shift overlaps with another service for this staff member.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Secondary Column - Verification Data (Expanded) */}
                        {(shift.clock_in_photo_url || shift.clock_out_photo_url || shift.clock_in_location || shift.clock_out_location) && (
                            <div className="space-y-4 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0"><CheckCircle2 size={16} /></span>
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Service Verification</span>
                                    <span className="ml-auto text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Service Record</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Clock In Payload */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Arrival Details</span>
                                            {shift.clock_in && (
                                                <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                                    {new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>

                                        {shift.clock_in_photo_url ? (
                                            <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-100 relative group shadow-sm transition-all hover:border-blue-200">
                                                <img src={shift.clock_in_photo_url} className="w-full h-full object-cover" alt="Clock In" />
                                                <a href={shift.clock_in_photo_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-[2px]">View Photo</a>
                                            </div>
                                        ) : (
                                            <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300">
                                                <Camera size={24} strokeWidth={1} />
                                            </div>
                                        )}

                                        {clockInLoc && (
                                            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <MapPin size={12} className="text-blue-500 mt-0.5" />
                                                    <div className="text-[9px] font-bold text-slate-600 leading-tight">
                                                        <LocationIQ lat={clockInLoc.latitude} lon={clockInLoc.longitude} />
                                                    </div>
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps?q=${clockInLoc.latitude},${clockInLoc.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block w-full text-center py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                                >
                                                    View Location
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Clock Out Payload */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Departure Details</span>
                                            {shift.clock_out && (
                                                <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                                    {new Date(shift.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>

                                        {shift.clock_out_photo_url ? (
                                            <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-100 relative group shadow-sm transition-all hover:border-blue-200">
                                                <img src={shift.clock_out_photo_url} className="w-full h-full object-cover" alt="Clock Out" />
                                                <a href={shift.clock_out_photo_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-[2px]">View Photo</a>
                                            </div>
                                        ) : (
                                            <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300">
                                                <Camera size={24} strokeWidth={1} />
                                            </div>
                                        )}

                                        {clockOutLoc && (
                                            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <MapPin size={12} className="text-blue-500 mt-0.5" />
                                                    <div className="text-[9px] font-bold text-slate-600 leading-tight">
                                                        <LocationIQ lat={clockOutLoc.latitude} lon={clockOutLoc.longitude} />
                                                    </div>
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps?q=${clockOutLoc.latitude},${clockOutLoc.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block w-full text-center py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                                >
                                                    View Location
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Last Updated: {new Date(shift.updated_at || shift.created_at).toLocaleDateString()}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Copy to Staff Modal */}
            {showCopyModal && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-slate-900 border-b border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/50">
                                        <Copy size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Copy to Staff</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                            Select staff members
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCopyModal(false);
                                        setSelectedStaffForCopy([]);
                                    }}
                                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 max-h-96 overflow-y-auto space-y-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Available Staff Members
                            </div>

                            {staffList.filter(s => {
                                // Filter out already assigned staff
                                if (shift.assigned_staff && shift.assigned_staff.length > 0) {
                                    return !shift.assigned_staff.some(assigned => assigned.staff_id === s.id);
                                }
                                // If using old format, filter out the single assigned staff
                                return shift.staff_id !== s.id;
                            }).map(staff => (
                                <button
                                    key={staff.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStaffForCopy(prev =>
                                            prev.includes(staff.id)
                                                ? prev.filter(id => id !== staff.id)
                                                : [...prev, staff.id]
                                        );
                                    }}
                                    className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all flex items-center gap-3"
                                >
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedStaffForCopy.includes(staff.id)
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'border-slate-300'
                                        }`}>
                                        {selectedStaffForCopy.includes(staff.id) && <Check size={14} className="text-white" />}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-sm font-black text-slate-900">{staff.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase">{staff.role || 'Staff'}</div>
                                    </div>
                                </button>
                            ))}

                            {staffList.filter(s => {
                                if (shift.assigned_staff && shift.assigned_staff.length > 0) {
                                    return !shift.assigned_staff.some(assigned => assigned.staff_id === s.id);
                                }
                                return shift.staff_id !== s.id;
                            }).length === 0 && (
                                    <div className="text-center py-8 text-slate-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">
                                            All staff already assigned
                                        </p>
                                    </div>
                                )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {selectedStaffForCopy.length} selected
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowCopyModal(false);
                                        setSelectedStaffForCopy([]);
                                    }}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedStaffForCopy.length > 0 && onCopyToStaff) {
                                            onCopyToStaff(shift.id, selectedStaffForCopy);
                                            setShowCopyModal(false);
                                            setSelectedStaffForCopy([]);
                                        }
                                    }}
                                    disabled={selectedStaffForCopy.length === 0}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Copy Shift
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Manual Log Modal Overlay */}
            <ManualLogModal
                visible={showManualLog}
                shift={shift}
                onClose={() => setShowManualLog(false)}
                onSave={() => {
                    setShowManualLog(false);
                    onClose(); // Close details too to refresh parent
                }}
            />
        </div>,
        document.body
    );
}
