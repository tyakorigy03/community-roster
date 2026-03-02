import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon,
  Clock, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  X,
  AlertCircle,
  CheckCircle,
  Clock as ClockIcon,
  FileText,
  AlertTriangle,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useUser } from '../context/UserContext';
import { generateSchedulePDF } from '../utils/StaffCalendar';
import MobileDayShiftsModal from '../components/MobileDayShiftsModal';

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateToLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get today's date in YYYY-MM-DD format (local timezone)
const getTodayLocal = () => {
  const now = new Date();
  return formatDateToLocal(now);
};

// Helper function to compare if two dates are the same day
const isSameDay = (date1, date2) => {
  return date1.getDate() === date2.getDate() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

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

const getShiftStatus = (shift, staffShiftData = null) => {
  const now = new Date();
  const todayStr = getTodayLocal();
  
  // Check if staff has clocked out (highest priority)
  if (staffShiftData && staffShiftData.clock_out_time) {
    return 'completed';
  }
  
  // Check if staff has clocked in (they're working)
  if (staffShiftData && staffShiftData.clock_in_time && !staffShiftData.clock_out_time) {
    return 'in-progress';
  }
  
  // Compare dates as strings
  if (shift.shift_date < todayStr) return 'completed';
  
  // For today's shifts, check time (only if not clocked in yet)
  if (shift.shift_date === todayStr) {
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const shiftStart = parseTime(shift.start_time);
    const shiftEnd = parseTime(shift.end_time);
    
    if (currentTime >= shiftStart && currentTime <= shiftEnd) return 'in-progress';
    if (currentTime > shiftEnd) return 'completed';
  }
  
  return 'upcoming';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in-progress': return 'bg-blue-100 text-blue-800';
    case 'upcoming': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'in-progress': return ClockIcon;
    case 'upcoming': return AlertCircle;
    case 'cancelled': return X;
    default: return AlertCircle;
  }
};

