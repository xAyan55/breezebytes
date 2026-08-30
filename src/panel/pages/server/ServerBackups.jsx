import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import BreezeEmptyState from '../../../components/ui/BreezeEmptyState.jsx';
import {
  Archive,
  PlusCircle,
  HardDrive,
  Calendar,
  Download,
  RotateCcw,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerBackups = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [backupName, setBackupName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchBackups = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const res = await api.get(`/servers/${serverId}/backups`);
      if (res.success && Array.isArray(res.data)) {
        setBackups(res.data);
      }
    } catch (err) {
      console.error('Failed to list backups:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await api.post(`/servers/${serverId}/backups`, {
        name: backupName.trim() || undefined,
      });
      if (res.success) {
        setShowCreateModal(false);
        setBackupName('');
        showToast('success', 'Backup archive created successfully.');
        fetchBackups();
      } else {
        throw new Error(res.error?.message || 'Backup failed');
      }
    } catch (err) {
      showToast('error', `Backup failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (backup) => {
    if (!window.confirm(`Are you sure you want to restore "${backup.name}"? Current world and configuration files will be replaced.`)) {
      return;
    }

    try {
      setRestoringId(backup.id);
      const res = await api.post(`/servers/${serverId}/backups/${backup.id}/restore`);
      if (res.success) {
        showToast('success', `Restored backup "${backup.name}". Restart your server to apply.`);
      } else {
        throw new Error(res.error?.message || 'Restore failed');
      }
    } catch (err) {
      showToast('error', `Restore failed: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backup) => {
    if (!window.confirm(`Permanently delete backup "${backup.name}"?`)) return;
    try {
      const res = await api.delete(`/servers/${serverId}/backups/${backup.id}`);
      if (res.success) {
        showToast('success', 'Backup deleted.');
        fetchBackups();
      } else {
        throw new Error(res.error?.message || 'Delete failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(1) + ' MB';
  };

  return (
    <div className="w-full flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={clsx(
            'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-300',
            toastMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          )}
        >
          <div className="flex items-center gap-2">
            <BreezeIcon icon={toastMessage.type === 'error' ? AlertCircle : Check} size={15} />
            <span>{toastMessage.message}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-3 text-p4 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 bg-s2 border-2 border-s3 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1">
            <BreezeIcon icon={Archive} size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-p4">Server Backups</h2>
            <p className="text-xs text-p5">Create compressed archives of your world and configs.</p>
          </div>
        </div>

        <BreezeButton
          variant="primary"
          size="sm"
          icon={PlusCircle}
          onClick={() => setShowCreateModal(true)}
        >
          Create Backup
        </BreezeButton>
      </div>

      {/* Backups List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
          <img src="/images/icons/Loader2.gif" alt="Loading" className="size-7 object-contain" />
          <span className="text-xs font-mono">Loading backup catalog...</span>
        </div>
      ) : backups.length === 0 ? (
        <BreezeEmptyState
          image="/images/detail-4.png"
          title="No Backups Found"
          description="Take regular snapshots of your Minecraft world, player inventories, and plugin configs to prevent data loss."
          actionLabel="Create First Backup"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backups.map((b) => (
            <div
              key={b.id}
              className="p-4 border-2 border-s3 rounded-2xl bg-s2 flex flex-col justify-between gap-4 hover:border-s4/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                    <BreezeIcon icon={HardDrive} size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-p4 truncate" title={b.name}>
                      {b.name || 'Automated Snapshot'}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-p5 font-mono mt-1">
                      <span>{formatBytes(b.size_bytes)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <BreezeIcon icon={Calendar} size={12} />
                        <span>{new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    b.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
                  )}
                >
                  {b.status || 'Ready'}
                </span>
              </div>

              <div className="pt-3 border-t border-s3/60 flex items-center justify-end gap-2">
                <a
                  href={`/api/v1/servers/${serverId}/backups/${b.id}/download`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-s1 border border-s3 text-p4 hover:text-p1 hover:border-s4 transition-colors"
                >
                  <BreezeIcon icon={Download} size={13} />
                  <span>Download</span>
                </a>

                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={RotateCcw}
                  loading={restoringId === b.id}
                  onClick={() => handleRestoreBackup(b)}
                >
                  Restore
                </BreezeButton>

                <button
                  onClick={() => handleDeleteBackup(b)}
                  className="p-2 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                  title="Delete Backup"
                >
                  <BreezeIcon icon={Trash2} size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Backup */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBackup}
            className="bg-s2 border-2 border-s3 rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-500"
          >
            <h3 className="h6 text-p4">Create Server Backup</h3>
            <p className="text-xs text-p5">Enter an optional label for this archive snapshot.</p>
            <input
              type="text"
              placeholder="e.g. Pre-Update Snapshot, Before Nether Reset"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              autoFocus
              className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <BreezeButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </BreezeButton>
              <BreezeButton
                type="submit"
                variant="primary"
                size="sm"
                icon={creating ? Loader2 : PlusCircle}
                loading={creating}
              >
                {creating ? 'Archiving...' : 'Start Backup'}
              </BreezeButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ServerBackups;
