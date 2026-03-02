import React, { useState } from "react";
import { X, Send, Mail } from "lucide-react";
import { toast } from "react-toastify";

const EDGE_FUNCTION_URL =
  "https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/create_user";

function SendInviteModal({ staff, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleSendInvite = async () => {
    try {
      setLoading(true);

      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staff_id: staff.id,
          email: staff.email,
          name: staff.name,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error || "Failed to send invite");
      }

      toast.success(`Invitation email sent to ${staff.name}`);
      onClose();
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Confirm Staff Invitation
            </h2>
            <p className="text-sm text-gray-600">
              Invite {staff.name} to the staff portal
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">
                Invitation will be sent via email
              </p>
              <p className="text-sm text-gray-600">
                {staff.email || "No email provided"}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-medium mb-1">Important</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                An account will be created for this staff member.
              </li>
              <li>
                Their password will be <strong>reset</strong>.
              </li>
              <li>
                They will receive an email with instructions to set a new
                password and access the portal.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            disabled={loading || !staff.email}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
          >
            <Send size={16} />
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SendInviteModal;