// Photo Capture Modal Component
function PhotoCaptureModal({ isOpen, onClose, onCapture, isClockOut }) {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
      getCurrentLocation();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      if (!navigator.geolocation) {
        toast.warning('Geolocation is not supported by your browser');
        setGettingLocation(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          setLocation(locationData);
          setGettingLocation(false);
          toast.success('Location captured successfully');
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          toast.error(errorMessage);
          setGettingLocation(false);
        },
        {
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('Error accessing geolocation:', error);
      toast.error('Failed to access location');
      setGettingLocation(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const uploadToCloudinary = async (imageDataUrl) => {
    try {
      setUploading(true);
      
      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', 'blessingcommunity'); // Replace with your Cloudinary upload preset
      formData.append('folder', 'shift-photos');
      
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/dazbtduwj/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await uploadResponse.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!capturedImage) {
      toast.error('Please capture a photo first');
      return;
    }

    if (!location) {
      toast.error('Location not available. Please enable location access.');
      return;
    }

    try {
      setUploading(true);
      const photoUrl = await uploadToCloudinary(capturedImage);
      onCapture(photoUrl, location);
      onClose();
    } catch (error) {
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              {isClockOut ? 'Clock Out Photo' : 'Clock In Photo'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={uploading}
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Take a photo as proof of {isClockOut ? 'clock out' : 'clock in'}
          </p>
          
          {/* Location Status */}
          <div className="mt-3 flex items-center gap-2">
            {gettingLocation ? (
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Getting location...
              </div>
            ) : location ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} />
                Location captured ({location.accuracy.toFixed(0)}m accuracy)
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                Location not available
                <button
                  onClick={getCurrentLocation}
                  className="ml-2 text-blue-600 underline hover:text-blue-700"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-3 mt-6">
            {!capturedImage ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  disabled={uploading}
                >
                  Capture Photo
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={retakePhoto}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={uploading}
                >
                  Retake
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  disabled={uploading || !location}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>Confirm & {isClockOut ? 'Clock Out' : 'Clock In'}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Clock In/Out Component
function ClockInOutButton({ shift, staffId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentShiftStatus, setCurrentShiftStatus] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isClockOut, setIsClockOut] = useState(false);
  const [photoProofEnabled, setPhotoProofEnabled] = useState(false);
  
  useEffect(() => {
    checkCurrentStatus();
    checkPhotoProofSetting();
  }, [shift.id, staffId]);
  
  const checkPhotoProofSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('enabled')
        .eq('key', 'photo-proof')
        .maybeSingle();
      
      if (error) throw error;
      
      setPhotoProofEnabled(data?.enabled === true);
    } catch (error) {
      console.error('Error checking photo proof setting:', error);
      setPhotoProofEnabled(false);
    }
  };
  
  const checkCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('clock_in_time, clock_out_time')
        .eq('shift_id', shift.id)
        .eq('staff_id', staffId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        // User is clocked in if they have clock_in_time but no clock_out_time
        setClockedIn(data.clock_in_time && !data.clock_out_time);
        setCurrentShiftStatus(data);
      } else {
        // No staff_shift record exists yet
        setClockedIn(false);
        setCurrentShiftStatus(null);
      }
    } catch (error) {
      console.error('Error checking clock status:', error);
    }
  };
  
  const handleClockInOut = async () => {
    if (!shift || !staffId) {
      toast.error('Missing shift or staff information');
      return;
    }
    
    // If photo proof is enabled, show the photo modal
    if (photoProofEnabled) {
      setIsClockOut(clockedIn);
      setShowPhotoModal(true);
      return;
    }
    
    // If photo proof is disabled, proceed normally
    await processClockInOut(null);
  };
  
  const processClockInOut = async (photoUrl, locationData = null) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Get location if not provided (for when photo proof is disabled)
      let finalLocation = locationData;
      if (!finalLocation && !photoProofEnabled) {
        finalLocation = await getLocationWithoutModal();
      }
      
      if (!clockedIn) {
        // Clock In
        const { data: existingShift, error: checkError } = await supabase
          .from('staff_shifts')
          .select('*')
          .eq('shift_id', shift.id)
          .eq('staff_id', staffId)
          .maybeSingle();
        
        if (existingShift) {
          // Update existing
          const updateData = {
            clock_in_time: now,
            updated_at: now
          };
          
          if (photoUrl) {
            updateData.clock_in_photo_url = photoUrl;
          }
          
          if (finalLocation) {
            updateData.clock_in_location = JSON.stringify(finalLocation);
          }
          
          const { error } = await supabase
            .from('staff_shifts')
            .update(updateData)
            .eq('id', existingShift.id);
          
          if (error) throw error;
        } else {
          // Create new
          const insertData = {
            shift_id: shift.id,
            staff_id: staffId,
            clock_in_time: now,
            status: 'in-progress'
          };
          
          if (photoUrl) {
            insertData.clock_in_photo_url = photoUrl;
          }
          
          if (finalLocation) {
            insertData.clock_in_location = JSON.stringify(finalLocation);
          }
          
          const { error } = await supabase
            .from('staff_shifts')
            .insert(insertData);
          
          if (error) throw error;
        }
        
        toast.success('Clocked in successfully!');
        setClockedIn(true);
      } else {
        // Clock Out
        const updateData = {
          clock_out_time: now,
          status: 'completed',
          updated_at: now
        };
        
        if (photoUrl) {
          updateData.clock_out_photo_url = photoUrl;
        }
        
        if (finalLocation) {
          updateData.clock_out_location = JSON.stringify(finalLocation);
        }
        
        const { error } = await supabase
          .from('staff_shifts')
          .update(updateData)
          .eq('shift_id', shift.id)
          .eq('staff_id', staffId)
          .is('clock_out_time', null);
        
        if (error) throw error;
        
        toast.success('Clocked out successfully!');
        setClockedIn(false);
      }
      
      if (onSuccess) onSuccess();
      await checkCurrentStatus();
      
    } catch (error) {
      console.error('Error clocking in/out:', error);
      toast.error('Failed to update clock status');
    } finally {
      setLoading(false);
    }
  };
  
  const getLocationWithoutModal = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.warning('Geolocation is not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };
          resolve(locationData);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.warning('Could not get location');
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  };
  
  const handlePhotoCapture = async (photoUrl, locationData) => {
    await processClockInOut(photoUrl, locationData);
  };
  // Only show button for today's shifts
  const todayStr = getTodayLocal();
  if (shift.shift_date !== todayStr) return null;
  
  // Don't show for completed shifts
  if (shift.status === 'completed') return null;
  
  // Don't show if user has already clocked in AND clocked out (shift completed)
  if (currentShiftStatus?.clock_in_time && currentShiftStatus?.clock_out_time) {
    return null;
  }
  
  const isShiftTime = () => {
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const shiftStart = parseTime(shift.start_time);
    const shiftEnd = parseTime(shift.end_time);
    
    // Allow clock-in 15 minutes before shift (0.25 hours)
    const clockInStart = shiftStart - 0.25;
    
    return currentTime >= clockInStart && currentTime <= shiftEnd;
  };
  
  if (!isShiftTime()) return null;
  
  return (
    <>
      <button
        onClick={handleClockInOut}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
          clockedIn
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : clockedIn ? (
          <>
            <StopCircle className="w-4 h-4" />
            Clock Out
          </>
        ) : (
          <>
            <PlayCircle className="w-4 h-4" />
            Clock In
          </>
        )}
      </button>
      
      <PhotoCaptureModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCapture={handlePhotoCapture}
        isClockOut={isClockOut}
      />
    </>
  );
}

