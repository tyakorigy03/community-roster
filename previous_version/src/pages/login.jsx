import React, { useEffect, useState } from "react";
import { Mail, Lock } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login, loading ,isAuthenticated} = useUser(); // Get login function and loading state from context
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate=useNavigate();
  useEffect(()=>{
      if (isAuthenticated) {
         navigate('/');
      }    
  },[isAuthenticated])
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return; // prevent double submit

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await login(email, password);
      toast.success("Welcome back!"); // success feedback
    } catch (err) {
      console.error(err);
      toast.error("Login failed. Please try again.");
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md md:bg-white md:rounded-xl md:shadow-md p-8">
        {/* Logo */}
        <div className="mb-6 justify-center flex">
          <img src="/logo.png" className="w-[100px]" alt="Logo" />
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-800">
            Welcome to Blessing Community
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-wide">
            Roster Management App
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2 border border-slate-300 px-3 py-2 focus-within:border-blue-600">
              <Mail size={16} className="text-slate-400" />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full text-sm outline-none placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">
              Password
            </label>
            <div className="flex items-center gap-2 border border-slate-300 px-3 py-2 focus-within:border-blue-600">
              <Lock size={16} className="text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full text-sm outline-none placeholder:text-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-disabled={loading}
            className={`w-full mt-4 text-white text-sm py-2 rounded transition flex justify-center items-center ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading && (
              <span
                className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 mr-2"
                aria-hidden="true"
              ></span>
            )}
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-[10px] text-slate-400 text-center mt-6">
          © {new Date().getFullYear()} Blessing Community
        </p>
      </div>
    </div>
  );
};

export default Login;
