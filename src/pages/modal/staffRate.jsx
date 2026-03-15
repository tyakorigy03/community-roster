import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, DollarSign, Save, Plus, ArrowUpRight, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "react-toastify";
import { useUser } from "../../context/UserContext";

export function AssignRateToStaffModal({ isOpen, onClose, staffId, staffName, onSuccess }) {
  const { currentStaff } = useUser();
  const [payRates, setPayRates] = useState([]);
  const [existingRateIds, setExistingRateIds] = useState(new Set());
  const [selectedRateIds, setSelectedRateIds] = useState([]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && staffId) {
      fetchData();
    }
  }, [isOpen, staffId]);

  const fetchData = async () => {
    setFetching(true);
    try {
      // 1. Fetch all active rates for the tenant
      const { data: rates, error: ratesError } = await supabase
        .from('pay_rates')
        .select('*')
        .eq('is_active', true)
        .eq('tenant_id', currentStaff.tenant_id)
        .order('name');

      if (ratesError) throw ratesError;

      // 2. Fetch existing assignments for this staff to prevent duplicates
      const { data: existing, error: existingError } = await supabase
        .from('staff_pay_rates')
        .select('pay_rate_id')
        .eq('staff_id', staffId)
        .eq('tenant_id', currentStaff.tenant_id);

      if (existingError) throw existingError;

      setPayRates(rates || []);
      setExistingRateIds(new Set((existing || []).map(e => e.pay_rate_id)));
      setSelectedRateIds([]); // Reset selection
    } catch (error) {
      console.error('Error fetching rate data:', error);
      toast.error('Failed to load rate profiles');
    } finally {
      setFetching(false);
    }
  };

  const toggleRateSelection = (id) => {
    if (existingRateIds.has(id)) return; // Cannot select already assigned rates

    setSelectedRateIds(prev => 
      prev.includes(id) 
        ? prev.filter(rateId => rateId !== id) 
        : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRateIds.length === 0) {
      toast.error('Please select at least one pay rate');
      return;
    }

    setLoading(true);
    try {
      const assignments = selectedRateIds.map(rateId => ({
        staff_id: staffId,
        pay_rate_id: rateId,
        effective_from: effectiveDate,
        is_default: false, // Bulk assignment usually secondary rates
        priority: 1,
        created_by: currentStaff?.id,
        tenant_id: currentStaff.tenant_id
      }));

      const { error } = await supabase
        .from('staff_pay_rates')
        .insert(assignments);

      if (error) throw error;

      toast.success(`${selectedRateIds.length} rate(s) assigned to ${staffName}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning rates:', error);
      toast.error('Failed to commit assignments');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
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
                <h2 className="text-sm font-black uppercase tracking-tight">Configure Rate Profiles</h2>
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
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Select Strategic Rates
            </label>
            
            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {fetching ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-slate-200 border-t-blue-600 rounded-full"></div>
                </div>
              ) : payRates.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No rates available</p>
                </div>
              ) : (
                payRates.map(rate => {
                  const isAssigned = existingRateIds.has(rate.id);
                  const isSelected = selectedRateIds.includes(rate.id);
                  
                  return (
                    <div 
                      key={rate.id}
                      onClick={() => toggleRateSelection(rate.id)}
                      className={`
                        flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group
                        ${isAssigned 
                          ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' 
                          : isSelected 
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all
                          ${isAssigned 
                            ? 'bg-slate-200 border-slate-200' 
                            : isSelected 
                              ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200' 
                              : 'bg-white border-slate-200 group-hover:border-slate-300'
                          }
                        `}>
                          {(isSelected || isAssigned) && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{rate.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            ${rate.hourly_rate}/HR · {rate.day_type}
                          </p>
                        </div>
                      </div>
                      {isAssigned && (
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-0.5 rounded-md">
                          Already Linked
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effective From</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
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
              disabled={loading || selectedRateIds.length === 0}
              className="flex-[2] h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
              ) : (
                <>
                  Commit Assignments
                  <ArrowUpRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
