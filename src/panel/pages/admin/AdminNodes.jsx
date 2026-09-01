import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import { BreezeCardSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';
import clsx from 'clsx';

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
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchNodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/nodes');
      if (res.success) {
        setNodes(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
      showNotification('error', err.message || 'Failed to fetch cluster nodes');
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
      showNotification('success', 'Cluster node registered.');
      fetchNodes();
    } catch (err) {
      showNotification('error', `Node registration failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <BreezePageHeader
        caption="Administration"
        title="Cluster Nodes"
        description="Manage host daemon nodes, daemon health, and cluster capacity distribution."
        icon="HardDrive"
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon="PlusCircle"
          onClick={() => setModalOpen(true)}
        >
          Register Node
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
          <BreezeIcon icon={statusMessage.type === 'success' ? 'Check' : 'AlertCircle'} size={16} />
          <span>{statusMessage.message}</span>
        </div>
      )}

      {loading ? (
        <BreezeCardSkeleton count={2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {nodes.map((node) => (
            <BreezeCard
              key={node.id}
              className="p-6 flex flex-col justify-between gap-6"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="base-bold text-p4 flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1">
                      <BreezeIcon icon="HardDrive" size={18} />
                    </div>
                    <span>{node.name}</span>
                  </h3>
                  <BreezeBadge status="online" pulse>
                    Online
                  </BreezeBadge>
                </div>

                <p className="text-xs text-p5 font-mono pl-1">
                  {node.fqdn}:{node.port}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-s1 border-2 border-s3">
                    <p className="text-[10px] text-p5 uppercase font-semibold font-sans">Instances</p>
                    <p className="text-sm font-bold text-p4 mt-0.5">{node.serversCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-s1 border-2 border-s3">
                    <p className="text-[10px] text-p5 uppercase font-semibold font-sans">Allocations</p>
                    <p className="text-sm font-bold text-p1 mt-0.5">{node.usedAllocations || 0} / {node.allocationsCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-s3 flex items-center justify-between text-xs text-p5">
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
              size="sm"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="sm" type="submit">
              Register Node
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default AdminNodes;