// Shift Card Component
function ShiftCard({ shift, staffId, onClockSuccess }) {
  const StatusIcon = getStatusIcon(shift.status);
  const statusColor = getStatusColor(shift.status);
  
  const duration = () => {
    const start = parseTime(shift.start_time);
    const end = parseTime(shift.end_time);
    const breakHours = (shift.break_minutes || 0) / 60;
    const hours = end - start - breakHours;
    return formatHours(hours);
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <Link to={'/view-client/'+shift.client_id} className="font-semibold text-gray-800">Client: {shift.client_name || 'Unassigned Client'}</Link>
          <div className="flex items-center gap-2 mt-1">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              <StatusIcon size={12} />
              {shift.status.replace('-', ' ')}
            </div>
            {shift.shift_type_name && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {shift.shift_type_name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-blue-600">{duration()}</div>
          <div className="text-xs text-gray-500">Duration</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <Clock size={14} className="mr-2 text-gray-400" />
          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
          {shift.break_minutes > 0 && (
            <span className="ml-2 text-gray-500">
              ({shift.break_minutes}m break)
            </span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <CalendarIcon size={14} className="mr-2 text-gray-400" />
          {new Date(shift.shift_date + 'T00:00:00').toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        <ClockInOutButton 
          shift={shift} 
          staffId={staffId}
          onSuccess={onClockSuccess}
        />
        
        <Link
          to={`/add-progressnote?shift_id=${shift?.id}`}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="w-3.5 h-3.5" />
          Record Note
        </Link>

        <Link
          to={`/add-incident?shift_id=${shift?.id}`}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Record Incident
        </Link>
      </div>
      
      {shift.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600">{shift.notes}</p>
        </div>
      )}
    </div>
  );
}

// Calendar Day Component
function CalendarDay({ date, shifts, isToday, isSelected, onClick }) {
  const dateStr = formatDateToLocal(date);
  const dayShifts = shifts.filter(s => s.shift_date === dateStr);
  
  return (
    <button
      onClick={onClick}
      className={`relative p-2 h-28 flex flex-col border rounded-lg transition-all hover:bg-gray-50 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className={`text-sm font-medium ${
          isToday ? 'text-blue-600' : 'text-gray-700'
        }`}>
          {date.getDate()}
        </div>
        {isToday && (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mb-2">
        {date.toLocaleDateString('en-US', { weekday: 'short' })}
      </div>
      
      <div className="flex-1 overflow-hidden">
        {dayShifts.length === 0 ? (
          <div className="text-xs text-gray-400 text-center mt-2">No shifts</div>
        ) : (
          <div className="space-y-1">
            {dayShifts.slice(0, 2).map((shift, index) => {
              const statusColor = getStatusColor(shift.status);
              return (
                <div 
                  key={index}
                  className={`text-xs px-2 py-1 rounded truncate ${statusColor}`}
                  title={`${shift.client_name} - ${formatTime(shift.start_time)}`}
                >
                  {formatTime(shift.start_time)}
                </div>
              );
            })}
            {dayShifts.length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayShifts.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
      
      {dayShifts.length > 0 && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </button>
  );
}

// Main Staff Calendar Component
export default function StaffCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const { currentStaff } = useUser();
  const [staffId, setStaffId] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileDayModal, setShowMobileDayModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [stats, setStats] = useState({
    totalShifts: 0,
    totalHours: 0,
    upcomingShifts: 0,
    completedShifts: 0
  });

  const navigate = useNavigate();
  const isAdmin = currentStaff?.role?.toLowerCase() === 'admin';

  useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 1024); // lg breakpoint
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);


  useEffect(() => {
    if (currentStaff) {
      setStaffId(currentStaff.id);
      setStaffName(currentStaff.name);
      setInitialLoading(false);
    } else {
      const timer = setTimeout(() => {
        if (!currentStaff) {
          toast.error('Please login as staff to view your calendar');
          navigate('/login');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStaff, navigate]);

  useEffect(() => {
    if (staffId) {
      fetchShifts();
    }
  }, [staffId, currentDate]);
const handleDayClick = (date) => {
  setSelectedDate(date);
  
  // On mobile, open the modal
  if (isMobile) {
    setShowMobileDayModal(true);
  }
};

  const fetchShifts = async () => {
    try {
      setLoading(true);
      
      // Calculate start and end of month for calendar view
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Format dates to YYYY-MM-DD using local timezone
      const firstDayStr = formatDateToLocal(firstDay);
      const lastDayStr = formatDateToLocal(lastDay);
      
      // Fetch shifts for this staff member for the current month
      const { data: shiftsData, error } = await supabase
        .from('shifts')
        .select(`
          *,
          staff:staff_id(name),
          client:client_id(id,first_name, last_name ),
          shift_type:shift_type_id(name),
          staff_shifts!left(
            clock_in_time,
            clock_out_time
          )
        `)
        .eq('staff_id', staffId)
        .gte('shift_date', firstDayStr)
        .lte('shift_date', lastDayStr)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const formattedShifts = (shiftsData || []).map(shift => {
        const staffShiftData = shift.staff_shifts && shift.staff_shifts.length > 0 
          ? shift.staff_shifts[0] 
          : null;
        
        const status = getShiftStatus(shift, staffShiftData);
        const clientName = shift.client 
          ? `${shift.client.first_name} ${shift.client.last_name}`
          : null;
        const clientId=shift.client? shift.client.id : null;  
        
        return {
          ...shift,
          id: shift.id,
          staff_name: shift.staff?.name || null,
          client_name: clientName,
          client_id: clientId,
          shift_type_name: shift.shift_type?.name || null,
          status: shift.status === 'cancelled' ? 'cancelled' : status,
          shift_date: shift.shift_date,
          staff_shift_clock_in: staffShiftData?.clock_in_time || null,
          staff_shift_clock_out: staffShiftData?.clock_out_time || null
        };
      });

      setShifts(formattedShifts);
      calculateStats(formattedShifts);
      
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (shiftsList) => {
    const totalShifts = shiftsList.length;
    const totalHours = shiftsList.reduce((total, shift) => {
      const start = parseTime(shift.start_time);
      const end = parseTime(shift.end_time);
      const breakHours = (shift.break_minutes || 0) / 60;
      return total + (end - start - breakHours);
    }, 0);
    
    const upcomingShifts = shiftsList.filter(s => s.status === 'upcoming').length;
    const completedShifts = shiftsList.filter(s => s.status === 'completed').length;
    
    setStats({
      totalShifts,
      totalHours,
      upcomingShifts,
      completedShifts
    });
  };

  const getFilteredShifts = () => {
    const selectedDateStr = formatDateToLocal(selectedDate);
    const dateShifts = shifts.filter(s => s.shift_date === selectedDateStr);
    
    if (filterStatus === 'all') return dateShifts;
    return dateShifts.filter(s => s.status === filterStatus);
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    
    const days = [];
    
    // Get first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Adjust to make Monday the first day of the week
    const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Calculate the date of the first day to display
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - adjustedFirstDayOfWeek);
    
    // Always show 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const getShiftsForDate = (date) => {
    const dateStr = formatDateToLocal(date);
    return shifts.filter(s => s.shift_date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const isSelected = (date) => {
    return isSameDay(date, selectedDate);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleClockSuccess = () => {
    fetchShifts();
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (loading && shifts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  if (!staffId || !staffName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mt-4">Staff Profile Not Found</h2>
          <p className="text-gray-600 mt-2">
            We couldn't find your staff profile. Please contact your administrator.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();
  const filteredShifts = getFilteredShifts();
  const selectedDateShifts = shifts.filter(s => 
    s.shift_date === formatDateToLocal(selectedDate)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className=" rounded-t-3xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex  justify-between items-start sm:items-center py-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, <span className="font-semibold">{staffName}</span>
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Today
              </button>
               {
                  isAdmin ?<Link
                to="/shifts"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Full Roster
              </Link>:<Link
                to="/add-progressnote"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Report a progress
              </Link>
               }
              
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <CalendarIcon className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalShifts}</div>
                <div className="text-sm text-gray-600">Total Shifts</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Clock className="text-green-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{Math.round(stats.totalHours)}</div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <AlertCircle className="text-yellow-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.upcomingShifts}</div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.completedShifts}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Calendar Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Previous month"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <button
                      onClick={goToToday}
                      className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Today
                    </button>
                    
                    <button
                      onClick={goToNextMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Next month"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
                
                {/* Day Headers - Monday to Sunday */}
                <div className="grid grid-cols-7 gap-2 mt-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((date, index) => (
                    <CalendarDay
                      key={index}
                      date={date}
                      shifts={getShiftsForDate(date)}
                      isToday={isToday(date)}
                      isSelected={isSelected(date)}
                      onClick={() => handleDayClick(date)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="space-y-6">
            {/* Selected Date Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatDate(selectedDate)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDateShifts.length} shift{selectedDateShifts.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Filter shifts"
                >
                  <Filter size={20} />
                </button>
              </div>
              
              {/* Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'upcoming', 'in-progress', 'completed', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          filterStatus === status
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shifts List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Shifts for {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}</h3>
              </div>
              
              <div className="p-4">
                {filteredShifts.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto text-gray-400" size={48} />
                    <p className="mt-4 text-gray-500">
                      {selectedDateShifts.length === 0 
                        ? 'No shifts scheduled for this day'
                        : `No ${filterStatus !== 'all' ? filterStatus : ''} shifts match your filter`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredShifts.map(shift => (
                      <ShiftCard 
                        key={shift.id} 
                        shift={shift} 
                        staffId={staffId}
                        onClockSuccess={handleClockSuccess}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Total Hours for Selected Day */}
              {filteredShifts.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total hours:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatHours(filteredShifts.reduce((total, shift) => {
                        const start = parseTime(shift.start_time);
                        const end = parseTime(shift.end_time);
                        const breakHours = (shift.break_minutes || 0) / 60;
                        return total + (end - start - breakHours);
                      }, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    toast.info('Coming soon: View all shifts');
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-center">
                    <Clock className="text-gray-400 mr-3" size={20} />
                    <div>
                      <div className="font-medium text-gray-900">View All Shifts</div>
                      <div className="text-sm text-gray-500">See your complete schedule</div>
                    </div>
                  </div>
                </button>
                
               {/* // In your StaffCalendar component, update the Print Schedule button: */}

              <button
                onClick={() => generateSchedulePDF({
                  staffName: staffName,
                  selectedDate: selectedDate,
                  selectedDateShifts: shifts.filter(s => s.shift_date === formatDateToLocal(selectedDate)),
                  allShifts: shifts,
                  stats: stats,
                  currentMonth: currentDate,
                  calendarDays: calendarDays,
                  getShiftsForDate: getShiftsForDate
                })}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="flex items-center">
                  <CalendarIcon className="text-gray-400 mr-3" size={20} />
                  <div>
                    <div className="font-medium text-gray-900">Print Schedule</div>
                    <div className="text-sm text-gray-500">Download schedule as PDF</div>
                  </div>
                </div>
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Shifts (Quick Actions) */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Today's Shifts</h2>
            <div className="text-sm text-gray-500">
              {shifts.filter(s => s.shift_date === getTodayLocal()).length} shift
              {shifts.filter(s => s.shift_date === getTodayLocal()).length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts
              .filter(s => {
                const todayStr = getTodayLocal();
                return s.shift_date === todayStr; // ✅ Show ALL today's shifts
              })
              .sort((a, b) => {
                // Sort by status: in-progress first, then upcoming, then completed
                const statusOrder = { 'in-progress': 1, 'upcoming': 2, 'completed': 3, 'cancelled': 4 };
                return (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
              })
              .map(shift => (
                <ShiftCard 
                  key={shift.id} 
                  shift={shift} 
                  staffId={staffId}
                  onClockSuccess={handleClockSuccess}
                />
              ))}
          </div>
          
          {shifts.filter(s => s.shift_date === getTodayLocal()).length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <CalendarIcon className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-gray-500">No shifts scheduled for today</p>
            </div>
          )}
        </div>
        </div>
        {/* Mobile Day Shifts Modal */}
      <MobileDayShiftsModal
        isOpen={showMobileDayModal}
        onClose={() => setShowMobileDayModal(false)}
        selectedDate={selectedDate}
        shifts={selectedDateShifts}
        staffId={staffId}
        onClockSuccess={handleClockSuccess}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        ShiftCard={ShiftCard}
      />
      </div>
  );
}