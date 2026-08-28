import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import {
  Server,
  Activity,
  HardDrive,
  Cpu,
  PlusCircle,
  ArrowUpRight,
  Loader2,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [serversRes, activityRes] = await Promise.all([
          api.get('/servers'),
          api.get('/account/activity').catch(() => ({ data: [] })),
        ]);

        if (serversRes.success) {
          setServers(serversRes.data || []);
        }
        if (activityRes.success) {
          setActivity(activityRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const runningCount = servers.filter((s) => s.status === 'running').length;
  const totalRam = servers.reduce((acc, s) => acc + (Number(s.memory) || 0), 0);
  const totalDisk = servers.reduce((acc, s) => acc + (Number(s.disk) || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="text-sm font-medium">Loading control plane metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-s1 via-[#11141e] to-s1 border border-[#222638] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-p1/10 border border-p1/30 text-p1 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>BreezeBytes Control Plane</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-p4 tracking-tight">
            Welcome back, <span className="text-p1">{user?.username}</span>
          </h1>
          <p className="text-sm text-p5 mt-2 leading-relaxed">
            Manage your Minecraft servers, console operations, backups, and player infrastructure in real-time.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Link
            to="/panel/servers/create"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-p1 text-black font-bold text-sm hover:bg-p1/90 shadow-lg shadow-p1/20 transition-all transform hover:scale-[1.02]"
          >
            <PlusCircle size={18} />
            <span>Create Server</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase tracking-wider">Total Servers</p>
            <p className="text-2xl sm:text-3xl font-bold text-p4 mt-1">{servers.length}</p>
            <p className="text-[11px] text-emerald-400 mt-1">{runningCount} online now</p>
          </div>
          <div className="size-12 rounded-xl bg-p1/10 border border-p1/30 flex items-center justify-center text-p1">
            <Server size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase tracking-wider">Allocated RAM</p>
            <p className="text-2xl sm:text-3xl font-bold text-p4 mt-1">{(totalRam / 1024).toFixed(1)} GB</p>
            <p className="text-[11px] text-p5 mt-1">{totalRam} MB total</p>
          </div>
          <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase tracking-wider">Allocated Storage</p>
            <p className="text-2xl sm:text-3xl font-bold text-p4 mt-1">{(totalDisk / 1024).toFixed(1)} GB</p>
            <p className="text-[11px] text-p5 mt-1">NVMe SSD</p>
          </div>
          <div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <HardDrive size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase tracking-wider">Node Status</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">Healthy</p>
            <p className="text-[11px] text-p5 mt-1">1 Node Connected</p>
          </div>
          <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Main Sections: Servers list + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Servers Preview (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <Server size={18} className="text-p1" />
              <span>Your Game Servers</span>
            </h2>
            <Link
              to="/panel/servers"
              className="text-xs text-p1 hover:underline font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {servers.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#11141e] border border-[#222638] text-center flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-full bg-p1/10 flex items-center justify-center text-p1">
                <Server size={24} />
              </div>
              <h3 className="text-base font-bold text-p4">No Servers Found</h3>
              <p className="text-xs text-p5 max-w-sm">
                You do not have any Minecraft servers yet. Create your first server to start playing!
              </p>
              <Link
                to="/panel/servers/create"
                className="mt-2 px-4 py-2 rounded-xl bg-p1 text-black font-semibold text-xs hover:bg-p1/90 transition-colors"
              >
                Create First Server
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {servers.slice(0, 4).map((server) => {
                const isOnline = server.status === 'running';
                const isStarting = server.status === 'starting';

                return (
                  <Link
                    key={server.id}
                    to={`/panel/servers/${server.id}/console`}
                    className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] hover:border-p1/40 transition-all duration-300 flex flex-col justify-between gap-4 group hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-base text-p4 group-hover:text-p1 transition-colors truncate">
                          {server.name}
                        </span>
                        <span
                          className={clsx(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            isOnline
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isStarting
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          )}
                        >
                          {server.status}
                        </span>
                      </div>

                      <p className="text-xs text-p5 font-mono">
                        {server.allocation ? `0.0.0.0:${server.allocation.port}` : 'No Port'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#222638] flex items-center justify-between text-xs text-p5">
                      <span className="capitalize">{server.software} {server.minecraft_version}</span>
                      <span className="font-medium text-p4">{server.memory} MB RAM</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed (1 Col) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <Activity size={18} className="text-p1" />
              <span>Recent Activity</span>
            </h2>
          </div>

          <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col gap-4 flex-1">
            {activity.length === 0 ? (
              <p className="text-xs text-p5 text-center my-auto py-6">No recent account activity.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-[#222638]/50 last:border-0 last:pb-0">
                    <div className="size-7 rounded-lg bg-s2 flex items-center justify-center text-p1 flex-shrink-0 mt-0.5">
                      <Clock size={14} />
                    </div>
                    <div className="text-xs flex-1 min-w-0">
                      <p className="font-semibold text-p4 truncate">{act.action.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-[10px] text-p5 mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
