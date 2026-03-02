import React, { useState, useEffect } from "react";
import { X, DollarSign, Save, Plus, ArrowUpRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "react-toastify";

export function AssignRateToStaffModal({ isOpen, onClose, staffId, staffName, onSuccess }) {
  const [formData, setFormData] = useState({
    pay_rate_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    is_default: true,
    priority: 1
  });
  const [loading, setLoading] = useState(false);
  const [payRates, setPayRates] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchRates();
    }
  }, [isOpen]);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('pay_rates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPayRates(data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pay_rate_id) {
      toast.error('Please select a pay rate profile');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('staff_pay_rates').insert([{
        staff_id: staffId,
        pay_rate_id: formData.pay_rate_id,
        effective_from: formData.effective_from,
        is_default: formData.is_default,
        priority: parseInt(formData.priority)
      }]);

      if (error) throw error;

      toast.success(`Rate assigned to ${staffName} successfully`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning rate:', error);
      toast.error('Failed to commit assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        <div className="bg-slate-950 px-6 py-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                <DollarSign className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">Configure Rate Profile</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                  Assigning to {staffName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors outline-none"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Select Strategic Rate
            </label>
            <div className="relative group">
              <select
                value={formData.pay_rate_id}
                onChange={(e) => setFormData({ ...formData, pay_rate_id: e.target.value })}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-black uppercase tracking-widest appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none cursor-pointer"
                required
              >
                <option value="">Select a rate profile...</option>
                {payRates.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} — ${r.hourly_rate}/HR ({r.day_type})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus size={14} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effective From</label>
            <input
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              required
            />
          </div>

          <div className="p-6 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              ) : (
                <>
                  Commit Assignment
                  <ArrowUpRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
