import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeStatCard from '../../components/ui/BreezeStatCard.jsx';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezeEmptyState from '../../components/ui/BreezeEmptyState.jsx';
import BreezeIcon from '../../components/ui/BreezeIcon.jsx';
import { BreezeCardSkeleton, BreezeSkeleton } from '../../components/ui/BreezeSkeleton.jsx';
import SoftwareIcon from '../../components/ui/SoftwareIcons.jsx';
import {
  ArrowRight,
  PlusCircle,
  Copy,
  Check,
  Activity,
  Terminal,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch servers list and recent user activity concurrently
      const [serversRes, activityRes] = await Promise.all([
        api.get('/servers'),
        api.get('/account/activity').catch(() => ({ success: false, data: [] })),
      ]);

      if (serversRes.success) {
        setServers(serversRes.data || []);
      } else {
        throw new Error(serversRes.error?.message || 'Failed to fetch servers');
      }

      if (activityRes.success) {
        setActivity(activityRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Unable to connect to the control plane.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const copyAddress = (server, e) => {
    e.preventDefault();
    e.stopPropagation();
    const addr = server.allocation
      ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
      : '';
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopiedId(server.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Aggregated operational stats from real server list
  const totalServers = servers.length;
  const runningServers = servers.filter((s) => s.status === 'running').length;
  const totalRamMb = servers.reduce((acc, s) => acc + (s.memory || 0), 0);
  const totalDiskMb = servers.reduce((acc, s) => acc + (s.disk || 0), 0);

  const formatGb = (mb) => {
    if (!mb) return '0 GB';
    const gb = (mb / 1024).toFixed(1);
    return `${gb.endsWith('.0') ? parseInt(gb, 10) : gb} GB`;
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* ===== Hero Greeting Section ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-s3/80 pb-6">
        <div>
          <h1 className="h4 text-p4 tracking-tight">
            {getGreeting()}, <span className="text-p1 capitalize">{user?.username || 'Host'}</span>
          </h1>
          <p className="body-3 text-p5 mt-1">
            Welcome to your BreezeBytes control center. Manage your live Minecraft instances below.
          </p>
        </div>

        <Link to="/panel/servers/create">
          <BreezeButton variant="primary" size="md" icon={PlusCircle}>
            Create Server
          </BreezeButton>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-between gap-3 text-red-400 text-xs">
          <div className="flex items-center gap-2.5">
            <BreezeIcon icon={AlertCircle} size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <BreezeButton variant="secondary" size="xs" icon={RefreshCw} onClick={fetchDashboardData}>
            Retry
          </BreezeButton>
        </div>
      )}

      {/* ===== 4 Real Operational Stat Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BreezeStatCard
          label="Servers"
          value={loading ? '...' : totalServers}
          subtitle="Total instances provisioned"
          icon="Server"
        />
        <BreezeStatCard
          label="Online"
          value={loading ? '...' : runningServers}
          subtitle="Currently active & playing"
          icon="Cpu"
          iconClassName="text-emerald-400"
        />
        <BreezeStatCard
          label="RAM Allocated"
          value={loading ? '...' : formatGb(totalRamMb)}
          subtitle="Aggregated memory pool"
          icon="HardDrive"
        />
        <BreezeStatCard
          label="Storage Allocated"
          value={loading ? '...' : formatGb(totalDiskMb)}
          subtitle="Total NVMe storage assigned"
          icon="Activity"
        />
      </div>

      {/* ===== Your Servers Workspace ===== */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BreezeIcon icon="Server" size={20} className="text-p1" />
            <h2 className="base-bold text-p4 text-base tracking-wide">Your Servers</h2>
            {!loading && servers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-s2 border border-s3 text-p5 font-mono">
                {servers.length}
              </span>
            )}
          </div>

          {servers.length > 0 && (
            <Link
              to="/panel/servers"
              className="text-xs font-semibold text-p1 hover:underline flex items-center gap-1 group"
            >
              <span>View all servers</span>
              <BreezeIcon icon={ArrowRight} size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* Server Cards Grid */}
        {loading ? (
          <BreezeCardSkeleton count={3} />
        ) : servers.length === 0 ? (
          <BreezeEmptyState
            image="/images/detail-1.png"
            title="No Servers Provisioned"
            description="You don't have any active Minecraft servers yet. Deploy your first Paper, Purpur, or Fabric server in under 30 seconds."
            actionLabel="Create Server"
            actionHref="/panel/servers/create"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {servers.map((server) => {
              const address = server.allocation
                ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
                : 'Unassigned';

              return (
                <BreezeCard
                  key={server.id}
                  className="p-5 flex flex-col justify-between gap-5 group hover:border-s4 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex flex-col gap-3.5">
                    {/* Header: Icon + Title + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 rounded-2xl bg-s1 border-2 border-s3 flex items-center justify-center p-2 flex-shrink-0 group-hover:border-s4 transition-colors">
                          <SoftwareIcon software={server.software} size={22} className="text-p1" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/panel/servers/${server.id}/console`}
                            className="base-bold text-p4 hover:text-p1 transition-colors truncate block text-sm font-semibold"
                            title={server.name}
                          >
                            {server.name}
                          </Link>
                          <p className="text-[11px] text-p5/70 font-mono capitalize">
                            {server.software || 'Paper'} {server.minecraft_version || ''}
                          </p>
                        </div>
                      </div>

                      <BreezeBadge
                        status={server.status || 'offline'}
                        pulse={server.status === 'running' || server.status === 'starting'}
                        className="px-2 py-0.5 text-[9px] flex-shrink-0"
                      >
                        {server.status || 'offline'}
                      </BreezeBadge>
                    </div>

                    {/* Address pill */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-s1 border border-s3 text-xs font-mono">
                      <span className="text-p4/90 truncate tracking-wide select-all text-[11px]">{address}</span>
                      {server.allocation && (
                        <button
                          onClick={(e) => copyAddress(server, e)}
                          className="p-1 rounded-md text-p5 hover:text-p1 transition-colors cursor-pointer flex-shrink-0 ml-2"
                          title="Copy Server Address"
                        >
                          {copiedId === server.id ? (
                            <BreezeIcon icon={Check} size={14} className="text-emerald-400" />
                          ) : (
                            <BreezeIcon icon={Copy} size={14} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Quick Specs Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                      <div className="p-2 rounded-xl bg-s1/60 border border-s3/80">
                        <span className="text-[9px] text-p5 uppercase font-sans font-semibold block">RAM</span>
                        <span className="text-p4 font-bold text-xs mt-0.5 block">{formatGb(server.memory)}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-s1/60 border border-s3/80">
                        <span className="text-[9px] text-p5 uppercase font-sans font-semibold block">Disk</span>
                        <span className="text-p4 font-bold text-xs mt-0.5 block">{formatGb(server.disk)}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-s1/60 border border-s3/80">
                        <span className="text-[9px] text-p5 uppercase font-sans font-semibold block">CPU</span>
                        <span className="text-p4 font-bold text-xs mt-0.5 block">{server.cpu || 100}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-3 border-t-2 border-s3/80 flex items-center justify-between">
                    <span className="text-[11px] text-p5/70 font-mono">
                      Port: #{server.allocation?.port || 'N/A'}
                    </span>
                    <Link
                      to={`/panel/servers/${server.id}/console`}
                      className="text-xs font-semibold text-p1 hover:underline flex items-center gap-1 group/link"
                    >
                      <span>Open Console</span>
                      <BreezeIcon icon={ArrowRight} size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </BreezeCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Recent Activity Feed ===== */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <BreezeIcon icon={Activity} size={20} className="text-p1" />
          <h2 className="base-bold text-p4 text-base tracking-wide">Recent Activity</h2>
        </div>

        <BreezeCard className="overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              <BreezeSkeleton className="h-6 w-3/4" />
              <BreezeSkeleton className="h-6 w-1/2" />
              <BreezeSkeleton className="h-6 w-2/3" />
            </div>
          ) : activity.length === 0 ? (
            <div className="p-10 text-center text-p5 text-xs flex flex-col items-center justify-center gap-2">
              <BreezeIcon icon={Terminal} size={28} className="text-p5/40 mb-1" />
              <p className="font-semibold text-p4">No recent activity logged</p>
              <p className="text-[11px] text-p5/70">Server creations, starts, and modifications will show up here in real time.</p>
            </div>
          ) : (
            <div className="divide-y divide-s3/60 font-mono text-xs">
              {activity.slice(0, 6).map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-s5/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                      <BreezeIcon icon={Terminal} size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-p4 font-semibold font-sans capitalize truncate">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] text-p5/70 truncate">
                        {log.server_id ? `Server #${log.server_id}` : 'Control Plane Operation'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-p5 font-sans whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </BreezeCard>
      </div>
    </div>
  );
};

export default Dashboard;
