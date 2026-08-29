import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeStatCard from '../../components/ui/BreezeStatCard.jsx';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezeEmptyState from '../../components/ui/BreezeEmptyState.jsx';
import {
  Cpu,
  HardDrive,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/servers');
        if (res.success) {
          setServers(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const totalMemory = servers.reduce((sum, s) => sum + (s.memory || 0), 0);
  const runningCount = servers.filter((s) => s.status === 'running').length;

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Welcome Banner ===== */}
      <BreezeCard gradient className="p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="caption">Dashboard</p>
            <h1 className="h5 text-p4">
              Welcome back, <span className="text-p1">{user?.username}</span>
            </h1>
            <p className="body-3 text-p5 mt-1">
              Manage your Minecraft servers from one place.
            </p>
          </div>

          <Link to="/panel/servers/create">
            <BreezeButton variant="primary" size="lg" icon="/images/magictouch.svg">
              Create Server
            </BreezeButton>
          </Link>
        </div>
      </BreezeCard>

      {/* ===== Quick Stats ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BreezeStatCard
          label="Total Servers"
          value={loading ? '—' : servers.length}
          image="/images/detail-1.png"
        />
        <BreezeStatCard
          label="Running"
          value={loading ? '—' : runningCount}
          subtitle={`of ${servers.length} servers`}
          image="/images/detail-3.png"
        />
        <BreezeStatCard
          label="Memory Used"
          value={loading ? '—' : `${(totalMemory / 1024).toFixed(1)} GB`}
          subtitle="Allocated across servers"
          image="/images/detail-2.png"
        />
      </div>

      {/* ===== Servers ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="h6 text-p4">Your Servers</h2>
          <Link to="/panel/servers">
            <BreezeButton variant="ghost" size="sm" iconRight={ArrowRight}>
              View All
            </BreezeButton>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
            <p className="body-3 font-medium">Loading servers...</p>
          </div>
        ) : servers.length === 0 ? (
          <BreezeEmptyState
            image="/images/detail-1.png"
            title="No Servers Yet"
            description="Create your first Minecraft server to get started. It only takes a minute."
            actionLabel="Create Server"
            actionHref="/panel/servers/create"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {servers.slice(0, 6).map((s) => (
              <Link key={s.id} to={`/panel/servers/${s.id}/console`}>
                <BreezeCard hover className="relative p-5 flex flex-col justify-between gap-4 h-full overflow-hidden group">
                  {/* Background Banner with Enhanced Opacity & Smooth Gradient Blend */}
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-55 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none"
                    style={{ backgroundImage: "url('/images/banners/server-card-bg.jpeg')" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-s2/95 via-s2/75 to-s2/30 pointer-events-none" />

                  {/* Card Content on Top */}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 rounded-2xl border-2 border-s3 bg-s1/90 backdrop-blur-sm flex items-center justify-center p-1.5 flex-shrink-0">
                        <img src="/images/detail-1.png" alt="" className="size-7 object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="base-bold text-p4 truncate group-hover:text-p1 transition-colors duration-300">
                          {s.name}
                        </h3>
                        <p className="small-2 text-p5 font-mono truncate">
                          {s.allocation
                            ? `${s.allocation.ip === '0.0.0.0' ? s.node?.fqdn || 'localhost' : s.allocation.ip}:${s.allocation.port}`
                            : 'No allocation'}
                        </p>
                      </div>
                    </div>
                    <BreezeBadge status={s.status || 'offline'} pulse={s.status === 'running'}>
                      {s.status || 'offline'}
                    </BreezeBadge>
                  </div>

                  <div className="relative z-10 flex items-center gap-3 pt-3 border-t-2 border-s3/80">
                    <div className="flex items-center gap-1.5 text-p5">
                      <Cpu size={13} className="text-p1" />
                      <span className="small-2">{s.memory} MB</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-p5">
                      <HardDrive size={13} className="text-emerald-400" />
                      <span className="small-2">{(s.disk / 1024).toFixed(1)} GB</span>
                    </div>
                    <span className="small-2 text-p5 capitalize ml-auto">{s.software || 'paper'}</span>
                  </div>
                </BreezeCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
