import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeStatCard from '../../components/ui/BreezeStatCard.jsx';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezeEmptyState from '../../components/ui/BreezeEmptyState.jsx';
import { BreezeCardSkeleton, BreezeSkeleton } from '../../components/ui/BreezeSkeleton.jsx';
import SoftwareIcon from '../../components/ui/SoftwareIcons.jsx';
import {
  Cpu,
  HardDrive,
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
      const [serversRes, activityRes] = await Promise.all([
        api.get('/servers'),
        api.get('/account/activity').catch(() => ({ success: true, data: [] })),
      ]);

      if (serversRes.success) {
        setServers(serversRes.data || []);
      } else {
        throw new Error(serversRes.error?.message || 'Unable to fetch servers');
      }

      if (activityRes.success) {
        setActivity(activityRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Something went wrong while fetching your servers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const copyAddress = (e, addr, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalMemory = servers.reduce((sum, s) => sum + (Number(s.memory) || 0), 0);
  const totalDisk = servers.reduce((sum, s) => sum + (Number(s.disk) || 0), 0);
  const runningCount = servers.filter((s) => s.status === 'running').length;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* ===== Global Page Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="caption">Dashboard</p>
          <h1 className="h6 text-p4 font-semibold">
            {getGreeting()}, <span className="text-p1 font-bold">{user?.username}</span>
          </h1>
          <p className="body-3 text-p5 mt-1">
            Here&apos;s an operational overview of your Minecraft servers and resource usage.
          </p>
        </div>

        <Link to="/panel/servers/create" className="flex-shrink-0">
          <BreezeButton variant="primary" size="md" icon={PlusCircle}>
            Create Server
          </BreezeButton>
        </Link>
      </div>

      {/* ===== Error State with Retry ===== */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-between gap-4 text-xs text-red-400">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <BreezeButton
            variant="outline"
            size="xs"
            icon={RefreshCw}
            onClick={fetchDashboardData}
          >
            Retry
          </BreezeButton>
        </div>
      )}

      {/* ===== 4 Quick Stat Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BreezeStatCard
          label="Servers"
          value={loading ? '—' : servers.length}
          subtitle="Total instances"
          image="/images/detail-1.png"
        />
        <BreezeStatCard
          label="Online"
          value={loading ? '—' : runningCount}
          subtitle={`${servers.length - runningCount} offline`}
          image="/images/detail-3.png"
        />
        <BreezeStatCard
          label="RAM Allocated"
          value={loading ? '—' : `${(totalMemory / 1024).toFixed(1)} GB`}
          subtitle="Memory assigned"
          image="/images/detail-2.png"
        />
        <BreezeStatCard
          label="Storage Allocated"
          value={loading ? '—' : `${(totalDisk / 1024).toFixed(1)} GB`}
          subtitle="Disk storage assigned"
          image="/images/detail-4.png"
        />
      </div>

      {/* ===== Section: Your Servers ===== */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="base-bold text-p4">Your Servers</h2>
            <p className="small-2 text-p5">Active instances running on BreezeBytes nodes</p>
          </div>
          {servers.length > 0 && (
            <Link to="/panel/servers">
              <BreezeButton variant="ghost" size="sm" iconRight={ArrowRight}>
                View All ({servers.length})
              </BreezeButton>
            </Link>
          )}
        </div>

        {loading ? (
          <BreezeCardSkeleton count={3} />
        ) : servers.length === 0 ? (
          <BreezeEmptyState
            image="/images/detail-1.png"
            title="No servers yet"
            description="Create your first Minecraft server to get started. It only takes a minute."
            actionLabel="Create Server"
            actionHref="/panel/servers/create"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {servers.slice(0, 6).map((s) => {
              const serverAddress = s.allocation
                ? `${s.allocation.ip === '0.0.0.0' ? s.node?.fqdn || 'localhost' : s.allocation.ip}:${s.allocation.port}`
                : 'Unassigned';

              return (
                <Link key={s.id} to={`/panel/servers/${s.id}/console`}>
                  <BreezeCard
                    hover
                    className="relative p-5 flex flex-col justify-between gap-4 h-full overflow-hidden group"
                  >
                    {/* Background Banner with Enhanced Opacity & Smooth Gradient Blend */}
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                      style={{ backgroundImage: "url('/images/banners/server-card-bg.jpeg')" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-s2/95 via-s2/80 to-s2/40 pointer-events-none" />

                    {/* Card Content Top */}
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 rounded-2xl border-2 border-s3 bg-s1/90 backdrop-blur-sm flex items-center justify-center p-1.5 flex-shrink-0 shadow-sm">
                          <SoftwareIcon software={s.software} size={20} className="text-p1" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="base-bold text-p4 truncate group-hover:text-p1 transition-colors duration-300">
                            {s.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="small-2 text-p5 font-mono truncate">{serverAddress}</span>
                            {s.allocation && (
                              <button
                                onClick={(e) => copyAddress(e, serverAddress, s.id)}
                                className="p-0.5 rounded text-p5/70 hover:text-p1 transition-colors"
                                title="Copy Address"
                              >
                                {copiedId === s.id ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <BreezeBadge status={s.status || 'offline'} pulse={s.status === 'running'}>
                        {s.status || 'offline'}
                      </BreezeBadge>
                    </div>

                    {/* Card Content Footer */}
                    <div className="relative z-10 flex items-center justify-between pt-3 border-t-2 border-s3/80 text-xs">
                      <div className="flex items-center gap-3 text-p5 font-mono">
                        <div className="flex items-center gap-1">
                          <Cpu size={13} className="text-p1" />
                          <span>{s.memory || 2048}M</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive size={13} className="text-emerald-400" />
                          <span>{((s.disk || 10000) / 1024).toFixed(0)}G</span>
                        </div>
                        <span className="capitalize text-p5/80 hidden sm:inline">
                          {s.software || 'paper'}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-p1 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Open Console <ArrowRight size={13} />
                      </span>
                    </div>
                  </BreezeCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Section: Recent Activity ===== */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="base-bold text-p4 flex items-center gap-2">
            <Activity size={18} className="text-p1" />
            <span>Recent Activity</span>
          </h2>
          <p className="small-2 text-p5">Recent operations, lifecycle triggers, and deployments</p>
        </div>

        <BreezeCard className="overflow-hidden">
          {loading ? (
            <div className="p-6 flex flex-col gap-3">
              <BreezeSkeleton className="h-8 w-full" />
              <BreezeSkeleton className="h-8 w-full" />
              <BreezeSkeleton className="h-8 w-full" />
            </div>
          ) : activity.length === 0 ? (
            <div className="p-8 text-center text-p5 small-2">
              No recent activity recorded.
            </div>
          ) : (
            <div className="divide-y divide-s3/60 font-mono text-xs">
              {activity.slice(0, 5).map((log) => {
                let meta = {};
                try {
                  meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata || {};
                } catch {
                  // ignore
                }

                return (
                  <div key={log.id} className="p-4 flex items-center justify-between flex-wrap gap-2 hover:bg-s5/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                        <Terminal size={14} />
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-p4 capitalize block">
                          {log.action?.replace(/_/g, ' ') || 'Action'}
                        </span>
                        <span className="text-p5 text-[11px]">
                          {meta.name ? `Server: ${meta.name}` : `Server #${log.server_id || 'System'}`}
                        </span>
                      </div>
                    </div>

                    <span className="text-p5 text-[11px] font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </BreezeCard>
      </div>
    </div>
  );
};

export default Dashboard;
