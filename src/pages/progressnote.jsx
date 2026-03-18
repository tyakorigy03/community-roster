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
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  ShieldCheck,
  ChevronRight as ChevronRightIcon,
  Paperclip
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { useUser } from '../context/UserContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportFile } from '../utils/exportHelpers';

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

const getStatusBadge = (note) => {
  if (note.is_draft) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-800">
        <FileText size={12} />
        Draft
      </span>
    );
  }

  if (note.is_submitted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
        <Clock size={12} />
        Submitted
      </span>
    );
  }

  // Default to approved if submitted and not draft (assuming workflow moves to approved)
  // or add an explicit approved check if the schema has it. 
  // For now, if it's not draft and not submitted, it might be in review or approved.
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-800">
      <CheckCircle size={12} />
      Published
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
    <div className="group bg-white rounded-[2rem] border border-slate-100 p-6 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-500"></div>

      <div className="relative flex justify-between items-start mb-6">
        <div className="min-w-0 pr-4">
          <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-tight line-clamp-1 mb-2">
            {note.subject || `Progress Note - ${formatDate(note.event_date)}`}
          </h3>
          <div className="flex items-center gap-1.5">
            {getStatusBadge(note)}
          </div>
        </div>

        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
          >
            <MoreVertical size={16} />
          </button>

          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => { onView(note); setShowActions(false); }}
                className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
              >
                <Eye size={14} /> View Details
              </button>
              <button
                onClick={() => { onEdit(note); setShowActions(false); }}
                className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors"
              >
                <Edit size={14} /> Edit Record
              </button>
              <div className="h-[1px] bg-slate-50 my-1 mx-2"></div>
              <button
                onClick={() => { onDelete(note); setShowActions(false); }}
                className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative space-y-3 mb-6">
        <div className="flex items-center text-[10px] font-black text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
          <User size={14} className="mr-3 text-blue-500" />
          <span className="uppercase tracking-widest truncate">{note.client_name || 'No client'}</span>
        </div>
        <div className="flex items-center text-[10px] font-black text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
          <Calendar size={14} className="mr-3 text-blue-500" />
          <span className="uppercase tracking-widest">{formatDate(note.event_date)}</span>
          <span className="ml-auto flex items-center gap-2 opacity-60">
            <Clock size={12} />
            {formatTime(note.shift_start_time)} - {formatTime(note.shift_end_time)}
          </span>
        </div>
      </div>

      <div className="relative min-h-[44px] mb-6">
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2 italic px-1">
          "{note.shift_notes || 'No detailed observations provided for this entry.'}"
        </p>
      </div>

      <div className="relative flex items-center justify-between pt-5 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-black text-white uppercase shadow-lg shadow-blue-900/20">
            {note.staff_name?.charAt(0) || 'S'}
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {note.staff_name || 'Unknown Staff'}
          </div>
        </div>
        {note.attachment_count > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg text-blue-600 border border-slate-100">
            <Paperclip size={12} />
            <span className="text-[10px] font-black">{note.attachment_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Filter Sidebar Component
function FilterSidebar({ filters, onFilterChange, clients, hierarchies, statusOptions }) {
  const [isOpen, setIsOpen] = useState(window.innerWidth > 768);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 h-fit shadow-sm shadow-slate-200/50 sticky top-24">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Filter size={14} className="text-blue-500" /> Control Center
        </h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors border border-transparent hover:border-slate-100"
        >
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              Search Vault
            </label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input
                type="text"
                placeholder="Keywords..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="h-[1px] bg-slate-50"></div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              Validation Status
            </label>
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 appearance-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              >
                <option value="all">ALL ENTRIES</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              Client Association
            </label>
            <div className="relative">
              <select
                value={filters.client_id}
                onChange={(e) => onFilterChange('client_id', e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 appearance-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              >
                <option value="all">ALL CLIENTS</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.first_name.toUpperCase()} {client.last_name.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>
          </div>

          <div className="h-[1px] bg-slate-50"></div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              Temporal Range
            </label>
            <div className="grid grid-cols-1 gap-2">
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => onFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none uppercase"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => onFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none uppercase"
              />
            </div>
          </div>

          <button
            onClick={() => onFilterChange('reset', '')}
            className="w-full py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all border border-slate-100"
          >
            Reset Environment
          </button>
        </div>
      )}
    </div>
  );
}

// Main Progress Notes Component
export default function ProgressNotesList() {
  const { currentStaff } = useUser();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'grid' : 'table'); // 'grid' or 'table'
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

  useEffect(() => {
    if (currentStaff?.tenant_id) {
      fetchInitialData();
    }
  }, [currentStaff]);

  useEffect(() => {
    fetchNotes();
  }, [filters, currentPage, itemsPerPage]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('first_name', { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      const { data: hierarchiesData, error: hierarchiesError } = await supabase
        .from('hierarchy')
        .select('id, name, code')
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('name', { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(hierarchiesData || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load system data');
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
        `, { count: 'exact' })
        .eq('tenant_id', currentStaff.tenant_id);

      if (filters.search) {
        query = query.or(`subject.ilike.%${filters.search}%,shift_notes.ilike.%${filters.search}%`);
      }
      if (filters.status !== 'all') {
        if (filters.status === 'draft') query = query.eq('is_draft', true);
        else if (filters.status === 'submitted') query = query.eq('is_submitted', true).eq('is_draft', false);
        else if (filters.status === 'approved') query = query.eq('is_submitted', false).eq('is_draft', false);
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

      const { count } = await query;
      setTotalItems(count || 0);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: notesData, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

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
      toast.error('Data synchronization failed');
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

  const handleViewNote = (note) => navigate(`/progress-notes/${note.id}`);
  const handleEditNote = (note) => navigate(`/edit-progressnote/${note.id}`);
  const handleDeleteNote = (note) => {
    setSelectedNote(note);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedNote) return;
    try {
      setDeleteLoading(true);
      await supabase.from('progress_note_attachments').delete().eq('progress_note_id', selectedNote.id);
      const { error } = await supabase.from('progress_notes').delete().eq('id', selectedNote.id);
      if (error) throw error;
      if (selectedNote.shift_id) {
        await supabase.from('shifts').update({ progress_note_id: null }).eq('id', selectedNote.shift_id);
      }
      toast.success('Record purged successfully');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Operation failed');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setSelectedNote(null);
    }
  };

  const exportToPDF = async () => {
    try {
      toast.info('Synthesizing PDF Report...');
      const { data: notesData, error } = await supabase
        .from('progress_notes')
        .select(`*, client:client_id(first_name, last_name), staff:created_by(name), hierarchy:hierarchy_id(name)`)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const doc = new jsPDF();

      // Header Section
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PROGRESS NOTES REPORT', 15, 18);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 12);
      doc.text(`Total Records: ${notesData.length}`, 145, 17);
      doc.text(`Blessing Community Roster App`, 145, 22);

      const columns = ["Date", "Client", "Staff", "Subject", "Status"];
      const rows = notesData.map(n => [
        formatDate(n.event_date),
        n.client ? `${n.client.first_name} ${n.client.last_name}` : 'N/A',
        n.staff?.name || 'N/A',
        n.subject || 'N/A',
        n.is_draft ? 'DRAFT' : (n.is_submitted ? 'SUBMITTED' : 'PUBLISHED')
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        didDrawPage: (data) => {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.setFont('helvetica', 'bold');
          doc.text(
            'DONE BY BLESSING COMMUNITY ROSTER APP',
            data.settings.margin.left,
            pageHeight - 10
          );
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Page ${data.pageNumber}`,
            pageSize.width - data.settings.margin.right - 15,
            pageHeight - 10
          );
        }
      });

      const pdfBlob = doc.output("blob");
      await exportFile(pdfBlob, `Progress_Notes_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to generate report');
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (loading && notes.length === 0) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-xl"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Environment...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* Professional Compact Header */}
      <div className="flex flex-row justify-between items-center gap-3 p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">

        {/* LEFT */}
        <div className="min-w-0">
          <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
            Progress Notes
          </h2>

          <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
            Operational → Journal
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">

          <button
            onClick={exportToPDF}
            className="h-10 px-4 flex items-center gap-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
          >
            <Download size={14} /> Export PDF
          </button>

          <Link
            to="/add-progressnote"
            className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Entry</span>
          </Link>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Modern High-Density Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Vault', value: totalItems, sub: 'Notes', icon: FileText, color: 'text-blue-600', hover: 'group-hover:bg-blue-600' },
            { label: 'In Pipeline', value: notes.filter(n => n.is_submitted && !n.is_draft).length, sub: 'Pending', icon: Clock, color: 'text-amber-500', hover: 'group-hover:bg-amber-500' },
            { label: 'Verified', value: notes.filter(n => !n.is_submitted && !n.is_draft).length, sub: 'Logs', icon: CheckCircle, color: 'text-emerald-500', hover: 'group-hover:bg-emerald-500' },
            { label: 'Drafts', value: notes.filter(n => n.is_draft).length, sub: 'Saved', icon: FileText, color: 'text-slate-400', hover: 'group-hover:bg-slate-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 rounded-3xl p-5 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className={`p-3 bg-white rounded-2xl shadow-sm transition-all ${stat.color} ${stat.hover} group-hover:text-white`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.sub}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <FilterSidebar filters={filters} onFilterChange={handleFilterChange} clients={clients} hierarchies={hierarchies} statusOptions={statusOptions} />
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-1">
                <button onClick={() => setViewMode('table')} className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <ListIcon size={14} /> Table
                </button>
                <button onClick={() => setViewMode('grid')} className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <LayoutGrid size={14} /> Grid
                </button>
              </div>
              <div className="flex items-center gap-4 pr-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalItems} <span className="opacity-50">Stored Records</span></div>
                <div className="h-4 w-[1px] bg-slate-200"></div>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent text-[10px] font-black text-slate-500 uppercase tracking-widest focus:outline-none cursor-pointer">
                  {[10, 25, 50].map(v => <option key={v} value={v}>{v} / PAGE</option>)}
                </select>
              </div>
            </div>

            {notes.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-16 text-center">
                <div className="h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 text-slate-300"><FileText size={32} /></div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">No Records Found</h3>
                <p className="text-[11px] font-medium text-slate-500 mb-8 max-w-xs mx-auto">Try adjusting your filters to find existing entries.</p>
                <button onClick={() => handleFilterChange('reset', '')} className="h-10 px-6 bg-white text-slate-900 hover:bg-slate-900 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 shadow-sm">Reset View</button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid md:grid-cols-2 gap-4">
                {notes.map(note => <ProgressNoteCard key={note.id} note={note} onView={handleViewNote} onEdit={handleEditNote} onDelete={handleDeleteNote} />)}
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Profile</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Context</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {notes.map(note => (
                      <tr key={note.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black uppercase">{note.client_name?.substring(0, 2) || '??'}</div>
                            <div>
                              <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{note.client_name}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(note.event_date)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-tight line-clamp-1">{note.subject || 'General'}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatTime(note.shift_start_time)} - {formatTime(note.shift_end_time)}</div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(note)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleViewNote(note)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye size={16} /></button>
                            <button onClick={() => handleEditNote(note)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Edit size={16} /></button>
                            <button onClick={() => handleDeleteNote(note)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-slate-50 p-3 rounded-[1.5rem] border border-slate-100 shadow-sm">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-10 w-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft size={16} /></button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`h-10 min-w-[2.5rem] px-2 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-100'}`}>{pageNum}</button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-10 w-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all shadow-sm"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && selectedNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6"><Trash2 size={32} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Purge Note Record?</h3>
              <p className="text-[11px] font-medium text-slate-500 mb-8 leading-relaxed">Permanently remove the progress note for <span className="font-black text-slate-900 uppercase">{selectedNote.client_name}</span>. This action is terminal.</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setSelectedNote(null); }} className="flex-1 h-12 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all" disabled={deleteLoading}>Cancel</button>
                <button onClick={confirmDelete} className="flex-1 h-12 bg-red-500 text-white hover:bg-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20" disabled={deleteLoading}>{deleteLoading ? 'Purging...' : 'Confirm Purge'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}