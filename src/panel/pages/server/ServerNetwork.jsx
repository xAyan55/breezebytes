import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import { Network, PlusCircle, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

const ServerNetwork = () => {
  const { server, fetchServer } = useOutletContext();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/network`);
      if (res.success) {
        setAllocations(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load allocations:', err);
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
      fetchAllocations();
      fetchServer();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssign = async () => {
    try {
      await api.post(`/servers/${server.id}/network/assign`);
      fetchAllocations();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleUnassign = async (allocId) => {
    if (!confirm('Unassign this port allocation?')) return;
    try {
      await api.delete(`/servers/${server.id}/network/${allocId}`);
      fetchAllocations();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-base font-bold text-p4">Port Allocations & Network</h2>
          <p className="text-xs text-p5">Configure primary connection port and secondary ports for Votifier, Dynmap, and BlueMap.</p>
        </div>

        <button
          onClick={handleAssign}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>Assign Port</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
          <p className="text-sm font-medium">Loading port routing...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((a) => {
            const isPrimary = a.is_primary === 1;

            return (
              <div
                key={a.id}
                className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-p4 font-mono">
                      {a.ip === '0.0.0.0' ? server.node?.fqdn || '0.0.0.0' : a.ip}:{a.port}
                    </span>
                    {isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-p1 text-black">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-p5 mt-1">Port #{a.port}</p>
                </div>

                <div className="flex items-center gap-2">
                  {!isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(a.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#08090d] border border-[#222638] text-xs text-p4 hover:text-p1 transition-colors"
                    >
                      <CheckCircle2 size={13} />
                      <span>Set Primary</span>
                    </button>
                  )}

                  {!isPrimary && (
                    <button
                      onClick={() => handleUnassign(a.id)}
                      className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Unassign Port"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServerNetwork;
