import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import BreezeEmptyState from '../../../components/ui/BreezeEmptyState.jsx';
import { Database, PlusCircle, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const ServerDatabases = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbName, setDbName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDatabases = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const res = await api.get(`/servers/${serverId}/databases`);
      if (res.success && Array.isArray(res.data)) {
        setDatabases(res.data);
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!dbName.trim()) return;

    try {
      setCreating(true);
      const res = await api.post(`/servers/${serverId}/databases`, {
        database_name: dbName.trim(),
      });
      if (res.success) {
        setShowCreateModal(false);
        setDbName('');
        showToast('success', 'Database provisioned successfully.');
        fetchDatabases();
      } else {
        throw new Error(res.error?.message || 'Creation failed');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (db) => {
    if (!window.confirm(`Drop database "${db.database_name}"? All tables and data will be deleted.`)) return;
    try {
      const res = await api.delete(`/servers/${serverId}/databases/${db.id}`);
      if (res.success) {
        showToast('success', 'Database dropped.');
        fetchDatabases();
      } else {
        throw new Error(res.error?.message || 'Delete failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const copyConnectionString = (db) => {
    const str = `mysql://${db.username}:${db.password}@${db.host || '127.0.0.1'}:${db.port || 3306}/${db.database_name}`;
    navigator.clipboard.writeText(str);
    setCopiedId(db.id);
    setTimeout(() => setCopiedId(null), 2000);
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
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 shadow-inner">
            <BreezeIcon icon={Database} size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-p4">Managed Databases</h2>
            <p className="text-xs text-p5">Provision dedicated MySQL instances for LuckPerms, CoreProtect, and plugins.</p>
          </div>
        </div>

        <BreezeButton
          variant="primary"
          size="sm"
          icon={PlusCircle}
          onClick={() => setShowCreateModal(true)}
        >
          New Database
        </BreezeButton>
      </div>

      {/* Database Cards */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
          <img src="/images/icons/Loader2.gif" alt="Loading" className="size-7 object-contain" />
          <span className="text-xs font-mono">Loading databases...</span>
        </div>
      ) : databases.length === 0 ? (
        <BreezeEmptyState
          image="/images/detail-2.png"
          title="No Databases Provisioned"
          description="Create a MySQL database instance to connect plugin storage, economy data, and permissions systems."
          actionLabel="Create Database"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map((db) => (
            <div
              key={db.id}
              className="p-4 border-2 border-s3 rounded-2xl bg-s2 flex flex-col justify-between gap-4 hover:border-s4/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                    <BreezeIcon icon={Database} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-p4 font-mono truncate">{db.database_name}</h3>
                    <p className="text-[11px] text-p5 font-mono truncate">
                      {db.host || '127.0.0.1'}:{db.port || 3306}
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  MySQL 8.0
                </span>
              </div>

              {/* Credentials Box */}
              <div className="p-3 rounded-xl bg-s1 border border-s3 font-mono text-xs flex flex-col gap-1 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-p5 text-[10px] uppercase font-sans">Username:</span>
                  <span className="text-p4 font-semibold select-all">{db.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-p5 text-[10px] uppercase font-sans">Password:</span>
                  <span className="text-p4 font-semibold select-all">{db.password}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-s3/60 flex items-center justify-between">
                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={copiedId === db.id ? Check : Copy}
                  onClick={() => copyConnectionString(db)}
                >
                  {copiedId === db.id ? 'Copied Config' : 'Copy Config'}
                </BreezeButton>

                <button
                  onClick={() => handleDelete(db)}
                  className="p-2 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Drop Database"
                >
                  <BreezeIcon icon={Trash2} size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Database */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-s2 border-2 border-s3 rounded-2xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-500"
          >
            <h3 className="h6 text-p4">Create MySQL Database</h3>
            <p className="text-xs text-p5">Enter a unique name for this database instance.</p>
            <input
              type="text"
              placeholder="e.g. luckperms_data, s1_coreprotect"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              autoFocus
              className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 font-mono focus:outline-none focus:border-s4"
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
                loading={creating}
                disabled={!dbName.trim()}
              >
                Provision Database
              </BreezeButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ServerDatabases;
