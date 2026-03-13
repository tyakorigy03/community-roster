import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Plus,
  Download,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  X,
  LayoutGrid,
  List as ListIcon,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";
function AttachmentItem({ attachment }) {
  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{getFileIcon(attachment.file_type)}</div>
        <div>
          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
            {attachment.file_name}
          </div>
          <div className="text-sm text-gray-500">
            {formatFileSize(attachment.file_size)} • {attachment.file_type?.split('/')[1] || 'File'}
          </div>
        </div>
      </div>
      <Download size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
    </a>
  );
}

function ClientsPage() {
  const { currentStaff } = useUser();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'grid' or 'list'
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'active', 'inactive'
    city: '',
    state: '',
    dateRange: {
      start: '',
      end: ''
    }
  });

  // Fetch clients from database
  useEffect(() => {
    if (currentStaff?.tenant_id) {
      fetchClients();
    }
  }, [currentStaff]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("* ,file:documents(file_url,file_name:document_name)")
        .eq("tenant_id", currentStaff.tenant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log('clients', data);

      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients data");
    } finally {
      setLoading(false);
    }
  };

  // Apply filtering and sorting
  const filteredAndSortedClients = React.useMemo(() => {
    let result = [...clients];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.first_name?.toLowerCase().includes(term) ||
        client.last_name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone_number?.toLowerCase().includes(term) ||
        client.ndis_number?.toLowerCase().includes(term) ||
        client.city?.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(client =>
        filters.status === 'active' ? client.is_active : !client.is_active
      );
    }

    if (filters.city) {
      result = result.filter(client =>
        client.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    if (filters.state) {
      result = result.filter(client =>
        client.state?.toLowerCase().includes(filters.state.toLowerCase())
      );
    }

    if (filters.dateRange.start) {
      result = result.filter(client =>
        new Date(client.created_at) >= new Date(filters.dateRange.start)
      );
    }

    if (filters.dateRange.end) {
      result = result.filter(client =>
        new Date(client.created_at) <= new Date(filters.dateRange.end)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested objects and dates
        if (sortConfig.key === 'name') {
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [clients, searchTerm, filters, sortConfig]);
  useEffect(() => {
    console.log('this is selected client', selectedClient?.file?.file_url);

  }, [selectedClient])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id)
        .eq("tenant_id", currentStaff.tenant_id);

      if (error) throw error;

      toast.success("Client deleted successfully");
      setClients(clients.filter(c => c.id !== selectedClient.id));
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    }
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      city: '',
      state: '',
      dateRange: {
        start: '',
        end: ''
      }
    });
    setSearchTerm("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  const calculateAge = (dobString) => {
    if (!dobString) return "N/A";
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Name', 'Age', 'NDIS Number', 'Phone', 'Email',
      'City', 'State', 'Status', 'Created Date'
    ];

    const csvData = filteredAndSortedClients.map(client => [
      `${client.first_name} ${client.last_name}`,
      calculateAge(client.date_of_birth),
      client.ndis_number || 'N/A',
      client.phone_number || 'N/A',
      client.email || 'N/A',
      client.city || 'N/A',
      client.state || 'N/A',
      client.is_active ? 'Active' : 'Inactive',
      formatDate(client.created_at)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Clients exported to CSV");
  };

if (loading) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">LOADING CLIENTS DATA...</div>
      </div>
    </div>
  );
}


  return (
    <div className="p-0 animate-in fade-in duration-500">
      {/* Compact Activity Header */}
      <div className="flex  gap-3 mflex-row justify-between items-center p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">Client Base</h2>
          <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
            {filteredAndSortedClients.length} Registrations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
          {/* View Toggle */}
          <div className="bg-slate-100/50 p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ListIcon size={14} />
            </button>
          </div>

          <div className="hidden sm:flex items-center bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50 w-48 lg:w-64">
            <Search className="text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search registry..."
              className="bg-transparent border-none text-[10px] font-bold placeholder:text-slate-400 focus:outline-none w-full ml-2 uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`p-2 rounded-xl border transition-all ${filterOpen ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
          >
            <Filter size={14} />
          </button>

          <button
            onClick={exportToCSV}
            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
            title="Export CSV"
          >
            <Download size={14} />
          </button>

          <Link
            to="/addclient"
            className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={13} /> <span className="hidden sm:inline">Add Client</span>
          </Link>
        </div>
      </div>

      {/* Filters Panel - Compact */}
{filterOpen && (
  <div className="mx-4 lg:mx-6 mt-3 mb-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
    
    <div className="p-4 lg:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Status */}
        <div className="space-y-1">
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* City */}
        <div className="space-y-1">
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            City
          </label>
          <input
            type="text"
            placeholder="City..."
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* State */}
        <div className="space-y-1">
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            State
          </label>
          <input
            type="text"
            placeholder="State..."
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[10px] font-black text-slate-700 uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value },
                })
              }
              className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[9px] font-black text-slate-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value },
                })
              }
              className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-[9px] font-black text-slate-700 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Compact Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
          {filters.status !== "all" ||
          filters.city ||
          filters.state ||
          filters.dateRange.start ||
          filters.dateRange.end
            ? "Filters Applied"
            : "No Filters"}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all"
          >
            Reset
          </button>

          <button
            onClick={() => setFilterOpen(false)}
            className="px-4 py-2 bg-blue-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Clients Content */}
      <div className="p-4 lg:p-6">
        {filteredAndSortedClients.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
            <User className="mx-auto text-slate-100 mb-4" size={56} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">No clients found</p>
            <p className="text-sm font-bold text-slate-200 mt-2 uppercase tracking-tight">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredAndSortedClients.map((client) => (
              <div
                key={client.id}
                onClick={() => {
                  setSelectedClient(client);
                  setShowInfoModal(true);
                }}
                className="bg-white border border-slate-100 rounded-[1.5rem] p-5 lg:p-6 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer group flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-start justify-between mb-5">
                    <div className="relative">
                      {client.profile_photo_url ? (
                        <img
                          src={client.profile_photo_url}
                          alt={client.first_name}
                          className="rounded-2xl h-12 w-12 object-cover border border-slate-100 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="rounded-2xl h-12 w-12 flex items-center justify-center bg-blue-50 text-blue-600 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {client.first_name[0]}{client.last_name[0]}
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-full transition-all ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mb-5">
                    <p className="text-[13px] font-black text-slate-900 uppercase truncate leading-tight">{client.first_name} {client.last_name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">NDIS: {client.ndis_number || 'N/A'}</p>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <Phone size={12} />
                      <span className="text-[10px] font-bold truncate leading-none">{client.phone_number || "No contact"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <MapPin size={12} />
                      <span className="text-[10px] font-bold leading-none uppercase truncate">{client.city || 'N/A'}, {client.state || ''}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setShowInfoModal(true);
                      }}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Eye size={14} />
                    </button>
                    <Link
                      to={`/edit-client/${client.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-green-600 hover:text-white transition-all"
                    >
                      <Edit size={14} />
                    </Link>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer" onClick={() => handleSort('name')}>Registration</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hidden lg:table-cell" onClick={() => handleSort('ndis_number')}>NDIS & Contact</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer" onClick={() => handleSort('is_active')}>Status</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hidden lg:table-cell">Actions</th>
                    <th className="px-4 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] lg:hidden w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAndSortedClients.map((client) => {
                    const isExpanded = expandedClientId === client.id;
                    return (
                      <React.Fragment key={client.id}>
                        <tr
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              setExpandedClientId(isExpanded ? null : client.id);
                            } else {
                              setSelectedClient(client);
                              setShowInfoModal(true);
                            }
                          }}
                          className={`hover:bg-slate-50/80 even:bg-slate-50/30 transition-all cursor-pointer group ${isExpanded ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex items-center gap-3">
                              {client.profile_photo_url ? (
                                <img src={client.profile_photo_url} className="w-9 h-9 rounded-xl object-cover shadow-sm" alt="" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase shadow-sm">
                                  {client.first_name[0]}{client.last_name[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate">{client.first_name} {client.last_name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Added {formatDate(client.created_at)}</p>
                                {/* Mobile Detail Preview */}
                                <div className="lg:hidden mt-0.5">
                                  <p className="text-[8px] font-bold text-slate-400 truncate">{client.ndis_number || "NO NDIS"}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <p className="text-[11px] font-black text-slate-600 uppercase leading-none">{client.ndis_number || "NO NDIS"}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1.5">{client.email || client.phone_number || "No contact Info"}</p>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${client.is_active ? 'bg-green-100/80 text-green-700' : 'bg-red-100/80 text-red-700'} backdrop-blur-sm border ${client.is_active ? 'border-green-200' : 'border-red-200'}`}>
                              {client.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {client.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {/* Desktop Actions */}
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setShowInfoModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={14} /></button>
                              <Link to={`/edit-client/${client.id}`} onClick={(e) => e.stopPropagation()} className="p-1.5 text-slate-400 hover:text-green-600 transition-colors"><Edit size={14} /></Link>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setShowDeleteModal(true); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                              <ChevronRight size={14} className="text-slate-200 ml-1" />
                            </div>
                          </td>
                          {/* Mobile Toggle Icon */}
                          <td className="px-4 py-4 text-right lg:hidden">
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown size={14} className="text-slate-300" />
                            </div>
                          </td>
                        </tr>
                        {/* Mobile Expanded Actions Tray */}
                        {isExpanded && (
                          <tr className="lg:hidden bg-blue-50/30">
                            <td colSpan="3" className="px-4 py-4 animate-in slide-in-from-top-2 duration-200">
                              <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-white/60 p-2 rounded-xl border border-blue-100/50">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                                    <p className="text-[9px] font-bold text-slate-600 truncate">{client.phone_number || "No Phone"}</p>
                                  </div>
                                  <div className="bg-white/60 p-2 rounded-xl border border-blue-100/50">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">NDIS Number</p>
                                    <p className="text-[9px] font-bold text-slate-600 truncate">{client.ndis_number || "Pending"}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setShowInfoModal(true); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-blue-200"
                                  >
                                    <Eye size={12} /> View Details
                                  </button>
                                  <Link 
                                    to={`/edit-client/${client.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-xl"
                                  >
                                    <Edit size={12} /> Modify
                                  </Link>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setShowDeleteModal(true); }}
                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Client Info Modal */}
      {selectedClient && showInfoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md">
              <div className="flex items-center gap-4">
                {selectedClient.profile_photo_url ? (
                  <img
                    src={selectedClient.profile_photo_url}
                    alt={`${selectedClient.first_name}`} 
                    className="rounded-2xl h-14 w-14 object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="rounded-2xl h-14 w-14 flex items-center justify-center bg-blue-600 text-white font-black text-lg shadow-lg shadow-blue-200">
                    {selectedClient.first_name[0]}{selectedClient.last_name[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate leading-tight">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Profile</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setSelectedClient(null);
                }}
                className="p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Personal File</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formal Age</span>
                        <span className="text-[11px] font-black text-slate-900 uppercase">{calculateAge(selectedClient.date_of_birth)} YRS</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Birth Date</span>
                        <span className="text-[11px] font-black text-slate-900 uppercase">{formatDate(selectedClient.date_of_birth)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">NDIS Number</span>
                        <span className="text-[11px] font-black text-slate-900 uppercase font-mono">{selectedClient.ndis_number || 'PENDING'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Support Directives</h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Primary Goals</p>
                      <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{selectedClient.goals_summary || 'No directives recorded'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Communication</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Phone size={14}/></div>
                        <div>
                          <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Mobile</p>
                          <p className="text-[11px] font-black text-slate-900 uppercase">{selectedClient.phone_number || 'UNLISTED'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={14}/></div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Email</p>
                          <p className="text-[11px] font-black text-slate-900 truncate uppercase">{selectedClient.email || 'UNLISTED'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">NDIS Documentation</h3>
                    {selectedClient.file ? (
                      <AttachmentItem attachment={selectedClient.file} />
                    ) : (
                      <div className="flex items-center gap-3 p-4 border border-dashed border-slate-200 rounded-2xl text-slate-300">
                        <FileText size={16}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">No plan attached</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Dismiss
              </button>
              <Link
                to={`/edit-client/${selectedClient.id}`}
                className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                Modify Profile
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Terminate Profile?</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8 px-4">
                You are about to permanently remove <span className="text-slate-900 font-black">{selectedClient.first_name} {selectedClient.last_name}</span>. This action is irreversible.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteClient}
                  className="w-full py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Confirm Termination
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedClient(null);
                  }}
                  className="w-full py-4 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsPage;