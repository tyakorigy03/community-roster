import React, { useState, useEffect } from 'react';
import {
    X,
    Clock,
    MapPin,
    Camera,
    CheckCircle2,
    Upload,
    Loader2,
    Map as MapIcon,
    AlertCircle,
    Check,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const locationIQ_token = 'pk.7e6d24e4df4e8624f46ce9d76081ed31';
const CLOUDINARY_CLOUD_NAME = 'dazbtduwj';
const CLOUDINARY_UPLOAD_PRESET = 'blessingcommunity';

export default function ManualLogModal({ visible, shift, onClose, onSave }) {
    const [loading, setLoading] = useState(false);
    const [geocoding, setGeocoding] = useState({ in: false, out: false });
    const [uploading, setUploading] = useState({ in: false, out: false });

    const [form, setForm] = useState({
        clock_in_time: '',
        clock_out_time: '',
        clock_in_address: '',
        clock_out_address: '',
        clock_in_location: null,
        clock_out_location: null,
        clock_in_photo: '',
        clock_out_photo: '',
        status: 'completed',
        approved: true
    });

    useEffect(() => {
        if (shift && visible) {
            // Pre-calculate date for time inputs
            const dateStr = shift.shift_date;
            setForm(prev => ({
                ...prev,
                clock_in_time: `${dateStr}T${shift.start_time || '09:00'}`,
                clock_out_time: `${dateStr}T${shift.end_time || '17:00'}`,
            }));
        }
    }, [shift, visible]);

    if (!visible || !shift) return null;

    const handleGeocode = async (type) => {
        const address = type === 'in' ? form.clock_in_address : form.clock_out_address;
        if (!address) return toast.error('Enter an address first');

        try {
            setGeocoding(prev => ({ ...prev, [type]: true }));
            const resp = await fetch(
                `https://us1.locationiq.com/v1/search?key=${locationIQ_token}&q=${encodeURIComponent(address)}&format=json`
            );
            const data = await resp.json();

            if (data && data.length > 0) {
                const loc = {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
                setForm(prev => ({
                    ...prev,
                    [type === 'in' ? 'clock_in_location' : 'clock_out_location']: loc,
                    [type === 'in' ? 'clock_in_address' : 'clock_out_address']: data[0].display_name
                }));
                toast.success(`GPS Fixed for ${type.toUpperCase()}`);
            } else {
                toast.error('Location not found');
            }
        } catch (err) {
            console.error('Geocode fail:', err);
            toast.error('Geocoding Error');
        } finally {
            setGeocoding(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(prev => ({ ...prev, [type]: true }));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', `manual-logs/${shift.id}`);

            const resp = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );

            if (!resp.ok) throw new Error('Cloudinary Upload Failed');
            const data = await resp.json();

            setForm(prev => ({
                ...prev,
                [type === 'in' ? 'clock_in_photo' : 'clock_out_photo']: data.secure_url
            }));
            toast.success('Evidence Registered');
        } catch (err) {
            console.error('Upload err:', err);
            toast.error('Visual Evidence Sync Failed');
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            // 1. Prepare Payload
            const payload = {
                shift_id: shift.id,
                staff_id: shift.staff_id,
                clock_in_time: new Date(form.clock_in_time).toISOString(),
                clock_out_time: new Date(form.clock_out_time).toISOString(),
                clock_in_location: form.clock_in_location ? JSON.stringify(form.clock_in_location) : null,
                clock_out_location: form.clock_out_location ? JSON.stringify(form.clock_out_location) : null,
                clock_in_photo_url: form.clock_in_photo || null,
                clock_out_photo_url: form.clock_out_photo || null,
                status: 'completed',
                approved: true,
                updated_at: new Date().toISOString(),
                tenant_id: shift.tenant_id
            };

            // 2. Check if staff_shift exists
            const { data: existing } = await supabase
                .from('staff_shifts')
                .select('id')
                .eq('shift_id', shift.id)
                .eq('tenant_id', shift.tenant_id)
                .maybeSingle();

            let error;
            if (existing) {
                const { error: err } = await supabase
                    .from('staff_shifts')
                    .update(payload)
                    .eq('id', existing.id)
                    .eq('tenant_id', shift.tenant_id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('staff_shifts')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;

            toast.success('Manual Shift Record Synchronized');
            onSave && onSave();
            onClose();
        } catch (err) {
            console.error('Manual save fail:', err);
            toast.error('Failed to log manual drift');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Tactical Header */}
                <div className="bg-slate-900 p-6 flex items-center justify-between border-b border-slate-700 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Manual Operational Log</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Admin Override → Entry for {shift.staff_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-8">
                    {/* Time Registry */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock In Interval</label>
                            <input
                                type="datetime-local"
                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                value={form.clock_in_time}
                                onChange={(e) => setForm(p => ({ ...p, clock_in_time: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock Out Interval</label>
                            <input
                                type="datetime-local"
                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                value={form.clock_out_time}
                                onChange={(e) => setForm(p => ({ ...p, clock_out_time: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Spatial Verification */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-blue-600">
                                        <MapPin size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Inbound Logistics</span>
                                    </div>
                                    {form.clock_in_location && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">GPS Synchronized</span>}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Entry point address..."
                                        className="flex-1 h-11 bg-white border border-slate-100 rounded-xl px-4 text-xs font-bold outline-none"
                                        value={form.clock_in_address}
                                        onChange={(e) => setForm(p => ({ ...p, clock_in_address: e.target.value }))}
                                    />
                                    <button
                                        onClick={() => handleGeocode('in')}
                                        disabled={geocoding.in}
                                        className="px-4 h-11 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
                                    >
                                        {geocoding.in ? <RefreshCw className="animate-spin" size={14} /> : 'Sync GPS'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <MapPin size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Outbound Logistics</span>
                                    </div>
                                    {form.clock_out_location && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">GPS Synchronized</span>}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Departure point address..."
                                        className="flex-1 h-11 bg-white border border-slate-100 rounded-xl px-4 text-xs font-bold outline-none"
                                        value={form.clock_out_address}
                                        onChange={(e) => setForm(p => ({ ...p, clock_out_address: e.target.value }))}
                                    />
                                    <button
                                        onClick={() => handleGeocode('out')}
                                        disabled={geocoding.out}
                                        className="px-4 h-11 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
                                    >
                                        {geocoding.out ? <RefreshCw className="animate-spin" size={14} /> : 'Sync GPS'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Evidence Area */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entry Proof</label>
                            <div
                                className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-all ${form.clock_in_photo ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                            >
                                {uploading.in ? (
                                    <Loader2 className="animate-spin text-blue-500" size={24} />
                                ) : form.clock_in_photo ? (
                                    <>
                                        <img src={form.clock_in_photo} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="text-white" size={24} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="text-slate-300 mb-2" size={24} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Upload Frame</span>
                                    </>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'in')} accept="image/*" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departure Proof</label>
                            <div
                                className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-all ${form.clock_out_photo ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                            >
                                {uploading.out ? (
                                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                                ) : form.clock_out_photo ? (
                                    <>
                                        <img src={form.clock_out_photo} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="text-white" size={24} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="text-slate-300 mb-2" size={24} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Upload Frame</span>
                                    </>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'out')} accept="image/*" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || uploading.in || uploading.out}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        Synchronize Operational Data
                    </button>
                </div>
            </div>
        </div>
    );
}
