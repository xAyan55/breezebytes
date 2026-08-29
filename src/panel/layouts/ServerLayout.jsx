import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../services/api.js';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
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
      await api.post(`/servers/${server.id}/power`, { action });
    } catch (err) {
      alert(`Power action failed: ${err.message}`);
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
      {/* ===== Mobile Sidebar Backdrop ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== Dedicated Server Sidebar ===== */}
      <aside
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-[240px] bg-s2 border-r-2 border-s3 flex flex-col z-50 transition-transform duration-500',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Top Branding */}
        <div className="p-5 pb-3">
          <Link
            to="/panel"
            className="flex items-center gap-2.5 group transition-transform duration-500 hover:scale-[1.02]"
          >
            <img
              src="/images/breeze-logo.png"
              width={32}
              height={32}
              alt="BreezeBytes"
              className="object-contain drop-shadow-md"
            />
            <span className="font-poppins font-bold text-base tracking-wider text-p4">
              Breeze<span className="text-p1">Bytes</span>
            </span>
          </Link>
        </div>

        {/* Server Identity Badge (Compact) */}
        <div className="px-4 py-2">
          <div className="p-3 rounded-2xl bg-s1/60 border border-s3/80 flex items-center gap-3">
            <div className="size-9 rounded-xl border border-s3 bg-s2 flex items-center justify-center p-1.5 flex-shrink-0 shadow-inner">
              <img src="/images/detail-1.png" alt="" className="size-6 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-p4 truncate" title={server.name}>
                {server.name}
              </h2>
              <div className="mt-1 flex items-center">
                <BreezeBadge
                  status={status}
                  pulse={isOnline || isStarting}
                  className="px-2 py-0.5 text-[9px]"
                >
                  {status}
                </BreezeBadge>
              </div>
            </div>
          </div>
        </div>

        {/* Server Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
          <p className="caption pl-3 mb-2 text-[11px]">Server</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchExact
              ? isConsoleActive
              : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-medium transition-all duration-500 group',
                  isActive
                    ? 'bg-s4/15 text-p1 border border-s4/30 shadow-400 font-semibold'
                    : 'text-p5 hover:text-p4 hover:bg-s5/40 border border-transparent',
                )}
              >
                <Icon
                  size={16}
                  className={clsx(
                    'flex-shrink-0 transition-colors duration-500',
                    isActive ? 'text-p1' : 'text-p5 group-hover:text-p4',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Pinned Bottom Navigation Action: Back to Servers */}
        <div className="px-4 py-4 border-t-2 border-s3 bg-s2">
          <Link
            to="/panel/servers"
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-p5 hover:text-p4 hover:bg-s5/40 border border-transparent transition-all duration-500"
          >
            <ArrowLeft size={16} className="text-p1 flex-shrink-0" />
            <span>Back to Servers</span>
          </Link>
        </div>
      </aside>

      {/* ===== Main Server Content Area ===== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-s2/95 backdrop-blur-md border-b-2 border-s3 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-2xl text-p5 hover:text-p4 hover:bg-s5/40 transition-all duration-500 border border-transparent"
            aria-label="Toggle Server Navigation"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2 truncate max-w-[200px]">
            <span className="font-semibold text-xs text-p4 truncate">{server.name}</span>
            <BreezeBadge status={status} pulse={isOnline || isStarting} className="px-1.5 py-0 text-[8px]">
              {status}
            </BreezeBadge>
          </div>

          <Link
            to="/panel/servers"
            className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/40 transition-colors"
            title="Back to Servers"
          >
            <ArrowLeft size={18} />
          </Link>
        </header>

        {/* Page Content & Server Header */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
          {/* ===== Server Header ===== */}
          <div className="border-2 border-s3 rounded-3xl g7 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-500 mb-6">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-12 rounded-2xl border-2 border-s2 bg-s1 flex items-center justify-center p-2 shadow-500 flex-shrink-0">
                <img src="/images/detail-1.png" alt="" className="size-8 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="h6 text-p4 truncate font-semibold">{server.name}</h1>
                  <BreezeBadge status={status} pulse={isOnline || isStarting}>
                    {status}
                  </BreezeBadge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-p5 font-mono truncate">{serverAddress}</p>
                  {server?.allocation && (
                    <button
                      onClick={copyAddress}
                      className="p-1 rounded-lg text-p5 hover:text-p1 transition-colors duration-500 cursor-pointer"
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

            {/* Power Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <BreezeButton
                variant="primary"
                size="sm"
                icon={actionLoading === 'start' ? Loader2 : Play}
                onClick={() => handlePower('start')}
                disabled={isOnline || isStarting}
              >
                Start
              </BreezeButton>
              <BreezeButton
                variant="warning"
                size="sm"
                icon={actionLoading === 'restart' ? Loader2 : RotateCcw}
                onClick={() => handlePower('restart')}
                disabled={!isOnline}
              >
                Restart
              </BreezeButton>
              <BreezeButton
                variant="destructive"
                size="sm"
                icon={actionLoading === 'stop' ? Loader2 : Square}
                onClick={() => handlePower('stop')}
                disabled={!isOnline && !isStarting}
              >
                Stop
              </BreezeButton>
              <BreezeButton
                variant="destructive"
                size="sm"
                icon={actionLoading === 'kill' ? Loader2 : XOctagon}
                onClick={() => handlePower('kill')}
                disabled={!isOnline && !isStarting && !isStopping}
              >
                Kill
              </BreezeButton>
            </div>
          </div>

          {/* ===== Page Content Outlet ===== */}
          <div className="flex-1 flex flex-col min-w-0">
            <Outlet context={{ server, status, fetchServer }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ServerLayout;
