import { X, UserCheck, Save } from "lucide-react";

export function AssignRateToStaffModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Assign Rate to Staff
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Staff Member
            </label>
            <select className="w-full border rounded-md px-3 py-2 text-sm">
              <option>Select staff</option>
              <option>John Doe</option>
              <option>Jane Williams</option>
              <option>Eric Johnson</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Payment Rate
            </label>
            <select className="w-full border rounded-md px-3 py-2 text-sm">
              <option>Select rate</option>
              <option>Weekday – 33/hour</option>
              <option>Weekday – 35/hour</option>
              <option>Weekday – 32/hour</option>
              <option>Sunday – 62/hour</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Effective From
            </label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md"
          >
            Cancel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gray-800 rounded-md">
            <Save className="w-4 h-4" />
            Assign Rate
          </button>
        </div>
      </div>
    </div>
  );
}
