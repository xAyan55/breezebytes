import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
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
      <BreezePageHeader
        caption="Administration"
        title="Port Allocation Pool"
        description="Assign IP/Port combinations available for Minecraft servers."
        icon={Network}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => setModalOpen(true)}
        >
          Create Allocations
        </BreezeButton>
      </BreezePageHeader>

      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-sans font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3.5 px-4">Node</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Port</th>
                  <th className="py-3.5 px-4 font-sans">Assigned Server</th>
                  <th className="py-3.5 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-s5/30 transition-colors duration-500">
                    <td className="py-3 px-4 text-p4 font-sans font-semibold">{a.nodeName}</td>
                    <td className="py-3 px-4 text-p5">{a.ip}</td>
                    <td className="py-3 px-4 font-bold text-p1">{a.port}</td>
                    <td className="py-3 px-4 font-sans">
                      {a.serverName ? (
                        <BreezeBadge status="default" dot={false}>
                          {a.serverName}
                        </BreezeBadge>
                      ) : (
                        <span className="text-emerald-400 text-xs font-semibold">Available</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {!a.server_id && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"
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
      </BreezeCard>

      {/* New Allocations Modal */}
      <BreezeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Bulk Create Port Allocations"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput
            label="Target Node"
            type="select"
            value={formData.node_id}
            onChange={(e) => setFormData({ ...formData, node_id: e.target.value })}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.fqdn})
              </option>
            ))}
          </BreezeInput>

          <BreezeInput
            label="IP Address"
            type="text"
            required
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            inputClassName="font-mono"
          />

          <div className="grid grid-cols-2 gap-3">
            <BreezeInput
              label="Start Port"
              type="number"
              required
              value={formData.start_port}
              onChange={(e) => setFormData({ ...formData, start_port: e.target.value })}
              inputClassName="font-mono"
            />
            <BreezeInput
              label="End Port"
              type="number"
              required
              value={formData.end_port}
              onChange={(e) => setFormData({ ...formData, end_port: e.target.value })}
              inputClassName="font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton
              variant="ghost"
              size="md"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit">
              Create Ports
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default AdminAllocations;
