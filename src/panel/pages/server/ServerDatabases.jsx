import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeEmptyState from '../../../components/ui/BreezeEmptyState.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import { BreezeCardSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';
import { Database, PlusCircle, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const ServerDatabases = () => {
  const { server } = useOutletContext();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dbName, setDbName] = useState('');
  const [createdDb, setCreatedDb] = useState(null);
  const [copied, setCopied] = useState(false);
  const [cardCopiedId, setCardCopiedId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchDatabases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/databases`);
      if (res.success) {
        setDatabases(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
      showNotification('error', err.message || 'Failed to fetch databases');
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!dbName.trim()) return;
    try {
      const res = await api.post(`/servers/${server.id}/databases`, {
        database_name: dbName.trim(),
      });
      if (res.success && res.data) {
        setCreatedDb(res.data);
        setDbName('');
        showNotification('success', 'Database provisioned.');
        fetchDatabases();
      }
    } catch (err) {
      showNotification('error', `Database creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (dbId, name) => {
    if (
      !confirm(
        `Are you sure you want to drop database "${name}"? All tables and data will be permanently destroyed.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/servers/${server.id}/databases/${dbId}`);
      showNotification('success', 'Database dropped.');
      fetchDatabases();
    } catch (err) {
      showNotification('error', `Delete failed: ${err.message}`);
    }
  };

  const copyDbDetails = (db) => {
    const details = `Host: ${db.host}\nPort: ${db.port}\nDatabase: ${db.database_name}\nUsername: ${db.username}`;
    navigator.clipboard.writeText(details);
    setCardCopiedId(db.id);
    setTimeout(() => setCardCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <BreezePageHeader
        caption="Persistent Storage"
        title="Managed Databases"
        description="Provision isolated MySQL database instances for plugins like LuckPerms, CoreProtect, and AuthMe."
        icon={Database}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => {
            setCreatedDb(null);
            setModalOpen(true);
          }}
        >
          New Database
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

      {loading ? (
        <BreezeCardSkeleton count={2} />
      ) : databases.length === 0 ? (
        <BreezeEmptyState
          image="/images/detail-2.png"
          title="No Databases Configured"
          description="Create a database to connect storage-heavy plugins like LuckPerms, AuthMe, or Vault."
          actionLabel="New Database"
          onAction={() => {
            setCreatedDb(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map((db) => (
            <BreezeCard key={db.id} className="p-5 flex flex-col justify-between gap-4 font-mono text-xs">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="base-bold text-p4 font-sans flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1">
                      <Database size={15} />
                    </div>
                    <span>{db.database_name}</span>
                  </span>
                  <BreezeBadge status="active">Active</BreezeBadge>
                </div>
                <div className="flex flex-col gap-1.5 text-p5 mt-3 p-3 bg-s1/60 rounded-xl border border-s3">
                  <p>
                    <span className="text-p4 font-semibold">Host:</span> {db.host}:{db.port}
                  </p>
                  <p>
                    <span className="text-p4 font-semibold">Username:</span> {db.username}
                  </p>
                  <p>
                    <span className="text-p4 font-semibold">Database:</span> {db.database_name}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t-2 border-s3 flex items-center justify-between">
                <button
                  onClick={() => copyDbDetails(db)}
                  className="flex items-center gap-1 text-[11px] font-sans font-semibold text-p1 hover:underline"
                >
                  {cardCopiedId === db.id ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span>Copied Config</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Config</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(db.id, db.database_name)}
                  className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Drop Database"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      {/* Database Creation Modal */}
      <BreezeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Provision Database Instance"
      >
        {createdDb ? (
          <div className="flex flex-col gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 font-sans">
              Database created successfully! Please save your password now (it will not be shown again).
            </div>
            <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-s1 border-2 border-s3 text-p4">
              <p>
                <span className="text-p5">Host:</span> {createdDb.host}:{createdDb.port}
              </p>
              <p>
                <span className="text-p5">Database:</span> {createdDb.database_name}
              </p>
              <p>
                <span className="text-p5">User:</span> {createdDb.username}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-s3/60">
                <p>
                  <span className="text-p5">Password:</span>{' '}
                  <span className="text-p1 font-bold select-all">{createdDb.plainPassword}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdDb.plainPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1.5 rounded-lg text-p5 hover:text-p1 hover:bg-s5/50 transition-colors"
                  title="Copy Password"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <BreezeButton
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                setModalOpen(false);
                setCreatedDb(null);
              }}
            >
              Done & Close
            </BreezeButton>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <BreezeInput
              label="Database Name"
              required
              placeholder="e.g. luckperms, survival"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              inputClassName="font-mono"
            />
            <p className="text-[11px] text-p5 -mt-2 pl-1">
              Creates an isolated database on the cluster MySQL service.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </BreezeButton>
              <BreezeButton variant="primary" size="sm" type="submit">
                Create Database
              </BreezeButton>
            </div>
          </form>
        )}
      </BreezeModal>
    </div>
  );
};

export default ServerDatabases;
