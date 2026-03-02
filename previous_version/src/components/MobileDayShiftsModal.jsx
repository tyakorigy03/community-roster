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
  ShiftCard // Pass the ShiftCard component as a prop
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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50 lg:hidden"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden animate-slide-up">
        <div 
          className="bg-white w-full rounded-t-2xl shadow-2xl"
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl z-10">
            <div className="flex justify-between items-center p-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-sm text-gray-600">
                  {shifts.length} shift{shifts.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="px-4 pb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-blue-600 font-medium flex items-center gap-1"
              >
                <Filter size={16} />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Status</h4>
                <div className="flex flex-wrap gap-2">
                  {['all', 'upcoming', 'in-progress', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filterStatus === status
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 160px)' }}>
            {filteredShifts.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto text-gray-300 mb-3" size={56} />
                <p className="text-gray-500 font-medium">
                  {shifts.length === 0 
                    ? 'No shifts scheduled'
                    : `No ${filterStatus !== 'all' ? filterStatus : ''} shifts`}
                </p>
                {shifts.length > 0 && filterStatus !== 'all' && (
                  <button
                    onClick={() => setFilterStatus('all')}
                    className="mt-3 text-blue-600 text-sm font-medium"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredShifts.map(shift => (
                  <ShiftCard 
                    key={shift.id} 
                    shift={shift} 
                    staffId={staffId}
                    onClockSuccess={onClockSuccess}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer - Total Hours */}
          {filteredShifts.length > 0 && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
              <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-600" size={20} />
                  <span className="text-sm font-medium text-gray-700">Total Hours</span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {formatHours(totalHours)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default MobileDayShiftsModal;