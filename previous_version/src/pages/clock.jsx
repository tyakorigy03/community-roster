import { Camera, Clock, User, MapPin, Calendar, AlertCircle, CheckCircle, X, Upload, Loader2, Cloud } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ClockInOutPage() {
  const { shift_id, staff_id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [shift, setShift] = useState(null);
  const [staff, setStaff] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoPublicUrl, setPhotoPublicUrl] = useState("");
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locationError, setLocationError] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  
  // Cloudinary configuration
  const CLOUDINARY_CLOUD_NAME ='dazbtduwj';
  const CLOUDINARY_UPLOAD_PRESET = 'blessingcommunity';
  
  // Check if photo proof is required
  useEffect(() => {
    const checkPhotoRequirement = async () => {
      const { data } = await supabase
        .from('settings')
        .select('enabled')
        .eq('key', 'photo-proof')
        .single();
      
      setRequiresPhoto(data?.enabled || false);
    };
    
    checkPhotoRequirement();
  }, []);
  
  // Fetch shift and staff data
  useEffect(() => {
    fetchData();
  }, [shift_id, staff_id]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch shift details
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select(`
          *,
          clients (name, address),
          staff_shifts (
            clock_in_time,
            clock_out_time,
            clock_in_photo_url,
            clock_out_photo_url,
            clock_in_location,
            clock_out_location
          )
        `)
        .eq('id', shift_id)
        .single();
      
      if (shiftError) throw shiftError;
      
      // Fetch staff details
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staff_id)
        .single();
      
      if (staffError) throw staffError;
      
      setShift(shiftData);
      setStaff(staffData);
      
      // Check current clock status
      const staffShift = shiftData.staff_shifts?.[0];
      if (staffShift) {
        if (staffShift.clock_in_time && !staffShift.clock_out_time) {
          setCurrentStatus('clocked_in');
        } else if (staffShift.clock_out_time) {
          setCurrentStatus('clocked_out');
        }
      }
      
      // Get current location
      getCurrentLocation();
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load shift information. Please check the URL.");
    } finally {
      setLoading(false);
    }
  };
  
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError("");
      },
      (err) => {
        console.error("Error getting location:", err);
        setLocationError("Unable to retrieve your location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size should be less than 5MB");
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }
    
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    
    // Upload to Cloudinary immediately
    await uploadToCloudinary(file);
  };
  
  const uploadToCloudinary = async (file) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setError("Cloudinary configuration is missing");
      return null;
    }
    
    try {
      setUploadingPhoto(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      
      // Add folder and tags for organization
      formData.append('folder', `staff-clock/${staff_id}`);
      formData.append('tags', `staff_${staff_id},shift_${shift_id}`);
      
      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to upload to Cloudinary');
      }
      
      const data = await response.json();
      
      // Store the public URL
      setPhotoPublicUrl(data.secure_url);
      
      return data.secure_url;
      
    } catch (err) {
      console.error("Error uploading to Cloudinary:", err);
      setError("Failed to upload photo. Please try again.");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview("");
    setPhotoPublicUrl("");
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handleClockIn = async () => {
    try {
      setSubmitting(true);
      setError("");
      
      // Validate photo if required
      if (requiresPhoto && !photoPublicUrl) {
        setError("Photo proof is required for clock-in");
        return;
      }
      
      // Validate location
      if (!location.lat || !location.lng) {
        setError("Unable to get your location. Please enable location services.");
        return;
      }
      
      // Create or update staff_shift record
      const { data: existingShift, error: checkError } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('shift_id', shift_id)
        .eq('staff_id', staff_id)
        .single();
      
      let result;
      const now = new Date().toISOString();
      
      if (existingShift) {
        // Update existing record
        result = await supabase
          .from('staff_shifts')
          .update({
            clock_in_time: now,
            clock_in_photo_url: photoPublicUrl,
            clock_in_location: `${location.lat},${location.lng}`,
            updated_at: now
          })
          .eq('id', existingShift.id)
          .select();
      } else {
        // Create new record
        result = await supabase
          .from('staff_shifts')
          .insert({
            shift_id: shift_id,
            staff_id: staff_id,
            clock_in_time: now,
            clock_in_photo_url: photoPublicUrl,
            clock_in_location: `${location.lat},${location.lng}`,
            status: 'clocked_in'
          })
          .select();
      }
      
      if (result.error) throw result.error;
      
      setSuccess("Successfully clocked in!");
      setCurrentStatus('clocked_in');
      
      // Clear photo
      setPhoto(null);
      setPhotoPreview("");
      setPhotoPublicUrl("");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        // Could redirect to dashboard or confirmation page
        // navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error("Error clocking in:", err);
      setError("Failed to clock in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleClockOut = async () => {
    try {
      setSubmitting(true);
      setError("");
      
      // Validate photo if required
      if (requiresPhoto && !photoPublicUrl) {
        setError("Photo proof is required for clock-out");
        return;
      }
      
      // Validate location
      if (!location.lat || !location.lng) {
        setError("Unable to get your location. Please enable location services.");
        return;
      }
      
      // Update staff_shift record
      const now = new Date().toISOString();
      const { data: existingShift, error: checkError } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('shift_id', shift_id)
        .eq('staff_id', staff_id)
        .single();
      
      if (!existingShift || !existingShift.clock_in_time) {
        setError("You need to clock in first");
        return;
      }
      
      const result = await supabase
        .from('staff_shifts')
        .update({
          clock_out_time: now,
          clock_out_photo_url: photoPublicUrl,
          clock_out_location: `${location.lat},${location.lng}`,
          status: 'completed',
          updated_at: now
        })
        .eq('id', existingShift.id)
        .select();
      
      if (result.error) throw result.error;
      
      setSuccess("Successfully clocked out! Shift completed.");
      setCurrentStatus('clocked_out');
      
      // Clear photo
      setPhoto(null);
      setPhotoPreview("");
      setPhotoPublicUrl("");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        // Could redirect to dashboard or confirmation page
        // navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error("Error clocking out:", err);
      setError("Failed to clock out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading shift information...</p>
        </div>
      </div>
    );
  }
  
  if (error && !shift) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Shift Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-3xl border-b border-gray-200 px-4 py-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {currentStatus === 'clocked_in' ? 'Clock Out' : 'Clock In'}
              </h1>
              <p className="text-sm text-gray-500">
                {shift?.clients?.name || 'Client'}
              </p>
            </div>
          </div>
          
          {/* Staff Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{staff?.name}</p>
                <p className="text-sm text-gray-500">{staff?.email}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Shift Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Shift Details
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{formatDate(shift?.date)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">
                {formatTime(shift?.start_time)} - {formatTime(shift?.end_time)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Hours:</span>
              <span className="font-medium">{shift?.hours || 'N/A'}</span>
            </div>
            
            <div className="pt-3 border-t">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <span className="text-gray-600 block mb-1">Location:</span>
                  <span className="font-medium">{shift?.clients?.address || 'Location not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Status */}
        {currentStatus && (
          <div className={`rounded-xl border p-4 mb-6 ${
            currentStatus === 'clocked_in' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                currentStatus === 'clocked_in' ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                {currentStatus === 'clocked_in' ? (
                  <Clock className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {currentStatus === 'clocked_in' ? 'Currently Clocked In' : 'Shift Completed'}
                </p>
                <p className="text-sm text-gray-600">
                  {currentStatus === 'clocked_in' 
                    ? 'You are currently working this shift' 
                    : 'You have completed this shift'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Photo Upload */}
        {requiresPhoto && currentStatus !== 'clocked_out' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-600" />
              Photo Proof {requiresPhoto && <span className="text-red-500">*</span>}
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {currentStatus === 'clocked_in' 
                  ? 'Take a photo to clock out' 
                  : 'Take a photo to clock in'}
              </p>
              
              {photoPreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {uploadingPhoto && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-sm text-blue-600">Uploading to Cloudinary...</span>
                    </div>
                  )}
                  
                  {photoPublicUrl && !uploadingPhoto && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg">
                      <Cloud className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Photo uploaded successfully!</span>
                    </div>
                  )}
                </div>
              ) : (
                <label className={`block cursor-pointer ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    {uploadingPhoto ? (
                      <div className="space-y-3">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                        <p className="text-gray-600 font-medium">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">Upload Photo</p>
                        <p className="text-sm text-gray-500 mt-1">Click to select or take a photo</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>
          </div>
        )}
        
        {/* Location Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            Your Location
          </h3>
          
          {locationError ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{locationError}</p>
              <button
                onClick={getCurrentLocation}
                className="mt-3 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Retry Location
              </button>
            </div>
          ) : location.lat ? (
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Location verified</p>
              <p className="text-xs text-gray-500 mt-1">
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Getting your location...</p>
            </div>
          )}
        </div>
        
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="sticky bottom-6">
          {currentStatus === 'clocked_in' ? (
            <button
              onClick={handleClockOut}
              disabled={submitting || uploadingPhoto || (requiresPhoto && !photoPublicUrl)}
              className={`w-full py-4 text-lg font-semibold rounded-xl shadow-lg transition-all ${
                submitting || uploadingPhoto || (requiresPhoto && !photoPublicUrl)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Clocking Out...
                </div>
              ) : (
                'Clock Out Now'
              )}
            </button>
          ) : currentStatus === 'clocked_out' ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">Shift Completed</p>
              <p className="text-sm text-gray-600 mt-1">Thank you for your work!</p>
            </div>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={submitting || uploadingPhoto || (requiresPhoto && !photoPublicUrl)}
              className={`w-full py-4 text-lg font-semibold rounded-xl shadow-lg transition-all ${
                submitting || uploadingPhoto || (requiresPhoto && !photoPublicUrl)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Clocking In...
                </div>
              ) : (
                'Clock In Now'
              )}
            </button>
          )}
        </div>
        
        {/* Help Text */}
        {requiresPhoto && !photoPublicUrl && currentStatus !== 'clocked_out' && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Photo proof is required to {currentStatus === 'clocked_in' ? 'clock out' : 'clock in'}
          </p>
        )}
        
        {/* Cloudinary Status */}
        {photoPublicUrl && (
          <div className="text-center mt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <Cloud className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">Photo stored securely in Cloudinary</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}