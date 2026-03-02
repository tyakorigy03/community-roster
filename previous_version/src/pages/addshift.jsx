import { X, Search, User, Calendar, Clock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Helper functions
const TODAY_ISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

const formatHours = (hours) => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
};

// Shift Modal Component
export default function ShiftModal({ visible, shift, onClose, onSave, onDelete, staffList = [] }) {
  const [formData, setFormData] = useState({
    client_id: '',
    staff_id: '',
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 0,
    shift_type_id: '',
    status: 'scheduled',
  });

  const [clients, setClients] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (visible) {
      fetchInitialData();
    }
  }, [visible]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client =>
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.ndis_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients.slice(0, 10));
    }
  }, [searchTerm, clients]);

  useEffect(() => {
    if (shift) {
      setFormData({
        client_id: shift.client_id || '',
        staff_id: shift.staff_id || '',
        shift_date: shift.shift_date || shift.date || TODAY_ISO(),
        start_time: shift.start_time || shift.start || '09:00',
        end_time: shift.end_time || shift.end || '17:00',
        break_minutes: shift.break_minutes || shift.breakMinutes || 0,
        shift_type_id: shift.shift_type_id || '',
        status: shift.status || 'scheduled',
      });
    } else {
      // Reset form for new shift
      setFormData({
        client_id: '',
        staff_id: '',
        shift_date: TODAY_ISO(),
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 0,
        shift_type_id: '',
        status: 'scheduled',
      });
    }
  }, [shift]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, ndis_number")
        .eq("is_active", true)
        .order("first_name", { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
      setFilteredClients(clientsData?.slice(0, 10) || []);

      // Fetch shift types
      const { data: shiftTypesData, error: shiftTypesError } = await supabase
        .from("shift_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (shiftTypesError) throw shiftTypesError;
      setShiftTypes(shiftTypesData || []);

    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.client_id) {
      alert("Please select a client");
      return;
    }
    
    if (!formData.shift_date) {
      alert("Please select shift date");
      return;
    }
    
    if (!formData.start_time || !formData.end_time) {
      alert("Please enter start and end times");
      return;
    }
    
    // Validate time range
    const start = parseTime(formData.start_time);
    const end = parseTime(formData.end_time);
    if (end <= start) {
      alert("End time must be after start time");
      return;
    }

    onSave(formData);
  };

  const getSelectedClientName = () => {
    if (!formData.client_id) return "Select a client";
    const client = clients.find(c => c.id === formData.client_id);
    return client ? `${client.first_name} ${client.last_name}` : "Select a client";
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {shift?.id ? 'Edit Shift' : 'Create Shift'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="w-full p-2 border border-gray-300 rounded-lg text-left flex justify-between items-center hover:bg-gray-50"
              >
                <span className={formData.client_id ? "text-gray-900" : "text-gray-500"}>
                  {getSelectedClientName()}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {showClientDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No clients found
                      </div>
                    ) : (
                      filteredClients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, client_id: client.id }));
                            setShowClientDropdown(false);
                            setSearchTerm("");
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              NDIS: {client.ndis_number || 'N/A'}
                            </div>
                          </div>
                          {formData.client_id === client.id && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Staff Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Assignment
            </label>
            <select
              name="staff_id"
              value={formData.staff_id}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned (Open Shift)</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} {staff.role ? `(${staff.role})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leave unassigned to create an open shift
            </p>
          </div>

          {/* Shift Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                name="shift_date"
                value={formData.shift_date}
                onChange={handleInputChange}
                className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Shift Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Break Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break (minutes)
            </label>
            <input
              type="number"
              name="break_minutes"
              value={formData.break_minutes}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="120"
              step="5"
            />
          </div>

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Type
            </label>
            <select
              name="shift_type_id"
              value={formData.shift_type_id}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select shift type</option>
              {shiftTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status (for editing) */}
          {shift?.id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {/* Shift Duration Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">
              Shift Duration: {(() => {
                if (!formData.start_time || !formData.end_time) return '0 hours';
                const start = parseTime(formData.start_time);
                const end = parseTime(formData.end_time);
                const breakHours = (formData.break_minutes || 0) / 60;
                const hours = end - start - breakHours;
                return hours > 0 ? formatHours(hours) : 'Invalid time range';
              })()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {shift?.id && (
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                Delete Shift
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {shift?.id ? 'Update' : 'Create'} Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add ChevronDown component if not already imported
function ChevronDown(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}