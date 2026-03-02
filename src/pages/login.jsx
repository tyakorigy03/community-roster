import React, { useEffect, useState } from "react";
import { Mail, Lock, ChevronRight, Fingerprint } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login, loading, isAuthenticated } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-100">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-50/50 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-lg p-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Streamlined Header */}
          <div className="bg-gradient-to-br from-slate-50 to-white px-10 py-8 text-center relative border-b border-slate-100">
            <div className="mb-6 justify-center flex">
              <div className="relative group">
                <img src="/logo.png" className="w-[90px] relative z-10 filter grayscale-0 contrast-125" alt="Logo" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                Personnel Access
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="h-[1px] w-4 bg-blue-600/30"></span>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                  Blessing Community Roster
                </p>
                <span className="h-[1px] w-4 bg-blue-600/30"></span>
              </div>
            </div>
          </div>

          {/* Streamlined Form */}
          <form className="p-10 pb-12 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5 group">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-blue-600">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="NAME@COMMUNITY.ORG"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-12 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase tracking-wide"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* PIN Input */}
              <div className="space-y-1.5 group">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 transition-colors group-focus-within:text-blue-600">
                  Staff PIN
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-12 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all uppercase tracking-wide"
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
              className="w-full relative"
            >
              <div className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm ${loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] border border-blue-500"
                }`}>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <>
                    <Fingerprint size={16} className="text-blue-200" />
                    <span>Sign In</span>
                    <ChevronRight size={14} className="text-blue-200" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Status Footer */}
          <div className="px-10 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Session</span>
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
              V.1.0 Stable
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
          © {new Date().getFullYear()} Blessing Community
        </p>
      </div>
    </div>
  );
};

export default Login;
