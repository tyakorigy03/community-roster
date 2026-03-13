import React, { useEffect, useState } from "react";
import { Mail, Lock, ChevronRight, Fingerprint, RefreshCcw, FileText, Shield, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase"; 

const Login = () => {
  const { login, loading, isAuthenticated } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      toast.error("IDENTIFICATION REQUIRED: PLEASE FILL ALL FIELDS");
      return;
    }
    try {
      await login(email, password);
      toast.success("ACCESS GRANTED. WELCOME BACK.");
    } catch (err) {
      console.error(err);
      toast.error("AUTHENTICATION FAILED. CHECK CREDENTIALS.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("PLEASE ENTER EMAIL FOR PASSWORD RESET");
      return;
    }
    setForgotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('forgot-password', {
        body: { email: forgotEmail },
      });

      if (error) throw error;
      toast.success(data.message || "If registered, a new PIN has been sent.");
      setIsForgotPassword(false);
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Failed to process request. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans selection:bg-blue-200 bg-slate-50">
      
      {/* Dynamic Background Elements - Using Brand Blue (#2563eb / blue-600) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600 opacity-[0.04] rounded-full blur-[100px] mix-blend-multiply animate-pulse duration-[8000ms]"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-blue-500 opacity-[0.03] rounded-full blur-[120px] mix-blend-multiply animate-pulse duration-[10000ms]"></div>
      </div>

      <div className="w-full max-w-[440px] p-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Main Card */}
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-[0_20px_60px_-16px_rgba(37,99,235,0.12)] overflow-hidden transition-all duration-500">
          
          {/* Header */}
          <div className="px-10 pt-10 pb-6 text-center relative">
            <div className="mb-6 justify-center flex">
              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-600 rounded-full blur-xl opacity-5 group-hover:opacity-10 transition duration-500"></div>
                <div className="bg-white p-2 rounded-2xl shadow-sm ring-1 ring-slate-100 relative z-10">
                  <img src="/logo.png" className="w-[70px] drop-shadow-sm" alt="Logo" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-[26px] font-black text-slate-900 tracking-tight uppercase">
                Blessing
              </h1>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.25em]">
                {isForgotPassword ? "Account Recovery" : "Community Roster"}
              </p>
            </div>
          </div>

          {/* Form Context */}
          {!isForgotPassword ? (
            <form className="px-10 pb-10 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5 group">
                  <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="name@community.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-3.5 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600/50 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* PIN Input */}
                <div className="space-y-1.5 group">
                  <div className="flex justify-between items-center ml-1">
                    <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                      Secure PIN
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 tracking-wide transition-colors"
                    >
                      Forgot Pin?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-3.5 text-[15px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600/50 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all tracking-widest"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group mt-2"
              >
                <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-bold text-[14px] uppercase tracking-widest relative ${loading
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 border"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.5)] hover:-translate-y-0.5"
                  }`}>
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <>
                      <Fingerprint size={18} className="opacity-90" />
                      <span>Sign In</span>
                    </>
                  )}
                </div>
              </button>
            </form>
          ) : (
            // Forgot Password Form
            <form className="px-10 pb-10 space-y-6 animate-in fade-in zoom-in-95 duration-300" onSubmit={handleForgotPassword}>
              <p className="text-[13px] text-slate-500 text-center leading-relaxed font-medium">
                Enter your registered email address. If found, we will securely send you a new temporary PIN.
              </p>
              <div className="space-y-4">
                <div className="space-y-1.5 group">
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="Account Email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-3.5 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600/50 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all font-bold text-[13px] uppercase tracking-widest border border-blue-100"
                >
                  {forgotLoading ? (
                    <div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <RefreshCcw size={18} strokeWidth={2.5} />
                      <span>Reset PIN</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  disabled={forgotLoading}
                  className="w-full py-3 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Links & Navigation */}
        <div className="mt-8 flex flex-col items-center gap-5">
          <Link to="/onboarding" className="group flex items-center gap-2 bg-white hover:bg-blue-50 border border-slate-200 shadow-sm px-6 py-3 rounded-full transition-all cursor-pointer">
            <UserPlus size={16} className="text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-widest">
              Register Care Service
            </span>
          </Link>

          <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            <Link to="/terms" className="hover:text-slate-600 transition-colors flex items-center gap-1.5">
              <FileText size={14} /> Terms
            </Link>
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <Link to="/privacy" className="hover:text-slate-600 transition-colors flex items-center gap-1.5">
              <Shield size={14} /> Privacy
            </Link>
          </div>
          
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} Blessing Community
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
