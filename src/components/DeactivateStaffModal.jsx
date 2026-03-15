import { createPortal } from "react-dom";
import React from "react";
import { X, AlertTriangle, UserX, ShieldAlert, ChevronRight } from "lucide-react";

function DeactivateStaffModal({ staff, onClose, onConfirm, loading }) {
    if (!staff) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 flex flex-col">

                {/* Tactical Header */}
                <div className="bg-gradient-to-r from-slate-950 via-rose-950 to-slate-950 px-8 py-6 text-white relative flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                    <div className="relative flex items-center gap-4">
                        <div className="h-12 w-12 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/40 border border-white/10">
                            <UserX size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight uppercase italic">Deactivate Staff</h2>
                            <p className="text-[10px] font-bold text-rose-300 uppercase tracking-widest mt-0.5">Suspend staff member account</p>
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
                    <div className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="relative">
                            {staff.profile_picture ? (
                                <img
                                    src={staff.profile_picture}
                                    alt={staff.name}
                                    className="rounded-xl h-12 w-12 object-cover border border-slate-100"
                                />
                            ) : (
                                <div className="rounded-xl h-12 w-12 flex items-center justify-center bg-slate-100 text-slate-400 font-black text-xs uppercase">
                                    {staff.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-rose-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Staff Member</p>
                            <p className="text-[14px] font-black text-slate-900 truncate uppercase tracking-tight">{staff.name}</p>
                        </div>
                    </div>

                    <div className="bg-rose-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-rose-900/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldAlert size={14} className="text-rose-400" />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Deactivation Impact</h4>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "Revoke login access immediately",
                                    "Preserve historical records",
                                    "Archive performance data",
                                    "Remove from active roster"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="h-4 w-4 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <div className="h-1 w-1 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"></div>
                                        </div>
                                        <span className="text-[11px] font-bold text-rose-100/80 uppercase tracking-tight">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Tactical Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-8 py-2.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <AlertTriangle size={14} className="group-hover:scale-110 transition-transform" />
                        )}
                        {loading ? "Processing..." : "Confirm Deactivation"}
                        {!loading && <ChevronRight size={14} />}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default DeactivateStaffModal;
