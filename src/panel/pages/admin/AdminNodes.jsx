import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import { HardDrive, PlusCircle, Loader2 } from 'lucide-react';

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
      <BreezePageHeader
        caption="Administration"
        title="Cluster Nodes"
        description="Manage VPS host daemon nodes and capacity distribution."
        icon={HardDrive}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => setModalOpen(true)}
        >
          Register Node
        </BreezeButton>
      </BreezePageHeader>

      {loading ? (
        <div className="flex justify-center py-12 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nodes.map((node) => (
            <BreezeCard
              key={node.id}
              className="p-6 flex flex-col justify-between gap-6"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="base-bold text-p4 flex items-center gap-2">
                    <HardDrive size={20} className="text-p1" />
                    <span>{node.name}</span>
                  </h3>
                  <BreezeBadge status="online" pulse>
                    Online
                  </BreezeBadge>
                </div>

                <p className="small-2 text-p5 font-mono">
                  {node.fqdn}:{node.port}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-s1 border-2 border-s3">
                    <p className="small-compact text-p5 uppercase font-sans">Servers</p>
                    <p className="text-sm font-bold text-p4 mt-0.5">{node.serversCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-s1 border-2 border-s3">
                    <p className="small-compact text-p5 uppercase font-sans">Allocations</p>
                    <p className="text-sm font-bold text-p1 mt-0.5">{node.usedAllocations || 0} / {node.allocationsCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-s3 flex items-center justify-between small-2 text-p5">
                <span>{(node.memory_total / 1024).toFixed(0)} GB RAM Total</span>
                <span>{(node.disk_total / 1024).toFixed(0)} GB Storage</span>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      {/* New Node Modal */}
      <BreezeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Cluster Node"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput
            label="Node Name"
            type="text"
            required
            placeholder="e.g. US-East-01"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <BreezeInput
            label="FQDN / IP Address"
            type="text"
            required
            value={formData.fqdn}
            onChange={(e) => setFormData({ ...formData, fqdn: e.target.value })}
            inputClassName="font-mono"
          />

          <div className="grid grid-cols-2 gap-3">
            <BreezeInput
              label="RAM (MB)"
              type="number"
              required
              value={formData.memory_total}
              onChange={(e) => setFormData({ ...formData, memory_total: Number(e.target.value) })}
              inputClassName="font-mono"
            />
            <BreezeInput
              label="Disk (MB)"
              type="number"
              required
              value={formData.disk_total}
              onChange={(e) => setFormData({ ...formData, disk_total: Number(e.target.value) })}
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
              Register Node
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default AdminNodes;
