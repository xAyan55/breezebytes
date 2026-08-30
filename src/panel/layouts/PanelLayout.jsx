import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Server,
  PlusCircle,
  User,
  LogOut,
  Settings,
  Shield,
  Users,
  HardDrive,
  Network,
  Activity,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

const PanelLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setUserDropdown(false);
  }, [location.pathname]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = () => setUserDropdown(false);
    if (userDropdown) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userDropdown]);

  // Close mobile sidebar and dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setUserDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mainNav = [
    { to: '/panel', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/panel/servers', icon: Server, label: 'My Servers', end: true },
  ];

  const serverNav = [
    { to: '/panel/servers/create', icon: PlusCircle, label: 'Create Server' },
  ];

  const adminNav = [
    { to: '/panel/admin', icon: Shield, label: 'Overview', end: true },
    { to: '/panel/admin/users', icon: Users, label: 'Users' },
    { to: '/panel/admin/nodes', icon: HardDrive, label: 'Nodes' },
    { to: '/panel/admin/allocations', icon: Network, label: 'Allocations' },
    { to: '/panel/admin/activity', icon: Activity, label: 'Activity Log' },
  ];

  const NavItem = ({ to, icon: Icon, label, end }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 group',
          isActive
            ? 'bg-s4/20 text-p1 font-semibold border border-s4/40 shadow-sm'
            : 'text-p5 hover:text-p4 hover:bg-s5/50 border border-transparent',
        )
      }
    >
      <Icon size={18} className="flex-shrink-0 transition-colors duration-300 group-[.active]:text-p1" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-s1 flex">
      {/* ===== Mobile Sidebar Overlay ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-[260px] bg-s2 border-r-2 border-s3 flex flex-col z-50 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="p-5 pb-0">
          <Link
            to="/panel"
            className="flex items-center gap-2.5 group transition-transform duration-300 hover:scale-[1.02]"
          >
            <img
              src="/images/breeze-logo.png"
              width={36}
              height={36}
              alt="BreezeBytes"
              className="object-contain drop-shadow-md"
            />
            <span className="font-poppins font-bold text-lg tracking-wider text-p4">
              Breeze<span className="text-p1">Bytes</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 flex flex-col gap-6">
          {/* Main */}
          <div className="flex flex-col gap-1">
            <p className="caption pl-3 mb-1 text-[11px] font-bold text-p3 uppercase tracking-wider">
              Main
            </p>
            {mainNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Server */}
          <div className="flex flex-col gap-1">
            <p className="caption pl-3 mb-1 text-[11px] font-bold text-p3 uppercase tracking-wider">
              Server
            </p>
            {serverNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Admin */}
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <p className="caption pl-3 mb-1 text-[11px] font-bold text-p3 uppercase tracking-wider">
                Administration
              </p>
              {adminNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div className="px-3 py-4 border-t-2 border-s3 flex flex-col gap-1">
          <NavLink
            to="/panel/account"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300',
                isActive
                  ? 'bg-s4/20 text-p1 font-semibold border border-s4/40 shadow-sm'
                  : 'text-p5 hover:text-p4 hover:bg-s5/50 border border-transparent',
              )
            }
          >
            <Settings size={18} className="flex-shrink-0" />
            <span>Account</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-p5 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-300 w-full text-left"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>


      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-s2/90 backdrop-blur-md border-b-2 border-s3">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-2xl text-p5 hover:text-p4 hover:bg-s5/40 transition-all duration-500 border border-transparent"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo in header for mobile */}
            <Link
              to="/panel"
              className="flex items-center gap-2 lg:hidden"
            >
              <img
                src="/images/breeze-logo.png"
                width={28}
                height={28}
                alt="BreezeBytes"
                className="object-contain"
              />
              <span className="font-poppins font-bold text-sm tracking-wider text-p4">
                Breeze<span className="text-p1">Bytes</span>
              </span>
            </Link>

            {/* Spacer for desktop */}
            <div className="hidden lg:block" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDropdown(!userDropdown);
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border-2 border-s3 bg-s2 hover:border-s4 transition-all duration-500 text-sm"
              >
                <div className="size-7 rounded-full bg-s4/20 border-2 border-s3 flex items-center justify-center text-p1">
                  <User size={14} />
                </div>
                <span className="text-p4 font-semibold hidden sm:inline max-w-[120px] truncate">
                  {user?.username}
                </span>
                <ChevronDown
                  size={14}
                  className={clsx(
                    'text-p5 transition-transform duration-500',
                    userDropdown && 'rotate-180',
                  )}
                />
              </button>

              {/* Dropdown */}
              {userDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-s2 border-2 border-s3 rounded-2xl shadow-500 overflow-hidden py-2 z-50">
                  <div className="px-4 py-2 border-b border-s3">
                    <p className="text-xs font-bold text-p4 truncate">{user?.username}</p>
                    <p className="text-[11px] text-p5 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => navigate('/panel/account')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-p5 hover:bg-s5/40 hover:text-p4 transition-colors"
                  >
                    <Settings size={14} />
                    <span>Account Settings</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PanelLayout;
