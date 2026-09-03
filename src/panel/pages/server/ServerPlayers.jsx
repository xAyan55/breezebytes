import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import PlayerDetailsModal from '../../components/player/PlayerDetailsModal.jsx';
import PlayerActionModal from '../../components/player/PlayerActionModal.jsx';
import AddPlayerModal from '../../components/player/AddPlayerModal.jsx';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Check,
  AlertCircle,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import clsx from 'clsx';

const ServerPlayers = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [players, setPlayers] = useState([]);
  const [counts, setCounts] = useState({ online: 0, totalTracked: 0 });
  const [serverOnline, setServerOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'online' | 'offline' | 'ops' | 'whitelist' | 'banned'
  const [sortBy, setSortBy] = useState('online'); // 'online' | 'offline' | 'name_asc' | 'name_desc' | 'last_seen'
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [currentActionType, setCurrentActionType] = useState('kick'); // 'kick' | 'ban' | 'deop' | 'unwhitelist'
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const lastSeqRef = useRef(0);
  const wsRef = useRef(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  /**
   * Fetch authoritative snapshot via REST
   */
  const fetchPlayerData = useCallback(async (isRefresh = false) => {
    if (!serverId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(`/servers/${serverId}/players`);
      if (res.success && res.data) {
        const snap = res.data;
        if (snap.seq && snap.seq >= lastSeqRef.current) {
          lastSeqRef.current = snap.seq;
          setPlayers(snap.players || []);
          setCounts(snap.counts || { online: 0, totalTracked: 0 });
          setServerOnline(!!snap.serverOnline);
        }
      }
    } catch (err) {
      console.error('[PLAYERS] Failed to load players:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  /**
   * Real-time WebSocket subscription
   */
  useEffect(() => {
    if (!serverId) return;

    const token = api.getToken() || localStorage.getItem('bb_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const channel = `server:${serverId}:players`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Authenticate then subscribe
      ws.send(JSON.stringify({ action: 'auth', token }));
      ws.send(JSON.stringify({ action: 'subscribe', channel }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel === channel && msg.event === 'players_update' && msg.data) {
          const snap = msg.data;
          // Monotonic sequence verification: ignore out-of-order messages
          if (!snap.seq || snap.seq >= lastSeqRef.current) {
            if (snap.seq) lastSeqRef.current = snap.seq;
            setPlayers(snap.players || []);
            setCounts(snap.counts || { online: 0, totalTracked: 0 });
            setServerOnline(!!snap.serverOnline);

            // If a player is selected in the modal, update their reference
            setSelectedPlayer((prev) => {
              if (!prev) return null;
              const updated = (snap.players || []).find(
                (p) => (p.uuid && p.uuid === prev.uuid) || p.username.toLowerCase() === prev.username.toLowerCase()
              );
              return updated || prev;
            });
          }
        }
      } catch {}
    };

    ws.onerror = () => {};

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'unsubscribe', channel }));
      }
      ws.close();
      wsRef.current = null;
    };
  }, [serverId]);

  // Handle Action Trigger (from card, table, or details modal)
  const triggerAction = (actionType, player) => {
    if (actionType === 'unban') {
      // Direct pardon without secondary dialog
      handleExecuteAction('unban', player.username);
    } else {
      setSelectedPlayer(player);
      setCurrentActionType(actionType);
      setActionModalOpen(true);
    }
  };

  // Execute destructive / state action
  const handleExecuteAction = async (actionType, username, reason = '') => {
    setActionLoading(true);
    try {
      const endpoint = `/servers/${serverId}/players/${actionType}`;
      const payload = { username };
      if (reason) payload.reason = reason;

      const res = await api.post(endpoint, payload);
      if (res.success) {
        showToast('success', res.message || res.data?.message || 'Action executed successfully.');
        setActionModalOpen(false);
        fetchPlayerData(true);
      } else {
        throw new Error(res.error?.message || 'Operation failed');
      }
    } catch (err) {
      showToast('error', err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Add Player (whitelist, op, ban)
  const handleAddPlayer = async (tab, username, reason = '') => {
    setActionLoading(true);
    try {
      const endpoint =
        tab === 'whitelist'
          ? `/servers/${serverId}/players/whitelist`
          : tab === 'op'
          ? `/servers/${serverId}/players/op`
          : `/servers/${serverId}/players/ban`;

      const payload = { username };
      if (reason) payload.reason = reason;

      const res = await api.post(endpoint, payload);
      if (res.success) {
        showToast('success', res.message || res.data?.message || `Successfully processed ${username}.`);
        fetchPlayerData(true);
      } else {
        throw new Error(res.error?.message || 'Failed to add player');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to add player');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Open 3D Viewer Details
  const handleOpenDetails = (player) => {
    setSelectedPlayer(player);
    setDetailsModalOpen(true);
  };

  // Filter & Search Logic
  const filteredPlayers = players
    .filter((p) => {
      // Search across username and UUID
      const matchesSearch =
        (p.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.uuid || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Filter tabs
      if (filter === 'online') return p.online;
      if (filter === 'offline') return !p.online;
      if (filter === 'ops') return p.operator;
      if (filter === 'whitelist') return p.whitelisted;
      if (filter === 'banned') return p.banned;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'online') {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.username.localeCompare(b.username);
      }
      if (sortBy === 'offline') {
        if (a.online !== b.online) return !a.online ? -1 : 1;
        return a.username.localeCompare(b.username);
      }
      if (sortBy === 'name_asc') return a.username.localeCompare(b.username);
      if (sortBy === 'name_desc') return b.username.localeCompare(a.username);
      if (sortBy === 'last_seen') {
        const tA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const tB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return tB - tA;
      }
      return 0;
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unavailable';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unavailable';
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-300 shadow-lg',
            toastMessage.type === 'error'
              ? 'bg-red-500/15 border-red-500/30 text-red-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          )}
        >
          <div className="flex items-center gap-2">
            <BreezeIcon icon={toastMessage.type === 'error' ? AlertCircle : Check} size={15} />
            <span className="font-semibold">{toastMessage.message}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-3 text-p4 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Main Header & Live Telemetry Summary */}
      <div className="p-5 bg-s2 border-2 border-s3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-11 rounded-2xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 shadow-inner flex-shrink-0">
            <BreezeIcon icon={Users} size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-bold text-p4 font-mono">Player Management</h1>
              <BreezeBadge status={serverOnline ? 'running' : 'offline'} pulse={serverOnline}>
                {serverOnline ? 'Server Online' : 'Server Offline'}
              </BreezeBadge>
            </div>
            <p className="text-xs text-p5 mt-0.5">
              Live player roster, operator controls, whitelist access, bans, and McView3D 3D skin viewer.
            </p>
          </div>
        </div>

        {/* Live Counts & Primary Action Header */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Live stats card */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 bg-s1 rounded-xl border border-s3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-400">{counts.online}</span>
              <span className="text-p5 text-[11px]">Online</span>
            </div>
            <span className="text-s3">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-p4">{counts.totalTracked}</span>
              <span className="text-p5 text-[11px]">Tracked</span>
            </div>
          </div>

          <BreezeButton
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchPlayerData(true)}
            title="Refresh player data"
          />

          <BreezeButton
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setAddModalOpen(true)}
          >
            Add Player
          </BreezeButton>
        </div>
      </div>

      {/* Search, Filter Pills & Sort Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[260px]">
          <BreezeIcon icon={Search} size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-p5" />
          <input
            type="text"
            placeholder="Search by username or UUID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-s2 border-2 border-s3 rounded-xl pl-10 pr-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono placeholder:font-sans"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-s1 rounded-xl border border-s3 text-xs overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: counts.totalTracked },
            { id: 'online', label: 'Online', count: counts.online },
            { id: 'offline', label: 'Offline', count: Math.max(0, counts.totalTracked - counts.online) },
            { id: 'ops', label: 'Operators', count: players.filter((p) => p.operator).length },
            { id: 'whitelist', label: 'Whitelisted', count: players.filter((p) => p.whitelisted).length },
            { id: 'banned', label: 'Banned', count: players.filter((p) => p.banned).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors',
                filter === tab.id ? 'bg-s4/30 text-p1' : 'text-p5 hover:text-p4'
              )}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-s2 border border-s3 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-s2 border-2 border-s3 rounded-xl text-xs text-p4 font-semibold">
            <BreezeIcon icon={ArrowUpDown} size={14} className="text-p5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-p4 focus:outline-none cursor-pointer"
            >
              <option value="online" className="bg-s1 text-p4">Sort: Online First</option>
              <option value="offline" className="bg-s1 text-p4">Sort: Offline First</option>
              <option value="name_asc" className="bg-s1 text-p4">Sort: Name (A-Z)</option>
              <option value="name_desc" className="bg-s1 text-p4">Sort: Name (Z-A)</option>
              <option value="last_seen" className="bg-s1 text-p4">Sort: Last Seen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players List: Desktop Table & Mobile Cards */}
      <div className="border-2 border-s3 rounded-2xl bg-s1 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
            <img src="/images/icons/Loader2.gif" alt="Loading" className="size-8 object-contain" />
            <span className="text-xs font-mono">Reconciling Minecraft player roster...</span>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-14 text-center text-p5 flex flex-col items-center justify-center gap-2.5">
            <BreezeIcon icon={Users} size={32} className="text-p5/30 mb-1" />
            <p className="font-bold text-p4 text-sm">
              {search
                ? 'No players match your search'
                : filter === 'online'
                ? 'No players are currently online'
                : !serverOnline
                ? 'Server is offline. Live roster unavailable'
                : 'No tracked players found'}
            </p>
            <p className="text-xs text-p5/70 max-w-sm">
              {search
                ? 'Try searching with a different player username or UUID.'
                : 'Players will appear automatically as they join, or you can manually whitelist, op, or ban players above.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-s3 bg-s2/50 text-p5 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Permissions & Flags</th>
                    <th className="py-3 px-4">Last Seen</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-s3/40">
                  {filteredPlayers.map((player, idx) => {
                    const encodedName = encodeURIComponent(player.username);

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-s2/40 transition-colors group cursor-pointer"
                        onClick={() => handleOpenDetails(player)}
                      >
                        {/* Player Column: Avatar + Name + UUID */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={`https://mc-heads.net/avatar/${encodedName}/32`}
                              alt={player.username}
                              className="size-8 rounded-lg border border-s3 bg-s2 flex-shrink-0 shadow-sm"
                              onError={(e) => {
                                e.target.src = '/breeze.png';
                              }}
                            />
                            <div className="min-w-0 flex flex-col">
                              <span className="font-bold text-p4 font-mono truncate group-hover:text-p1 transition-colors">
                                {player.username}
                              </span>
                              <span className="text-[10px] text-p5/60 font-mono truncate max-w-[200px]">
                                {player.uuid || 'UUID not resolved'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="py-3 px-4">
                          <BreezeBadge status={player.online ? 'running' : 'offline'} pulse={player.online}>
                            {player.online ? 'Online' : 'Offline'}
                          </BreezeBadge>
                        </td>

                        {/* Permissions & Flags */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {player.operator && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                <BreezeIcon icon={ShieldCheck} size={11} />
                                <span>OP</span>
                              </span>
                            )}

                            {player.whitelisted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                <BreezeIcon icon={UserCheck} size={11} />
                                <span>WL</span>
                              </span>
                            )}

                            {player.banned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                                <BreezeIcon icon={ShieldAlert} size={11} />
                                <span>BANNED</span>
                              </span>
                            )}

                            {!player.operator && !player.whitelisted && !player.banned && (
                              <span className="text-p5/60 text-[11px] font-mono">—</span>
                            )}
                          </div>
                        </td>

                        {/* Last Seen */}
                        <td className="py-3 px-4 text-p5 text-[11px] font-mono">
                          {player.online ? (
                            <span className="text-emerald-400 font-semibold">Active now</span>
                          ) : player.lastSeen ? (
                            formatDate(player.lastSeen)
                          ) : (
                            <span className="text-p5/50">Unavailable</span>
                          )}
                        </td>

                        {/* Actions button */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <BreezeButton
                              variant="ghost"
                              size="xs"
                              icon={Eye}
                              onClick={() => handleOpenDetails(player)}
                              title="View 3D Skin & Details"
                            >
                              3D Skin
                            </BreezeButton>

                            {player.online && (
                              <button
                                onClick={() => triggerAction('kick', player)}
                                className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Kick player"
                              >
                                Kick
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Rendered on mobile, hidden on desktop) */}
            <div className="md:hidden divide-y divide-s3/40">
              {filteredPlayers.map((player, idx) => {
                const encodedName = encodeURIComponent(player.username);

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenDetails(player)}
                    className="p-4 flex flex-col gap-3 hover:bg-s2/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={`https://mc-heads.net/avatar/${encodedName}/32`}
                          alt={player.username}
                          className="size-9 rounded-lg border border-s3 bg-s2 flex-shrink-0"
                          onError={(e) => {
                            e.target.src = '/breeze.png';
                          }}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-p4 font-mono truncate block text-sm">
                            {player.username}
                          </span>
                          <span className="text-[10px] text-p5/70 font-mono truncate block">
                            {player.uuid || 'UUID not resolved'}
                          </span>
                        </div>
                      </div>

                      <BreezeBadge status={player.online ? 'running' : 'offline'} pulse={player.online}>
                        {player.online ? 'Online' : 'Offline'}
                      </BreezeBadge>
                    </div>

                    {/* Flags and Last Seen row */}
                    <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-s3/30">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {player.operator && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            OP
                          </span>
                        )}
                        {player.whitelisted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            WL
                          </span>
                        )}
                        {player.banned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                            BANNED
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-p5 font-mono">
                        {player.online ? 'Active now' : formatDate(player.lastSeen)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3D Skin & Player Details Modal */}
      <PlayerDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        player={selectedPlayer}
        serverOnline={serverOnline}
        onActionClick={(type, p) => {
          setDetailsModalOpen(false);
          triggerAction(type, p);
        }}
      />

      {/* Dangerous Action Confirmation Modal (Kick / Ban / Deop / Unwhitelist) */}
      <PlayerActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        actionType={currentActionType}
        player={selectedPlayer}
        loading={actionLoading}
        onConfirm={(username, reason) => handleExecuteAction(currentActionType, username, reason)}
      />

      {/* Add Player Modal (Whitelist / Op / Ban) */}
      <AddPlayerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        loading={actionLoading}
        onAddPlayer={handleAddPlayer}
      />
    </div>
  );
};

export default ServerPlayers;
