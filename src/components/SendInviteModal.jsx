import React, { useState } from "react";
import { useUser } from "../context/UserContext";
import { X, Send, Mail, ShieldCheck, AlertCircle, ChevronRight, Fingerprint } from "lucide-react";
import { toast } from "react-toastify";

const EDGE_FUNCTION_URL =
  "https://lyuhhztaemndephpgjaj.supabase.co/functions/v1/create_user";

function SendInviteModal({ staff, onClose }) {
  const { currentStaff } = useUser();
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
          tenant_id: currentStaff?.tenant_id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error || "Failed to send invite");
      }

      toast.success(`Access credentials dispatched to ${staff.name}`);
      onClose();
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 flex flex-col">

        {/* Tactical Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 px-8 py-6 text-white relative flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 border border-white/10">
              <Fingerprint size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase italic">Access Authorization</h2>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-0.5">Strategic Portal Invitation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tactical Content */}
        <div className="p-8 space-y-6 bg-slate-50/30">
          <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Mail size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target Email Vector</p>
              <p className="text-[13px] font-black text-slate-900 truncate uppercase tracking-tight">
                {staff.email || "NO_EMAIL_DETECTED"}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={14} className="text-blue-400" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Security Protocol</h4>
              </div>
              <ul className="space-y-3">
                {[
                  "Initialize primary account structure",
                  "Dispatch encrypted reset credentials",
                  "Activate portal access permissions"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-1 w-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {!staff.email && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0" />
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-wide">
                Warning: No communication vector found for {staff.name}. Authorization blocked.
              </p>
            </div>
          )}
        </div>

        {/* Tactical Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all"
            disabled={loading}
          >
            Abort Command
          </button>
          <button
            onClick={handleSendInvite}
            disabled={loading || !staff.email}
            className="px-8 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            )}
            {loading ? "Transmitting..." : "Dispatch Invite"}
            {!loading && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SendInviteModal;
