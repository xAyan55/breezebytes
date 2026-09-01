import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import {
  Users,
  ShieldCheck,
  UserCheck,
  ShieldAlert,
  Search,
  PlusCircle,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerPlayers = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [activeTab, setActiveTab] = useState('ops'); // 'ops' | 'whitelist' | 'bans'
  const [ops, setOps] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [banned, setBanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPlayerData = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const [opsRes, wlRes, banRes] = await Promise.all([
        api.get(`/servers/${serverId}/players/ops`).catch(() => ({ success: false, data: [] })),
        api.get(`/servers/${serverId}/players/whitelist`).catch(() => ({ success: false, data: [] })),
        api.get(`/servers/${serverId}/players/banned`).catch(() => ({ success: false, data: [] })),
      ]);

      if (opsRes.success) setOps(opsRes.data || []);
      if (wlRes.success) setWhitelist(wlRes.data || []);
      if (banRes.success) setBanned(banRes.data || []);
    } catch (err) {
      console.error('Failed to load player data:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    try {
      const endpoint =
        activeTab === 'ops'
          ? `/servers/${serverId}/players/ops`
          : activeTab === 'whitelist'
          ? `/servers/${serverId}/players/whitelist`
          : `/servers/${serverId}/players/banned`;

      const res = await api.post(endpoint, { username: playerName.trim() });
      if (res.success) {
        setPlayerName('');
        showToast('success', `Added "${playerName.trim()}" to ${activeTab}.`);
        fetchPlayerData();
      } else {
        throw new Error(res.error?.message || 'Action failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRemovePlayer = async (username) => {
    try {
      const endpoint =
        activeTab === 'ops'
          ? `/servers/${serverId}/players/ops/${encodeURIComponent(username)}`
          : activeTab === 'whitelist'
          ? `/servers/${serverId}/players/whitelist/${encodeURIComponent(username)}`
          : `/servers/${serverId}/players/banned/${encodeURIComponent(username)}`;

      const res = await api.delete(endpoint);
      if (res.success) {
        showToast('success', `Removed "${username}".`);
        fetchPlayerData();
      } else {
        throw new Error(res.error?.message || 'Remove failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const currentList =
    activeTab === 'ops' ? ops : activeTab === 'whitelist' ? whitelist : banned;

  const filteredList = currentList.filter((p) =>
    (p.name || p.username || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-300',
            toastMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          )}
        >
          <div className="flex items-center gap-2">
            <BreezeIcon icon={toastMessage.type === 'error' ? AlertCircle : Check} size={15} />
            <span>{toastMessage.message}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-3 text-p4 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="p-4 bg-s2 border-2 border-s3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 shadow-inner">
            <BreezeIcon icon={Users} size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-p4">Player Management</h2>
            <p className="text-xs text-p5">Configure server operators, whitelist access, and player bans.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-s1 rounded-xl border border-s3 text-xs">
          <button
            onClick={() => setActiveTab('ops')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors',
              activeTab === 'ops' ? 'bg-s4/20 text-p1' : 'text-p5 hover:text-p4',
            )}
          >
            <BreezeIcon icon={ShieldCheck} size={16} />
            <span>Operators ({ops.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('whitelist')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors',
              activeTab === 'whitelist' ? 'bg-s4/20 text-p1' : 'text-p5 hover:text-p4',
            )}
          >
            <BreezeIcon icon={UserCheck} size={16} />
            <span>Whitelist ({whitelist.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors',
              activeTab === 'bans' ? 'bg-red-500/20 text-red-400' : 'text-p5 hover:text-p4',
            )}
          >
            <BreezeIcon icon={ShieldAlert} size={16} />
            <span>Bans ({banned.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Add Player Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="relative">
          <BreezeIcon icon={Search} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-p5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-s2 border-2 border-s3 rounded-xl pl-9 pr-3 py-2 text-xs text-p4 focus:outline-none focus:border-s4"
          />
        </div>

        <form onSubmit={handleAddPlayer} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Minecraft username..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="bg-s2 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4 min-w-[200px]"
          />
          <BreezeButton
            type="submit"
            variant="primary"
            size="sm"
            icon={UserCheck}
            disabled={!playerName.trim()}
          >
            Add Player
          </BreezeButton>
        </form>
      </div>

      {/* Players List Table */}
      <div className="border-2 border-s3 rounded-2xl bg-s1 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
            <img src="/images/icons/Loader2.gif" alt="Loading" className="size-7 object-contain" />
            <span className="text-xs font-mono">Loading player roster...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-p5 text-xs flex flex-col items-center justify-center gap-2">
            <BreezeIcon icon={Users} size={28} className="text-p5/30 mb-1" />
            <p className="font-semibold text-p4">No entries in {activeTab}</p>
            <p className="text-[11px] text-p5/70">Add a player using their exact Minecraft username above.</p>
          </div>
        ) : (
          <div className="divide-y divide-s3/40">
            {filteredList.map((player, idx) => {
              const nameStr = player.name || player.username || 'Unknown';

              return (
                <div key={idx} className="p-3.5 px-4 flex items-center justify-between gap-4 hover:bg-s5/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={`https://mc-heads.net/avatar/${nameStr}/32`}
                      alt={nameStr}
                      className="size-8 rounded-lg border border-s3 bg-s2 flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-p4 font-mono">{nameStr}</span>
                      {player.level && (
                        <span className="text-[10px] text-p5 ml-2 font-mono">Level {player.level}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemovePlayer(nameStr)}
                    className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={`Remove ${nameStr}`}
                  >
                    <BreezeIcon icon={Trash2} size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerPlayers;
