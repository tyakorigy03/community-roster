import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Save, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

function AddHierarchy() {
  const navigate = useNavigate();
  const [hierarchyData, setHierarchyData] = useState({
    name: "",
    code: "",
    description: "",
    parent_id: "",
    is_active: true,
    sort_order: 0
  });
  
  const [hierarchies, setHierarchies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing hierarchies for parent selection
  useEffect(() => {
    fetchHierarchies();
  }, []);

const fetchHierarchies = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from("hierarchy")
      .select("id, name, code, parent_id, is_active")
      .eq("tenant_id", currentStaff.tenant_id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    setHierarchies(data || []);
  } catch (error) {
    console.error("Error fetching hierarchies:", error);
    toast.error("Failed to load hierarchies");
  } finally {
    setLoading(false);
  }
}

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHierarchyData(prev => ({ 
      ...prev, 
      [name]: name === 'sort_order' ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("hierarchy")
        .insert([{
          name: hierarchyData.name,
          code: hierarchyData.code,
          description: hierarchyData.description,
          parent_id: hierarchyData.parent_id || null,
          is_active: hierarchyData.is_active,
          sort_order: hierarchyData.sort_order || 0,
          tenant_id: currentStaff.tenant_id
        }]);

      if (error) throw error;

      toast.success("Hierarchy added successfully!");
      navigate("/hierarchy");
    } catch (err) {
      console.error(err);
      toast.error("Error adding hierarchy. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build hierarchical options
  const buildHierarchyOptions = (items, level = 0) => {
    return items
      .filter(item => !item.parent_id) // Start with root items
      .map(item => {
        const children = items.filter(child => child.parent_id === item.id);
        return (
          <React.Fragment key={item.id}>
            <option value={item.id}>
              {"— ".repeat(level)} {item.name} {item.code ? `(${item.code})` : ''}
            </option>
            {buildHierarchyOptions(children, level + 1)}
          </React.Fragment>
        );
      });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-100 md:p-4 pt-safe pb-safe">
      <div className="w-full max-w-4xl md:rounded-xl md:shadow border border-gray-300 bg-white p-8">
        <div className="header flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 py-1 border-b mb-6 border-gray-400 gap-4">
          <Link to={'/hierarchy'} className="flex items-center hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} className="mr-1" /> Back 
          </Link>
          <h2 className="text-2xl font-semibold text-slate-800 text-center">
            Add New Hierarchy
          </h2>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter hierarchy name"
                  value={hierarchyData.name}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Code</label>
                <input
                  type="text"
                  name="code"
                  placeholder="e.g., DEPT-001"
                  value={hierarchyData.code}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  name="description"
                  placeholder="Enter hierarchy description..."
                  value={hierarchyData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Hierarchy Structure */}
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Hierarchy Structure</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Parent Hierarchy</label>
                <select
                  name="parent_id"
                  value={hierarchyData.parent_id}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  disabled={isSubmitting || loading}
                >
                  <option value="">None (Root Level)</option>
                  {loading ? (
                    <option disabled>Loading hierarchies...</option>
                  ) : (
                    buildHierarchyOptions(hierarchies)
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown size={16} />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Select a parent if this is a child item
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-600 mb-1">Sort Order</label>
                <input
                  type="number"
                  name="sort_order"
                  placeholder="0"
                  value={hierarchyData.sort_order}
                  onChange={handleInputChange}
                  className="p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-700">Status</h3>
                <p className="text-sm text-slate-500 mt-1">Set the initial status for this hierarchy</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{hierarchyData.is_active ? 'Active' : 'Inactive'}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={hierarchyData.is_active}
                    onChange={(e) => setHierarchyData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="sr-only peer"
                    disabled={isSubmitting}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link
              to="/hierarchy"
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Cancel
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <p className="text-xs text-slate-500 text-center sm:text-right">
                Fields marked with * are required
              </p>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={20} /> Add Hierarchy
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddHierarchy;