import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../services/api.js';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import SoftwareIcon from '../../components/ui/SoftwareIcons.jsx';
import {
  Terminal,
  FolderOpen,
  Users,
  Archive,
  Calendar,
  Database,
  Network,
  Settings,
  Play,
  Square,
  RotateCcw,
  XOctagon,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Menu,
  X,
  PanelLeft,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerLayout = () => {
  const { id, serverId } = useParams();
  const effectiveId = id || serverId;
  const navigate = useNavigate();
  const location = useLocation();
  const { subscribe } = useSocket();
  const [server, setServer] = useState(null);
  const [status, setStatus] = useState('offline');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('bb_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Save collapsed preference
  useEffect(() => {
    try {
      localStorage.setItem('bb_sidebar_collapsed', String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar & Escape to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const fetchServer = useCallback(async () => {
    if (!effectiveId) {
      navigate('/panel/servers');
      return;
    }
    try {
      const res = await api.get(`/servers/${effectiveId}`);
      if (res.success && res.data) {
        setServer(res.data);
        setStatus(res.data.status || 'offline');
      } else {
        navigate('/panel/servers');
      }
    } catch (err) {
      console.error('Failed to load server:', err);
      navigate('/panel/servers');
    } finally {
      setLoading(false);
    }
  }, [effectiveId, navigate]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  useEffect(() => {
    if (!server?.id) return;
    const unsub = subscribe(`server:${server.id}:status`, (event, data) => {
      if (event === 'status_change' && data?.status) {
        setStatus(data.status);
      }
    });
    return () => unsub();
  }, [server?.id, subscribe]);

  const handlePower = async (action) => {
    if (actionLoading) return;
    try {
      setActionLoading(action);
      setErrorMessage(null);
      await api.post(`/servers/${server.id}/power`, { action });
    } catch (err) {
      setErrorMessage(`Power action "${action}" failed: ${err.message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const copyAddress = () => {
    const addr =
      server?.allocation
        ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
        : '';
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-s1 flex flex-col items-center justify-center gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="body-3 font-medium">Loading server workspace...</p>
      </div>
    );
  }

  if (!server) return null;

  const navItems = [
    { to: `/panel/servers/${effectiveId}/console`, icon: Terminal, label: 'Console', matchExact: true },
    { to: `/panel/servers/${effectiveId}/files`, icon: FolderOpen, label: 'Files' },
    { to: `/panel/servers/${effectiveId}/players`, icon: Users, label: 'Players' },
    { to: `/panel/servers/${effectiveId}/backups`, icon: Archive, label: 'Backups' },
    { to: `/panel/servers/${effectiveId}/schedules`, icon: Calendar, label: 'Schedules' },
    { to: `/panel/servers/${effectiveId}/databases`, icon: Database, label: 'Databases' },
    { to: `/panel/servers/${effectiveId}/network`, icon: Network, label: 'Network' },
    { to: `/panel/servers/${effectiveId}/settings`, icon: Settings, label: 'Settings' },
  ];

  const serverAddress = server?.allocation
    ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
    : 'Unassigned';

  const isOnline = status === 'running';
  const isStarting = status === 'starting';
  const isStopping = status === 'stopping';

  const isConsoleActive =
    location.pathname === `/panel/servers/${effectiveId}` ||
    location.pathname === `/panel/servers/${effectiveId}/` ||
    location.pathname === `/panel/servers/${effectiveId}/console`;

  return (
    <div className="min-h-screen bg-s1 flex">
      {/* ===== Mobile Backdrop ===== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ===== Dedicated Server Sidebar ===== */}
      <aside
        data-collapsed={collapsed}
        className={clsx(
          'fixed top-0 left-0 bottom-0 bg-s2 border-r-2 border-s3 flex flex-col z-50 transition-all duration-300 ease-in-out',
          'lg:static lg:z-auto',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]',
          mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b-2 border-s3 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <Link
              to="/panel"
              className={clsx(
                'flex items-center gap-2.5 group transition-transform duration-300 hover:scale-[1.02] min-w-0',
                collapsed && 'lg:mx-auto',
              )}
            >
              <img
                src="/images/breeze-logo.png"
                width={32}
                height={32}
                alt="BreezeBytes"
                className="object-contain flex-shrink-0 drop-shadow-md"
              />
              {(!collapsed || mobileOpen) && (
                <span className="font-poppins font-bold text-base tracking-wider text-p4 truncate">
                  Breeze<span className="text-p1">Bytes</span>
                </span>
              )}
            </Link>

            {/* Collapse Trigger Button (Desktop) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-xl text-p5 hover:text-p4 hover:bg-s5/60 transition-colors cursor-pointer"
              title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
            >
              <PanelLeft size={18} />
            </button>

            {/* Close Button (Mobile) */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-2 rounded-xl text-p5 hover:text-p4 hover:bg-s5/60 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Server Identity Card in Sidebar */}
          {(!collapsed || mobileOpen) ? (
            <div className="p-3 rounded-2xl bg-s1/70 border border-s3/80 flex items-center gap-3">
              <div className="size-9 rounded-xl border border-s3 bg-s2 flex items-center justify-center p-1.5 flex-shrink-0 shadow-inner">
                <SoftwareIcon software={server.software} size={18} className="text-p1" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs font-bold text-p4 truncate" title={server.name}>
                  {server.name}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <BreezeBadge
                    status={status}
                    pulse={isOnline || isStarting}
                    className="px-2 py-0.5 text-[9px]"
                  >
                    {status}
                  </BreezeBadge>
                  <span className="text-[10px] text-p5/70 font-mono capitalize truncate">
                    {server.software || 'Paper'} {server.minecraft_version || ''}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="size-10 mx-auto rounded-xl border border-s3 bg-s1/80 flex items-center justify-center p-1.5 relative group cursor-default"
              title={`${server.name} (${status}) - ${server.software || 'Paper'} ${server.minecraft_version || ''}`}
            >
              <SoftwareIcon software={server.software} size={18} className="text-p1" />
              <span
                className={clsx(
                  'absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-s2',
                  isOnline ? 'bg-emerald-400' : 'bg-p5/40',
                )}
              />
            </div>
          )}
        </div>

        {/* Sidebar Content / Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1.5">
          {(!collapsed || mobileOpen) && (
            <p className="caption pl-3 mb-1 text-[11px] font-bold text-p3 uppercase tracking-wider">
              Server Workspace
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchExact
              ? isConsoleActive
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed && !mobileOpen ? item.label : undefined}
                className={clsx(
                  'flex items-center rounded-2xl transition-all duration-300 group relative',
                  collapsed && !mobileOpen
                    ? 'justify-center size-11 mx-auto'
                    : 'gap-3.5 px-3.5 py-2.5 text-sm font-medium',
                  isActive
                    ? 'bg-s4/20 text-p1 font-semibold border border-s4/40 shadow-sm'
                    : 'text-p5 hover:text-p4 hover:bg-s5/50 border border-transparent',
                )}
              >
                <Icon
                  size={18}
                  className={clsx(
                    'flex-shrink-0 transition-colors duration-300',
                    isActive ? 'text-p1' : 'text-p5/70 group-hover:text-p4',
                  )}
                />
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (Pinned at Bottom) */}
        <div className="px-3 py-3 border-t-2 border-s3 bg-s2">
          <Link
            to="/panel/servers"
            title={collapsed && !mobileOpen ? 'Back to Servers' : undefined}
            className={clsx(
              'flex items-center rounded-2xl text-sm font-semibold text-p5 hover:text-p4 hover:bg-s5/50 border border-transparent transition-all duration-300',
              collapsed && !mobileOpen
                ? 'justify-center size-11 mx-auto'
                : 'gap-3 px-3.5 py-2.5',
            )}
          >
            <ArrowLeft size={18} className="text-p1 flex-shrink-0" />
            {(!collapsed || mobileOpen) && <span>Back to Servers</span>}
          </Link>
        </div>
      </aside>

      {/* ===== Main Workspace Content Area ===== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header Bar (< 1024px) */}
        <header className="lg:hidden sticky top-0 z-30 bg-s2/95 backdrop-blur-md border-b-2 border-s3 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-p5 hover:text-p4 hover:bg-s5/50 transition-colors"
            aria-label="Toggle Server Navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2 truncate max-w-[200px]">
            <span className="font-semibold text-xs text-p4 truncate">{server.name}</span>
            <BreezeBadge status={status} pulse={isOnline || isStarting} className="px-1.5 py-0 text-[8px]">
              {status}
            </BreezeBadge>
          </div>

          <Link
            to="/panel/servers"
            className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/50 transition-colors"
            title="Back to Servers"
          >
            <ArrowLeft size={18} />
          </Link>
        </header>

        {/* Page Content Centered */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
          <div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
            {/* Error Notification Banner if power action fails */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center gap-2.5 text-xs text-red-400">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ===== Persistent Global Server Header ===== */}
            <div className="relative border-2 border-s3 rounded-2xl bg-s2 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 overflow-hidden">
              {/* Banner Image with high visibility and smooth dark vignette blend */}
              <div
                className="absolute inset-0 bg-cover bg-[center_30%] opacity-50 pointer-events-none"
                style={{ backgroundImage: "url('/images/banners/server-banner.jpeg')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-s1/90 via-s1/60 to-s1/70 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-s1/70 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                <div className="size-11 rounded-xl border border-s3 bg-s1/90 backdrop-blur-md flex items-center justify-center p-1.5 flex-shrink-0 shadow-md">
                  <SoftwareIcon software={server.software} size={22} className="text-p1" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="h6 text-p4 truncate font-bold drop-shadow-md">{server.name}</h1>
                    <BreezeBadge status={status} pulse={isOnline || isStarting}>
                      {status}
                    </BreezeBadge>
                    <span className="text-xs text-p5 font-mono px-2 py-0.5 rounded-lg bg-s1/80 border border-s3 capitalize hidden md:inline">
                      {server.software || 'Paper'} {server.minecraft_version || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-p4/90 font-mono tracking-wide truncate drop-shadow">{serverAddress}</p>
                    {server?.allocation && (
                      <button
                        onClick={copyAddress}
                        className="p-1 rounded-lg text-p4 hover:text-p1 bg-s1/40 backdrop-blur-sm border border-s3/40 transition-colors duration-300 cursor-pointer"
                        title="Copy Server Address"
                      >
                        {copied ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* State-Aware Power Controls */}
              <div className="relative z-10 flex items-center gap-2 flex-wrap sm:flex-nowrap bg-s1/50 backdrop-blur-sm p-1 rounded-2xl border border-s3/40">
                <BreezeButton
                  variant="primary"
                  size="sm"
                  icon={actionLoading === 'start' ? Loader2 : Play}
                  loading={actionLoading === 'start'}
                  onClick={() => handlePower('start')}
                  disabled={isOnline || isStarting || !!actionLoading}
                >
                  Start
                </BreezeButton>
                <BreezeButton
                  variant="warning"
                  size="sm"
                  icon={actionLoading === 'restart' ? Loader2 : RotateCcw}
                  loading={actionLoading === 'restart'}
                  onClick={() => handlePower('restart')}
                  disabled={!isOnline || !!actionLoading}
                >
                  Restart
                </BreezeButton>
                <BreezeButton
                  variant="destructive"
                  size="sm"
                  icon={actionLoading === 'stop' ? Loader2 : Square}
                  loading={actionLoading === 'stop'}
                  onClick={() => handlePower('stop')}
                  disabled={(!isOnline && !isStarting) || !!actionLoading}
                >
                  Stop
                </BreezeButton>
                <BreezeButton
                  variant="destructive"
                  size="sm"
                  icon={actionLoading === 'kill' ? Loader2 : XOctagon}
                  loading={actionLoading === 'kill'}
                  onClick={() => handlePower('kill')}
                  disabled={(!isOnline && !isStarting && !isStopping) || !!actionLoading}
                >
                  Kill
                </BreezeButton>
              </div>
            </div>

            {/* ===== Page Content Outlet ===== */}
            <div className="flex-1 flex flex-col min-w-0 w-full">
              <Outlet context={{ server, status, fetchServer }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServerLayout;
