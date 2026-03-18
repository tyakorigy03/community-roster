import React, { useState, useEffect, useRef } from 'react';
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
  StopCircle,
  MapPin,
  Camera,
  RefreshCw,
  Plus,
  Download,
  ShieldCheck,
  MoreVertical,
  ChevronRight as ChevronRightIcon,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useUser } from '../context/UserContext';
import { generateSchedulePDF } from '../utils/StaffCalendar';
import MobileDayShiftsModal from '../components/MobileDayShiftsModal';

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateToLocal = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get today's date in YYYY-MM-DD format (local timezone)
const getTodayLocal = () => {
  return formatDateToLocal(new Date());
};

// Helper function to compare if two dates are the same day
const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    // Expected format: HH:mm:ss
    return timeStr.substring(0, 5);
  } catch (e) {
    return timeStr;
  }
};

const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

const formatHours = (hours) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const getShiftStatus = (shift, staffShiftData = null) => {
  if (shift.status === 'cancelled') return 'cancelled';

  const data = staffShiftData || shift.staff_shifts?.[0];
  if (data?.approved) return 'approved';
  if (data?.clock_out_time) return 'completed';
  if (data?.clock_in_time) return 'in-progress';

  const today = getTodayLocal();
  if (shift.shift_date < today) return 'missed';
  return 'upcoming';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'upcoming': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'in-progress': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'approved': return 'bg-emerald-600 text-white border-emerald-700'; // High contrast for approved
    case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
    case 'missed': return 'bg-slate-100 text-slate-500 border-slate-200';
    default: return 'bg-slate-50 text-slate-500 border-slate-100';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'upcoming': return ClockIcon;
    case 'in-progress': return PlayCircle;
    case 'completed': return CheckCircle;
    case 'cancelled': return X;
    case 'missed': return AlertTriangle;
    default: return ClockIcon;
  }
};

