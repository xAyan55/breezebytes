import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Loader2,
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
      if (res.success && res.data) setData(res.data);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const handleOp = async (username) => { try { await api.post(`/servers/${server.id}/players/op`, { username }); fetchPlayers(); } catch (err) { alert(err.message); } };
  const handleDeop = async (username) => { try { await api.post(`/servers/${server.id}/players/deop`, { username }); fetchPlayers(); } catch (err) { alert(err.message); } };
  const handleWhitelistAdd = async (username) => { try { await api.post(`/servers/${server.id}/players/whitelist`, { username }); fetchPlayers(); } catch (err) { alert(err.message); } };
  const handleWhitelistRemove = async (username) => { try { await api.post(`/servers/${server.id}/players/unwhitelist`, { username }); fetchPlayers(); } catch (err) { alert(err.message); } };
  const handleBan = async (username) => {
    const reason = prompt('Enter ban reason:', 'Banned by operator');
    if (reason === null) return;
    try { await api.post(`/servers/${server.id}/players/ban`, { username, reason }); fetchPlayers(); } catch (err) { alert(err.message); }
  };
  const handleUnban = async (username) => { try { await api.post(`/servers/${server.id}/players/unban`, { username }); fetchPlayers(); } catch (err) { alert(err.message); } };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    if (activeTab === 'ops') handleOp(usernameInput.trim());
    if (activeTab === 'whitelist') handleWhitelistAdd(usernameInput.trim());
    if (activeTab === 'bans') handleBan(usernameInput.trim());
    setUsernameInput('');
  };

  const tabs = [
    { id: 'ops', label: 'Operators (OPs)', icon: ShieldCheck, count: data.ops.length },
    { id: 'whitelist', label: 'Whitelist', icon: UserCheck, count: data.whitelist.length },
    { id: 'bans', label: 'Banned Players', icon: ShieldAlert, count: data.bannedPlayers.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar & Quick add */}
      <BreezeCard className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all duration-500 border-2',
                  activeTab === t.id
                    ? 'g4 text-p1 border-s4/30 shadow-400'
                    : 'bg-s1 border-s3 text-p5 hover:text-p4',
                )}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                <span className="small-2 opacity-70">({t.count})</span>
              </button>
            );
          })}
        </div>
        <form onSubmit={handleAddSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder={`Add username to ${activeTab}...`}
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="bg-s1 border-2 border-s3 rounded-2xl px-3.5 py-2 text-xs text-p4 placeholder:text-p5/50 focus:outline-none focus:border-s4 transition-all duration-500 w-full sm:w-56"
          />
          <BreezeButton variant="primary" size="sm" type="submit">Add</BreezeButton>
        </form>
      </BreezeCard>

      {/* Players Table */}
      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
            <p className="body-3 font-medium">Reading player records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">UUID / Details</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60 font-mono">
                {activeTab === 'ops' && (data.ops.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-p5 font-sans">No operators assigned.</td></tr>
                ) : data.ops.map((op) => (
                  <tr key={op.name} className="hover:bg-s5/30 transition-colors duration-500">
                    <td className="py-3 px-4 font-bold text-p4 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-p1" />
                      <span>{op.name}</span>
                    </td>
                    <td className="py-3 px-4 text-p5 small-2">{op.uuid || 'Offline Mode'}</td>
                    <td className="py-3 px-4 text-right">
                      <BreezeButton variant="destructive" size="xs" onClick={() => handleDeop(op.name)}>
                        Remove OP
                      </BreezeButton>
                    </td>
                  </tr>
                )))}

                {activeTab === 'whitelist' && (data.whitelist.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-p5 font-sans">Whitelist is currently empty.</td></tr>
                ) : data.whitelist.map((wl) => (
                  <tr key={wl.name} className="hover:bg-s5/30 transition-colors duration-500">
                    <td className="py-3 px-4 font-bold text-p4 flex items-center gap-2">
                      <UserCheck size={16} className="text-emerald-400" />
                      <span>{wl.name}</span>
                    </td>
                    <td className="py-3 px-4 text-p5 small-2">{wl.uuid || 'Offline Mode'}</td>
                    <td className="py-3 px-4 text-right">
                      <BreezeButton variant="destructive" size="xs" onClick={() => handleWhitelistRemove(wl.name)}>
                        Remove
                      </BreezeButton>
                    </td>
                  </tr>
                )))}

                {activeTab === 'bans' && (data.bannedPlayers.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-p5 font-sans">No players are currently banned.</td></tr>
                ) : data.bannedPlayers.map((ban) => (
                  <tr key={ban.name} className="hover:bg-s5/30 transition-colors duration-500">
                    <td className="py-3 px-4 font-bold text-red-400 flex items-center gap-2">
                      <ShieldAlert size={16} />
                      <span>{ban.name}</span>
                    </td>
                    <td className="py-3 px-4 text-p5 small-2">
                      Reason: {ban.reason || 'No reason'} | {ban.created ? new Date(ban.created).toLocaleDateString() : ''}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <BreezeButton variant="success" size="xs" onClick={() => handleUnban(ban.name)}>
                        Pardon / Unban
                      </BreezeButton>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </BreezeCard>
    </div>
  );
};

export default ServerPlayers;
