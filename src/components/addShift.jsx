import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

// Shift Modal Component
function ShiftModal({ visible, shift, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    role: '',
    site: '',
    start: '',
    end: '',
    breakMinutes: 0,
    employeeId: '',
    date: '',
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        role: shift.role || 'Security',
        site: shift.site || 'Office',
        start: shift.start || '09:00',
        end: shift.end || '17:00',
        breakMinutes: shift.breakMinutes || 0,
        employeeId: shift.employeeId || '',
        date: shift.date || TODAY_ISO(),
      });
    }
  }, [shift]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center sm:p-4 p-0 z-50">
      <div className="bg-white sm:rounded-xl rounded-none shadow-2xl w-full sm:max-w-md h-dvh sm:h-auto flex flex-col">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            {shift?.id ? 'Edit Shift' : 'Add Shift'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Security">Security</option>
              <option value="Manager">Manager</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site
            </label>
            <input
              type="text"
              value={formData.site}
              onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Office"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.end}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break (minutes)
            </label>
            <input
              type="number"
              value={formData.breakMinutes}
              onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="120"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {shift?.id && (
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {shift?.id ? 'Update' : 'Add'} Shift
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
export default ShiftModal;