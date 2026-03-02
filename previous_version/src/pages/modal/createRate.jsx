import { useState } from "react";
import { X, DollarSign, Save } from "lucide-react";

export function CreateRateModal({ isOpen, onClose }) {
  const [dayType, setDayType] = useState("Weekday");
  const [customDay, setCustomDay] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-2">
              <DollarSign className="text-blue-600 w-5 h-5" />
            </div>
            Create Payment Rate
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Rate Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Name
            </label>
            <input
              type="text"
              placeholder="e.g. Weekday - Level 1"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate
            </label>
            <input
              type="number"
              placeholder="33"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Day Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day Type
            </label>
            <select
              value={dayType}
              onChange={(e) => setDayType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option>Weekday</option>
              <option>Saturday</option>
              <option>Sunday</option>
              <option>Public Holiday</option>
              <option>Custom</option>
            </select>
          </div>

          {/* Custom Day Picker (only if Custom selected) */}
          {dayType === "Custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Custom Date
              </label>
              <input
                type="date"
                value={customDay}
                onChange={(e) => setCustomDay(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700">
            <div className="p-1 bg-green-100 rounded">
              <Save className="w-4 h-4 text-green-700" />
            </div>
            Save Rate
          </button>
        </div>
      </div>
    </div>
  );
}
