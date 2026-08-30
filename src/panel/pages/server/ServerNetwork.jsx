import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import { BreezeCardSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';
import { Network, PlusCircle, Trash2, CheckCircle2, Copy, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const ServerNetwork = () => {
  const { server, fetchServer } = useOutletContext();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/network`);
      if (res.success) {
        setAllocations(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load allocations:', err);
      showNotification('error', err.message || 'Failed to fetch allocations');
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleSetPrimary = async (allocId) => {
    try {
      await api.post(`/servers/${server.id}/network/primary`, { allocationId: allocId });
      showNotification('success', 'Primary port updated.');
      fetchAllocations();
      fetchServer();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleAssign = async () => {
    try {
      setAssigning(true);
      await api.post(`/servers/${server.id}/network/assign`);
      showNotification('success', 'New port allocation assigned.');
      fetchAllocations();
    } catch (err) {
      showNotification('error', `Assignment failed: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (allocId) => {
    if (!confirm('Unassign this port allocation?')) return;
    try {
      await api.delete(`/servers/${server.id}/network/${allocId}`);
      showNotification('success', 'Allocation removed.');
      fetchAllocations();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const copyAddress = (addr, id) => {
    navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <BreezePageHeader
        caption="Network & Ports"
        title="Port Allocations"
        description="Manage the primary server address and secondary ports for Votifier, Dynmap, and BlueMap."
        icon={Network}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          loading={assigning}
          onClick={handleAssign}
        >
          Assign Additional Port
        </BreezeButton>
      </BreezePageHeader>

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

      {loading ? (
        <BreezeCardSkeleton count={2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((a) => {
            const isPrimary = a.is_primary === 1;
            const fullAddress = `${a.ip === '0.0.0.0' ? server.node?.fqdn || '0.0.0.0' : a.ip}:${a.port}`;

            return (
              <BreezeCard key={a.id} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="base-bold text-p4 font-mono font-bold tracking-wide truncate">
                      {fullAddress}
                    </span>
                    {isPrimary && (
                      <BreezeBadge status="default" dot={false} className="bg-p1/15 text-p1 border-p1/30">
                        Primary
                      </BreezeBadge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-p5 font-mono">Port #{a.port}</p>
                    <button
                      onClick={() => copyAddress(fullAddress, a.id)}
                      className="p-1 rounded-md text-p5/70 hover:text-p1 transition-colors"
                      title="Copy Address"
                    >
                      {copiedId === a.id ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isPrimary && (
                    <BreezeButton
                      variant="secondary"
                      size="xs"
                      icon={CheckCircle2}
                      onClick={() => handleSetPrimary(a.id)}
                    >
                      Set Primary
                    </BreezeButton>
                  )}
                  {!isPrimary && (
                    <button
                      onClick={() => handleUnassign(a.id)}
                      className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Unassign Port"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </BreezeCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServerNetwork;
