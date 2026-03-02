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
  User,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Briefcase,
  TrendingUp
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
    <div className="min-h-screen bg-white">
      {/* Professional Compact Header */}
   <div className="bg-gradient-to-r from-blue-950 via-slate-950 to-blue-950 px-3 sm:px-4 lg:px-8 py-2 sm:py-3 sticky top-0 z-40 shadow-xl border-b border-white/10 backdrop-blur-md">
  <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
    
    {/* Left Section */}
    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
      <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30 flex-shrink-0">
        <DollarSign className="text-white" size={18} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-black text-blue-400 uppercase tracking-[0.18em] mb-0.5 truncate">
          <span className="opacity-50">Operational</span>
          <ChevronRight size={10} className="opacity-70 flex-shrink-0" />
          <span className="truncate">Rate Management</span>
        </div>

        <h1 className="text-[13px] sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-1 sm:gap-2 truncate">
          <span className="truncate">Payroll Config</span>

          <span className="bg-white/10 text-emerald-200 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border border-white/10 font-black flex-shrink-0">
            {payRates.length} Rates
          </span>
        </h1>
      </div>
    </div>

    {/* Right Section */}
    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
      <button
        onClick={() => setShowCreateRate(true)}
        className="h-8 sm:h-9 px-3 sm:px-4 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
      >
        <Plus size={14} />
        <span className="hidden lg:inline">Initialize Rate</span>
      </button>

      <button
        onClick={() => setShowAssignRate(true)}
        className="h-8 sm:h-9 px-3 sm:px-4 bg-white/5 text-white hover:bg-white/10 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 flex items-center gap-2"
      >
        <UserCheck size={14} className="text-blue-400" />
        <span className="hidden lg:inline">Assign Personnel</span>
      </button>
    </div>
  </div>
</div>


      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Modern High-Density Tabs */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 mb-8 w-fit shadow-sm shadow-slate-200/50">
          {[
            { id: 'rates', label: 'Rate Definitions', icon: DollarSign, count: payRates.length },
            { id: 'assignments', label: 'Authorized Assignments', icon: Users, count: staffPayRates.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-100"
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? "text-blue-600" : "opacity-50"} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeTab === tab.id ? "bg-blue-50 text-blue-600 border border-blue-100/50" : "bg-slate-100 text-slate-400"
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Unified High-Density Search & Filter Area */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
              <input
                type="text"
                placeholder={`Identify ${activeTab === 'rates' ? 'pay parameters' : 'authorized personnel'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 text-[11px] font-black uppercase tracking-widest focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              />
            </div>

            {activeTab === 'rates' && (
              <div className="relative min-w-[180px] w-full md:w-auto">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all cursor-pointer"
                >
                  <option value="all">Global Classification</option>
                  <option value="weekday">Weekday Normal</option>
                  <option value="saturday">Saturday Loading</option>
                  <option value="sunday">Sunday Premium</option>
                  <option value="public_holiday">Mandatory Holiday</option>
                  <option value="custom">Tactical Custom</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-slate-100">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-emerald-600 mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Parameters...</p>
            </div>
          ) : activeTab === "rates" ? (
            /* High-Density Pay Rates Ledger */
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/50">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <tr>
                      <th className="px-6 py-4 text-left">Internal Designation</th>
                      <th className="px-6 py-4 text-left">Environment</th>
                      <th className="px-6 py-4 text-left">Financial Rate</th>
                      <th className="px-6 py-4 text-left">Tactical Window</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {filteredPayRates.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm transition-transform hover:scale-110 duration-500">
                              <DollarSign className="text-slate-300" size={32} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Registry Silent</h3>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed">No pay rates matched your classification criteria.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPayRates.map((rate) => (
                        <tr key={rate.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 text-emerald-600 shadow-sm transition-transform group-hover:scale-110">
                                <Tag size={16} />
                              </div>
                              <div>
                                <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{rate.name}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 line-clamp-1 max-w-[200px]">{rate.description || "NO METADATA"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${rate.day_type === 'weekday' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              rate.day_type === 'saturday' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                rate.day_type === 'sunday' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                  rate.day_type === 'public_holiday' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    'bg-violet-50 text-violet-700 border border-violet-100'
                              }`}>
                              {rate.day_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[12px] font-black text-slate-900">
                              <span className="text-slate-400 text-[10px]">$</span>
                              {rate.hourly_rate?.toFixed(2)}
                              <span className="text-slate-400 text-[9px] font-bold">/HR</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-slate-500">
                            {rate.custom_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-blue-500" />
                                {new Date(rate.custom_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            ) : (
                              <span className="opacity-30 tracking-widest uppercase">Continuous</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${rate.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${rate.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                              {rate.is_active ? 'Operational' : 'Deactivated'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedRate(rate); setShowEditRate(true); }}
                                className="h-8 w-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRate(rate.id)}
                                className="h-8 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
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
            /* High-Density Authorized Assignments Table */
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/50">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <tr>
                      <th className="px-6 py-4 text-left">Authorized Personnel</th>
                      <th className="px-6 py-4 text-left">Linked Rate Profile</th>
                      <th className="px-6 py-4 text-left">Operational Window</th>
                      <th className="px-6 py-4 text-left">Priority</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {filteredStaffRates.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm transition-transform hover:scale-110 duration-500">
                              <UserCheck className="text-slate-300" size={32} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Assignments Empty</h3>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed">No personnel have been linked to pay profiles matching your criteria.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStaffRates.map((assignment) => (
                        <tr key={assignment.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                {assignment.staff?.profile_picture ? (
                                  <img src={assignment.staff.profile_picture} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-blue-600 bg-blue-50">
                                    {assignment.staff?.name?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{assignment.staff?.name || "REDACTED"}</div>
                                <div className="text-[9px] font-bold text-slate-400 line-clamp-1">{assignment.staff?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{assignment.pay_rate?.name}</div>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                                <DollarSign size={10} />
                                ${assignment.pay_rate?.hourly_rate}/HR LEADS
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={10} className="text-blue-500" />
                                <span className="opacity-50">FROM:</span> {new Date(assignment.effective_from).toLocaleDateString()}
                              </div>
                              {assignment.effective_to && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={10} className="text-rose-500" />
                                  <span className="opacity-50">TO:</span> {new Date(assignment.effective_to).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 w-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-900">
                              {assignment.priority}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {assignment.is_default ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">
                                <ShieldCheck size={10} />
                                Default Profile
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black uppercase tracking-widest">
                                Override Case
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setSelectedStaffRate(assignment); setShowEditStaffRate(true); }}
                                className="h-8 w-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteStaffRate(assignment.id)}
                                className="h-8 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
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

// Create Rate Modal
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                <DollarSign className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">
                  {isEditing ? 'Sync Rate' : 'Init Rate'}
                </h2>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest opacity-80">
                  {isEditing ? 'Environment Update' : 'Financial Definition'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={12} className="text-blue-500" />
              Rate Designation
            </label>
            <input
              type="text"
              placeholder="e.g., Level 1 Operational"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Tag size={12} className="text-indigo-500" />
              Metadata / Description
            </label>
            <textarea
              placeholder="Brief operational context..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} className="text-emerald-500" />
                Hourly Base
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-4 pr-10 text-[11px] font-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">/HR</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Filter size={12} className="text-blue-500" />
                Day Class
              </label>
              <div className="relative">
                <select
                  value={formData.day_type}
                  onChange={(e) => setFormData({ ...formData, day_type: e.target.value })}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer outline-none"
                >
                  <option value="weekday">Weekday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                  <option value="public_holiday">Holiday</option>
                  <option value="custom">Tactical</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {formData.day_type === 'custom' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-blue-500" />
                Target Date
              </label>
              <input
                type="date"
                value={formData.custom_date}
                onChange={(e) => setFormData({ ...formData, custom_date: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                required
              />
            </div>
          )}

          {isEditing && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${formData.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}>
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Active Operation</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Available for payroll linkage</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
        </form>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
            ) : (
              <>
                {isEditing ? 'Commit Update' : 'Synchronize Rate'}
                <ArrowUpRight size={14} />
              </>
            )}
          </button>
        </div>
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                <UserCheck className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Assign Profile</h2>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest opacity-80">Personnel Linkage</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-blue-500" />
              Target Personnel
            </label>
            <div className="relative">
              <select
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-black uppercase tracking-widest appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none cursor-pointer"
                required
              >
                <option value="">Select Staff Candidate...</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} — {staff.email}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={12} className="text-emerald-500" />
              Pay Rate Profile
            </label>
            <div className="relative">
              <select
                value={formData.pay_rate_id}
                onChange={(e) => setFormData({ ...formData, pay_rate_id: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-black uppercase tracking-widest appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none cursor-pointer"
                required
              >
                <option value="">Select Rate Profile...</option>
                {payRates.map(rate => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} — ${rate.hourly_rate}/hr ({rate.day_type})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-blue-500" />
                Commencement
              </label>
              <input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-rose-500" />
                Termination
              </label>
              <input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={12} className="text-indigo-500" />
              Operational Priority (0-10)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              />
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 px-1">Higher values override overlapping concurrent profiles</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${formData.is_default ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-400'}`}>
              <ShieldCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Primary Fallback</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Set as global default for staff</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${formData.is_default ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.is_default ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </form>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
            ) : (
              <>
                Authorize Assignment
                <ArrowUpRight size={14} />
              </>
            )}
          </button>
        </div>
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                <Edit className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Sync Assignment</h2>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest opacity-80">Assignment Modulation</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
              <User size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Personnel</p>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{assignment?.staff?.name}</p>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Rate Profile</p>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                {assignment?.pay_rate?.name} — ${assignment?.pay_rate?.hourly_rate}/hr
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-blue-500" />
                Commencement
              </label>
              <input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-rose-500" />
                Termination
              </label>
              <input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={12} className="text-indigo-500" />
              Operational Priority (0-10)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${formData.is_default ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-400'}`}>
              <ShieldCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Primary Fallback</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Set as global default for staff</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${formData.is_default ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.is_default ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </form>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
            ) : (
              <>
                Commit Modulation
                <ArrowUpRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}