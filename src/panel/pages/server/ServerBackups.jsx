import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import {
  Archive,
  PlusCircle,
  Download,
  RotateCcw,
  Trash2,
  Lock,
  Unlock,
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
      if (res.success) {
        setBackups(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

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
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-base font-bold text-p4">Server Backups</h2>
          <p className="text-xs text-p5">Archive and restore full server state on demand.</p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>Create Backup</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
          <p className="text-sm font-medium">Loading backups...</p>
        </div>
      ) : backups.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11141e] border border-[#222638] text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-p1/10 flex items-center justify-center text-p1">
            <Archive size={24} />
          </div>
          <h3 className="text-base font-bold text-p4">No Backups Created</h3>
          <p className="text-xs text-p5 max-w-sm">
            Create regular backups of your worlds and plugins to protect against griefing and corruption.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {backups.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col justify-between gap-4 shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base text-p4">{b.name}</h3>
                  <span className="text-xs text-emerald-400 font-semibold">{formatSize(b.size_bytes)}</span>
                </div>
                <p className="text-[11px] text-p5 font-mono">{b.filename}</p>
                <p className="text-[10px] text-p5/70 mt-2">
                  Created: {new Date(b.created_at).toLocaleString()}
                </p>
              </div>

              <div className="pt-3 border-t border-[#222638] flex items-center justify-end gap-2">
                <a
                  href={`/api/v1/servers/${server.id}/backups/${b.id}/download`}
                  download
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#08090d] border border-[#222638] text-xs text-p4 hover:text-p1 hover:border-p1/50 transition-colors"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => handleRestore(b)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500 hover:text-black transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => handleDelete(b)}
                  className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Backup"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Backup Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Create Full Server Backup</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="Backup name (e.g. Pre-Boss Fight, Weekly SMP)..."
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 flex items-center gap-1.5"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  <span>Generate Backup</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerBackups;
