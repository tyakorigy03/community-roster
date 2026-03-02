import { useLocation, useNavigate, Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  AlertCircle,
  CircleDollarSign,
  Settings,
  LogOut,
  User,
  ChevronDown,
  MoreHorizontal,
  Clock,
  X
} from "lucide-react";

function Layout({ children }) {
  const { currentStaff, loading, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const activeNavItem = location.pathname;

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const userDropdownRef = useRef(null);
  const mainContentRef = useRef(null);

  const isAdmin = currentStaff?.role?.toLowerCase() === 'admin';

  const adminNavItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/calender", label: "Calendar", icon: Calendar },
    { path: "/clients", label: "Clients", icon: Users },
    { path: "/staff", label: "Staff", icon: UserCheck },
    { path: "/shifts", label: "Shifts", icon: Calendar },
    { path: "/progress-notes", label: "Progress", icon: FileText },
    { path: "/shift-history", label: "History", icon: Clock },
    { path: "/incidents", label: "Incidents", icon: AlertCircle },
    { path: "/payroll", label: "Payroll", icon: CircleDollarSign },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const staffNavItems = [
    { path: "/calender", label: "Dashboard", icon: LayoutDashboard },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const navItems = isAdmin ? adminNavItems : staffNavItems;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      const currentScrollY = mainContentRef.current?.scrollTop || 0;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    const mainElement = mainContentRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (!loading && isAuthenticated && currentStaff) {
      if (!isAdmin && activeNavItem === "/") {
        navigate("/calender");
        return;
      }
      const adminOnlyPaths = ["/", "/clients", "/staff", "/shifts", "/progress-notes", "/incidents", "/payroll", "/settings"];
      if (!isAdmin && adminOnlyPaths.includes(activeNavItem)) navigate("/calender");
    }
  }, [currentStaff, isAdmin, activeNavItem]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent shadow-xl"></div>
      </div>
    );
  }

  const visibleMobileItems = isMobile && navItems.length > 5 ? navItems.slice(0, 4) : navItems;
  const dropdownMobileItems = isMobile && navItems.length > 5 ? navItems.slice(4) : [];

  return (
    <div className="flex flex-col h-screen bg-[#020617] overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Header - Glassmorphic */}
      <nav className="flex justify-between items-center px-4 lg:px-8 py-3 text-white z-50 w-full glass-sidebar border-b border-white/5">
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30 group-hover:bg-indigo-600/30 transition-all">
              <img src="/logo.png" className="w-8 h-8 lg:w-10 lg:h-10 object-contain block" alt="Logo" />
            </div>
            {!isMobile && (
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-[14px] font-black tracking-tighter uppercase leading-none text-white">Blessing</h1>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Community Roster</p>
              </div>
            )}
          </Link>

          {!isMobile && (
            <ul className="flex items-center gap-1 min-w-0 ml-4">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight flex items-center gap-2 transition-all whitespace-nowrap ${activeNavItem === item.path
                        ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <item.icon size={15} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {isMobile && (
            <h2 className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 truncate max-w-[140px]">
              {navItems.find((el) => el.path === activeNavItem)?.label || "Menu"}
            </h2>
          )}
        </div>

        <div className="relative flex-shrink-0" ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-white/5 transition-all border border-white/5"
          >
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 overflow-hidden shadow-lg flex-shrink-0">
              {currentStaff?.profile_picture ? (
                <img src={currentStaff.profile_picture} className="w-full h-full object-cover" alt="staff" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-xs uppercase text-indigo-400">
                  {currentStaff?.name?.charAt(0)}
                </div>
              )}
            </div>
            {!isMobile && (
              <div className="text-left hidden sm:block min-w-0 max-w-[120px]">
                <p className="text-[11px] font-black uppercase tracking-tight text-white leading-none truncate">{currentStaff?.name}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">{currentStaff?.role}</p>
              </div>
            )}
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showUserDropdown ? "rotate-180" : ""}`} />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-3 w-60 glass-card rounded-[2rem] py-3 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-sm flex-shrink-0">
                  {currentStaff?.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-white truncate uppercase">{currentStaff?.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-widest">{currentStaff?.role}</p>
                </div>
              </div>
              <div className="p-2">
                <Link to="/profile" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-4 px-4 py-3 text-[11px] font-black text-slate-400 hover:text-white hover:bg-indigo-600/10 rounded-2xl transition-all">
                  <User size={16} /> Identity
                </Link>
                {isAdmin && (
                  <Link to="/settings" onClick={() => setShowUserDropdown(false)} className="flex items-center gap-4 px-4 py-3 text-[11px] font-black text-slate-400 hover:text-white hover:bg-indigo-600/10 rounded-2xl transition-all">
                    <Settings size={16} /> Preferences
                  </Link>
                )}
              </div>
              <div className="p-2 border-t border-white/5">
                <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all text-left">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area - Dark first */}
      <main ref={mainContentRef} className="flex-1 bg-[#020617] overflow-auto px-4 lg:px-8 py-6" style={{ paddingBottom: isMobile ? 'calc(5rem + env(safe-area-inset-bottom))' : '2rem' }}>
        <div className="max-w-[1600px] mx-auto animate-fadeIn">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav - Refined */}
      {isMobile && (
        <>
          <div className={`fixed bottom-0 left-0 right-0 glass-sidebar border-t border-white/5 shadow-2xl transition-transform duration-500 ease-out z-50 ${isNavVisible ? 'translate-y-0' : 'translate-y-full'}`} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="flex justify-around items-center px-4 pt-3">
              {visibleMobileItems.map((item) => {
                const isActive = activeNavItem === item.path;
                return (
                  <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${isActive ? "text-indigo-400" : "text-slate-500 active:scale-90"}`}>
                    <div className={`transition-all ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''}`}>
                      <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-tight transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
              {dropdownMobileItems.length > 0 && (
                <button onClick={() => setShowMoreModal(true)} className="flex flex-col items-center gap-1.5 p-2 text-slate-500 active:scale-90 transition-all">
                  <MoreHorizontal size={24} strokeWidth={2} />
                  <span className="text-[10px] font-black uppercase tracking-tight opacity-60">More</span>
                </button>
              )}
            </div>
          </div>

          {showMoreModal && (
            <div className="fixed inset-0 z-[100] animate-in fade-in duration-300" onClick={() => setShowMoreModal(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
              <div className="absolute inset-x-0 bottom-0 glass-sidebar rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom-full duration-500" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))', borderTop: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center pt-4 pb-6">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-8 pb-6 border-b border-white/5">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">System Navigation</h3>
                  <button onClick={() => setShowMoreModal(false)} className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
                <div className="p-6 grid grid-cols-1 gap-3 max-h-[65vh] overflow-y-auto custom-scrollbar">
                  {dropdownMobileItems.map((item) => {
                    const isActive = activeNavItem === item.path;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setShowMoreModal(false)} className={`flex items-center gap-5 px-6 py-5 text-sm font-black uppercase tracking-widest rounded-3xl transition-all ${isActive ? "premium-gradient text-white shadow-lg premium-shadow" : "text-slate-400 hover:bg-white/5 active:scale-[0.98]"}`}>
                        <item.icon size={22} strokeWidth={2.5} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Layout;
