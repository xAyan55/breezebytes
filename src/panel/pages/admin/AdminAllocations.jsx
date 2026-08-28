import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { Network, PlusCircle, Trash2, Loader2 } from 'lucide-react';

const AdminAllocations = () => {
  const [allocations, setAllocations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ node_id: '', ip: '0.0.0.0', start_port: 25576, end_port: 25585 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allocRes, nodeRes] = await Promise.all([
        api.get('/admin/allocations'),
        api.get('/admin/nodes'),
      ]);

      if (allocRes.success) setAllocations(allocRes.data || []);
      if (nodeRes.success && nodeRes.data.length > 0) {
        setNodes(nodeRes.data);
        setFormData((prev) => ({ ...prev, node_id: nodeRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load allocations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/allocations', formData);
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(`Allocation creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/allocations/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-p4">Port Allocation Pool</h1>
          <p className="text-xs text-p5">Assign IP/Port combinations available for Minecraft servers.</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>Create Allocations</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#11141e] border border-[#222638] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center py-12 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222638] bg-[#08090d] text-p5 font-sans font-semibold uppercase">
                  <th className="py-3.5 px-4">Node</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Port</th>
                  <th className="py-3.5 px-4 font-sans">Assigned Server</th>
                  <th className="py-3.5 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222638]/60">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-s2/30">
                    <td className="py-3 px-4 text-p4 font-sans font-semibold">{a.nodeName}</td>
                    <td className="py-3 px-4 text-p5">{a.ip}</td>
                    <td className="py-3 px-4 font-bold text-p1">{a.port}</td>
                    <td className="py-3 px-4 font-sans">
                      {a.serverName ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-p1/10 text-p1 border border-p1/30">
                          {a.serverName}
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold">Available</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {!a.server_id && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Allocations Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Bulk Create Port Allocations</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Target Node</label>
                <select
                  value={formData.node_id}
                  onChange={(e) => setFormData({ ...formData, node_id: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.fqdn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">IP Address</label>
                <input
                  type="text"
                  required
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 font-mono focus:outline-none focus:border-p1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Start Port</label>
                  <input
                    type="number"
                    required
                    value={formData.start_port}
                    onChange={(e) => setFormData({ ...formData, start_port: e.target.value })}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 font-mono focus:outline-none focus:border-p1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">End Port</label>
                  <input
                    type="number"
                    required
                    value={formData.end_port}
                    onChange={(e) => setFormData({ ...formData, end_port: e.target.value })}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 font-mono focus:outline-none focus:border-p1"
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
                  Create Ports
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAllocations;
