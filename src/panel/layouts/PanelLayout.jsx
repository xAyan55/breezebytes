import { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Server,
  PlusCircle,
  User,
  Shield,
  Users,
  HardDrive,
  Network,
  Activity,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const PanelLayout = () => {
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getBreadcrumb = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return 'Dashboard';
    const sub = parts[1];
    if (sub === 'servers' && parts.length === 2) return 'Servers';
    if (sub === 'servers' && parts[2] === 'create') return 'Create Server';
    if (sub === 'servers') return 'Server Management';
    if (sub === 'account') return 'Account Settings';
    if (sub === 'admin') {
      const adminSub = parts[2] || 'Overview';
      return `Admin / ${adminSub.charAt(0).toUpperCase() + adminSub.slice(1)}`;
    }
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  };

  const navItemClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
      isActive
        ? 'bg-p1/10 text-p1 border border-p1/30 font-semibold shadow-sm'
        : 'text-p5/80 hover:text-p4 hover:bg-s2/60 border border-transparent'
    );

  return (
    <div className="min-h-screen bg-[#08090d] text-p4 flex flex-col antialiased selection:bg-p1 selection:text-black">
      {/* Top Header */}
      <header className="h-16 border-b border-[#222638] bg-[#11141e]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-p5 hover:text-p4 hover:bg-s2/60 transition-colors"
            aria-label="Toggle sidebar"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo in header for mobile or quick home link */}
          <Link to="/panel" className="flex items-center gap-2.5 group">
            <img
              src="/images/breeze-logo.png"
              alt="BreezeBytes"
              className="size-8 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-poppins font-bold text-lg tracking-wider text-p4">
              Breeze<span className="text-p1">Bytes</span>
            </span>
          </Link>

          <span className="hidden sm:inline text-s3 font-light mx-1">/</span>
          <span className="hidden sm:inline text-xs font-medium text-p5 px-2.5 py-1 rounded-md bg-[#08090d] border border-[#222638]">
            {getBreadcrumb()}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-xs text-p5 hover:text-p1 px-3 py-1.5 rounded-lg border border-[#222638] bg-[#08090d]/60 transition-colors"
          >
            <span>Public Website</span>
            <ExternalLink size={12} />
          </Link>

          {/* User profile dropdown / badge */}
          <div className="flex items-center gap-3 pl-2 border-l border-[#222638]">
            <Link
              to="/panel/account"
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-s2/50 transition-colors group"
            >
              <div className="size-8 rounded-full bg-p1/20 border border-p1/40 flex items-center justify-center text-xs font-bold text-p1">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <p className="font-semibold text-p4 group-hover:text-p1 transition-colors">{user?.username}</p>
                <p className="text-[10px] text-p5 uppercase tracking-wider">{user?.role || 'User'}</p>
              </div>
            </Link>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-p5/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Navigation */}
        <aside
          className={clsx(
            'w-64 border-r border-[#222638] bg-[#11141e] flex flex-col justify-between p-4 z-30 transition-all duration-300',
            'max-lg:fixed max-lg:top-16 max-lg:bottom-0 max-lg:left-0',
            mobileMenuOpen ? 'max-lg:translate-x-0 shadow-2xl' : 'max-lg:-translate-x-full'
          )}
        >
          <div className="flex flex-col gap-6 overflow-y-auto pr-1">
            {/* Primary Section */}
            <div>
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-p5/60">
                Server Panel
              </div>
              <nav className="flex flex-col gap-1">
                <NavLink
                  to="/panel"
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={navItemClass}
                >
                  <LayoutDashboard size={18} className="transition-transform group-hover:scale-110" />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/panel/servers"
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={navItemClass}
                >
                  <Server size={18} className="transition-transform group-hover:scale-110" />
                  <span>Servers</span>
                </NavLink>

                <NavLink
                  to="/panel/servers/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className={navItemClass}
                >
                  <PlusCircle size={18} className="transition-transform group-hover:scale-110 text-p1" />
                  <span className="text-p1 font-medium">Create Server</span>
                </NavLink>

                <NavLink
                  to="/panel/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={navItemClass}
                >
                  <User size={18} className="transition-transform group-hover:scale-110" />
                  <span>Account & API</span>
                </NavLink>
              </nav>
            </div>

            {/* Administration Section (Owner/Admin) */}
            {isAdmin && (
              <div className="pt-4 border-t border-[#222638]/70">
                <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-p1/70 flex items-center gap-1.5">
                  <Shield size={12} />
                  <span>Administration</span>
                </div>
                <nav className="flex flex-col gap-1">
                  <NavLink
                    to="/panel/admin"
                    end
                    onClick={() => setMobileMenuOpen(false)}
                    className={navItemClass}
                  >
                    <Activity size={18} className="transition-transform group-hover:scale-110" />
                    <span>Overview</span>
                  </NavLink>

                  <NavLink
                    to="/panel/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navItemClass}
                  >
                    <Users size={18} className="transition-transform group-hover:scale-110" />
                    <span>Users</span>
                  </NavLink>

                  <NavLink
                    to="/panel/admin/nodes"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navItemClass}
                  >
                    <HardDrive size={18} className="transition-transform group-hover:scale-110" />
                    <span>Nodes</span>
                  </NavLink>

                  <NavLink
                    to="/panel/admin/allocations"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navItemClass}
                  >
                    <Network size={18} className="transition-transform group-hover:scale-110" />
                    <span>Allocations</span>
                  </NavLink>

                  <NavLink
                    to="/panel/admin/activity"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navItemClass}
                  >
                    <Activity size={18} className="transition-transform group-hover:scale-110" />
                    <span>Audit Logs</span>
                  </NavLink>
                </nav>
              </div>
            )}
          </div>

          {/* Bottom Footer Info */}
          <div className="pt-4 border-t border-[#222638] text-[11px] text-p5/60 flex items-center justify-between">
            <span>BreezeBytes v1.0.0</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online</span>
            </span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#08090d] p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PanelLayout;
