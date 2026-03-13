import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Trash2, ChevronDown } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

function EditHierarchy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentStaff } = useUser();
  
  const [hierarchyData, setHierarchyData] = useState({
    name: "",
    code: "",
    description: "",
    parent_id: "",
    is_active: true,
    sort_order: 0
  });
  
  const [hierarchies, setHierarchies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // Fetch hierarchy data and available hierarchies
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current hierarchy data
      const { data: hierarchy, error: hierarchyError } = await supabase
        .from("hierarchy")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", currentStaff.tenant_id)
        .single();

      if (hierarchyError) throw hierarchyError;

      if (!hierarchy) {
        toast.error("Hierarchy not found");
        navigate("/hierarchy");
        return;
      }

      setHierarchyData({
        name: hierarchy.name || "",
        code: hierarchy.code || "",
        description: hierarchy.description || "",
        parent_id: hierarchy.parent_id || "",
        is_active: hierarchy.is_active !== undefined ? hierarchy.is_active : true,
        sort_order: hierarchy.sort_order || 0
      });

      setOriginalData(hierarchy);

      // Fetch all hierarchies (excluding current one for parent selection)
      const { data: allHierarchies, error: hierarchiesError } = await supabase
        .from("hierarchy")
        .select("id, name, code, parent_id")
        .neq("id", id) // Exclude current hierarchy from parent options
        .eq("tenant_id", currentStaff.tenant_id)
        .order("name", { ascending: true });

      if (hierarchiesError) throw hierarchiesError;
      setHierarchies(allHierarchies || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load hierarchy data");
      navigate("/hierarchy");
    } finally {
      setLoading(false);
    }
  };

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
      // Check for circular reference
      if (hierarchyData.parent_id === id) {
        toast.error("Cannot set parent to itself");
        return;
      }

      const { error } = await supabase
        .from("hierarchy")
        .update({
          name: hierarchyData.name,
          code: hierarchyData.code,
          description: hierarchyData.description,
          parent_id: hierarchyData.parent_id || null,
          is_active: hierarchyData.is_active,
          sort_order: hierarchyData.sort_order || 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("tenant_id", currentStaff.tenant_id);

      if (error) throw error;

      toast.success("Hierarchy updated successfully!");
      navigate("/hierarchy");
    } catch (err) {
      console.error(err);
      toast.error("Error updating hierarchy. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this hierarchy? This action cannot be undone.")) {
      try {
        // Check if hierarchy has children
        const { data: children, error: childrenError } = await supabase
          .from("hierarchy")
          .select("id")
          .eq("parent_id", id)
          .eq("tenant_id", currentStaff.tenant_id);

        if (childrenError) throw childrenError;

        if (children && children.length > 0) {
          toast.error("Cannot delete hierarchy with child items. Please delete children first.");
          return;
        }

        const { error } = await supabase
          .from("hierarchy")
          .delete()
          .eq("id", id)
          .eq("tenant_id", currentStaff.tenant_id);

        if (error) throw error;

        toast.success("Hierarchy deleted successfully!");
        navigate("/hierarchy");
      } catch (error) {
        console.error("Error deleting hierarchy:", error);
        toast.error("Failed to delete hierarchy");
      }
    }
  };

  // Build hierarchical options
  const buildHierarchyOptions = (items, level = 0) => {
    return items
      .filter(item => !item.parent_id || item.parent_id !== id) // Start with root items and exclude those that would create circular reference
      .map(item => {
        const children = items.filter(child => child.parent_id === item.id && child.id !== id);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 md:p-4">
      <div className="w-full max-w-4xl md:rounded-xl md:shadow border border-gray-300 bg-white p-8">
        <div className="header flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 py-1 border-b mb-6 border-gray-400 gap-4">
          <Link to={'/hierarchy'} className="flex items-center hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} className="mr-1" /> Back 
          </Link>
          <h2 className="text-2xl font-semibold text-slate-800 text-center">
            Edit Hierarchy: {hierarchyData.name}
          </h2>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
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
                  disabled={isSubmitting}
                >
                  <option value="">None (Root Level)</option>
                  {buildHierarchyOptions(hierarchies)}
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
                <p className="text-sm text-slate-500 mt-1">Set the status for this hierarchy</p>
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={20} /> Update Hierarchy
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

export default EditHierarchy;