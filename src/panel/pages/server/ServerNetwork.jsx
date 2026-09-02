import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import {
  Network,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Globe,
  RotateCw,
  Zap,
  Power,
  Server,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';

const ServerNetwork = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [allocations, setAllocations] = useState([]);
  const [playitData, setPlayitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [playitActionLoading, setPlayitActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPlayit, setCopiedPlayit] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllocations = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const [allocRes, playitRes] = await Promise.all([
        api.get(`/servers/${serverId}/allocations`).catch(() => ({ success: false })),
        api.get(`/servers/${serverId}/network/playit`).catch(() => ({ success: false })),
      ]);

      if (allocRes.success && Array.isArray(allocRes.data)) {
        setAllocations(allocRes.data);
      }
      if (playitRes.success && playitRes.data) {
        setPlayitData(playitRes.data);
      }
    } catch (err) {
      console.error('Failed to load allocations:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleAssignPort = async () => {
    try {
      setAssigning(true);
      const res = await api.post(`/servers/${serverId}/allocations`);
      if (res.success) {
        showToast('success', `Assigned additional port #${res.data?.port || ''}.`);
        fetchAllocations();
      } else {
        throw new Error(res.error?.message || 'Could not allocate port');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleSetPrimary = async (alloc) => {
    try {
      const res = await api.post(`/servers/${serverId}/allocations/${alloc.id}/primary`);
      if (res.success) {
        showToast('success', `Set port #${alloc.port} as primary address.`);
        fetchAllocations();
      } else {
        throw new Error(res.error?.message || 'Failed to set primary');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleUnassign = async (alloc) => {
    if (alloc.is_primary) {
      alert('Cannot remove the primary port allocation.');
      return;
    }
    if (!window.confirm(`Unassign port #${alloc.port}?`)) return;

    try {
      const res = await api.delete(`/servers/${serverId}/allocations/${alloc.id}`);
      if (res.success) {
        showToast('success', `Unassigned port #${alloc.port}.`);
        fetchAllocations();
      } else {
        throw new Error(res.error?.message || 'Unassign failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const copyAddress = (alloc) => {
    const host = alloc.ip === '0.0.0.0' ? server?.node?.fqdn || 'localhost' : alloc.ip;
    navigator.clipboard.writeText(`${host}:${alloc.port}`);
    setCopiedId(alloc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPlayitAddress = (address) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedPlayit(true);
    setTimeout(() => setCopiedPlayit(false), 2000);
  };

  const handleRetryPlayit = async () => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/servers/${serverId}/network/playit/retry`);
      if (res.success) {
        showToast('success', 'Playit tunnel provisioning queued. Refreshing in 3s...');
        setTimeout(fetchAllocations, 3000);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const handleTogglePlayit = async (currentEnabled) => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/servers/${serverId}/network/playit/toggle`, { enabled: !currentEnabled });
      if (res.success) {
        showToast('success', `Playit tunnel ${!currentEnabled ? 'enabled' : 'disabled'}.`);
        fetchAllocations();
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const handleRefreshPlayit = async () => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/servers/${serverId}/network/playit/refresh`);
      if (res.success) {
        setPlayitData((prev) => ({ ...prev, primary: res.data?.primary, tunnels: res.data?.tunnels }));
        showToast('success', 'Refreshed Playit tunnel status.');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const primaryTunnel = playitData?.primary;
  const isPlayitActive = primaryTunnel?.status === 'active';
  const isPlayitPending = primaryTunnel && ['pending', 'ensuring_agent', 'creating', 'waiting_allocation'].includes(primaryTunnel.status);
  const isPlayitFailed = primaryTunnel?.status === 'failed';

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto">
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

      {/* ===== Section 1: Playit Zero-Config Public Ingress Card ===== */}
      <div className="p-6 bg-s2 border-2 border-s3 rounded-3xl flex flex-col gap-5 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-s3/80">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-p1/10 border border-p1/30 flex items-center justify-center text-p1 shadow-inner">
              <BreezeIcon icon={Globe} size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-p4">Zero-Config Public Tunnel (Playit.gg)</h2>
                {isPlayitActive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                  </span>
                )}
                {isPlayitPending && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider flex items-center gap-1 animate-pulse">
                    <span className="size-1.5 rounded-full bg-amber-400" /> Provisioning...
                  </span>
                )}
                {isPlayitFailed && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Failed
                  </span>
                )}
                {primaryTunnel && !primaryTunnel.enabled && (
                  <span className="px-2.5 py-0.5 rounded-full bg-s3 text-p5 border border-s3 text-[10px] font-bold uppercase tracking-wider">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-p5 mt-0.5">
                Global Anycast public address for your Minecraft server. No port forwarding required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/panel/servers/${serverId}/connect`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-p1/20 hover:bg-p1/30 border border-p1/30 text-p1 text-xs font-bold transition-all shadow-sm"
              title="Open dedicated Connect workspace"
            >
              <BreezeIcon icon="connect" size={14} />
              <span>Connect &rarr;</span>
            </Link>

            <BreezeButton
              variant="secondary"
              size="sm"
              icon={RotateCw}
              loading={playitActionLoading}
              onClick={handleRefreshPlayit}
              title="Refresh live Playit status"
            >
              Refresh
            </BreezeButton>

            {isPlayitFailed && (
              <BreezeButton
                variant="primary"
                size="sm"
                icon={Zap}
                loading={playitActionLoading}
                onClick={handleRetryPlayit}
              >
                Retry Tunnel
              </BreezeButton>
            )}

            {primaryTunnel && (
              <button
                onClick={() => handleTogglePlayit(primaryTunnel.enabled)}
                disabled={playitActionLoading}
                className={clsx(
                  'px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                  primaryTunnel.enabled
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                )}
              >
                <BreezeIcon icon={Power} size={14} />
                <span>{primaryTunnel.enabled ? 'Disable Tunnel' : 'Enable Tunnel'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Public Address Display Box */}
        {primaryTunnel?.publicAddress ? (
          <div className="p-4 rounded-2xl bg-s1 border-2 border-s3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-p5 font-semibold uppercase tracking-wider">
                Public Connection Endpoint ({primaryTunnel.tunnelType === 'minecraft-bedrock' ? 'Bedrock' : 'Java'})
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-base sm:text-lg font-bold text-p1 select-all tracking-wide">
                  {primaryTunnel.publicAddress}
                </span>
                <button
                  onClick={() => copyPlayitAddress(primaryTunnel.publicAddress)}
                  className="px-2.5 py-1 rounded-lg bg-s2 border border-s3 text-p4 hover:text-p1 hover:border-s4 transition-colors font-medium flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <BreezeIcon icon={copiedPlayit ? Check : Copy} size={13} className={copiedPlayit ? 'text-emerald-400' : ''} />
                  <span>{copiedPlayit ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-p5">
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-p5/70">Local Forward</span>
                <span className="text-p4 font-semibold">127.0.0.1:{primaryTunnel.localPort || server?.allocation?.port}</span>
              </div>
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-p5/70">Protocol</span>
                <span className="text-p4 font-semibold uppercase">{primaryTunnel.protocol || 'TCP'}</span>
              </div>
            </div>
          </div>
        ) : isPlayitPending ? (
          <div className="p-6 rounded-2xl bg-amber-500/5 border-2 border-amber-500/20 flex items-center gap-3 text-amber-300 text-xs">
            <Radio className="size-5 animate-pulse text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Playit tunnel is allocating public address...</span>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                The agent is negotiating connection routing with Playit edge nodes. This usually takes 5-15 seconds.
              </p>
            </div>
          </div>
        ) : isPlayitFailed ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-300 flex-wrap">
            <div className="flex items-center gap-2.5">
              <BreezeIcon icon={AlertCircle} size={18} className="text-red-400 flex-shrink-0" />
              <div>
                <span className="font-bold">Public tunnel allocation failed</span>
                <p className="text-[11px] text-red-400/80">
                  {primaryTunnel?.lastError || 'Unable to allocate public address from Playit. Your local server port is still running.'}
                </p>
              </div>
            </div>
            <BreezeButton variant="primary" size="sm" icon={Zap} onClick={handleRetryPlayit} loading={playitActionLoading}>
              Retry Allocation
            </BreezeButton>
          </div>
        ) : !playitData?.nodeConfigured ? (
          <div className="p-4 rounded-2xl bg-s1 border border-s3/80 text-xs text-p5 flex items-center gap-3">
            <BreezeIcon icon={AlertCircle} size={16} className="text-p3 flex-shrink-0" />
            <span>
              Playit integration is not yet configured on this node. You can connect using your local node address below, or ask your administrator to configure Playit in Admin Settings.
            </span>
          </div>
        ) : null}
      </div>

      {/* ===== Section 2: Local Node Port Allocations ===== */}
      <div className="p-4 bg-s2 border-2 border-s3 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 shadow-inner">
            <BreezeIcon icon={Network} size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-p4">Node Port Allocations</h2>
            <p className="text-xs text-p5">Direct node ports assigned for internal binding, Dynmap, SimpleVoiceChat, and Votifier.</p>
          </div>
        </div>

        <BreezeButton
          variant="primary"
          size="sm"
          icon={PlusCircle}
          loading={assigning}
          onClick={handleAssignPort}
        >
          Assign Additional Port
        </BreezeButton>
      </div>

      {/* Allocations Table */}
      <div className="border-2 border-s3 rounded-2xl bg-s1 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
            <img src="/images/icons/Loader2.gif" alt="Loading" className="size-7 object-contain" />
            <span className="text-xs font-mono">Loading port allocations...</span>
          </div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center text-p5 text-xs">No allocations found.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-s3/80 bg-s2/50 text-p5 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Address / IP</th>
                <th className="py-2.5 px-4 w-32">Port</th>
                <th className="py-2.5 px-4 w-36">Status</th>
                <th className="py-2.5 px-4 w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-s3/40">
              {allocations.map((alloc) => {
                const host = alloc.ip === '0.0.0.0' ? server?.node?.fqdn || 'localhost' : alloc.ip;

                return (
                  <tr key={alloc.id} className="hover:bg-s5/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-p4 flex items-center gap-2">
                      <BreezeIcon icon={Network} size={16} className="text-p1 flex-shrink-0" />
                      <span>{host}</span>
                      <button
                        onClick={() => copyAddress(alloc)}
                        className="p-1 rounded-md text-p5 hover:text-p1 transition-colors cursor-pointer"
                        title="Copy Address"
                      >
                        {copiedId === alloc.id ? (
                          <BreezeIcon icon={Check} size={14} className="text-emerald-400" />
                        ) : (
                          <BreezeIcon icon={Copy} size={14} />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-p4 font-bold">
                      {alloc.port}
                    </td>
                    <td className="py-3 px-4">
                      {alloc.is_primary ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                          Primary Port
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-s3 text-p5 border border-s3 text-[10px] font-bold uppercase tracking-wider">
                          Secondary
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!alloc.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(alloc)}
                            className="px-2.5 py-1 rounded-xl bg-s2 border border-s3 text-p4 hover:text-p1 hover:border-s4 transition-colors font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <BreezeIcon icon={CheckCircle2} size={13} />
                            <span>Set Primary</span>
                          </button>
                        )}
                        {!alloc.is_primary && (
                          <button
                            onClick={() => handleUnassign(alloc)}
                            className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Unassign Port"
                          >
                            <BreezeIcon icon={Trash2} size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ServerNetwork;
