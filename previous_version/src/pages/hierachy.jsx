import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Edit, 
  Trash2, 
  Eye,
  FolderTree,
  FolderOpen,
  Folder,
  X,
  AlertCircle,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  MoreVertical
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

function HierarchyPage() {
  const [hierarchies, setHierarchies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedHierarchy, setSelectedHierarchy] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'sort_order', direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'active', 'inactive'
    hasParent: 'all' // 'all', 'with_parent', 'without_parent'
  });

  // Fetch hierarchies from database
  useEffect(() => {
    fetchHierarchies();
  }, []);

  const fetchHierarchies = async () => {
    try {
      setLoading(true);
      
      // First, fetch all hierarchies
      const { data, error } = await supabase
        .from("hierarchy")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Now fetch parent names for each hierarchy
      const hierarchiesWithParents = await Promise.all(
        (data || []).map(async (hierarchy) => {
          let parentName = null;
          if (hierarchy.parent_id) {
            const { data: parentData, error: parentError } = await supabase
              .from("hierarchy")
              .select("name")
              .eq("id", hierarchy.parent_id)
              .single();
              
            if (!parentError && parentData) {
              parentName = parentData.name;
            }
          }
          
          return {
            ...hierarchy,
            parent_name: parentName
          };
        })
      );
      
      // Count children for each hierarchy
      const hierarchiesWithChildrenCount = hierarchiesWithParents.map(hierarchy => {
        const childrenCount = hierarchiesWithParents.filter(h => h.parent_id === hierarchy.id).length;
        return {
          ...hierarchy,
          children_count: childrenCount
        };
      });
      
      setHierarchies(hierarchiesWithChildrenCount);
    } catch (error) {
      console.error("Error fetching hierarchies:", error);
      toast.error("Failed to load hierarchies data");
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical structure
  const buildHierarchy = (items) => {
    const itemMap = {};
    const roots = [];

    // Create a map of all items
    items.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    // Build the tree
    items.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(itemMap[item.id]);
      } else {
        roots.push(itemMap[item.id]);
      }
    });

    return roots;
  };

  // Filter and sort hierarchies
  const filteredAndSortedHierarchies = React.useMemo(() => {
    let result = [...hierarchies];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name?.toLowerCase().includes(term) ||
        item.code?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(item => 
        filters.status === 'active' ? item.is_active : !item.is_active
      );
    }

    if (filters.hasParent !== 'all') {
      result = result.filter(item => 
        filters.hasParent === 'with_parent' ? item.parent_id : !item.parent_id
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

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
  }, [hierarchies, searchTerm, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteHierarchy = async () => {
    if (!selectedHierarchy) return;

    try {
      // Check if hierarchy has children
      const children = hierarchies.filter(h => h.parent_id === selectedHierarchy.id);
      if (children.length > 0) {
        toast.error("Cannot delete hierarchy with child items. Please delete children first.");
        return;
      }

      const { error } = await supabase
        .from("hierarchy")
        .delete()
        .eq("id", selectedHierarchy.id);

      if (error) throw error;

      toast.success("Hierarchy deleted successfully");
      setHierarchies(hierarchies.filter(h => h.id !== selectedHierarchy.id));
      setShowDeleteModal(false);
      setSelectedHierarchy(null);
    } catch (error) {
      console.error("Error deleting hierarchy:", error);
      toast.error("Failed to delete hierarchy");
    }
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      hasParent: 'all'
    });
    setSearchTerm("");
  };

  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  const getParentName = (hierarchy) => {
    if (!hierarchy.parent_id) return "None (Root)";
    return hierarchy.parent_name || "Loading...";
  };

  // Recursive function to render hierarchy tree
  const renderHierarchyTree = (items, level = 0) => {
    // First, sort items by sort_order
    const sortedItems = [...items].sort((a, b) => {
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return sortedItems.map(item => {
      const hasChildren = item.children_count > 0;
      const isExpanded = expandedRows.has(item.id);
      const children = hierarchies.filter(h => h.parent_id === item.id);

      return (
        <React.Fragment key={item.id}>
          <tr className={`border-b border-gray-200 hover:bg-gray-50 ${level > 0 ? 'bg-gray-50' : ''}`}>
            <td className="px-6 py-4">
              <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleRowExpansion(item.id)}
                    className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-600" />
                    ) : (
                      <ChevronUp size={16} className="text-gray-600" />
                    )}
                  </button>
                ) : (
                  <div className="w-6 mr-2"></div>
                )}
                <div className="flex items-center">
                  {hasChildren ? (
                    <FolderOpen size={18} className="text-blue-500 mr-2" />
                  ) : (
                    <Folder size={18} className="text-gray-400 mr-2" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.code && (
                      <div className="text-sm text-gray-500">{item.code}</div>
                    )}
                  </div>
                </div>
              </div>
            </td>
            
            <td className="px-6 py-4">
              <div className="text-sm text-gray-900 max-w-xs truncate">
                {item.description || "No description"}
              </div>
            </td>

            <td className="px-6 py-4">
              <div className="text-sm text-gray-900">
                {getParentName(item)}
              </div>
            </td>

            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  item.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.is_active ? (
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
                {hasChildren && (
                  <span className="text-xs text-gray-500">
                    {item.children_count} child{item.children_count !== 1 ? 'ren' : ''}
                  </span>
                )}
              </div>
            </td>

            <td className="px-6 py-4">
              <div className="text-sm text-gray-900">{item.sort_order || 0}</div>
            </td>

            <td className="px-6 py-4">
              <div className="text-sm text-gray-900">{formatDate(item.created_at)}</div>
            </td>

            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedHierarchy(item);
                    setShowInfoModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <Link
                  to={`/edit-hierarchy/${item.id}`}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Edit Hierarchy"
                >
                  <Edit size={16} />
                </Link>
                <button
                  onClick={() => {
                    setSelectedHierarchy(item);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Hierarchy"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
          
          {/* Render children if expanded */}
          {hasChildren && isExpanded && renderHierarchyTree(children, level + 1)}
        </React.Fragment>
      );
    });
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
          <h2 className="text-2xl font-bold text-gray-700">Hierarchy Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredAndSortedHierarchies.length} item{filteredAndSortedHierarchies.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search hierarchies..."
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
            {(filters.status !== 'all' || filters.hasParent !== 'all') && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>

          {/* Add Hierarchy Button */}
          <Link
            to="/add-hierarchy"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Hierarchy
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      {filterOpen && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

            {/* Parent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Status</label>
              <select
                value={filters.hasParent}
                onChange={(e) => setFilters({ ...filters, hasParent: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Items</option>
                <option value="with_parent">With Parent</option>
                <option value="without_parent">Without Parent (Root)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSort('name')}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                    sortConfig.key === 'name' 
                      ? 'bg-blue-100 border-blue-300 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Name {sortConfig.key === 'name' && (
                    sortConfig.direction === 'asc' ? '↑' : '↓'
                  )}
                </button>
                <button
                  onClick={() => handleSort('sort_order')}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                    sortConfig.key === 'sort_order' 
                      ? 'bg-blue-100 border-blue-300 text-blue-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Order {sortConfig.key === 'sort_order' && (
                    sortConfig.direction === 'asc' ? '↑' : '↓'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {filters.status !== 'all' || filters.hasParent !== 'all'
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

      {/* Hierarchies Table */}
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
                    Name & Code
                    {sortConfig.key === 'name' && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent
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
                  onClick={() => handleSort('sort_order')}
                >
                  <div className="flex items-center gap-1">
                    Sort Order
                    {sortConfig.key === 'sort_order' && (
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
              {filteredAndSortedHierarchies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FolderTree className="text-gray-300 w-12 h-12 mb-3" />
                      <p className="text-gray-500 text-lg">No hierarchies found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || Object.values(filters).some(f => f !== 'all') 
                          ? "Try adjusting your search or filters" 
                          : "Create your first hierarchy item to get started"}
                      </p>
                      {!searchTerm && !Object.values(filters).some(f => f !== 'all') && (
                        <Link
                          to="/add-hierarchy"
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={16} />
                          Add Hierarchy
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                renderHierarchyTree(buildHierarchy(filteredAndSortedHierarchies))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredAndSortedHierarchies.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing {filteredAndSortedHierarchies.length} of {hierarchies.length} items
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

      {/* Hierarchy Info Modal */}
      {selectedHierarchy && showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <FolderTree className="text-blue-500 w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedHierarchy.name}</h2>
                  <p className="text-gray-600">{selectedHierarchy.code || "No code"}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setSelectedHierarchy(null);
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
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {selectedHierarchy.name}</p>
                      <p><span className="font-medium">Code:</span> {selectedHierarchy.code || "Not set"}</p>
                      <p><span className="font-medium">Description:</span> {selectedHierarchy.description || "No description"}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Hierarchy Structure</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Parent:</span> {getParentName(selectedHierarchy)}</p>
                      <p><span className="font-medium">Children Count:</span> {selectedHierarchy.children_count || 0}</p>
                      <p><span className="font-medium">Sort Order:</span> {selectedHierarchy.sort_order || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Status Information</h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          selectedHierarchy.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedHierarchy.is_active ? "Active" : "Inactive"}
                        </span>
                      </p>
                      <p><span className="font-medium">Created:</span> {formatDate(selectedHierarchy.created_at)}</p>
                      <p><span className="font-medium">Updated:</span> {formatDate(selectedHierarchy.updated_at)}</p>
                    </div>
                  </div>

                  {selectedHierarchy.children_count > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Child Items</h3>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {hierarchies
                          .filter(h => h.parent_id === selectedHierarchy.id)
                          .map(child => (
                            <div key={child.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                              <Folder size={14} className="text-gray-400" />
                              <span className="text-sm">{child.name}</span>
                              {child.code && (
                                <span className="text-xs text-gray-500 ml-auto">{child.code}</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Link
                to={`/edit-hierarchy/${selectedHierarchy.id}`}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Hierarchy
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
      {showDeleteModal && selectedHierarchy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Hierarchy</h2>
                  <p className="text-gray-600 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <FolderTree className="text-gray-400 w-12 h-12" />
                <div>
                  <p className="font-semibold text-gray-700">{selectedHierarchy.name}</p>
                  <p className="text-gray-500 text-sm">{selectedHierarchy.code || "No code"}</p>
                </div>
              </div>

              {selectedHierarchy.children_count > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                    <div>
                      <p className="text-yellow-800 font-medium mb-1">Cannot Delete</p>
                      <p className="text-yellow-700 text-sm">
                        This hierarchy has {selectedHierarchy.children_count} child item{selectedHierarchy.children_count !== 1 ? 's' : ''}. 
                        Please delete all child items first.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 text-sm">
                    Are you sure you want to delete this hierarchy item? This action cannot be undone.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedHierarchy(null);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              {selectedHierarchy.children_count === 0 && (
                <button
                  onClick={handleDeleteHierarchy}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Hierarchy
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HierarchyPage;