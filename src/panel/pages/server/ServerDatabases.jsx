import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
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
      if (res.success) {
        setDatabases(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load databases:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/servers/${server.id}/databases`, { database_name: dbName });
      if (res.success && res.data) {
        setCreatedDb(res.data);
        setDbName('');
        fetchDatabases();
      }
    } catch (err) {
      alert(`Database creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (dbId) => {
    if (!confirm('Are you sure you want to drop this database? All data will be permanently deleted.')) return;
    try {
      await api.delete(`/servers/${server.id}/databases/${dbId}`);
      fetchDatabases();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-base font-bold text-p4">Managed Databases</h2>
          <p className="text-xs text-p5">Provision isolated MySQL databases for LuckPerms, CoreProtect, and plugins.</p>
        </div>

        <button
          onClick={() => {
            setCreatedDb(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>New Database</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
          <p className="text-sm font-medium">Loading database instances...</p>
        </div>
      ) : databases.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11141e] border border-[#222638] text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-p1/10 flex items-center justify-center text-p1">
            <Database size={24} />
          </div>
          <h3 className="text-base font-bold text-p4">No Databases Configured</h3>
          <p className="text-xs text-p5 max-w-sm">
            Create a database to connect storage-heavy plugins like LuckPerms, AuthMe, or Vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map((db) => (
            <div
              key={db.id}
              className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col justify-between gap-4 shadow-lg font-mono text-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-bold text-sm text-p4 font-sans flex items-center gap-2">
                    <Database size={16} className="text-p1" />
                    <span>{db.database_name}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    Active
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-p5 mt-3">
                  <p><span className="text-p4 font-semibold">Host:</span> {db.host}:{db.port}</p>
                  <p><span className="text-p4 font-semibold">Username:</span> {db.username}</p>
                  <p><span className="text-p4 font-semibold">Database:</span> {db.database_name}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#222638] flex justify-end">
                <button
                  onClick={() => handleDelete(db.id)}
                  className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Database Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Provision Database</h3>

            {createdDb ? (
              <div className="flex flex-col gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Database created successfully! Please save your password now (it will not be shown again).
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-xl bg-[#08090d] border border-[#222638] text-p4">
                  <p><span className="text-p5">Host:</span> {createdDb.host}:{createdDb.port}</p>
                  <p><span className="text-p5">Database:</span> {createdDb.database_name}</p>
                  <p><span className="text-p5">User:</span> {createdDb.username}</p>
                  <p><span className="text-p5">Password:</span> <span className="text-p1 font-bold">{createdDb.plainPassword}</span></p>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setCreatedDb(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Database Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. luckperms, survival"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                  >
                    Create Database
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerDatabases;
