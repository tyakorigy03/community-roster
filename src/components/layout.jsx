import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  DollarSign,
  Settings,
  Menu,
  LogOut,
  User,
  ChevronDown,
  Ellipsis,
  Clock,
  CircleAlert,
  CircleDollarSign,
  UserCheck
} from "lucide-react";

function Layout({ children }) {
  const { currentStaff, loading, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const activeNavItem = location.pathname;
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const userDropdownRef = useRef(null);

  // Check if user is admin
  const isAdmin = currentStaff?.role?.toLowerCase() === 'admin';

  // Total navigation items from build version
  const allNavItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Calendar", path: "/calender", icon: Calendar },
    { label: "Clients", path: "/clients", icon: Users },
    { label: "Staff", path: "/staff", icon: UserCheck },
    { label: "Shifts", path: "/shifts", icon: Calendar },
    { label: "Progress", path: "/progress-notes", icon: FileText },
    { label: "History", path: "/shift-history", icon: Clock },
    { label: "Incidents", path: "/incidents", icon: CircleAlert },
    { label: "Payroll", path: "/payroll", icon: CircleDollarSign },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  // For Staff: Minimal access
  const staffNavItems = [
    { label: "Dashboard", path: "/calender", icon: LayoutDashboard },
    { label: "Profile", path: "/profile", icon: User },
  ];

  // Actual navigation items based on role
  const navItems = isAdmin ? allNavItems : staffNavItems;

  // For Mobile Bottom Nav: Show first 4 items + "More"
  const mobilePrimaryNav = navItems.slice(0, 4);
  const mobileMoreNav = navItems.slice(4);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && isAuthenticated && currentStaff) {
      if (!isAdmin && activeNavItem === "/") {
        navigate("/calender");
        return;
      }

      const adminOnlyPaths = [
        "/",
        "/clients",
        "/staff",
        "/shifts",
        "/progress-notes",
        "/incidents",
        "/payroll",
        "/settings",
      ];

      if (!isAdmin && adminOnlyPaths.includes(activeNavItem)) {
        navigate("/calender");
      }
    }
  }, [isAuthenticated, loading, currentStaff, isAdmin, activeNavItem, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigation = (path) => {
    if (!isAdmin && path === "/") {
      navigate("/calender");
    } else {
      navigate(path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-blue-600 overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-3 lg:px-5 py-2 pt-5 md:pt-1  text-white z-50 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <a className="flex items-center gap-2 group flex-shrink-0" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <div className="bg-white p-1 rounded-lg group-hover:bg-white/90 transition-all flex-shrink-0 shadow-md ring-1 ring-white/20">
              <img className="w-7 h-7 lg:w-9 lg:h-9 object-contain block" alt="Logo" src="/logo.png" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-[12px] font-black tracking-tight uppercase leading-none truncate max-w-[140px]">Blessing</h1>
              <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5 truncate max-w-[140px]">Community Roster</p>
            </div>
          </a>

          {/* Desktop Navigation List */}
          <ul className="flex items-center gap-0.5 min-w-0">
            {navItems.map((item) => {
              const isActive = activeNavItem === item.path;
              return (
                <li key={item.path} className={isActive ? "block" : "hidden lg:block"}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      isActive 
                        ? "bg-white/20 text-white shadow-sm" 
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <item.icon size={14} />
                    <span className={isActive ? "inline" : "hidden lg:inline"}>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative flex-shrink-0" ref={userDropdownRef}>
          <button 
            className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-white/20 border border-white/20 overflow-hidden shadow-sm flex-shrink-0">
              {currentStaff?.profile_picture ? (
                <img src={currentStaff.profile_picture} className="w-full h-full object-cover" alt="staff" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                  {currentStaff?.name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div className="text-left hidden sm:block min-w-0 max-w-[110px]">
              <p className="text-[10px] font-black uppercase tracking-tight leading-none truncate">
                {currentStaff?.name || "User"}
              </p>
              <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-0.5 truncate">
                {currentStaff?.role || "Staff"}
              </p>
            </div>
            <ChevronDown size={12} className={`opacity-50 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-[60] border border-slate-100 animate-in fade-in zoom-in duration-200">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  {currentStaff?.name || "User"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {currentStaff?.role || "Staff"}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowUserDropdown(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                >
                  <User size={14} className="mr-3" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors uppercase tracking-widest"
                >
                  <LogOut size={14} className="mr-3" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 bg-white rounded-t-2xl lg:rounded-t-[2rem] overflow-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative no-scrollbar">
        <div className="h-full layout-main">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Hidden on md+ unless needed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out z-40 translate-y-0 md:hidden" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-around items-center px-1 pt-1 pb-1">
          {mobilePrimaryNav.map((item) => {
            const isActive = activeNavItem === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-[48px] ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className={`transition-all ${isActive ? 'scale-110' : ''}`}>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-tight transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {isAdmin && mobileMoreNav.length > 0 && (
            <div className="relative">
              <button 
                className="flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-[48px] text-slate-400 hover:text-slate-600"
                onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              >
                <div className="transition-all">
                  <Ellipsis size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tight opacity-70">More</span>
              </button>

              {/* More Dropdown (Mobile style) */}
              {showMoreDropdown && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl py-1 z-50 border border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
                  {mobileMoreNav.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        handleNavigation(item.path);
                        setShowMoreDropdown(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest border-b border-slate-50 last:border-0"
                    >
                      <item.icon size={14} className="mr-3" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Layout;
