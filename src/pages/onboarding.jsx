import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Heart, ShieldCheck, CheckCircle2, ChevronRight, Mail, Phone, Calendar } from "lucide-react";

export default function Onboarding() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceType: "NDIS Core Supports"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
    }, 800);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Premium Header - White/Blue Theme */}
      <nav className="bg-blue-600 sticky top-0 z-50 shadow-md pt-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/login" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors font-semibold text-xs tracking-widest uppercase group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Return
            </Link>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
              <div className="bg-white p-1 rounded-full">
                <img src="/logo.png" className="h-6 w-6 object-contain" alt="Logo" />
              </div>
              <span className="font-black tracking-tight text-white uppercase text-sm">Blessing Community</span>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 relative">
        {!submitted ? (
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold tracking-widest text-[10px] mb-6 uppercase shadow-sm">
                <Heart size={14} /> Care Service Registration
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4 uppercase">
                Start Your Care Journey
              </h1>
              <p className="text-base text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
                Register your interest for Blessing Community care services. Provide your details below and our coordination team will reach out to you.
              </p>
            </div>

            <div className="bg-white rounded-[32px] p-8 md:p-10 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 ml-1">First Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-colors"
                        placeholder="e.g. John"
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 ml-1">Last Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-colors"
                        placeholder="e.g. Doe"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 ml-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input 
                        type="email" 
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-colors"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 ml-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Phone size={18} />
                      </div>
                      <input 
                        type="tel" 
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-colors"
                        placeholder="0400 000 000"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Type */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 ml-1">Primary Interest</label>
                  <div className="relative">
                    <select 
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-colors appearance-none"
                    >
                      <option>NDIS Core Supports</option>
                      <option>Community Participation</option>
                      <option>Supported Independent Living</option>
                      <option>Other Services</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 uppercase tracking-widest text-[13px]">
                    Submit Registration <ChevronRight size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="relative animate-in zoom-in-95 duration-500 py-12">
             <div className="bg-white rounded-[32px] p-10 md:p-14 border border-slate-200 shadow-xl text-center max-w-xl mx-auto">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Registration Received!</h2>
                <p className="text-lg text-slate-600 font-medium leading-relaxed mb-8">
                  Thank you, <span className="font-bold text-slate-900">{formData.firstName}</span>. Your details have been securely logged in our system.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 text-left">
                  <div className="flex items-start gap-4">
                    <Calendar className="text-blue-600 mt-1" size={24} />
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">What happens next?</h4>
                      <p className="text-slate-600 text-sm font-medium leading-relaxed">One of our dedicated care coordinators will review your submission and contact you within <strong className="text-slate-900">2 business days</strong> to discuss the next steps in your care journey.</p>
                    </div>
                  </div>
                </div>
                <Link to="/login" className="inline-block bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-8 rounded-xl transition-colors text-[13px] uppercase tracking-widest shadow-sm">
                  Return Home
                </Link>
             </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center border-t border-slate-200 pt-10">
          <ShieldCheck size={28} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-slate-900 font-bold mb-2 uppercase tracking-wide text-xs">Secure & Confidential</h3>
          <p className="text-[13px] text-slate-500 mb-6 max-w-md mx-auto font-medium">
            All applications are securely processed in strict accordance with the Privacy Act.
          </p>
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
