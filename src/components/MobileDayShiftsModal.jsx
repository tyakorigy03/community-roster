import React, { useRef, useState, useEffect } from 'react';
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
  const contentRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Optimized scroll handler with RAF
  useEffect(() => {
    if (!isOpen) return;
    
    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;
      
      rafId = requestAnimationFrame(() => {
        if (!contentRef.current || !headerRef.current || !footerRef.current) {
          rafId = null;
          return;
        }

        const scrollTop = contentRef.current.scrollTop;
        const scrollThreshold = 60;
        
        const shouldCollapse = scrollTop > scrollThreshold;
        
        if (shouldCollapse !== isScrolled) {
          setIsScrolled(shouldCollapse);
        }

        rafId = null;
      });
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        element.removeEventListener('scroll', handleScroll);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  }, [isOpen, isScrolled]);

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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
        style={{
          padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
        }}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="bg-white w-full rounded-t-3xl shadow-2xl flex flex-col"
          style={{ 
            maxHeight: '90vh',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          {/* Drag Handle */}
          <div 
            className="flex justify-center pt-3 pb-2 transition-opacity duration-300"
            style={{
              opacity: isScrolled ? 0 : 1,
              transform: 'translateZ(0)'
            }}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header - Collapsing */}
          <div 
            ref={headerRef}
            className="bg-white border-b border-gray-200 flex-shrink-0 transition-all duration-300 ease-out will-change-transform"
            style={{
              transform: 'translateZ(0)'
            }}
          >
            <div 
              className="flex justify-between items-center transition-all duration-300"
              style={{
                padding: isScrolled ? '0.5rem 1rem' : '0.75rem 1rem'
              }}
            >
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-bold text-gray-900 truncate transition-all duration-300"
                  style={{
                    fontSize: isScrolled ? '0.875rem' : '1.125rem',
                    marginBottom: isScrolled ? '0' : '0.25rem'
                  }}
                >
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                <p 
                  className="text-gray-600 truncate transition-all duration-300 overflow-hidden"
                  style={{
                    fontSize: isScrolled ? '0' : '0.875rem',
                    maxHeight: isScrolled ? '0' : '1.5rem',
                    opacity: isScrolled ? 0 : 1,
                    transform: 'translateZ(0)'
                  }}
                >
                  {shifts.length} shift{shifts.length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                style={{ transform: 'translateZ(0)' }}
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Filter Toggle - Collapses on scroll */}
            <div 
              className="transition-all duration-300 overflow-hidden"
              style={{
                padding: isScrolled ? '0 1rem' : '0 1rem 0.75rem',
                maxHeight: isScrolled ? '0' : '3rem',
                opacity: isScrolled ? 0 : 1,
                transform: 'translateZ(0)'
              }}
            >
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700 transition-colors"
              >
                <Filter size={16} />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {/* Filters - Only show when not scrolled */}
            {showFilters && !isScrolled && (
              <div className="px-4 pb-4 border-t border-gray-200 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Status</h4>
                <div className="flex flex-wrap gap-2">
                  {['all', 'upcoming', 'in-progress', 'completed', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                        filterStatus === status
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content - Scrollable */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
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
                    className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 pb-4">
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

          {/* Footer - Total Hours (Hides on scroll) */}
          {filteredShifts.length > 0 && (
            <div 
              ref={footerRef}
              className="bg-white border-t border-gray-200 flex-shrink-0 transition-all duration-300 ease-out will-change-transform"
              style={{
                padding: isScrolled ? '0.5rem 1rem' : '1rem 1rem',
                transform: isScrolled ? 'translateY(100%) translateZ(0)' : 'translateY(0) translateZ(0)',
                opacity: isScrolled ? 0 : 1
              }}
            >
              <div className="bg-blue-50 rounded-xl p-4 flex justify-between items-center">
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
    </>
  );
}

export default MobileDayShiftsModal;