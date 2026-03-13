import React, { useState } from "react";
import { X, Clock, Info, MapPin, Camera, Check, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "react-toastify";
import LocationIQ from "../../components/locationIQ";

export function ShiftApprovalModal({ isOpen, onClose, shift, onApprove }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !shift) return null;

  const clockInLocation = shift.clock_in_location ? (typeof shift.clock_in_location === 'string' ? JSON.parse(shift.clock_in_location) : shift.clock_in_location) : null;
  const clockOutLocation = shift.clock_out_location ? (typeof shift.clock_out_location === 'string' ? JSON.parse(shift.clock_out_location) : shift.clock_out_location) : null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_shifts')
        .update({
          status: 'approved',
          approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', shift.id);

      if (error) throw error;

      toast.success('Shift approved successfully');
      if (onApprove) onApprove();
      onClose();
    } catch (error) {
      console.error('Error approving shift:', error);
      toast.error('Failed to approve shift');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Check size={18} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Shift Verification</h2>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                Reviewing {shift.staff_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {/* Shift Details Summary */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-y-3 gap-x-6">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Client</p>
              <p className="text-[11px] font-bold text-slate-900 uppercase truncate">{shift.client_name}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Date</p>
              <p className="text-[11px] font-bold text-slate-900 uppercase">{formatDate(shift.shift_date)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Schedule</p>
              <p className="text-[11px] font-bold text-slate-900 uppercase">{shift.start_time} - {shift.end_time}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Role</p>
              <p className="text-[11px] font-bold text-slate-900 uppercase">{shift.role || 'Support Staff'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Clock In */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock size={14} /> Clock In
              </h3>
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Actual Time</span>
                  <span className="font-bold text-slate-900">{formatTime(shift.clock_in_time)}</span>
                </div>
                
                {clockInLocation && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-tight">Location</span>
                      <a href={`https://www.google.com/maps?q=${clockInLocation.latitude},${clockInLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Maps →</a>
                    </div>
                    <div className="text-[10px] text-slate-600 leading-relaxed bg-white border border-slate-100 p-2 rounded-lg">
                      <LocationIQ lat={clockInLocation.latitude} lon={clockInLocation.longitude} />
                    </div>
                  </div>
                )}
                
                {shift.clock_in_photo_url && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={shift.clock_in_photo_url} alt="Clock In" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Clock Out */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 px-1">
                <Clock size={14} /> Clock Out
              </h3>
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Actual Time</span>
                  <span className="font-bold text-slate-900">{formatTime(shift.clock_out_time)}</span>
                </div>
                
                {clockOutLocation && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-tight">Location</span>
                      <a href={`https://www.google.com/maps?q=${clockOutLocation.latitude},${clockOutLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Maps →</a>
                    </div>
                    <div className="text-[10px] text-slate-600 leading-relaxed bg-white border border-slate-100 p-2 rounded-lg">
                      <LocationIQ lat={clockOutLocation.latitude} lon={clockOutLocation.longitude} />
                    </div>
                  </div>
                )}
                
                {shift.clock_out_photo_url && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={shift.clock_out_photo_url} alt="Clock Out" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between text-white">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Calculated Performance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">
                  {shift.clock_in_time && shift.clock_out_time 
                    ? ((new Date(shift.clock_out_time) - new Date(shift.clock_in_time)) / (1000 * 60 * 60)).toFixed(2)
                    : '0.00'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Billable Hours</span>
              </div>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <Clock size={20} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-300 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-white transition-all disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            className="flex-[1.5] h-11 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white"></div>
                <span>Approving...</span>
              </div>
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                <span>Approve Shift</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
