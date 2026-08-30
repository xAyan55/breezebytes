import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeEmptyState from '../../../components/ui/BreezeEmptyState.jsx';
import { BreezeCardSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';
import {
  Archive,
  PlusCircle,
  Download,
  RotateCcw,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  HardDrive,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';

const ServerBackups = () => {
  const { server } = useOutletContext();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/backups`);
      if (res.success) {
        setBackups(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
      showNotification('error', err.message || 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!backupName.trim()) return;
    try {
      setCreating(true);
      await api.post(`/servers/${server.id}/backups`, { name: backupName.trim() });
      setCreateModal(false);
      setBackupName('');
      showNotification('success', 'Backup created successfully.');
      fetchBackups();
    } catch (err) {
      showNotification('error', `Backup failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backup) => {
    if (
      !confirm(
        `Warning: Restoring "${backup.name}" will overwrite existing server files and restart the server. Do you want to proceed?`,
      )
    ) {
      return;
    }

    try {
      setRestoringId(backup.id);
      await api.post(`/servers/${server.id}/backups/${backup.id}/restore`);
      showNotification('success', `Backup "${backup.name}" restored.`);
      fetchBackups();
    } catch (err) {
      showNotification('error', `Restore failed: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (backup) => {
    if (!confirm(`Delete backup "${backup.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/servers/${server.id}/backups/${backup.id}`);
      showNotification('success', 'Backup deleted.');
      fetchBackups();
    } catch (err) {
      showNotification('error', `Delete failed: ${err.message}`);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <BreezePageHeader
        caption="Disaster Recovery"
        title="Server Backups"
        description="Create snapshots of your worlds, configs, and plugins for instant restore."
        icon={Archive}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => setCreateModal(true)}
        >
          Create Backup
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

      {/* Backups List */}
      {loading ? (
        <BreezeCardSkeleton count={2} />
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
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                      <HardDrive size={16} />
                    </div>
                    <h3 className="base-bold text-p4 truncate">{b.name}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex-shrink-0">
                    {formatSize(b.size_bytes)}
                  </span>
                </div>

                <p className="text-xs text-p5 font-mono truncate pl-1">{b.filename || `${b.id}.tar.gz`}</p>

                <div className="flex items-center gap-1.5 text-p5/70 text-[11px] mt-3 pl-1">
                  <Calendar size={13} />
                  <span>Created: {new Date(b.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-s3/80 flex items-center justify-end gap-2">
                <a
                  href={`/api/v1/servers/${server.id}/backups/${b.id}/download`}
                  download
                  className="inline-flex"
                >
                  <BreezeButton variant="secondary" size="xs" icon={Download}>
                    Download
                  </BreezeButton>
                </a>
                <BreezeButton
                  variant="warning"
                  size="xs"
                  icon={restoringId === b.id ? Loader2 : RotateCcw}
                  loading={restoringId === b.id}
                  onClick={() => handleRestore(b)}
                >
                  Restore
                </BreezeButton>
                <button
                  onClick={() => handleDelete(b)}
                  className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Backup"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      {/* Create Backup Modal */}
      <BreezeModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Server Backup"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput
            label="Backup Name"
            required
            placeholder="e.g. Pre-Update Snapshot, Weekly SMP World"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
          />
          <p className="text-[11px] text-p5 -mt-2 pl-1">
            Backups archive the entire server working directory into a compressed tarball.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setCreateModal(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton
              variant="primary"
              size="sm"
              type="submit"
              loading={creating}
              icon={creating ? Loader2 : PlusCircle}
            >
              {creating ? 'Creating Backup...' : 'Start Backup'}
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerBackups;
