import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BreezeIcon from '../../components/ui/BreezeIcon.jsx';
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
      <BreezeIcon icon={Icon} size={20} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
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

          {/* Administration (Admin only) */}
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

        {/* Sidebar Footer */}
        <div className="p-3 border-t-2 border-s3 flex flex-col gap-1">
          <NavLink
            to="/panel/account"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 group',
                isActive
                  ? 'bg-s4/20 text-p1 font-semibold border border-s4/40 shadow-sm'
                  : 'text-p5 hover:text-p4 hover:bg-s5/50 border border-transparent',
              )
            }
          >
            <BreezeIcon icon={User} size={20} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <span>Account Settings</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left cursor-pointer"
          >
            <BreezeIcon icon={LogOut} size={20} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ===== Main Area ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-s2/80 backdrop-blur-md border-b-2 border-s3 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-p5 hover:text-p4 hover:bg-s5/50 transition-colors"
            aria-label="Toggle Navigation"
          >
            <BreezeIcon icon={sidebarOpen ? X : Menu} size={22} />
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <img src="/images/breeze-logo.png" width={28} height={28} alt="BreezeBytes" />
            <span className="font-poppins font-bold text-sm text-p4">
              Breeze<span className="text-p1">Bytes</span>
            </span>
          </div>

          <div className="hidden lg:block">
            {/* Breadcrumb or empty */}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUserDropdown(!userDropdown);
              }}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-s5/50 border border-transparent hover:border-s3 transition-all duration-300 cursor-pointer"
            >
              <div className="size-8 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 font-bold text-xs uppercase overflow-hidden">
                {user?.username ? user.username.charAt(0) : <BreezeIcon icon={Server} size={16} />}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-p4 leading-tight">{user?.username}</span>
                <span className="text-[10px] text-p5 capitalize leading-tight">{user?.role}</span>
              </div>
              <BreezeIcon icon={ChevronDown} size={14} className="text-p5" />
            </button>

            {/* Dropdown */}
            {userDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-s2 border-2 border-s3 rounded-2xl p-1.5 shadow-500 z-50 animate-in fade-in zoom-in-95 duration-200">
                <Link
                  to="/panel/account"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-p5 hover:text-p4 hover:bg-s5/50 transition-colors"
                >
                  <BreezeIcon icon={Settings} size={16} />
                  <span>Account Settings</span>
                </Link>
                <div className="my-1 border-t border-s3" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full text-left cursor-pointer"
                >
                  <BreezeIcon icon={LogOut} size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PanelLayout;
