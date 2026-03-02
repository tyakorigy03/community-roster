import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Calendar,
  Filter,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  ShieldAlert,
  Clock,
  LayoutGrid,
  List as ListIcon,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function IncidentsList() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHierarchy, setFilterHierarchy] = useState("all");

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          client:clients(first_name, last_name),
          hierarchy:hierarchy(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch =
      (incident.subject?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (incident.client?.first_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (incident.client?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesHierarchy = filterHierarchy === "all" || incident.hierarchy?.name === filterHierarchy;

    return matchesSearch && matchesHierarchy;
  });

  const hierarchies = ["all", ...new Set(incidents.map(i => i.hierarchy?.name).filter(Boolean))];

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Compact Header */}
      <div className="flex flex-row justify-between items-center gap-3 p-4 lg:px-6 lg:py-3 border-b-2 border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 min-w-0">

  {/* LEFT */}
  <div className="min-w-0">
    <h2 className="text-sm lg:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
      Incident Register
    </h2>

    <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">
      Operational → Safety Logs · {filteredIncidents.length} Records
    </p>
  </div>

  {/* RIGHT */}
  <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">

    {/* View Toggle */}
    <div className="bg-slate-100/50 p-1 rounded-xl flex border border-slate-200/50">
      <button
        onClick={() => setViewMode("grid")}
        className={`p-1.5 rounded-lg transition-all ${
          viewMode === "grid"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <LayoutGrid size={14} />
      </button>

      <button
        onClick={() => setViewMode("list")}
        className={`p-1.5 rounded-lg transition-all ${
          viewMode === "list"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <ListIcon size={14} />
      </button>
    </div>

    <Link
      to="/add-incident"
      className="px-3 py-2 bg-blue-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
    >
      <Plus size={13} />
      <span className="hidden sm:inline">Log Incident</span>
    </Link>
  </div>
</div>


      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by subject or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select
                value={filterHierarchy}
                onChange={(e) => setFilterHierarchy(e.target.value)}
                className="h-12 pl-11 pr-10 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest appearance-none focus:bg-white focus:border-blue-500/50 transition-all outline-none"
              >
                {hierarchies.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Modern High-Density Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Incidents', value: incidents.length, sub: 'Logs', icon: ShieldAlert, color: 'text-rose-600', hover: 'group-hover:bg-rose-600' },
            { label: 'Latest Record', value: incidents.length > 0 ? formatDate(incidents[0].created_at) : 'N/A', sub: 'Date', icon: Clock, color: 'text-blue-600', hover: 'group-hover:bg-blue-600' },
            { label: 'Classifications', value: new Set(incidents.map(i => i.hierarchy?.name)).size, sub: 'Levels', icon: Filter, color: 'text-indigo-600', hover: 'group-hover:bg-indigo-600' },
            { label: 'Active Reports', value: filteredIncidents.length, sub: 'Entries', icon: AlertTriangle, color: 'text-amber-500', hover: 'group-hover:bg-amber-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 bg-white rounded-xl shadow-sm transition-all ${stat.color} ${stat.hover} group-hover:text-white`}><stat.icon size={18} /></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">{stat.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-black text-slate-900 tracking-tight ${typeof stat.value === 'string' ? "text-xs" : "text-lg"}`}>{stat.value}</span>
                    {typeof stat.value !== 'string' && <span className="text-[9px] font-bold text-slate-400 uppercase">{stat.sub}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIncidents.length === 0 ? (
                  <EmptyState />
                ) : (
                  filteredIncidents.map(incident => (
                    <IncidentCard key={incident.id} incident={incident} formatDate={formatDate} />
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm shadow-slate-200/50">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
                      <tr>
                        <th className="px-6 py-4 text-left">Client Association</th>
                        <th className="px-6 py-4 text-left">Subject / Description</th>
                        <th className="px-6 py-4 text-left">Occurrence</th>
                        <th className="px-6 py-4 text-left">Classification</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {filteredIncidents.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <EmptyState />
                          </td>
                        </tr>
                      ) : (
                        filteredIncidents.map(incident => (
                          <IncidentRow key={incident.id} incident={incident} formatDate={formatDate} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components
function IncidentCard({ incident, formatDate }) {
  return (
    <div className="group bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/50 rounded-full -mr-12 -mt-12 group-hover:bg-rose-100/50 transition-colors duration-500"></div>

      <div className="relative flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-slate-900/10">
            {incident.client?.first_name[0]}{incident.client?.last_name[0]}
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">
              {incident.client?.first_name} {incident.client?.last_name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registered Client</span>
            </div>
          </div>
        </div>
        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[8px] font-black uppercase tracking-wider">
          {incident.hierarchy?.name || "Unclassified"}
        </div>
      </div>

      <div className="relative mb-6">
        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2 line-clamp-1">{incident.subject || "NO SUBJECT"}</h4>
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded-xl border border-slate-100/50">
          <Calendar size={12} className="text-blue-500" />
          <span>{formatDate(incident.incident_date)}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-between pt-4 border-t border-slate-50">
        <Link
          to={'/incidents/' + incident.id}
          className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all"
        >
          View Analysis <ArrowRight size={14} />
        </Link>
        <div className="flex gap-1.5">
          <Link
            to={'/viewncident/' + incident.id}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
          >
            <Eye size={16} />
          </Link>
          <Link
            to={'/edit-incident/' + incident.id}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
          >
            <Edit size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function IncidentRow({ incident, formatDate }) {
  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black border border-blue-100 uppercase">
            {incident.client?.first_name[0]}{incident.client?.last_name[0]}
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
              {incident.client?.first_name} {incident.client?.last_name}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Registered Client</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-[11px] font-bold text-slate-600 line-clamp-1 max-w-xs">{incident.subject || "NO SUBJECT"}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-slate-700 uppercase">{formatDate(incident.incident_date)}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Occurrence Date</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
          <span className="text-[9px] font-black uppercase tracking-tight">{incident.hierarchy?.name || "UNCLASSIFIED"}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
          <Link to={'/viewncident/' + incident.id} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye size={16} /></Link>
          <Link to={'/edit-incident/' + incident.id} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit size={16} /></Link>
        </div>
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center max-w-sm mx-auto py-20 text-center w-full col-span-full">
      <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm transition-transform hover:scale-110 duration-500">
        <ShieldAlert className="text-slate-300" size={32} />
      </div>
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Clear Records</h3>
      <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6">No incident reports have been synchronized with the register yet.</p>
      <Link to="/add-incident" className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Log First Incident</Link>
    </div>
  );
}

export default IncidentsList;