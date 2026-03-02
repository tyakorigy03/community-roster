import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import {
  DollarSign,
  Users,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  UserCheck,
  ChevronDown,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Tag,
  User
} from "lucide-react";

// Pay Rate Management Component
export default function PayRateManagement() {
  const [payRates, setPayRates] = useState([]);
  const [staffPayRates, setStaffPayRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRate, setShowCreateRate] = useState(false);
  const [showAssignRate, setShowAssignRate] = useState(false);
  const [showEditRate, setShowEditRate] = useState(false);
  const [showEditStaffRate, setShowEditStaffRate] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [selectedStaffRate, setSelectedStaffRate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("rates"); // "rates" or "assignments"

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pay rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('pay_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (ratesError) throw ratesError;
      setPayRates(ratesData || []);

      // Fetch staff pay rates with related data
      const { data: staffRatesData, error: staffRatesError } = await supabase
        .from('staff_pay_rates')
        .select(`
          *,
          staff:staff_id(id, name, email, profile_picture),
          pay_rate:pay_rate_id(*)
        `)
        .order('created_at', { ascending: false });

      if (staffRatesError) throw staffRatesError;
      setStaffPayRates(staffRatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteRate = async (rateId) => {
    if (!confirm('Are you sure you want to delete this pay rate? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pay_rates')
        .update({ is_active: false })
        .eq('id', rateId);

      if (error) throw error;

      toast.success('Pay rate deactivated successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting pay rate:', error);
      toast.error('Failed to delete pay rate');
    }
  };

  const handleDeleteStaffRate = async (staffRateId) => {
    if (!confirm('Are you sure you want to remove this pay rate assignment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_pay_rates')
        .delete()
        .eq('id', staffRateId);

      if (error) throw error;

      toast.success('Pay rate assignment removed successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting staff pay rate:', error);
      toast.error('Failed to remove pay rate assignment');
    }
  };

  const filteredPayRates = payRates.filter(rate => {
    if (filterType !== "all" && rate.day_type !== filterType) return false;
    if (searchTerm && !rate.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredStaffRates = staffPayRates.filter(assignment => {
    if (searchTerm && !assignment.staff?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getDayTypeBadge = (dayType) => {
    const colors = {
      weekday: "bg-blue-100 text-blue-800",
      saturday: "bg-green-100 text-green-800",
      sunday: "bg-purple-100 text-purple-800",
      public_holiday: "bg-red-100 text-red-800",
      custom: "bg-yellow-100 text-yellow-800"
    };
    return colors[dayType] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b rounded-t-3xl border-gray-200 px-6 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Pay Rate Management</h1>
            <p className="mt-2 text-gray-600">Create and manage pay rates for your staff</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCreateRate(true)}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Pay Rate
            </button>
            <button
              onClick={() => setShowAssignRate(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <UserCheck className="w-4 h-4" />
              Assign to Staff
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab("rates")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "rates"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pay Rates
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {payRates.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "assignments"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Assignments
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {staffPayRates.length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Search and Filter */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === "rates" ? "pay rates..." : "staff..."}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {activeTab === "rates" && (
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Day Types</option>
                  <option value="weekday">Weekday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                  <option value="public_holiday">Public Holiday</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : activeTab === "rates" ? (
          /* Pay Rates Table */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hourly Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Custom Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayRates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <DollarSign className="text-gray-300 w-10 h-10 mb-3" />
                          <p className="text-gray-500 text-sm font-medium">No pay rates found</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {searchTerm ? "Try a different search term" : "Create your first pay rate"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{rate.name}</div>
                            {rate.description && (
                              <div className="text-sm text-gray-500 mt-1">{rate.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getDayTypeBadge(rate.day_type)}`}>
                            {rate.day_type.replace('_', ' ').charAt(0).toUpperCase() + rate.day_type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">${rate.hourly_rate}</span>
                            <span className="text-sm text-gray-500">/hour</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            {rate.custom_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {new Date(rate.custom_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {rate.is_active ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedRate(rate);
                                setShowEditRate(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRate(rate.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Staff Assignments Table */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pay Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Default
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStaffRates.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <UserCheck className="text-gray-300 w-10 h-10 mb-3" />
                          <p className="text-gray-500 text-sm font-medium">No staff assignments found</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {searchTerm ? "Try a different search term" : "Assign your first pay rate to staff"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaffRates.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {assignment.staff?.profile_picture ? (
                              <img
                                src={assignment.staff.profile_picture}
                                alt={assignment.staff.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{assignment.staff?.name || "Unknown Staff"}</div>
                              <div className="text-sm text-gray-500">{assignment.staff?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{assignment.pay_rate?.name}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <DollarSign className="w-3 h-3" />
                              ${assignment.pay_rate?.hourly_rate}/hr
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDayTypeBadge(assignment.pay_rate?.day_type)}`}>
                                {assignment.pay_rate?.day_type?.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              From: {new Date(assignment.effective_from).toLocaleDateString()}
                            </div>
                            {assignment.effective_to && (
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                To: {new Date(assignment.effective_to).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.priority}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {assignment.is_default ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3" />
                              Default
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedStaffRate(assignment);
                                setShowEditStaffRate(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaffRate(assignment.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRateModal
        isOpen={showCreateRate}
        onClose={() => setShowCreateRate(false)}
        onSuccess={fetchData}
        rateToEdit={null}
      />

      <EditRateModal
        isOpen={showEditRate}
        onClose={() => {
          setShowEditRate(false);
          setSelectedRate(null);
        }}
        onSuccess={fetchData}
        rate={selectedRate}
      />

      <AssignRateToStaffModal
        isOpen={showAssignRate}
        onClose={() => setShowAssignRate(false)}
        onSuccess={fetchData}
      />

      <EditStaffRateModal
        isOpen={showEditStaffRate}
        onClose={() => {
          setShowEditStaffRate(false);
          setSelectedStaffRate(null);
        }}
        onSuccess={fetchData}
        assignment={selectedStaffRate}
      />
    </div>
  );
}

// Create Rate Modal (Reusing from previous code but adding edit functionality)
function CreateRateModal({ isOpen, onClose, onSuccess, rateToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourly_rate: '',
    day_type: 'weekday',
    custom_date: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const isEditing = !!rateToEdit;

  useEffect(() => {
    if (rateToEdit) {
      setFormData({
        name: rateToEdit.name || '',
        description: rateToEdit.description || '',
        hourly_rate: rateToEdit.hourly_rate || '',
        day_type: rateToEdit.day_type || 'weekday',
        custom_date: rateToEdit.custom_date || '',
        is_active: rateToEdit.is_active !== false
      });
    }
  }, [rateToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.hourly_rate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.day_type === 'custom' && !formData.custom_date) {
      toast.error('Please select a custom date');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = {
        name: formData.name,
        description: formData.description,
        hourly_rate: parseFloat(formData.hourly_rate),
        day_type: formData.day_type,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (formData.day_type === 'custom') {
        insertData.custom_date = formData.custom_date;
      } else {
        insertData.custom_date = null;
      }

      if (isEditing) {
        // Update existing rate
        const { error } = await supabase
          .from('pay_rates')
          .update(insertData)
          .eq('id', rateToEdit.id);

        if (error) throw error;
        toast.success('Pay rate updated successfully');
      } else {
        // Create new rate
        insertData.created_by = userData.user?.id ? 1 : null;
        const { error } = await supabase
          .from('pay_rates')
          .insert([insertData]);

        if (error) throw error;
        toast.success('Pay rate created successfully');
      }

      onSuccess();
      onClose();
      
      // Reset form if not editing
      if (!isEditing) {
        setFormData({
          name: '',
          description: '',
          hourly_rate: '',
          day_type: 'weekday',
          custom_date: '',
          is_active: true
        });
      }
    } catch (error) {
      console.error('Error saving pay rate:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} pay rate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Pay Rate' : 'Create Pay Rate'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditing ? 'Update payment rate details' : 'Define new payment rate'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Weekday - Level 1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="33.00"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day Type *
            </label>
            <select
              value={formData.day_type}
              onChange={(e) => setFormData({ ...formData, day_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="weekday">Weekday (Mon-Fri)</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
              <option value="public_holiday">Public Holiday</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {formData.day_type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Date *
              </label>
              <input
                type="date"
                value={formData.custom_date}
                onChange={(e) => setFormData({ ...formData, custom_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          )}

          {isEditing && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active Rate
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Rate' : 'Save Rate'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Rate Modal (Separate component for clarity)
function EditRateModal({ isOpen, onClose, onSuccess, rate }) {
  return <CreateRateModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} rateToEdit={rate} />;
}

// Assign Rate to Staff Modal (Reusing from previous code but with improvements)
function AssignRateToStaffModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    staff_id: '',
    pay_rate_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    is_default: false,
    priority: 0
  });
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [payRates, setPayRates] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name');

      if (staffError) throw staffError;
      setStaffList(staffData || []);

      // Fetch pay rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('pay_rates')
        .select('*')
        .eq('is_active', true)
        .order('day_type')
        .order('hourly_rate', { ascending: false });

      if (ratesError) throw ratesError;
      setPayRates(ratesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.staff_id || !formData.pay_rate_id || !formData.effective_from) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = {
        staff_id: formData.staff_id,
        pay_rate_id: formData.pay_rate_id,
        effective_from: formData.effective_from,
        is_default: formData.is_default,
        priority: parseInt(formData.priority) || 0,
        created_by: userData.user?.id ? 1 : null
      };

      if (formData.effective_to) {
        insertData.effective_to = formData.effective_to;
      }

      const { error } = await supabase
        .from('staff_pay_rates')
        .insert([insertData]);

      if (error) throw error;

      toast.success('Pay rate assigned successfully');
      onSuccess();
      onClose();
      
      setFormData({
        staff_id: '',
        pay_rate_id: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
        is_default: false,
        priority: 0
      });
    } catch (error) {
      console.error('Error assigning pay rate:', error);
      toast.error('Failed to assign pay rate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UserCheck className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Assign Pay Rate</h2>
              <p className="text-xs text-gray-500">Set rate for staff member</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" disabled={loading}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Member *
            </label>
            <select
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Select staff member</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Rate *
            </label>
            <select
              value={formData.pay_rate_id}
              onChange={(e) => setFormData({ ...formData, pay_rate_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Select rate</option>
              {payRates.map(rate => (
                <option key={rate.id} value={rate.id}>
                  {rate.name} – ${rate.hourly_rate}/hr ({rate.day_type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective From *
              </label>
              <input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective To (Optional)
              </label>
              <input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority (0-10)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Higher priority rates override lower ones</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
              Set as default rate for this staff member
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Assign Rate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Staff Rate Modal
function EditStaffRateModal({ isOpen, onClose, onSuccess, assignment }) {
  const [formData, setFormData] = useState({
    effective_from: '',
    effective_to: '',
    is_default: false,
    priority: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assignment) {
      setFormData({
        effective_from: assignment.effective_from ? new Date(assignment.effective_from).toISOString().split('T')[0] : '',
        effective_to: assignment.effective_to ? new Date(assignment.effective_to).toISOString().split('T')[0] : '',
        is_default: assignment.is_default || false,
        priority: assignment.priority || 0
      });
    }
  }, [assignment]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.effective_from) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        effective_from: formData.effective_from,
        is_default: formData.is_default,
        priority: parseInt(formData.priority) || 0,
        updated_at: new Date().toISOString()
      };

      if (formData.effective_to) {
        updateData.effective_to = formData.effective_to;
      } else {
        updateData.effective_to = null;
      }

      const { error } = await supabase
        .from('staff_pay_rates')
        .update(updateData)
        .eq('id', assignment.id);

      if (error) throw error;

      toast.success('Staff rate assignment updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating staff rate:', error);
      toast.error('Failed to update staff rate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Edit className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Staff Rate Assignment</h2>
              <p className="text-xs text-gray-500">Update assignment details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" disabled={loading}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Member
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{assignment?.staff?.name}</div>
              <div className="text-sm text-gray-500">{assignment?.staff?.email}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pay Rate
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{assignment?.pay_rate?.name}</div>
              <div className="text-sm text-gray-500">
                ${assignment?.pay_rate?.hourly_rate}/hr • {assignment?.pay_rate?.day_type?.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective From *
              </label>
              <input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective To (Optional)
              </label>
              <input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority (0-10)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
              Set as default rate for this staff member
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Assignment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}