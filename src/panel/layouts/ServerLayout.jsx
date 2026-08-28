import { useEffect, useState, useCallback } from 'react';
import { useParams, NavLink, Outlet, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../services/api.js';
import {
  Terminal,
  FolderOpen,
  Archive,
  Calendar,
  Users,
  Database,
  Cpu,
  Network,
  Settings,
  Play,
  RotateCw,
  Square,
  Skull,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

const ServerLayout = () => {
  const { id } = useParams();
  const { subscribe } = useSocket();
  const [server, setServer] = useState(null);
  const [status, setStatus] = useState('offline');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchServer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${id}`);
      if (res.success && res.data) {
        setServer(res.data);
        setStatus(res.data.status || 'offline');
      }
    } catch (err) {
      setError(err.message || 'Failed to load server details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchServer();

    // Subscribe to real-time server status updates
    const unsubscribe = subscribe(`server:${id}:status`, (event, data) => {
      if (data && data.status) {
        setStatus(data.status);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id, fetchServer, subscribe]);

  const handlePower = async (action) => {
    try {
      setActionLoading(true);
      await api.post(`/servers/${id}/power`, { action });
    } catch (err) {
      alert(`Power action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="text-sm font-medium">Connecting to server control plane...</p>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center max-w-xl mx-auto my-12">
        <h3 className="text-lg font-bold text-red-400 mb-2">Server Unavailable</h3>
        <p className="text-sm text-p5 mb-6">{error || 'Server does not exist or you lack permission.'}</p>
        <Link
          to="/panel/servers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-s2 border border-[#222638] text-sm font-medium text-p4 hover:text-p1 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Servers</span>
        </Link>
      </div>
    );
  }

  const primaryAlloc = server.allocations?.find(a => a.isPrimary) || server.allocations?.[0];

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </span>
        );
      case 'starting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Loader2 size={12} className="animate-spin text-amber-400" />
            <span>Starting</span>
          </span>
        );
      case 'stopping':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
            <span>Stopping</span>
          </span>
        );
      case 'crashed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="size-2 rounded-full bg-red-400" />
            <span>Crashed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            <span className="size-2 rounded-full bg-zinc-500" />
            <span>Offline</span>
          </span>
        );
    }
  };

  const navTabClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200',
      isActive
        ? 'bg-p1 text-black font-bold shadow-md shadow-p1/20'
        : 'text-p5 hover:text-p4 hover:bg-s2/70 border border-transparent'
    );

  return (
    <div className="flex flex-col gap-6">
      {/* Server Header Banner */}
      <div className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <Link
            to="/panel/servers"
            className="p-2 rounded-xl border border-[#222638] bg-[#08090d] text-p5 hover:text-p1 hover:border-p1/40 transition-colors mt-0.5"
            title="Back to Servers"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-p4 tracking-tight">{server.name}</h1>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-p5 flex-wrap">
              <span className="font-mono bg-[#08090d] px-2 py-0.5 rounded border border-[#222638] text-p1">
                {primaryAlloc ? `${server.node?.fqdn || '0.0.0.0'}:${primaryAlloc.port}` : 'No Port Allocated'}
              </span>
              <span>•</span>
              <span className="capitalize">{server.software} {server.minecraft_version}</span>
              <span>•</span>
              <span>{server.memory} MB RAM</span>
              <span>•</span>
              <span>Node: {server.node?.name || 'Local Node'}</span>
            </div>
          </div>
        </div>

        {/* Power Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handlePower('start')}
            disabled={status === 'running' || status === 'starting' || actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <Play size={14} />
            <span>Start</span>
          </button>

          <button
            onClick={() => handlePower('restart')}
            disabled={status === 'offline' || actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <RotateCw size={14} />
            <span>Restart</span>
          </button>

          <button
            onClick={() => handlePower('stop')}
            disabled={status === 'offline' || status === 'stopping' || actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <Square size={14} />
            <span>Stop</span>
          </button>

          <button
            onClick={() => handlePower('kill')}
            disabled={status === 'offline' || actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-red-600 hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
            title="Force terminate process immediately"
          >
            <Skull size={14} />
            <span>Kill</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-1 scroll-hide border-b border-[#222638]">
        <NavLink to={`/panel/servers/${id}/console`} className={navTabClass}>
          <Terminal size={15} />
          <span>Console</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/files`} className={navTabClass}>
          <FolderOpen size={15} />
          <span>Files</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/backups`} className={navTabClass}>
          <Archive size={15} />
          <span>Backups</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/schedules`} className={navTabClass}>
          <Calendar size={15} />
          <span>Schedules</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/players`} className={navTabClass}>
          <Users size={15} />
          <span>Players</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/databases`} className={navTabClass}>
          <Database size={15} />
          <span>Databases</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/startup`} className={navTabClass}>
          <Cpu size={15} />
          <span>Startup</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/network`} className={navTabClass}>
          <Network size={15} />
          <span>Network</span>
        </NavLink>

        <NavLink to={`/panel/servers/${id}/settings`} className={navTabClass}>
          <Settings size={15} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Tab Page Outlet */}
      <div className="flex-1">
        <Outlet context={{ server, status, fetchServer }} />
      </div>
    </div>
  );
};

export default ServerLayout;
