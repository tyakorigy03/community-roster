import React from 'react';
import { X, CalendarIcon, Clock, Filter } from 'lucide-react';

function MobileDayShiftsModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  shifts, 
  staffId, 
  onClockSuccess,
  filterStatus,
  setFilterStatus,
  showFilters,
  setShowFilters,
  ShiftCard
}) {
  if (!isOpen) return null;

  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const formatHours = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (wholeHours === 0 && minutes === 0) return '0h';
    if (wholeHours === 0) return `${minutes}m`;
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}m`;
  };

  const getFilteredShifts = () => {
    if (filterStatus === 'all') return shifts;
    return shifts.filter(s => s.status === filterStatus);
  };

  const filteredShifts = getFilteredShifts();

  const totalHours = filteredShifts.reduce((total, shift) => {
    const start = parseTime(shift.start_time);
    const end = parseTime(shift.end_time);
    const breakHours = (shift.break_minutes || 0) / 60;
    return total + (end - start - breakHours);
  }, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] lg:hidden animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {shifts.length} shift{shifts.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-white text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters Section */}
        <div className="p-4 bg-slate-50/30 border-b border-slate-100">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 hover:text-blue-700 transition-colors mb-2"
          >
            <Filter size={14} />
            {showFilters ? 'Hide Filters' : 'Filter Assignments'}
          </button>
          
          {showFilters && (
            <div className="flex flex-wrap gap-1.5 pt-1 animate-in slide-in-from-top-2 duration-200">
              {['all', 'upcoming', 'in-progress', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
          {filteredShifts.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-200">
                <CalendarIcon size={32} />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                No matching assignments
              </p>
              {shifts.length > 0 && filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
                  className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            filteredShifts.map(shift => (
              <ShiftCard 
                key={shift.id} 
                shift={shift} 
                staffId={staffId}
                onClockSuccess={onClockSuccess}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {filteredShifts.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="bg-slate-900 rounded-xl p-4 flex justify-between items-center shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Duration</span>
              </div>
              <span className="text-lg font-black text-white tracking-tight">
                {formatHours(totalHours)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileDayShiftsModal;