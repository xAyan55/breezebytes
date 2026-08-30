import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezePageHeader from '../../components/ui/BreezePageHeader.jsx';
import BreezeEmptyState from '../../components/ui/BreezeEmptyState.jsx';
import BreezeIcon from '../../components/ui/BreezeIcon.jsx';
import { BreezeCardSkeleton } from '../../components/ui/BreezeSkeleton.jsx';
import SoftwareIcon from '../../components/ui/SoftwareIcons.jsx';
import {
  Server,
  Cpu,
  HardDrive,
  Search,
  PlusCircle,
  Copy,
  Check,
  ArrowRight,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerList = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const searchInputRef = useRef(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/servers');
      if (res.success) {
        setServers(res.data || []);
      } else {
        throw new Error(res.error?.message || 'Failed to fetch servers');
      }
    } catch (err) {
      console.error('Failed to load server list:', err);
      setError(err.message || 'Unable to connect to the control plane.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

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

  const formatGb = (mb) => {
    if (!mb) return '0 GB';
    const gb = (mb / 1024).toFixed(1);
    return `${gb.endsWith('.0') ? parseInt(gb, 10) : gb} GB`;
  };

  // Filter & Search logic
  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.software && s.software.toLowerCase().includes(search.toLowerCase())) ||
      (s.allocation && String(s.allocation.port).includes(search));

    if (!matchesSearch) return false;
    if (filter === 'running') return s.status === 'running';
    if (filter === 'offline') return s.status === 'offline' || !s.status;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* ===== Page Header ===== */}
      <BreezePageHeader
        caption="Control Center"
        title="My Servers"
        description="View, manage, and configure your deployed Minecraft instances."
        icon={Server}
      >
        <Link to="/panel/servers/create">
          <BreezeButton variant="primary" size="md" icon={PlusCircle}>
            Create Server
          </BreezeButton>
        </Link>
      </BreezePageHeader>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-between gap-3 text-red-400 text-xs">
          <div className="flex items-center gap-2.5">
            <BreezeIcon icon={AlertCircle} size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <BreezeButton variant="secondary" size="xs" icon={RefreshCw} onClick={fetchServers}>
            Retry
          </BreezeButton>
        </div>
      )}

      {/* ===== Filters & Search Toolbar ===== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-s2 border-2 border-s3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <BreezeIcon icon={Search} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-p5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by server name, software, or port..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-s1 border border-s3 rounded-xl pl-9 pr-8 py-2 text-xs text-p4 placeholder:text-p5/50 focus:outline-none focus:border-s4 transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-p5 hover:text-p4"
            >
              <BreezeIcon icon={X} size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-s1 rounded-xl border border-s3 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-3 py-1 rounded-lg font-medium transition-colors',
              filter === 'all'
                ? 'bg-s4/30 text-p1 font-semibold'
                : 'text-p5 hover:text-p4',
            )}
          >
            All ({servers.length})
          </button>
          <button
            onClick={() => setFilter('running')}
            className={clsx(
              'px-3 py-1 rounded-lg font-medium transition-colors',
              filter === 'running'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                : 'text-p5 hover:text-p4',
            )}
          >
            Running ({servers.filter((s) => s.status === 'running').length})
          </button>
          <button
            onClick={() => setFilter('offline')}
            className={clsx(
              'px-3 py-1 rounded-lg font-medium transition-colors',
              filter === 'offline'
                ? 'bg-s3 text-p4 font-semibold'
                : 'text-p5 hover:text-p4',
            )}
          >
            Offline ({servers.filter((s) => s.status !== 'running').length})
          </button>
        </div>
      </div>

      {/* ===== Grid of Server Cards ===== */}
      {loading ? (
        <BreezeCardSkeleton count={6} />
      ) : filteredServers.length === 0 ? (
        search || filter !== 'all' ? (
          <div className="p-12 border-2 border-s3 rounded-3xl bg-s2 text-center flex flex-col items-center justify-center gap-2">
            <BreezeIcon icon={Search} size={28} className="text-p5/40 mb-1" />
            <h3 className="h6 text-p4">No matching servers</h3>
            <p className="body-3 text-p5 max-w-sm">No servers match your active filter query &ldquo;{search}&rdquo;.</p>
            <BreezeButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="mt-2"
            >
              Clear filters
            </BreezeButton>
          </div>
        ) : (
          <BreezeEmptyState
            image="/images/detail-1.png"
            title="No Servers Provisioned"
            description="You don't have any active Minecraft servers yet. Deploy your first Paper, Purpur, or Fabric server in under 30 seconds."
            actionLabel="Create Server"
            actionHref="/panel/servers/create"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((server) => {
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
                          <BreezeIcon icon={Check} size={13} />
                        ) : (
                          <BreezeIcon icon={Copy} size={13} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Quick Specs Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                    <div className="p-2 rounded-xl bg-s1/60 border border-s3/80">
                      <span className="text-[9px] text-p5 uppercase font-sans font-semibold flex items-center justify-center gap-1">
                        <BreezeIcon icon={HardDrive} size={10} />
                        <span>RAM</span>
                      </span>
                      <span className="text-p4 font-bold text-xs mt-0.5 block">{formatGb(server.memory)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-s1/60 border border-s3/80">
                      <span className="text-[9px] text-p5 uppercase font-sans font-semibold flex items-center justify-center gap-1">
                        <BreezeIcon icon={HardDrive} size={10} />
                        <span>Disk</span>
                      </span>
                      <span className="text-p4 font-bold text-xs mt-0.5 block">{formatGb(server.disk)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-s1/60 border border-s3/80">
                      <span className="text-[9px] text-p5 uppercase font-sans font-semibold flex items-center justify-center gap-1">
                        <BreezeIcon icon={Cpu} size={10} />
                        <span>CPU</span>
                      </span>
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
                    <span>Manage Server</span>
                    <BreezeIcon icon={ArrowRight} size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </BreezeCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServerList;
