import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import { Network, PlusCircle, Trash2, CheckCircle2, Copy, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const ServerNetwork = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllocations = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const res = await api.get(`/servers/${serverId}/allocations`);
      if (res.success && Array.isArray(res.data)) {
        setAllocations(res.data);
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

      {/* Header Bar */}
      <div className="p-4 bg-s2 border-2 border-s3 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 shadow-inner">
            <BreezeIcon icon={Network} size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-p4">Port Allocations</h2>
            <p className="text-xs text-p5">Assign ports for Minecraft, Voice Chat (SimpleVoiceChat), Dynmap, and Votifier.</p>
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
