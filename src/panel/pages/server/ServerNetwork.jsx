import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import { Network, PlusCircle, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

const ServerNetwork = () => {
  const { server, fetchServer } = useOutletContext();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/network`);
      if (res.success) setAllocations(res.data || []);
    } catch (err) { console.error('Failed to load allocations:', err); }
    finally { setLoading(false); }
  }, [server.id]);

  useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

  const handleSetPrimary = async (allocId) => {
    try { await api.post(`/servers/${server.id}/network/primary`, { allocationId: allocId }); fetchAllocations(); fetchServer(); }
    catch (err) { alert(err.message); }
  };

  const handleAssign = async () => {
    try { await api.post(`/servers/${server.id}/network/assign`); fetchAllocations(); }
    catch (err) { alert(`Assignment failed: ${err.message}`); }
  };

  const handleUnassign = async (allocId) => {
    if (!confirm('Unassign this port allocation?')) return;
    try { await api.delete(`/servers/${server.id}/network/${allocId}`); fetchAllocations(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="flex flex-col gap-6">
      <BreezePageHeader title="Port Allocations & Network" description="Configure primary connection port and secondary ports for Votifier, Dynmap, and BlueMap." icon={Network}>
        <BreezeButton variant="primary" size="md" icon={PlusCircle} onClick={handleAssign}>Assign Port</BreezeButton>
      </BreezePageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" /><p className="body-3 font-medium">Loading port routing...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((a) => {
            const isPrimary = a.is_primary === 1;
            return (
              <BreezeCard key={a.id} className="p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="base-bold text-p4 font-mono">
                      {a.ip === '0.0.0.0' ? server.node?.fqdn || '0.0.0.0' : a.ip}:{a.port}
                    </span>
                    {isPrimary && <BreezeBadge status="default" dot={false}>Primary</BreezeBadge>}
                  </div>
                  <p className="small-2 text-p5 mt-1">Port #{a.port}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isPrimary && (
                    <BreezeButton variant="secondary" size="xs" icon={CheckCircle2} onClick={() => handleSetPrimary(a.id)}>
                      Set Primary
                    </BreezeButton>
                  )}
                  {!isPrimary && (
                    <button onClick={() => handleUnassign(a.id)} className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500" title="Unassign Port"><Trash2 size={15} /></button>
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
