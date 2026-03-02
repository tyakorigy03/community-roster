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
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
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
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("* ,file:documents(file_url,file_name:document_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log('clients',data);
      
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
  useEffect(()=>{
     console.log('this is selected client',selectedClient?.file?.file_url);
     
  },[selectedClient])

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
        .eq("id", selectedClient.id);

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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b border-gray-300 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-700">Clients</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredAndSortedClients.length} client{filteredAndSortedClients.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search clients..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              filterOpen 
                ? 'bg-blue-100 border-blue-300 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filter
            {(filters.status !== 'all' || filters.city || filters.state || filters.dateRange.start || filters.dateRange.end) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export
          </button>

          {/* Add Client Button */}
          <Link
            to="/addclient"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Client
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      {filterOpen && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                placeholder="Filter by city..."
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                placeholder="Filter by state..."
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange, start: e.target.value }
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange, end: e.target.value }
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {filters.status !== 'all' || filters.city || filters.state || filters.dateRange.start || filters.dateRange.end
                ? "Filters applied"
                : "No filters applied"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Client Name
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ndis_number')}
                >
                  <div className="flex items-center gap-1">
                    NDIS Number
                    {sortConfig.key === 'ndis_number' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('phone_number')}
                >
                  <div className="flex items-center gap-1">
                    Contact Info
                    {sortConfig.key === 'phone_number' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center gap-1">
                    Location
                    {sortConfig.key === 'city' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('is_active')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortConfig.key === 'is_active' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created Date
                    {sortConfig.key === 'created_at' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedClients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <User className="text-gray-300 w-12 h-12 mb-3" />
                      <p className="text-gray-500 text-lg">No clients found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || Object.values(filters).some(f => f !== 'all' && f !== '') 
                          ? "Try adjusting your search or filters" 
                          : "Add your first client to get started"}
                      </p>
                      {!searchTerm && !Object.values(filters).some(f => f !== 'all' && f !== '') && (
                        <Link
                          to="/addclient"
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={16} />
                          Add Client
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {client.profile_photo_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover border border-gray-200"
                              src={client.profile_photo_url}
                              alt={`${client.first_name} ${client.last_name}`}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border border-gray-200">
                              <span className="text-blue-600 font-semibold">
                                {client.first_name?.[0]}{client.last_name?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.first_name} {client.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Age: {calculateAge(client.date_of_birth)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* NDIS Number */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-mono">{client.ndis_number}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <FileText size={12} className="inline mr-1" />
                        Plan available
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {client.phone_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone size={12} className="text-gray-400" />
                            <span className="text-gray-900">{client.phone_number}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={12} className="text-gray-400" />
                            <span className="text-gray-900 truncate max-w-xs">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-gray-900">
                            {client.city || 'N/A'} {client.state ? `, ${client.state}` : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {client.postcode || 'No postcode'}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        client.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {client.is_active ? (
                          <>
                            <CheckCircle size={12} />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{formatDate(client.created_at)}</div>
                      <div className="text-xs text-gray-500">
                        <Calendar size={12} className="inline mr-1" />
                        Added
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowInfoModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <Link
                          to={`/edit-client/${client.id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Client"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Client"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredAndSortedClients.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing {filteredAndSortedClients.length} of {clients.length} clients
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Back to top
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Info Modal */}
      {selectedClient && showInfoModal && (
        <div className="fixed inset-0 bg-black/70  flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                {selectedClient.profile_photo_url ? (
                  <img
                    src={selectedClient.profile_photo_url}
                    alt={`${selectedClient.first_name} ${selectedClient.last_name}`}
                    className="rounded-full h-16 w-16 object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="rounded-full h-16 w-16 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 font-bold text-xl border-2 border-gray-200">
                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h2>
                  <p className="text-gray-600">{selectedClient.ndis_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setSelectedClient(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Age:</span> {calculateAge(selectedClient.date_of_birth)}</p>
                      <p><span className="font-medium">DOB:</span> {formatDate(selectedClient.date_of_birth)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Phone:</span> {selectedClient.phone_number || 'N/A'}</p>
                      <p><span className="font-medium">Email:</span> {selectedClient.email || 'N/A'}</p>
                      <p><span className="font-medium">Address:</span> {selectedClient.address_line || 'N/A'}</p>
                      <p>{selectedClient.city}, {selectedClient.state} {selectedClient.postcode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">NDIS Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Diagnosis:</span> {selectedClient.diagnosis || 'Not specified'}</p>
                      <p><span className="font-medium">Goals:</span> {selectedClient.goals_summary || 'Not specified'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Emergency Contacts</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Doctor:</span> {selectedClient.doctor_name || 'N/A'}</p>
                      <p><span className="font-medium">Doctor Phone:</span> {selectedClient.doctor_phone || 'N/A'}</p>
                      <p><span className="font-medium">Next of Kin:</span> {selectedClient.next_of_kin_name || 'N/A'}</p>
                      <p><span className="font-medium">Relationship:</span> {selectedClient.next_of_kin_relationship || 'N/A'}</p>
                    </div>
                  </div>
                   <div>
                    {
                      selectedClient.file && <><h3 className="text-sm font-medium text-gray-500 mb-2">NDIS plan document</h3>
                    <div className="space-y-2">
                       <AttachmentItem attachment={selectedClient.file || {}} />
                    </div>
                      </>
                    }
                    
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Link
                to={`/edit-client/${selectedClient.id}`}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Client
              </Link>
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Client</h2>
                  <p className="text-gray-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                {selectedClient.profile_photo_url ? (
                  <img
                    src={selectedClient.profile_photo_url}
                    alt={`${selectedClient.first_name} ${selectedClient.last_name}`}
                    className="rounded-full h-12 w-12 object-cover"
                  />
                ) : (
                  <div className="rounded-full h-12 w-12 flex items-center justify-center bg-gray-200 text-gray-600 font-bold">
                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-700">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-gray-500 text-sm">{selectedClient.ndis_number}</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">
                  Are you sure you want to delete this client? All associated data will be permanently removed.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedClient(null);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsPage;