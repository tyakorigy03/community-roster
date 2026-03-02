import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    User,
    Building,
    ArrowRight,
    RefreshCw,
    FileText,
    Camera,
    HardDrive
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import ShiftDetailsModal from '../components/ShiftDetailsModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ShiftHistory = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(15);
    const [selectedShift, setSelectedShift] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showFilters, setShowFilters] = useState(window.innerWidth > 1024);

    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: '',
        clientId: 'all',
        staffId: 'all'
    });

    const [clients, setClients] = useState([]);
    const [staffList, setStaffList] = useState([]);

    useEffect(() => {
        fetchFiltersData();
        const handleResize = () => {
            if (window.innerWidth < 1024) setShowFilters(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [currentPage, filters]);

    const fetchFiltersData = async () => {
        try {
            const { data: clientsData } = await supabase.from('clients').select('id, first_name, last_name, city, state').order('first_name');
            const { data: staffData } = await supabase.from('staff').select('id, name').order('name');
            setClients(clientsData || []);
            setStaffList(staffData || []);
        } catch (error) {
            console.error('Filter fetch fail:', error);
        }
    };

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];

            let query = supabase
                .from('shifts')
                .select(`
                    *,
                    client:client_id(first_name, last_name, city, state),
                    staff:staff_id(name, role),
                    shift_type:shift_type_id(name),
                    staff_shifts(
                        id,
                        clock_in_time,
                        clock_out_time,
                        status,
                        approved,
                        clock_in_photo_url,
                        clock_out_photo_url,
                        clock_in_location,
                        clock_out_location
                    )
                `, { count: 'exact' })
                .lte('shift_date', today)
                .order('shift_date', { ascending: false })
                .order('start_time', { ascending: false });

            if (filters.search) query = query.ilike('notes', `%${filters.search}%`);
            if (filters.startDate) query = query.gte('shift_date', filters.startDate);
            if (filters.endDate) query = query.lte('shift_date', filters.endDate);
            if (filters.clientId !== 'all') query = query.eq('client_id', filters.clientId);
            if (filters.staffId !== 'all') query = query.eq('staff_id', filters.staffId);

            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            const formatted = data.map(shift => {
                const ss = shift.staff_shifts?.[0] || {};
                return {
                    ...shift,
                    client_name: shift.client ? `${shift.client.first_name} ${shift.client.last_name}` : 'Unknown',
                    client_address: [shift.client?.city, shift.client?.state].filter(Boolean).join(', ') || 'Field Ops',
                    staff_name: shift.staff?.name || 'Unassigned',
                    execution_status: ss.status || 'pending',
                    approved: ss.approved || false,
                    clock_in: ss.clock_in_time,
                    clock_out: ss.clock_out_time,
                    clock_in_photo_url: ss.clock_in_photo_url,
                    clock_out_photo_url: ss.clock_out_photo_url,
                    clock_in_location: ss.clock_in_location,
                    clock_out_location: ss.clock_out_location,
                    duration: calculateDuration(ss.clock_in_time, ss.clock_out_time)
                };
            });

            setShifts(formatted);
            setTotalItems(count || 0);
        } catch (error) {
            console.error('Fetch err:', error);
            toast.error('Log Synchronization Failed');
        } finally {
            setLoading(false);
        }
    };

    const calculateDuration = (start, end) => {
        if (!start || !end) return 'N/A';
        const diff = new Date(end) - new Date(start);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('OPERATIONAL ARCHIVE REPORT', 15, 20);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 20);

        const columns = ["Date", "Client", "Staff", "Duration", "Status"];
        const rows = shifts.map(s => [
            s.shift_date,
            s.client_name,
            s.staff_name,
            s.duration,
            s.execution_status.toUpperCase()
        ]);

        autoTable(doc, {
            head: [columns],
            body: rows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 8 },
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    'Done by Blessing Community Roster App',
                    data.settings.margin.left,
                    pageHeight - 10
                );
            }
        });

        doc.save(`Archive_Export_${new Date().getTime()}.pdf`);
        toast.success('Forensic Report Generated');
    };

    const handleFilterChange = (k, v) => {
        setFilters(p => ({ ...p, [k]: v }));
        setCurrentPage(1);
    };

    const CompactBadge = ({ status, approved }) => {
        const base = "px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest";
        if (approved) return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100`}>[A] Approved</span>;
        if (status === 'completed') return <span className={`${base} bg-blue-50 text-blue-600 border-blue-100`}>[C] Completed</span>;
        return <span className={`${base} bg-slate-50 text-slate-400 border-slate-100`}>{status}</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header Strategy */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b-2 border-slate-100 p-4 lg:px-8 lg:py-4 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <h1 className="text-base lg:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Operational Archive</h1>
                        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Forensic Logs → Past Deployments</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                    >
                        <Filter size={14} /> <span className="hidden md:inline">Parameters</span>
                    </button>
                    <button
                        onClick={generatePDF}
                        className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                    >
                        <Download size={14} /> <span className="hidden md:inline">Export PDF</span>
                    </button>
                    <button
                        onClick={fetchShifts}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="max-w-[1700px] mx-auto p-4 lg:p-8">
                {/* Advanced Query Console */}
                {showFilters && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 mb-8 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Note Fragment</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search logs..."
                                        className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Pipeline</label>
                                <select
                                    className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold outline-none cursor-pointer"
                                    value={filters.clientId}
                                    onChange={(e) => handleFilterChange('clientId', e.target.value)}
                                >
                                    <option value="all">Global (All Clients)</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator Profile</label>
                                <select
                                    className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold outline-none cursor-pointer"
                                    value={filters.staffId}
                                    onChange={(e) => handleFilterChange('staffId', e.target.value)}
                                >
                                    <option value="all">Global (All Staff)</option>
                                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="lg:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temporal Range</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[10px] font-bold outline-none" />
                                    <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[10px] font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hybrid Intelligence UI */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[400px]">
                            <RefreshCw className="text-blue-500 animate-spin mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
                        </div>
                    ) : shifts.length > 0 ? (
                        <>
                            {/* Desktop Forensic Table */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Temporal Log</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject/Client</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Operator</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Verification</th>
                                            <th className="text-center p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sync Status</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {shifts.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-all cursor-pointer group" onClick={() => { setSelectedShift(s); setShowModal(true); }}>
                                                <td className="p-4">
                                                    <div className="font-black text-slate-900 text-[11px] leading-tight">{s.shift_date}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{s.start_time || '--:--'} - {s.end_time || '--:--'}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-black text-slate-800 text-[11px] leading-tight group-hover:text-blue-600 transition-colors uppercase">{s.client_name}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate max-w-[150px]">{s.client_address}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400 text-[9px] font-black">U</div>
                                                        <span className="text-[11px] font-black text-slate-700">{s.staff_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-600">
                                                        <Clock size={12} className="text-blue-500" /> {s.duration}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        {s.clock_in_photo_url && <Camera size={14} className="text-emerald-500" title="Photo Evidence" />}
                                                        {(s.clock_in_location || s.clock_out_location) && <MapPin size={14} className="text-blue-500" title="GPS Evidence" />}
                                                        {s.notes && <FileText size={14} className="text-slate-400" title="Field Notes" />}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <CompactBadge status={s.execution_status} approved={s.approved} />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <ArrowRight size={16} className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Tactical Grid */}
                            <div className="lg:hidden divide-y divide-slate-50">
                                {shifts.map((s) => (
                                    <div key={s.id} className="p-5 active:bg-slate-50 transition-colors" onClick={() => { setSelectedShift(s); setShowModal(true); }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{s.shift_date}</div>
                                                <h3 className="font-black text-slate-900 text-sm uppercase leading-tight">{s.client_name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CompactBadge status={s.execution_status} approved={s.approved} />
                                                <ChevronRight size={16} className="text-slate-300" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-600">
                                                <User size={12} className="text-indigo-500" /> {s.staff_name.split(' ')[0]}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600">
                                                <Clock size={12} /> {s.duration}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tactical Pagination */}
                            <div className="p-4 lg:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-row items-center justify-between">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Entries: <span className="text-slate-900">{totalItems}</span></p>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="px-4 text-[11px] font-black text-slate-900 uppercase">Page {currentPage}</div>
                                    <button
                                        disabled={currentPage * itemsPerPage >= totalItems}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="text-slate-200" size={32} />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Log Sector Empty</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-[200px]">No historical data found for current parameters.</p>
                        </div>
                    )}
                </div>
            </div>

            <ShiftDetailsModal
                visible={showModal}
                shift={selectedShift}
                onClose={() => {
                    setShowModal(false);
                    fetchShifts();
                }}
                readOnly={true}
                onApprove={async (id) => {
                    try {
                        const { error } = await supabase
                            .from('staff_shifts')
                            .update({ approved: true, updated_at: new Date().toISOString() })
                            .eq('shift_id', id);
                        if (error) throw error;
                        toast.success('Shift Tactical Approval Secured');
                        fetchShifts();
                    } catch (err) {
                        console.error('Approval fail:', err);
                        toast.error('Approval Authorization Failure');
                    }
                }}
            />
        </div>
    );
};

export default ShiftHistory;
