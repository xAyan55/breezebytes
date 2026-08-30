import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Search,
  Check,
  AlertCircle,
  PlusCircle,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { BreezeSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';

const ServerPlayers = () => {
  const { server } = useOutletContext();
  const [data, setData] = useState({ players: [], whitelist: [], ops: [], bannedPlayers: [] });
  const [activeTab, setActiveTab] = useState('ops');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('Banned by operator');
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/players`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load players:', err);
      showNotification('error', err.message || 'Failed to fetch player lists');
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
      showNotification('success', `Granted operator to ${username}.`);
      fetchPlayers();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDeop = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/deop`, { username });
      showNotification('success', `Removed operator from ${username}.`);
      fetchPlayers();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleWhitelistAdd = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/whitelist`, { username });
      showNotification('success', `Added ${username} to whitelist.`);
      fetchPlayers();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleWhitelistRemove = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/unwhitelist`, { username });
      showNotification('success', `Removed ${username} from whitelist.`);
      fetchPlayers();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleBanSubmit = async (e) => {
    e?.preventDefault();
    if (!banUsername.trim()) return;
    try {
      await api.post(`/servers/${server.id}/players/ban`, {
        username: banUsername.trim(),
        reason: banReason.trim(),
      });
      setBanModalOpen(false);
      setBanUsername('');
      setBanReason('Banned by operator');
      showNotification('success', `Banned ${banUsername}.`);
      fetchPlayers();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleUnban = async (username) => {
    try {
      await api.post(`/servers/${server.id}/players/unban`, { username });
      showNotification('success', `Pardoned / unbanned ${username}.`);
      fetchPlayers();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    const cleanUser = usernameInput.trim();
    if (activeTab === 'ops') handleOp(cleanUser);
    if (activeTab === 'whitelist') handleWhitelistAdd(cleanUser);
    if (activeTab === 'bans') {
      setBanUsername(cleanUser);
      setBanModalOpen(true);
    }
    setUsernameInput('');
  };

  const tabs = [
    { id: 'ops', label: 'Operators', icon: ShieldCheck, count: data.ops.length },
    { id: 'whitelist', label: 'Whitelist', icon: UserCheck, count: data.whitelist.length },
    { id: 'bans', label: 'Bans', icon: ShieldAlert, count: data.bannedPlayers.length },
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Page Header */}
      <BreezePageHeader
        caption="Player Access"
        title="Player Management"
        description="Manage server operators, whitelist permissions, and player restrictions."
        icon={Users}
      />

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-2xl border-2 text-xs flex items-center gap-2.5',
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400',
          )}
        >
          {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.message}</span>
        </div>
      )}

      {/* Tab bar & Quick add */}
      <BreezeCard className="p-3.5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-s1 border-2 border-s3 rounded-2xl self-start sm:self-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setSearch('');
                }}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer',
                  activeTab === t.id
                    ? 'g4 text-p1 border border-s4/40 shadow-sm'
                    : 'text-p5 hover:text-p4 border border-transparent',
                )}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                <span className="text-[10px] opacity-70 font-mono">({t.count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-p5/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter list..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-36 pl-8 pr-3 py-1.5 bg-s1 border-2 border-s3 rounded-xl text-xs text-p4 placeholder:text-p5/40 focus:outline-none focus:border-s4 transition-colors"
            />
          </div>

          <form onSubmit={handleAddSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder={`Add to ${activeTab}...`}
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="bg-s1 border-2 border-s3 rounded-xl px-3 py-1.5 text-xs text-p4 placeholder:text-p5/50 focus:outline-none focus:border-s4 transition-colors flex-1 sm:w-44 font-mono"
            />
            <BreezeButton variant="primary" size="sm" type="submit" icon={PlusCircle}>
              Add
            </BreezeButton>
          </form>
        </div>
      </BreezeCard>

      {/* Players Table */}
      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">UUID / Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60 font-mono">
                {activeTab === 'ops' && (
                  data.ops.filter((op) => op.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-p5 font-sans">
                        <Users size={24} className="mx-auto mb-2 text-p5/40" />
                        <p className="font-semibold text-p4">No operators assigned</p>
                        <p className="text-[11px] text-p5/70 mt-0.5">Use the form above to grant operator permissions to a player.</p>
                      </td>
                    </tr>
                  ) : (
                    data.ops
                      .filter((op) => op.name.toLowerCase().includes(search.toLowerCase()))
                      .map((op) => (
                        <tr key={op.name} className="hover:bg-s5/30 transition-colors duration-300">
                          <td className="py-2.5 px-4 font-bold text-p4 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-p1" />
                            <span>{op.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-p5 small-2">{op.uuid || 'Offline Mode'}</td>
                          <td className="py-2.5 px-4 text-right">
                            <BreezeButton variant="destructive" size="xs" onClick={() => handleDeop(op.name)}>
                              Remove OP
                            </BreezeButton>
                          </td>
                        </tr>
                      ))
                  )
                )}

                {activeTab === 'whitelist' && (
                  data.whitelist.filter((wl) => wl.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-p5 font-sans">
                        <UserCheck size={24} className="mx-auto mb-2 text-p5/40" />
                        <p className="font-semibold text-p4">Whitelist is currently empty</p>
                        <p className="text-[11px] text-p5/70 mt-0.5">When whitelist is enabled in server.properties, only approved players can join.</p>
                      </td>
                    </tr>
                  ) : (
                    data.whitelist
                      .filter((wl) => wl.name.toLowerCase().includes(search.toLowerCase()))
                      .map((wl) => (
                        <tr key={wl.name} className="hover:bg-s5/30 transition-colors duration-300">
                          <td className="py-2.5 px-4 font-bold text-p4 flex items-center gap-2">
                            <UserCheck size={16} className="text-emerald-400" />
                            <span>{wl.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-p5 small-2">{wl.uuid || 'Offline Mode'}</td>
                          <td className="py-2.5 px-4 text-right">
                            <BreezeButton variant="destructive" size="xs" onClick={() => handleWhitelistRemove(wl.name)}>
                              Remove
                            </BreezeButton>
                          </td>
                        </tr>
                      ))
                  )
                )}

                {activeTab === 'bans' && (
                  data.bannedPlayers.filter((ban) => ban.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-p5 font-sans">
                        <ShieldAlert size={24} className="mx-auto mb-2 text-p5/40" />
                        <p className="font-semibold text-p4">No players are currently banned</p>
                        <p className="text-[11px] text-p5/70 mt-0.5">Banned players and IP restrictions will appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    data.bannedPlayers
                      .filter((ban) => ban.name.toLowerCase().includes(search.toLowerCase()))
                      .map((ban) => (
                        <tr key={ban.name} className="hover:bg-s5/30 transition-colors duration-300">
                          <td className="py-2.5 px-4 font-bold text-red-400 flex items-center gap-2">
                            <ShieldAlert size={16} />
                            <span>{ban.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-p5 small-2">
                            Reason: {ban.reason || 'No reason specified'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <BreezeButton variant="success" size="xs" onClick={() => handleUnban(ban.name)}>
                              Pardon / Unban
                            </BreezeButton>
                          </td>
                        </tr>
                      ))
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </BreezeCard>

      {/* Ban Player Modal */}
      <BreezeModal open={banModalOpen} onClose={() => setBanModalOpen(false)} title="Ban Player from Server">
        <form onSubmit={handleBanSubmit} className="flex flex-col gap-4">
          <BreezeInput
            label="Player Username"
            required
            value={banUsername}
            onChange={(e) => setBanUsername(e.target.value)}
            inputClassName="font-mono"
          />
          <BreezeInput
            label="Ban Reason"
            placeholder="e.g. Griefing, Inappropriate behavior"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setBanModalOpen(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="destructive" size="sm" type="submit">
              Confirm Ban
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerPlayers;
