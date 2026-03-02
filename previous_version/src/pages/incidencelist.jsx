import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, Filter, ChevronDown, Eye, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function IncidentsList() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b border-gray-300 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-700">Incident Logs</h2>
          <p className="text-sm text-gray-500 mt-1">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/add-incident"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Log New Incident
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hierarchy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="text-gray-300 w-12 h-12 mb-3" />
                        <p className="text-gray-500 text-lg">No incidents logged yet</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Log your first incident to get started
                        </p>
                        <Link
                          to="/add-incident"
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={16} />
                          Log Incident
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidents.map(incident => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {incident.client?.first_name} {incident.client?.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {incident.subject || "No subject"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(incident.incident_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {incident.hierarchy?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(incident.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link to={'/incidents/'+incident.id} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Eye size={16} />
                          </Link>
                          <Link to={'/edit-incident/'+incident.id} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                            <Edit size={16} />
                          </Link>
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
  );
}

export default IncidentsList;