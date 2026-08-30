import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeBadge from '../../components/ui/BreezeBadge.jsx';
import BreezePageHeader from '../../components/ui/BreezePageHeader.jsx';
import BreezeEmptyState from '../../components/ui/BreezeEmptyState.jsx';
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
        throw new Error(res.error?.message || 'Failed to retrieve servers');
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
      setError(err.message || 'Something went wrong while fetching your servers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const copyAddress = (e, addr, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearch('');
    }
  };

  const filtered = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.software && s.software.toLowerCase().includes(search.toLowerCase())) ||
      (s.minecraft_version && s.minecraft_version.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      filter === 'all' ||
      (filter === 'running' && s.status === 'running') ||
      (filter === 'offline' && s.status !== 'running');

    return matchesSearch && matchesFilter;
  });

  const filters = [
    { id: 'all', label: 'All', count: servers.length },
    { id: 'running', label: 'Running', count: servers.filter((s) => s.status === 'running').length },
    { id: 'offline', label: 'Offline', count: servers.filter((s) => s.status !== 'running').length },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* ===== Global Page Header ===== */}
      <BreezePageHeader
        caption="Server Management"
        title="My Servers"
        description="Manage and monitor your Minecraft server instances."
        icon={Server}
      >
        <Link to="/panel/servers/create">
          <BreezeButton variant="primary" size="md" icon={PlusCircle}>
            Create Server
          </BreezeButton>
        </Link>
      </BreezePageHeader>

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
            onClick={fetchServers}
          >
            Retry
          </BreezeButton>
        </div>
      )}

      {/* ===== Toolbar (Search & Filter Tabs) ===== */}
      <BreezeCard className="p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-p5/50 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search servers by name, software, or version..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-9 py-2 bg-s1 border-2 border-s3 rounded-2xl text-xs text-p4 placeholder:text-p5/40 focus:outline-none focus:border-s4 transition-all duration-300 font-sans"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-p5 hover:text-p4 transition-colors"
              title="Clear search (Esc)"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 p-1 bg-s1 border-2 border-s3 rounded-2xl self-start sm:self-auto">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer',
                filter === f.id
                  ? 'g4 text-p1 border border-s4/40 shadow-sm'
                  : 'text-p5 hover:text-p4 border border-transparent',
              )}
            >
              <span>{f.label}</span>
              <span className="text-[10px] opacity-70 font-mono">({f.count})</span>
            </button>
          ))}
        </div>
      </BreezeCard>

      {/* ===== Server Grid ===== */}
      {loading ? (
        <BreezeCardSkeleton count={6} />
      ) : filtered.length === 0 ? (
        search || filter !== 'all' ? (
          <BreezeEmptyState
            icon={Search}
            title="No Matching Servers"
            description={`No servers found matching "${search || filter}". Try adjusting your search query or filters.`}
            actionLabel="Reset Search"
            onAction={() => {
              setSearch('');
              setFilter('all');
            }}
          />
        ) : (
          <BreezeEmptyState
            image="/images/detail-1.png"
            title="No servers yet"
            description="Create your first Minecraft server to get started. It only takes a minute."
            actionLabel="Create Server"
            actionHref="/panel/servers/create"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
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
                        {s.software || 'paper'} {s.minecraft_version || ''}
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
  );
};

export default ServerList;
