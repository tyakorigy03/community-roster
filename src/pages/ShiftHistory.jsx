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
import { useUser } from '../context/UserContext';
import ShiftDetailsModal from '../components/ShiftDetailsModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportFile } from '../utils/exportHelpers';

const ShiftHistory = () => {
    const { currentStaff } = useUser();
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
        if (currentStaff?.tenant_id) {
            fetchFiltersData();
        }
        const handleResize = () => {
            if (window.innerWidth < 1024) setShowFilters(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (currentStaff?.tenant_id) {
            fetchShifts();
        }
    }, [currentPage, filters, currentStaff]);

    const fetchFiltersData = async () => {
        try {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, first_name, last_name, city, state')
                .eq('tenant_id', currentStaff.tenant_id)
                .order('first_name');
            const { data: staffData } = await supabase
                .from('staff')
                .select('id, name')
                .eq('tenant_id', currentStaff.tenant_id)
                .order('name');
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
                .eq('tenant_id', currentStaff.tenant_id)
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
            toast.error('Failed to sync history');
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

    const generatePDF = async () => {
        const doc = new jsPDF();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('SHIFT HISTORY REPORT', 15, 20);
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

        const pdfBlob = doc.output("blob");
        await exportFile(pdfBlob, `Shift_History_${new Date().getTime()}.pdf`);
        toast.success('Report Generated');
    };

    const handleFilterChange = (k, v) => {
        setFilters(p => ({ ...p, [k]: v }));
        setCurrentPage(1);
    };

    const CompactBadge = ({ status, approved }) => {
        const base = "px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest";
        if (approved) return <span className={`${base} bg-emerald-50 text-emerald-600 border-emerald-100`}>Approved</span>;
        if (status === 'completed') return <span className={`${base} bg-blue-50 text-blue-600 border-blue-100`}>Completed</span>;
        return <span className={`${base} bg-slate-50 text-slate-400 border-slate-100`}>{status}</span>;
    };

    return (
        <div className="min-h-dvh bg-slate-50/50">
            {/* Header Strategy */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b-2 border-slate-100 p-4 lg:px-8 lg:py-4 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h1 className="text-base lg:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Shift History</h1>
                        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Shift Records → Past Shifts</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                    >
                        <Filter size={14} /> <span className="hidden md:inline">Filters</span>
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
                {/* Advanced Filters */}
                {showFilters && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 mb-8 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Notes</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Keywords..."
                                        className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client</label>
                                <select
                                    className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold outline-none cursor-pointer"
                                    value={filters.clientId}
                                    onChange={(e) => handleFilterChange('clientId', e.target.value)}
                                >
                                    <option value="all">All Clients</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff</label>
                                <select
                                    className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold outline-none cursor-pointer"
                                    value={filters.staffId}
                                    onChange={(e) => handleFilterChange('staffId', e.target.value)}
                                >
                                    <option value="all">All Staff</option>
                                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="lg:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Range</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[10px] font-bold outline-none" />
                                    <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[10px] font-bold outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center flex-grow py-20">
                            <RefreshCw className="text-blue-500 animate-spin mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
                        </div>
                    ) : shifts.length > 0 ? (
                        <div className="flex flex-col flex-grow">
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                            <th className="text-center p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {shifts.map((s) => (
                                            <tr key={s.id} className="hover:bg-blue-50/30 even:bg-slate-50/50 transition-all cursor-pointer group" onClick={() => { setSelectedShift(s); setShowModal(true); }}>
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

                            {/* Mobile Simple Table View */}
                            <div className="lg:hidden overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                                            <th className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="p-3 w-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {shifts.map((s) => (
                                            <tr 
                                                key={s.id} 
                                                className="even:bg-slate-50/50 active:bg-slate-100 transition-colors cursor-pointer" 
                                                onClick={() => { setSelectedShift(s); setShowModal(true); }}
                                            >
                                                <td className="p-3 whitespace-nowrap">
                                                    <div className="text-[10px] font-black text-slate-900">{s.shift_date.split('-').slice(1).join('/')}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase">{s.start_time}</div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[100px]">{s.client_name}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase truncate">{s.staff_name.split(' ')[0]}</div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <CompactBadge status={s.execution_status} approved={s.approved} />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <ChevronRight size={12} className="text-slate-300" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="mt-auto p-4 lg:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-row items-center justify-between">
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
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center flex-grow py-20 p-8 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                <Search className="text-slate-300" size={32} />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">No Records Found</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-[200px]">We couldn't find any historical data for these parameters.</p>
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
                            .update({ 
                                approved: true, 
                                status: 'approved',
                                updated_at: new Date().toISOString() 
                            })
                            .eq('shift_id', id)
                            .eq('tenant_id', currentStaff.tenant_id);
                            
                        if (error) throw error;
                        toast.success('Shift Approved');
                        fetchShifts();
                    } catch (err) {
                        console.error('Approval fail:', err);
                        toast.error('Failed to approve shift');
                    }
                }}
            />
        </div>
    );
};

export default ShiftHistory;
