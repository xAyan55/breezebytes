import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeEmptyState from '../../../components/ui/BreezeEmptyState.jsx';
import {
  Archive,
  PlusCircle,
  Download,
  RotateCcw,
  Trash2,
  Loader2,
} from 'lucide-react';

const ServerBackups = () => {
  const { server } = useOutletContext();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/backups`);
      if (res.success) setBackups(res.data || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.post(`/servers/${server.id}/backups`, { name: backupName });
      setCreateModal(false);
      setBackupName('');
      fetchBackups();
    } catch (err) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backup) => {
    if (!confirm(`Warning: Restoring "${backup.name}" will overwrite current server files and restart the server. Continue?`)) return;
    try {
      setLoading(true);
      await api.post(`/servers/${server.id}/backups/${backup.id}/restore`);
      alert('Backup restored successfully!');
      fetchBackups();
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (backup) => {
    if (!confirm(`Delete backup "${backup.name}"?`)) return;
    try {
      await api.delete(`/servers/${server.id}/backups/${backup.id}`);
      fetchBackups();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="flex flex-col gap-6">
      <BreezePageHeader
        title="Server Backups"
        description="Archive and restore full server state on demand."
        icon={Archive}
      >
        <BreezeButton variant="primary" size="md" icon={PlusCircle} onClick={() => setCreateModal(true)}>
          Create Backup
        </BreezeButton>
      </BreezePageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
          <p className="body-3 font-medium">Loading backups...</p>
        </div>
      ) : backups.length === 0 ? (
        <BreezeEmptyState
          image="/images/detail-4.png"
          title="No Backups Created"
          description="Create regular backups of your worlds and plugins to protect against griefing and corruption."
          actionLabel="Create Backup"
          onAction={() => setCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backups.map((b) => (
            <BreezeCard key={b.id} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="base-bold text-p4">{b.name}</h3>
                  <span className="small-2 text-emerald-400 font-semibold">{formatSize(b.size_bytes)}</span>
                </div>
                <p className="small-2 text-p5 font-mono">{b.filename}</p>
                <p className="small-2 text-p5/70 mt-2">
                  Created: {new Date(b.created_at).toLocaleString()}
                </p>
              </div>
              <div className="pt-3 border-t-2 border-s3 flex items-center justify-end gap-2">
                <a
                  href={`/api/v1/servers/${server.id}/backups/${b.id}/download`}
                  download
                >
                  <BreezeButton variant="secondary" size="xs" icon={Download}>
                    Download
                  </BreezeButton>
                </a>
                <BreezeButton variant="warning" size="xs" icon={RotateCcw} onClick={() => handleRestore(b)}>
                  Restore
                </BreezeButton>
                <button
                  onClick={() => handleDelete(b)}
                  className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      <BreezeModal open={createModal} onClose={() => setCreateModal(false)} title="Create Full Server Backup">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput
            required
            placeholder="Backup name (e.g. Pre-Boss Fight, Weekly SMP)..."
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <BreezeButton variant="ghost" size="md" onClick={() => setCreateModal(false)}>Cancel</BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit" loading={creating} icon={creating ? Loader2 : undefined}>
              Generate Backup
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerBackups;
