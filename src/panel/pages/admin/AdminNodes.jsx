import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { HardDrive, PlusCircle, Server, Activity, Loader2 } from 'lucide-react';

const AdminNodes = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    fqdn: '127.0.0.1',
    port: 3001,
    memory_total: 24576,
    disk_total: 50000,
  });

  const fetchNodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/nodes');
      if (res.success) {
        setNodes(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/nodes', formData);
      setModalOpen(false);
      setFormData({ name: '', fqdn: '127.0.0.1', port: 3001, memory_total: 24576, disk_total: 50000 });
      fetchNodes();
    } catch (err) {
      alert(`Node registration failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-p4">Cluster Nodes</h1>
          <p className="text-xs text-p5">Manage VPS host daemon nodes and capacity distribution.</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>Register Node</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col justify-between gap-6 shadow-xl"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg text-p4 flex items-center gap-2">
                    <HardDrive size={20} className="text-p1" />
                    <span>{node.name}</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                  </span>
                </div>

                <p className="text-xs text-p5 font-mono">
                  {node.fqdn}:{node.port}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#08090d] border border-[#222638]">
                    <p className="text-[10px] text-p5 uppercase font-sans">Servers</p>
                    <p className="text-sm font-bold text-p4 mt-0.5">{node.serversCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#08090d] border border-[#222638]">
                    <p className="text-[10px] text-p5 uppercase font-sans">Allocations</p>
                    <p className="text-sm font-bold text-p1 mt-0.5">{node.usedAllocations || 0} / {node.allocationsCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#222638] flex items-center justify-between text-xs text-p5">
                <span>{(node.memory_total / 1024).toFixed(0)} GB RAM Total</span>
                <span>{(node.disk_total / 1024).toFixed(0)} GB Storage</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Node Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Register Cluster Node</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Node Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US-East-01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">FQDN / IP Address</label>
                <input
                  type="text"
                  required
                  value={formData.fqdn}
                  onChange={(e) => setFormData({ ...formData, fqdn: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">RAM (MB)</label>
                  <input
                    type="number"
                    required
                    value={formData.memory_total}
                    onChange={(e) => setFormData({ ...formData, memory_total: Number(e.target.value) })}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Disk (MB)</label>
                  <input
                    type="number"
                    required
                    value={formData.disk_total}
                    onChange={(e) => setFormData({ ...formData, disk_total: Number(e.target.value) })}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNodes;
