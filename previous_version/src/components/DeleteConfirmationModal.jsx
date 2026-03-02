import React from "react";
import { X, AlertTriangle } from "lucide-react";

function DeleteConfirmationModal({ staff, onClose, onConfirm }) {
  if (!staff) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Delete Staff</h2>
              <p className="text-gray-600 text-sm">Confirm staff deletion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {staff.profile_picture ? (
              <img
                src={staff.profile_picture}
                alt={staff.name}
                className="rounded-full h-12 w-12 object-cover"
              />
            ) : (
              <div className="rounded-full h-12 w-12 flex items-center justify-center bg-gray-200 text-gray-600 font-bold">
                {staff.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-700">{staff.name}</p>
              <p className="text-gray-500 text-sm">{staff.email || "No email"}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">
              <span className="font-semibold">Warning:</span> This action cannot be undone. 
              All staff data, including documents and records, will be permanently deleted.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">Are you sure you want to delete:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
              <li>Staff profile information</li>
              <li>All uploaded documents</li>
              <li>Attendance records</li>
              <li>Any associated data</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Staff
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;