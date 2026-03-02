import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  return timeString.substring(0, 5);
};

const getStatusBadge = (status) => {
  const statusMap = {
    draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
    submitted: { color: 'bg-blue-100 text-blue-800', icon: Clock },
    approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
    review: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
  };
  
  const config = statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: FileText };
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Progress Note Card Component
function ProgressNoteCard({ note, onView, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-800 line-clamp-1">
                {note.subject || `Progress Note - ${formatDate(note.event_date)}`}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(note.status || 'draft')}
                <span className="text-xs text-gray-500">
                  Created: {formatDate(note.created_at)}
                </span>
              </div>
            </div>
            
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MoreVertical size={18} className="text-gray-500" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      onView(note);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Eye size={14} /> View Details
                  </button>
                  <button
                    onClick={() => {
                      onEdit(note);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(note);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="flex items-center text-sm text-gray-600">
              <User size={14} className="mr-2 text-gray-400" />
              <span className="truncate">{note.client_name || 'No client'}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar size={14} className="mr-2 text-gray-400" />
              <span>{formatDate(note.event_date)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock size={14} className="mr-2 text-gray-400" />
              <span>
                {formatTime(note.shift_start_time)} - {formatTime(note.shift_end_time)}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FileText size={14} className="mr-2 text-gray-400" />
              <span>{note.shift_type_name || 'General'}</span>
            </div>
          </div>
          
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">
              {note.shift_notes || 'No notes provided'}
            </p>
          </div>
          
          {note.key_areas && note.key_areas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {note.key_areas.map((area, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div>
              Staff: <span className="font-medium">{note.staff_name || 'Unknown'}</span>
            </div>
            {note.attachment_count > 0 && (
              <div className="flex items-center">
                <FileText size={12} className="mr-1" />
                {note.attachment_count} attachment{note.attachment_count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Sidebar Component
function FilterSidebar({ filters, onFilterChange, clients, hierarchies, statusOptions }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-fit">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Filter size={16} /> Filters
        </h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      {isOpen && (
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Search Notes
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search in notes..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Client
            </label>
            <select
              value={filters.client_id}
              onChange={(e) => onFilterChange('client_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Hierarchy Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Hierarchy
            </label>
            <select
              value={filters.hierarchy_id}
              onChange={(e) => onFilterChange('hierarchy_id', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Hierarchies</option>
              {hierarchies.map(hierarchy => (
                <option key={hierarchy.id} value={hierarchy.id}>
                  {hierarchy.name} {hierarchy.code ? `(${hierarchy.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => onFilterChange('date_from', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => onFilterChange('date_to', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              onFilterChange('reset', '');
            }}
            className="w-full py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

// Main Progress Notes Component
export default function ProgressNotesList() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [selectedNote, setSelectedNote] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    client_id: 'all',
    hierarchy_id: 'all',
    date_from: '',
    date_to: ''
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'review', label: 'Under Review' }
  ];

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch notes when filters or pagination changes
  useEffect(() => {
    fetchNotes();
  }, [filters, currentPage, itemsPerPage]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch hierarchies
      const { data: hierarchiesData, error: hierarchiesError } = await supabase
        .from('hierarchy')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(hierarchiesData || []);

    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('progress_notes')
        .select(`
          *,
          client:client_id(first_name, last_name),
          staff:created_by(name),
          hierarchy:hierarchy_id(name, code),
          shift_type:shift_type_id(name),
          attachments:progress_note_attachments(count)
        `, { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`subject.ilike.%${filters.search}%,shift_notes.ilike.%${filters.search}%`);
      }
      
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.client_id !== 'all') {
        query = query.eq('client_id', filters.client_id);
      }
      
      if (filters.hierarchy_id !== 'all') {
        query = query.eq('hierarchy_id', filters.hierarchy_id);
      }
      
      if (filters.date_from) {
        query = query.gte('event_date', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('event_date', filters.date_to);
      }

      // Get total count
      const { count } = await query;
      setTotalItems(count || 0);

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: notesData, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Format notes data
      const formattedNotes = (notesData || []).map(note => ({
        ...note,
        client_name: note.client ? `${note.client.first_name} ${note.client.last_name}` : null,
        staff_name: note.staff?.name || null,
        hierarchy_name: note.hierarchy?.name || null,
        hierarchy_code: note.hierarchy?.code || null,
        shift_type_name: note.shift_type?.name || null,
        attachment_count: note.attachments?.[0]?.count || 0
      }));

      setNotes(formattedNotes);

    } catch (error) {
      console.error('Error fetching progress notes:', error);
      toast.error('Failed to load progress notes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    if (filterName === 'reset') {
      setFilters({
        search: '',
        status: 'all',
        client_id: 'all',
        hierarchy_id: 'all',
        date_from: '',
        date_to: ''
      });
      setCurrentPage(1);
    } else {
      setFilters(prev => ({ ...prev, [filterName]: value }));
      setCurrentPage(1);
    }
  };

  const handleViewNote = (note) => {
    navigate(`/progress-notes/${note.id}`);
  };

  const handleEditNote = (note) => {
    navigate(`/edit-progressnote/${note.id}`);
  };

  const handleDeleteNote = (note) => {
    setSelectedNote(note);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedNote) return;
    
    try {
      setDeleteLoading(true);
      
      // Delete attachments first
      await supabase
        .from('progress_note_attachments')
        .delete()
        .eq('progress_note_id', selectedNote.id);
      
      // Delete the progress note
      const { error } = await supabase
        .from('progress_notes')
        .delete()
        .eq('id', selectedNote.id);

      if (error) throw error;

      // Clear shift link if exists
      if (selectedNote.shift_id) {
        await supabase
          .from('shifts')
          .update({ progress_note_id: null })
          .eq('id', selectedNote.shift_id);
      }

      toast.success('Progress note deleted successfully');
      fetchNotes(); // Refresh list
      
    } catch (error) {
      console.error('Error deleting progress note:', error);
      toast.error('Failed to delete progress note');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setSelectedNote(null);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info('Preparing export...');
      
      const { data: notesData, error } = await supabase
        .from('progress_notes')
        .select(`
          *,
          client:client_id(first_name, last_name),
          staff:created_by(name),
          hierarchy:hierarchy_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csvRows = [];
      
      // Add header
      const headers = [
        'Date',
        'Client',
        'Hierarchy',
        'Subject',
        'Shift Date',
        'Shift Times',
        'Status',
        'Created By',
        'Created Date'
      ];
      csvRows.push(headers.join(','));
      
      // Add data rows
      notesData.forEach(note => {
        const row = [
          formatDate(note.event_date),
          note.client ? `${note.client.first_name} ${note.client.last_name}` : '',
          note.hierarchy?.name || '',
          note.subject || '',
          formatDate(note.shift_date),
          `${formatTime(note.shift_start_time)}-${formatTime(note.shift_end_time)}`,
          note.status || 'draft',
          note.staff?.name || '',
          formatDate(note.created_at)
        ];
        
        // Escape quotes and wrap in quotes
        const escapedRow = row.map(field => {
          if (field.includes(',') || field.includes('"')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });
        
        csvRows.push(escapedRow.join(','));
      });
      
      // Create and download file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-notes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
      
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (loading && notes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading progress notes...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
<div className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 ">
    <div className="flex justify-between items-start sm:items-center py-2 gap-2 sm:gap-4">
      
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
          Progress Notes
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-0.5">
          View and manage all progress notes
        </p>
      </div>
      
      {/* Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ">
        <button
          onClick={exportToCSV}
          className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <Download size={16} />
          Export CSV
        </button>
        
        <Link
          to="/add-progressnote"
          className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <Plus size={16} />
          Add Progress Note
        </Link>
      </div>
      
    </div>
  </div>
</div>



      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              clients={clients}
              hierarchies={hierarchies}
              statusOptions={statusOptions}
            />
            
            {/* Stats Summary */}
            <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Notes:</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Showing:</span>
                  <span className="font-medium">
                    {startItem}-{endItem} of {totalItems}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* View Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="flex border border-gray-300 rounded-lg">
                 <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Grid
                  </button>
                </div>
                
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600">
                {notes.length} note{notes.length !== 1 ? 's' : ''} found
              </div>
            </div>

            {/* Notes Grid/List */}
            {notes.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <FileText className="mx-auto text-gray-400" size={48} />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No progress notes found</h3>
                <p className="text-gray-600 mt-2">
                  {filters.search || filters.status !== 'all' || filters.client_id !== 'all'
                    ? 'Try adjusting your filters or search terms'
                    : 'Get started by creating your first progress note'}
                </p>
                <Link
                  to="/add-progressnote"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Add Progress Note
                </Link>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid md:grid-cols-2 gap-4">
                {notes.map(note => (
                  <ProgressNoteCard
                    key={note.id}
                    note={note}
                    onView={handleViewNote}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client & Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shift Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {notes.map(note => (
                        <tr key={note.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {note.client_name || 'No client'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(note.event_date)}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {note.subject?.substring(0, 50) || 'No subject'}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {formatDate(note.shift_date)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatTime(note.shift_start_time)} - {formatTime(note.shift_end_time)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {note.shift_type_name || 'General'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(note.status || 'draft')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewNote(note)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="View"
                              >
                                <Eye size={16} className="text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleEditNote(note)}
                                className="p-1 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit size={16} className="text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note)}
                                className="p-1 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedNote && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Delete Progress Note</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the progress note for{' '}
                <span className="font-semibold">
                  {selectedNote.client_name || 'this client'}
                </span>{' '}
                dated {formatDate(selectedNote.event_date)}?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. All attachments and associated data will be permanently removed.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedNote(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}