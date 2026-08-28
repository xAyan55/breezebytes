import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  PlusCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';

const ServerPlayers = () => {
  const { server } = useOutletContext();
  const [data, setData] = useState({ players: [], whitelist: [], ops: [], bannedPlayers: [] });
  const [activeTab, setActiveTab] = useState('ops');
  const [loading, setLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/players`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleOp = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/op`, { username });
      fetchPlayers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeop = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/deop`, { username });
      fetchPlayers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWhitelistAdd = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/whitelist`, { username });
      fetchPlayers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWhitelistRemove = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/unwhitelist`, { username });
      fetchPlayers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBan = async (username) => {
    const reason = prompt('Enter ban reason:', 'Banned by operator');
    if (reason === null) return;
    try {
      await api.post(`/servers/${server.id}/players/ban`, { username, reason });
      fetchPlayers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnban = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/unban`, { username });
      fetchPlayers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    if (activeTab === 'ops') handleOp(usernameInput.trim());
    if (activeTab === 'whitelist') handleWhitelistAdd(usernameInput.trim());
    if (activeTab === 'bans') handleBan(usernameInput.trim());
    setUsernameInput('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub tabs & Quick Add */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          {[
            { id: 'ops', label: 'Operators (OPs)', icon: ShieldCheck, count: data.ops.length },
            { id: 'whitelist', label: 'Whitelist', icon: UserCheck, count: data.whitelist.length },
            { id: 'bans', label: 'Banned Players', icon: ShieldAlert, count: data.bannedPlayers.length },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
                  activeTab === t.id
                    ? 'bg-p1 text-black font-bold shadow-md shadow-p1/20'
                    : 'bg-[#08090d] border border-[#222638] text-p5 hover:text-p4'
                )}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                <span className="text-[10px] opacity-70">({t.count})</span>
              </button>
            );
          })}
        </div>

        {/* Add Input */}
        <form onSubmit={handleAddSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder={`Add username to ${activeTab}...`}
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="bg-[#08090d] border border-[#222638] rounded-xl px-3.5 py-2 text-xs text-p4 placeholder:text-p5/50 focus:outline-none focus:border-p1 w-full sm:w-56"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 flex-shrink-0"
          >
            Add
          </button>
        </form>
      </div>

      {/* Players List Table */}
      <div className="rounded-2xl bg-[#11141e] border border-[#222638] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
            <p className="text-sm font-medium">Reading player records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222638] bg-[#08090d] text-p5 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">UUID / Details</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222638]/60 font-mono">
                {activeTab === 'ops' &&
                  (data.ops.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-p5 font-sans">
                        No operators assigned.
                      </td>
                    </tr>
                  ) : (
                    data.ops.map((op) => (
                      <tr key={op.name} className="hover:bg-s2/30">
                        <td className="py-3 px-4 font-bold text-p4 flex items-center gap-2">
                          <ShieldCheck size={16} className="text-p1" />
                          <span>{op.name}</span>
                        </td>
                        <td className="py-3 px-4 text-p5 text-[11px]">{op.uuid || 'Offline Mode'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeop(op.name)}
                            className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 text-xs font-sans transition-colors"
                          >
                            Remove OP
                          </button>
                        </td>
                      </tr>
                    ))
                  ))}

                {activeTab === 'whitelist' &&
                  (data.whitelist.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-p5 font-sans">
                        Whitelist is currently empty.
                      </td>
                    </tr>
                  ) : (
                    data.whitelist.map((wl) => (
                      <tr key={wl.name} className="hover:bg-s2/30">
                        <td className="py-3 px-4 font-bold text-p4 flex items-center gap-2">
                          <UserCheck size={16} className="text-emerald-400" />
                          <span>{wl.name}</span>
                        </td>
                        <td className="py-3 px-4 text-p5 text-[11px]">{wl.uuid || 'Offline Mode'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleWhitelistRemove(wl.name)}
                            className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 text-xs font-sans transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ))}

                {activeTab === 'bans' &&
                  (data.bannedPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-p5 font-sans">
                        No players are currently banned.
                      </td>
                    </tr>
                  ) : (
                    data.bannedPlayers.map((ban) => (
                      <tr key={ban.name} className="hover:bg-s2/30">
                        <td className="py-3 px-4 font-bold text-red-400 flex items-center gap-2">
                          <ShieldAlert size={16} />
                          <span>{ban.name}</span>
                        </td>
                        <td className="py-3 px-4 text-p5 text-[11px]">
                          Reason: {ban.reason || 'No reason'} | {ban.created ? new Date(ban.created).toLocaleDateString() : ''}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleUnban(ban.name)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 text-xs font-sans transition-colors"
                          >
                            Pardon / Unban
                          </button>
                        </td>
                      </tr>
                    ))
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerPlayers;
