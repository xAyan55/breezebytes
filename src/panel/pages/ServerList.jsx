import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import {
  Server,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Play,
  RotateCw,
  Square,
  Loader2,
  HardDrive,
  Cpu,
} from 'lucide-react';
import clsx from 'clsx';

const ServerList = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/servers');
      if (res.success) {
        setServers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleQuickPower = async (e, serverId, action) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/servers/${serverId}/power`, { action });
      fetchServers();
    } catch (err) {
      alert(`Power action failed: ${err.message}`);
    }
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.allocation && String(s.allocation.port).includes(search));

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-p4 tracking-tight">Game Servers</h1>
          <p className="text-xs text-p5 mt-1">Manage and monitor all your deployed Minecraft instances.</p>
        </div>

        <Link
          to="/panel/servers/create"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all transform hover:scale-[1.02] w-full sm:w-auto"
        >
          <PlusCircle size={16} />
          <span>Create New Server</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-p5" />
          <input
            type="text"
            placeholder="Search servers by name or port..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#08090d] border border-[#222638] rounded-xl pl-9 pr-4 py-2 text-xs text-p4 placeholder:text-p5/50 focus:outline-none focus:border-p1/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-p5 flex items-center gap-1 mr-1">
            <SlidersHorizontal size={14} />
            <span>Filter:</span>
          </span>
          {['all', 'running', 'offline', 'installing'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                statusFilter === filter
                  ? 'bg-p1 text-black font-bold'
                  : 'bg-[#08090d] border border-[#222638] text-p5 hover:text-p4 hover:bg-s2/60'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Server Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
          <p className="text-sm font-medium">Fetching servers...</p>
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11141e] border border-[#222638] text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-p1/10 flex items-center justify-center text-p1">
            <Server size={24} />
          </div>
          <h3 className="text-base font-bold text-p4">No Matching Servers</h3>
          <p className="text-xs text-p5 max-w-sm">
            {search || statusFilter !== 'all'
              ? 'No servers match your current search or filter query.'
              : 'You have not created any Minecraft servers yet.'}
          </p>
          <Link
            to="/panel/servers/create"
            className="mt-2 px-4 py-2 rounded-xl bg-p1 text-black font-semibold text-xs hover:bg-p1/90 transition-colors"
          >
            Create Server
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => {
            const isOnline = server.status === 'running';
            const isStarting = server.status === 'starting';

            return (
              <Link
                key={server.id}
                to={`/panel/servers/${server.id}/console`}
                className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] hover:border-p1/50 transition-all duration-300 flex flex-col justify-between gap-6 group hover:shadow-2xl hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-p4 group-hover:text-p1 transition-colors">
                        {server.name}
                      </h3>
                      <p className="text-xs text-p5 font-mono mt-0.5">
                        {server.allocation ? `0.0.0.0:${server.allocation.port}` : 'No Port'}
                      </p>
                    </div>

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

                  {server.description && (
                    <p className="text-xs text-p5 line-clamp-2 mb-4 leading-relaxed">
                      {server.description}
                    </p>
                  )}

                  {/* Resource Badges */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="p-2.5 rounded-xl bg-[#08090d] border border-[#222638] flex items-center gap-2">
                      <Cpu size={14} className="text-p1" />
                      <div>
                        <p className="text-[10px] text-p5 uppercase">RAM</p>
                        <p className="text-xs font-semibold text-p4">{server.memory} MB</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#08090d] border border-[#222638] flex items-center gap-2">
                      <HardDrive size={14} className="text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-p5 uppercase">Disk</p>
                        <p className="text-xs font-semibold text-p4">{(server.disk / 1024).toFixed(1)} GB</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Quick Controls */}
                <div className="pt-4 border-t border-[#222638] flex items-center justify-between">
                  <span className="text-xs text-p5 font-medium capitalize">
                    {server.software} {server.minecraft_version}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleQuickPower(e, server.id, 'start')}
                      disabled={isOnline || isStarting}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title="Start Server"
                    >
                      <Play size={14} />
                    </button>

                    <button
                      onClick={(e) => handleQuickPower(e, server.id, 'restart')}
                      disabled={!isOnline}
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border border-amber-500/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title="Restart Server"
                    >
                      <RotateCw size={14} />
                    </button>

                    <button
                      onClick={(e) => handleQuickPower(e, server.id, 'stop')}
                      disabled={!isOnline}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title="Stop Server"
                    >
                      <Square size={14} />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServerList;
