import { useState, useEffect, useCallback } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  Cpu,
  Network,
  Settings,
  Play,
  Square,
  RotateCcw,
  XOctagon,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

const ServerLayout = () => {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { subscribe } = useSocket();
  const [server, setServer] = useState(null);
  const [status, setStatus] = useState('offline');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchServer = useCallback(async () => {
    try {
      const res = await api.get(`/servers/${serverId}`);
      if (res.success && res.data) {
        setServer(res.data);
        setStatus(res.data.status || 'offline');
      }
    } catch (err) {
      console.error('Failed to load server:', err);
      navigate('/panel/servers');
    } finally {
      setLoading(false);
    }
  }, [serverId, navigate]);

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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="body-3 font-medium">Loading server...</p>
      </div>
    );
  }

  if (!server) return null;

  const tabs = [
    { to: 'console', icon: Terminal, label: 'Console' },
    { to: 'files', icon: FolderOpen, label: 'Files' },
    { to: 'players', icon: Users, label: 'Players' },
    { to: 'backups', icon: Archive, label: 'Backups' },
    { to: 'schedules', icon: Calendar, label: 'Schedules' },
    { to: 'databases', icon: Database, label: 'Databases' },
    { to: 'startup', icon: Cpu, label: 'Startup' },
    { to: 'network', icon: Network, label: 'Network' },
    { to: 'settings', icon: Settings, label: 'Settings' },
  ];

  const serverAddress = server?.allocation
    ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
    : 'Unassigned';

  const isOnline = status === 'running';
  const isStarting = status === 'starting';
  const isStopping = status === 'stopping';

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Server Header ===== */}
      <div className="border-2 border-s3 rounded-3xl g7 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-500">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full border-2 border-s2 bg-s1 flex items-center justify-center shadow-500 flex-shrink-0">
            <img src="/images/detail-1.png" alt="" className="size-9 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="h6 text-p4">{server.name}</h1>
              <BreezeBadge
                status={status}
                pulse={isOnline || isStarting}
              >
                {status}
              </BreezeBadge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="body-3 text-p5 font-mono">{serverAddress}</p>
              {server?.allocation && (
                <button
                  onClick={copyAddress}
                  className="p-1 rounded-lg text-p5 hover:text-p1 transition-colors duration-500"
                  title="Copy Address"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Power Controls */}
        <div className="flex items-center gap-2">
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
            size="xs"
            icon={actionLoading === 'kill' ? Loader2 : XOctagon}
            onClick={() => handlePower('kill')}
            disabled={!isOnline && !isStarting && !isStopping}
            className="hidden sm:inline-flex"
          >
            Kill
          </BreezeButton>
        </div>
      </div>

      {/* ===== Tab Navigation ===== */}
      <div className="border-2 border-s3 rounded-3xl bg-s2 overflow-hidden">
        <div className="flex items-center gap-1 p-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={`/panel/servers/${serverId}/${tab.to}`}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-500',
                    isActive
                      ? 'g4 text-p1 border border-s4/30 shadow-400'
                      : 'text-p5 hover:text-p4 hover:bg-s5/40 border border-transparent',
                  )
                }
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* ===== Page Content ===== */}
      <Outlet context={{ server, status, fetchServer }} />
    </div>
  );
};

export default ServerLayout;
