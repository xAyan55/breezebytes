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
import { Database, PlusCircle, Trash2, Copy, Check, Loader2 } from 'lucide-react';

const ServerDatabases = () => {
  const { server } = useOutletContext();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dbName, setDbName] = useState('');
  const [createdDb, setCreatedDb] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchDatabases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/databases`);
      if (res.success) setDatabases(res.data || []);
    } catch (err) { console.error('Failed to load databases:', err); }
    finally { setLoading(false); }
  }, [server.id]);

  useEffect(() => { fetchDatabases(); }, [fetchDatabases]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/servers/${server.id}/databases`, { database_name: dbName });
      if (res.success && res.data) { setCreatedDb(res.data); setDbName(''); fetchDatabases(); }
    } catch (err) { alert(`Database creation failed: ${err.message}`); }
  };

  const handleDelete = async (dbId) => {
    if (!confirm('Are you sure you want to drop this database? All data will be permanently deleted.')) return;
    try { await api.delete(`/servers/${server.id}/databases/${dbId}`); fetchDatabases(); }
    catch (err) { alert(`Delete failed: ${err.message}`); }
  };

  return (
    <div className="flex flex-col gap-6">
      <BreezePageHeader title="Managed Databases" description="Provision isolated MySQL databases for LuckPerms, CoreProtect, and plugins." icon={Database}>
        <BreezeButton variant="primary" size="md" icon={PlusCircle} onClick={() => { setCreatedDb(null); setModalOpen(true); }}>New Database</BreezeButton>
      </BreezePageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" /><p className="body-3 font-medium">Loading database instances...</p>
        </div>
      ) : databases.length === 0 ? (
        <BreezeEmptyState image="/images/detail-2.png" title="No Databases Configured" description="Create a database to connect storage-heavy plugins like LuckPerms, AuthMe, or Vault." actionLabel="New Database" onAction={() => { setCreatedDb(null); setModalOpen(true); }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map((db) => (
            <BreezeCard key={db.id} className="p-5 flex flex-col justify-between gap-4 font-mono text-xs">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="base-bold text-p4 font-sans flex items-center gap-2">
                    <Database size={16} className="text-p1" />
                    <span>{db.database_name}</span>
                  </span>
                  <BreezeBadge status="active">Active</BreezeBadge>
                </div>
                <div className="flex flex-col gap-1 text-p5 mt-3">
                  <p><span className="text-p4 font-semibold">Host:</span> {db.host}:{db.port}</p>
                  <p><span className="text-p4 font-semibold">Username:</span> {db.username}</p>
                  <p><span className="text-p4 font-semibold">Database:</span> {db.database_name}</p>
                </div>
              </div>
              <div className="pt-3 border-t-2 border-s3 flex justify-end">
                <button onClick={() => handleDelete(db.id)} className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"><Trash2 size={15} /></button>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      <BreezeModal open={modalOpen} onClose={() => setModalOpen(false)} title="Provision Database">
        {createdDb ? (
          <div className="flex flex-col gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400">
              Database created successfully! Please save your password now (it will not be shown again).
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-s1 border-2 border-s3 text-p4">
              <p><span className="text-p5">Host:</span> {createdDb.host}:{createdDb.port}</p>
              <p><span className="text-p5">Database:</span> {createdDb.database_name}</p>
              <p><span className="text-p5">User:</span> {createdDb.username}</p>
              <div className="flex items-center justify-between">
                <p><span className="text-p5">Password:</span> <span className="text-p1 font-bold select-all">{createdDb.plainPassword}</span></p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdDb.plainPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1 rounded-lg text-p5 hover:text-p1 transition-colors duration-500"
                  title="Copy Password"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <BreezeButton variant="primary" size="md" className="w-full" onClick={() => { setModalOpen(false); setCreatedDb(null); }}>
              Close & Done
            </BreezeButton>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <BreezeInput label="Database Name" required placeholder="e.g. luckperms, survival" value={dbName} onChange={(e) => setDbName(e.target.value)} inputClassName="font-mono" />
            <div className="flex justify-end gap-2 mt-2">
              <BreezeButton variant="ghost" size="md" onClick={() => setModalOpen(false)}>Cancel</BreezeButton>
              <BreezeButton variant="primary" size="md" type="submit">Create Database</BreezeButton>
            </div>
          </form>
        )}
      </BreezeModal>
    </div>
  );
};

export default ServerDatabases;
