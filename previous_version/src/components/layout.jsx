import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useEffect, useState, useRef } from "react";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiCalendar,
  FiFileText,
  FiAlertCircle,
  FiDollarSign,
  FiSettings,
  FiMenu,
  FiLogOut,
  FiUser,
} from "react-icons/fi";

function Layout({ children }) {
  const { currentStaff, loading, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const activeNavItem = location.pathname;
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const userDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);

  // Check if user is admin
  const isAdmin = currentStaff?.role?.toLowerCase() === 'admin';

  // Admin navigation items
  const adminNavItems = [
    { path: "/", label: "Dashboard", icon: FiHome },
    { path: "/calender", label:  "Calender", icon: FiCalendar },
    { path: "/clients", label: "Clients", icon: FiUsers },
    { path: "/staff", label: "Staff", icon: FiUserCheck },
    { path: "/shifts", label: "Shifts", icon: FiCalendar },
    { path: "/progress-notes", label: "Progress", icon: FiFileText },
    { path: "/incidents", label: "Incidents", icon: FiAlertCircle },
    { path: "/payroll", label: "Payroll", icon: FiDollarSign },
    { path: "/settings", label: "Settings", icon: FiSettings },
  ];

  // Staff navigation items (only Calendar and Profile)
  const staffNavItems = [
    { path: "/calender", label: "Dashboard", icon: FiHome },
    { path: "/profile", label: "Profile", icon: FiUser },
  ];

  // Select navigation based on role
  const navItems = isAdmin ? adminNavItems : staffNavItems;

  // Check for mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false);
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

  // Redirect non-admin users trying to access admin pages
  useEffect(() => {
    if (!loading && isAuthenticated && currentStaff) {
      // If not admin and trying to access dashboard, redirect to calendar
      if (!isAdmin && activeNavItem === "/") {
        navigate("/calender");
        return;
      }

      // Check if non-admin is trying to access admin-only pages
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
        // Redirect to calendar
        navigate("/calender");
      }
    }
  }, [isAuthenticated, loading, currentStaff, isAdmin, activeNavItem, navigate]);

  // Split nav items for mobile - show first 3, rest in dropdown
  const visibleMobileItems = isMobile && navItems.length > 4 
    ? navItems.slice(0, 3) 
    : navItems;
  const dropdownMobileItems = isMobile && navItems.length > 4 
    ? navItems.slice(3) 
    : [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigation = (path) => {
    // For non-admin users, redirect dashboard to calendar
    if (!isAdmin && path === "/") {
      navigate("/calender");
    } else {
      navigate(path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-blue-500">
        {/* Header - Mobile/Desktop */}
        <nav className="flex justify-between items-center px-4 md:px-10 py-2 text-gray-50">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" className="w-[40px] md:w-[50px]" alt="Logo" />
            
            {/* Desktop Navigation */}
            {!isMobile && (
              <ul className="hidden md:flex space-x-2">
                {navItems.map((item) => (
                  <li
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`rounded-3xl px-3 py-2 transition hover:bg-blue-600 cursor-pointer flex items-center space-x-1 ${
                      activeNavItem === item.path && "bg-blue-600"
                    }`}
                  >
                    <item.icon className="text-lg" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {/* Mobile - Show current page label */}
            {isMobile && (
              <h2 className="font-semibold">
                {navItems.find(el => el.path === activeNavItem)?.label || "App"}
              </h2>
            )}
          </div>
          
          {/* User Profile with Dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <div
              className="profile flex items-center justify-center w-[40px] h-[40px] md:w-[50px] md:h-[50px] rounded-full bg-gray-400 overflow-hidden cursor-pointer hover:bg-gray-500 transition"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              {currentStaff?.profile_picture ? (
                <img
                  src={currentStaff.profile_picture}
                  className="h-full w-full object-cover"
                  alt="Profile"
                />
              ) : (
                <h2 className="font-semibold uppercase text-sm">
                  {currentStaff?.name?.charAt(0) || "U"}
                  {currentStaff?.name?.split(" ")[1]?.charAt(0) || ""}
                </h2>
              )}
            </div>

            {/* User Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-0 w-64 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {currentStaff?.name || "User"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentStaff?.role || "Role not specified"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentStaff?.email || "email@example.com"}
                  </p>
                </div>
                
                {/* Profile link for non-admin users */}
                {!isAdmin && (
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setShowUserDropdown(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FiUser className="mr-3" />
                      View Profile
                    </button>
                  </div>
                )}
                
                <div className="py-1 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <FiLogOut className="mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 bg-gray-100 rounded-t-3xl overflow-auto">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 flex justify-around items-center md:hidden z-40">
            {visibleMobileItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${
                  activeNavItem === item.path
                    ? "text-blue-600"
                    : "text-gray-600"
                }`}
              >
                <item.icon className="text-xl" />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}

            {/* More dropdown for remaining items (only if there are more than 4 items) */}
            {dropdownMobileItems.length > 0 && (
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${
                    showMoreDropdown ? "text-blue-600" : "text-gray-600"
                  }`}
                >
                  <FiMenu className="text-xl" />
                  <span className="text-xs mt-1">More</span>
                </button>

                {/* More Items Dropdown */}
                {showMoreDropdown && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg py-2 border border-gray-200">
                    {dropdownMobileItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          handleNavigation(item.path);
                          setShowMoreDropdown(false);
                        }}
                        className={`flex items-center w-full px-4 py-3 text-sm ${
                          activeNavItem === item.path
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <item.icon className="mr-3 text-lg" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add padding for mobile bottom nav */}
      {isMobile && <div className="h-16 md:h-0"></div>}
    </>
  );
}

export default Layout;