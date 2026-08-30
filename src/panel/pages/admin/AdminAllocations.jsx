import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import { BreezeSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';
import { Network, PlusCircle, Trash2, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const AdminAllocations = () => {
  const [allocations, setAllocations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ node_id: '', ip: '0.0.0.0', start_port: 25576, end_port: 25585 });
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

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
      showNotification('error', err.message || 'Failed to fetch allocations');
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
      showNotification('success', 'Allocations created in pool.');
      fetchData();
    } catch (err) {
      showNotification('error', `Allocation creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/allocations/${id}`);
      showNotification('success', 'Allocation deleted.');
      fetchData();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <BreezePageHeader
        caption="Administration"
        title="Port Allocation Pool"
        description="Assign IP/Port combinations available for Minecraft servers across cluster nodes."
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
          <BreezeIcon icon={statusMessage.type === 'success' ? Check : AlertCircle} size={16} />
          <span>{statusMessage.message}</span>
        </div>
      )}

      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-sans font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3 px-4">Node</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Port</th>
                  <th className="py-3 px-4 font-sans">Assigned Server</th>
                  <th className="py-3 px-4 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-s5/30 transition-colors duration-300">
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
                          className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Allocation"
                        >
                          <BreezeIcon icon={Trash2} size={15} />
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
              onChange={(e) => setFormData({ ...formData, start_port: Number(e.target.value) })}
              inputClassName="font-mono"
            />
            <BreezeInput
              label="End Port"
              type="number"
              required
              value={formData.end_port}
              onChange={(e) => setFormData({ ...formData, end_port: Number(e.target.value) })}
              inputClassName="font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="sm" type="submit">
              Create Ports
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default AdminAllocations;