// Photo Capture Modal Component
function PhotoCaptureModal({ isOpen, onClose, onCapture, isClockOut }) {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [location, setLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Location capture failed. Please check permissions.');
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } catch (error) {
      console.error('Error accessing geolocation:', error);
      setGettingLocation(false);
    }
  };

  const startCamera = async () => {
    try {
      // Simplify constraints for better compatibility
      const constraints = {
        video: {
          facingMode: 'environment', // simpler constraint
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Force play just in case autoPlay is inhibited
        videoRef.current.play().catch(e => console.error("Playback failed", e));
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Camera access failed. Ensure you have given permission.');
    }
  };

  const stopCamera = () => {
    const activeStream = streamRef.current || stream;
    if (activeStream) {
      activeStream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      setStream(null);
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    try {
      if (!canvasRef.current || !videoRef.current) {
        toast.error('System synchronization error. Please refresh.');
        return;
      }

      const video = videoRef.current;

      // Ensure video is ready
      if (video.readyState < 2 || video.videoWidth === 0) {
        toast.error('Camera is still warming up. Try again in a moment.');
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Use exact dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      if (!imageDataUrl || imageDataUrl.length < 100) {
        throw new Error('Capture produced empty frame');
      }

      setCapturedImage(imageDataUrl);
      stopCamera();
    } catch (err) {
      console.error('Capture failed:', err);
      toast.error('Snapshot failed. Please try again.');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const uploadToCloudinary = async (imageDataUrl) => {
    try {
      setUploading(true);
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', 'blessingcommunity');
      formData.append('folder', 'shift-photos');

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/dazbtduwj/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const data = await uploadResponse.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!capturedImage || !location) return;
    try {
      const photoUrl = await uploadToCloudinary(capturedImage);
      onCapture(photoUrl, location);
      onClose();
    } catch (error) {
      toast.error('System synchronization failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {isClockOut ? 'Attendance Terminal' : 'Sequence Activation'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {isClockOut ? 'Verify shift conclusion' : 'Verify operational commencement'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${location ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                <MapPin size={14} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Coordinate Sync</p>
                <p className="text-[10px] font-black text-slate-900 uppercase leading-none mt-0.5">
                  {gettingLocation ? 'Syncing...' : location ? `Verified (${location.accuracy.toFixed(0)}M)` : 'Pending Access'}
                </p>
              </div>
            </div>
            {!location && !gettingLocation && (
              <button onClick={getCurrentLocation} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Retry</button>
            )}
          </div>

          <div className="bg-slate-950 rounded-xl overflow-hidden aspect-video shadow-2xl border-2 border-white relative group">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover grayscale-[0.2]"
              />
            ) : (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            )}
            {!capturedImage && (
              <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-white/40 rounded-full border-dashed animate-pulse"></div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="mt-6 flex gap-2">
            {!capturedImage ? (
              <button onClick={capturePhoto} className="flex-1 h-12 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-[98%] flex items-center justify-center gap-2">
                <Camera size={18} /> Snapshot & Verify
              </button>
            ) : (
              <>
                <button onClick={retakePhoto} className="flex-1 h-12 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all border border-slate-100" disabled={uploading}>
                  Retake
                </button>
                <button onClick={handleConfirm} className="flex-[2] h-12 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-[98%] flex items-center justify-center gap-2 transition-colors" disabled={uploading || !location}>
                  {uploading ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {uploading ? 'Processing...' : 'Authenticate'}
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
  const { currentStaff } = useUser();
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    checkCurrentStatus();
  }, [shift]);

  const checkCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('shift_id', shift.id)
        .eq('staff_id', staffId)
        .eq('tenant_id', currentStaff?.tenant_id)
        .maybeSingle();

      if (error) throw error;
      setCurrentStatus(data);
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleClockInOut = async () => {
    setIsPhotoModalOpen(true);
  };

  const processClockInOut = async (photoUrl, locationData = null) => {
    try {
      setLoading(true);
      const isClockIn = !currentStatus?.clock_in_time;
      const today = new Date().toISOString();
      const finalLocation = locationData ? JSON.stringify(locationData) : null;

      if (isClockIn) {
        const { error } = await supabase
          .from('staff_shifts')
          .insert([{
            shift_id: shift.id,
            staff_id: staffId,
            clock_in_time: today,
            clock_in_photo_url: photoUrl,
            clock_in_location: finalLocation,
            status: 'clocked_in',
            tenant_id: currentStaff?.tenant_id
          }]);
        if (error) throw error;
        toast.success('Sequence Activated');
      } else {
        const { error } = await supabase
          .from('staff_shifts')
          .update({
            clock_out_time: today,
            clock_out_photo_url: photoUrl,
            clock_out_location: finalLocation,
            status: 'completed',
            updated_at: today
          })
          .eq('id', currentStatus.id)
          .eq('tenant_id', currentStaff?.tenant_id);
        if (error) throw error;
        toast.success('Sequence Terminated');
      }

      await checkCurrentStatus();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Clock error:', error);
      toast.error('System synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = !!currentStatus?.clock_out_time || shift.status === 'completed' || shift.status === 'approved';
  const isInProgress = !!currentStatus?.clock_in_time && !currentStatus?.clock_out_time && shift.status !== 'completed' && shift.status !== 'approved';

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
        <CheckCircle size={14} /> Logged
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClockInOut}
        disabled={loading || shift.status === 'cancelled'}
        className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${isInProgress
          ? 'bg-amber-500 text-white shadow-amber-900/20 hover:bg-amber-600'
          : 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : isInProgress ? <StopCircle size={14} /> : <PlayCircle size={14} />}
        {isInProgress ? 'Clock Out' : 'Clock In'}
      </button>

      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onCapture={processClockInOut}
        isClockOut={isInProgress}
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
    <div className="group bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50/50 rounded-full -mr-10 -mt-10 group-hover:bg-blue-100/50 transition-colors duration-500"></div>

      <div className="relative flex justify-between items-start mb-4">
        <div className="min-w-0 pr-4">
          <Link to={'/view-client/' + shift.client_id} className="text-xs font-black text-slate-900 uppercase tracking-tight hover:text-blue-600 transition-colors truncate block mb-1.5">
            {shift.client_name || 'Registry Client'}
          </Link>
          <div className="flex items-center gap-1.5">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${statusColor} border border-white/50 shadow-sm`}>
              <StatusIcon size={10} />
              {shift.status}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">{duration()}</div>
          <div className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Payload</div>
        </div>
      </div>

      <div className="relative space-y-2 mb-4">
        <div className="flex items-center text-[9px] font-black text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
          <Clock size={12} className="mr-2 text-blue-500" />
          <span className="uppercase tracking-widest">
            {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
          </span>
          {shift.break_minutes > 0 && (
            <span className="ml-auto text-[8px] font-black text-slate-400 opacity-60">
              {shift.break_minutes}M
            </span>
          )}
        </div>

        <div className="flex items-center text-[9px] font-black text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
          <CalendarIcon size={12} className="mr-2 text-blue-500" />
          <span className="uppercase tracking-widest">
            {new Date(shift.shift_date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex gap-1.5">
          <ClockInOutButton
            shift={shift}
            staffId={staffId}
            onSuccess={onClockSuccess}
          />
        </div>

        <div className="flex gap-1 ml-auto">
          <Link to={`/add-progressnote?shift_id=${shift?.id}`} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-100" title="Record Note">
            <FileText size={14} />
          </Link>
          <Link to={`/add-incident?shift_id=${shift?.id}`} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-600 hover:text-white transition-all border border-slate-100" title="Record Incident">
            <AlertTriangle size={14} />
          </Link>
        </div>
      </div>
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
      className={`relative p-2 h-24 lg:h-28 flex flex-col border rounded-xl transition-all duration-500 group overflow-hidden ${isSelected
        ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-600/5 shadow-lg shadow-blue-900/10'
        : dayShifts.length > 0 
          ? 'border-blue-100 bg-blue-50/20 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-xl hover:shadow-blue-200/50' 
          : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50'
        }`}
    >
      {dayShifts.length > 0 && (
        <div className="absolute bottom-3 right-2 flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-[9px] font-black rounded-full shadow-lg z-30 border-2 border-white pointer-events-none">
          {dayShifts.length}
        </div>
      )}

      <div className="flex justify-between items-center mb-1 relative z-10 w-full">
        <span className={`text-[8px] font-black uppercase tracking-widest ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
          {date.toLocaleDateString('en-US', { weekday: 'short' })}
        </span>
        <div className={`w-6 h-6 flex items-center justify-center text-[9px] font-black rounded-lg transition-all duration-500 ${isToday
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-400/30'
          : 'bg-slate-50 text-slate-900 group-hover:bg-blue-600 group-hover:text-white'
          }`}>
          {date.getDate()}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative z-10 w-full">
        {dayShifts.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-1">
            {dayShifts.slice(0, 2).map((shift, index) => {
              const status = getShiftStatus(shift);
              const statusColor = getStatusColor(status);
              return (
                <div key={index} className={`text-[8px] font-black px-1.5 py-0.5 rounded-md truncate border border-white/50 uppercase tracking-tight ${statusColor}`}>
                  {formatTime(shift.start_time)}
                </div>
              );
            })}
            {dayShifts.length > 2 && (
              <div className="text-[7px] font-black text-slate-400 text-center uppercase tracking-widest bg-slate-50/50 py-0.5 rounded-md">
                +{dayShifts.length - 2} More
              </div>
            )}
          </div>
        )}
      </div>

      {dayShifts.length > 0 && (
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-blue-600 transition-all duration-500 ${isSelected ? 'opacity-100' : 'opacity-60'}`}></div>
      )}
    </button>
  );
}

// Main Staff Calendar Component
export default function StaffCalendar() {
  const navigate = useNavigate();
  const { user, currentStaff, loading: authLoading } = useUser();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({ totalShifts: 0, totalHours: 0, upcomingShifts: 0, completedShifts: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileDayModal, setShowMobileDayModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const profile = currentStaff;
  const isAdmin = profile?.role?.toLowerCase() === 'admin';
  const staffId = profile?.id;
  const staffName = profile?.name ? profile.name : '';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (staffId) {
      fetchShifts();
      setInitialLoading(false);
    } else if (!authLoading) {
      setInitialLoading(false);
    }
  }, [staffId, authLoading, currentDate]);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    if (isMobile) {
      setShowMobileDayModal(true);
    }
  };

  const fetchShifts = async () => {
    if (!staffId) return;
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('shifts')
        .select(`*, client:client_id(first_name, last_name), staff_shifts(*), shift_type:shift_type_id(name)`)
        .eq('staff_id', staffId)
        .eq('tenant_id', currentStaff?.tenant_id)
        .gte('shift_date', formatDateToLocal(startOfMonth))
        .lte('shift_date', formatDateToLocal(endOfMonth));

      if (error) throw error;

      const formattedData = data.map(shift => ({
        ...shift,
        client_name: shift.client ? `${shift.client.first_name} ${shift.client.last_name}` : null,
        status: getShiftStatus(shift),
        shift_type_name: shift.shift_type?.name || null
      }));

      setShifts(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Data synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (shiftsList) => {
    const statsObj = shiftsList.reduce((acc, shift) => {
      acc.totalShifts++;
      const start = parseTime(shift.start_time);
      const end = parseTime(shift.end_time);
      const breakHours = (shift.break_minutes || 0) / 60;
      acc.totalHours += (end - start - breakHours);

      if (shift.status === 'upcoming' || shift.status === 'in-progress') acc.upcomingShifts++;
      if (shift.status === 'completed') acc.completedShifts++;
      return acc;
    }, { totalShifts: 0, totalHours: 0, upcomingShifts: 0, completedShifts: 0 });

    setStats(statsObj);
  };

  const getFilteredShifts = () => {
    let filtered = shifts.filter(s => s.shift_date === formatDateToLocal(selectedDate));
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }
    return filtered;
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };

  const getShiftsForDate = (date) => shifts.filter(s => s.shift_date === formatDateToLocal(date));
  const isToday = (date) => isSameDay(date, new Date());
  const isSelected = (date) => isSameDay(date, selectedDate);
  const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };
  const handleClockSuccess = () => fetchShifts();

  if (initialLoading) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Environment...</div>
        </div>
      </div>
    );
  }

  if (!staffId || !staffName) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 max-w-md w-full text-center border border-slate-100">
          <div className="h-20 w-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-900/5">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">Identity Not Found</h2>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-relaxed mb-10">We cannot initialize the calendar sequence without a valid staff profile association.</p>
          <button onClick={() => navigate('/login')} className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all">Re-authenticate</button>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();
  const filteredShifts = getFilteredShifts();
  const selectedDateShifts = shifts.filter(s => s.shift_date === formatDateToLocal(selectedDate));

  return (
    <div className="min-h-dvh bg-white">
      {/* Professional Compact Header */}
      <div className="flex flex-row justify-between items-center gap-3 p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">

        {/* LEFT */}
        <div className="min-w-0">
          <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
            Shift Schedule
          </h2>

          <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
            Operational → Roster Control · {staffName}
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">

          <button
            onClick={goToToday}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all text-[9px] lg:text-[11px] font-black uppercase tracking-widest"
          >
            Today
          </button>

          {isAdmin ? (
            <Link
              to="/shifts"
              className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center"
            >
              Full Roster
            </Link>
          ) : (
            <Link
              to="/add-progressnote"
              className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Progress Report</span>
            </Link>
          )}
        </div>
      </div>



      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
        {/* Modern High-Density Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Capacity', value: stats.totalShifts, sub: 'Shifts', icon: CalendarIcon, color: 'text-blue-600', hover: 'group-hover:bg-blue-600' },
            { label: 'Service Time', value: Math.round(stats.totalHours), sub: 'Hours', icon: Clock, color: 'text-indigo-600', hover: 'group-hover:bg-indigo-600' },
            { label: 'Actionable', value: stats.upcomingShifts, sub: 'Pending', icon: AlertCircle, color: 'text-amber-500', hover: 'group-hover:bg-amber-500' },
            { label: 'Validated', value: stats.completedShifts, sub: 'Closed', icon: CheckCircle, color: 'text-emerald-500', hover: 'group-hover:bg-emerald-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-white rounded-xl shadow-sm transition-all ${stat.color} ${stat.hover} group-hover:text-white`}><stat.icon size={18} /></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-900 tracking-tight">{stat.value}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{stat.sub}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
<div className="grid lg:grid-cols-3 gap-5">
  {/* Calendar Section */}
  <div className="lg:col-span-2">
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="p-3 sm:p-5 border-b border-slate-50 bg-slate-50/30">
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="h-3 w-[1px] bg-slate-100 mx-0.5"></div>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-1 sm:gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div
              key={day}
              className="text-center text-[10px] sm:text-[9px] font-black text-slate-400 uppercase tracking-normal sm:tracking-[0.1em] py-1 truncate"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Days */}
      <div className="p-2 sm:p-5">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-1 sm:gap-2 shadow-inner bg-slate-50/50 p-1 rounded-xl">
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
  <div className="space-y-4">
    <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all duration-500"></div>
      <div className="relative">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight mb-1 truncate">
              {formatDate(selectedDate)}
            </h3>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
              {selectedDateShifts.length} Tasks Pending
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl transition-all ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <Filter size={16} />
          </button>
        </div>

        {showFilters && (
          <div className="mb-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-wrap gap-1.5">
              {['all', 'upcoming', 'in-progress', 'completed', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all border ${
                    filterStatus === status
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-transparent text-white/60 border-white/20 hover:border-white/40'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() =>
              generateSchedulePDF({
                staffName,
                selectedDate,
                selectedDateShifts: shifts.filter(s => s.shift_date === formatDateToLocal(selectedDate)),
                allShifts: shifts,
                stats,
                currentMonth: currentDate,
                calendarDays,
                getShiftsForDate,
              })
            }
            className="flex-1 h-10 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-lg active:scale-95"
          >
            <Download size={14} /> Download PDF Schedule
          </button>
        </div>
      </div>
    </div>

    {/* Shifts List */}
    <div className="space-y-3">
      {filteredShifts.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
          <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
            <CalendarIcon size={24} />
          </div>
          <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1">No Shifts Found</h3>
          <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed">
            No scheduled assignments detected.
          </p>
        </div>
      ) : (
        filteredShifts.map(shift => (
          <ShiftCard key={shift.id} shift={shift} staffId={staffId} onClockSuccess={handleClockSuccess} />
        ))
      )}
    </div>

    {filteredShifts.length > 0 && (
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Duration</span>
        <span className="text-base font-black text-blue-600 tracking-tight">
          {formatHours(
            filteredShifts.reduce((total, shift) => {
              const start = parseTime(shift.start_time);
              const end = parseTime(shift.end_time);
              const breakHours = (shift.break_minutes || 0) / 60;
              return total + (end - start - breakHours);
            }, 0)
          )}
        </span>
      </div>
    )}
  </div>
</div>


      </div>

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