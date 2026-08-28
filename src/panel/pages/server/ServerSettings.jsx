import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { Settings, RefreshCw, Trash2, Save, AlertTriangle, Loader2 } from 'lucide-react';

const ServerSettings = () => {
  const { server, fetchServer } = useOutletContext();
  const navigate = useNavigate();
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [autoRestart, setAutoRestart] = useState(server.auto_restart === 1);
  const [saving, setSaving] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch(`/servers/${server.id}`, {
        name,
        description,
        auto_restart: autoRestart,
      });
      alert('Server settings saved!');
      fetchServer();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReinstall = async () => {
    if (!confirm('Warning: Reinstalling will overwrite server JAR and base properties. Existing world files will not be deleted, but please ensure you have a backup. Continue?')) return;
    try {
      setReinstalling(true);
      await api.post(`/servers/${server.id}/reinstall`);
      alert('Reinstallation process started. Check console for progress.');
      navigate(`/panel/servers/${server.id}/console`);
    } catch (err) {
      alert(`Reinstall failed: ${err.message}`);
    } finally {
      setReinstalling(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== server.name) {
      alert(`Please type "${server.name}" exactly to confirm deletion.`);
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/servers/${server.id}`);
      navigate('/panel/servers');
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* General Settings */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col gap-6 shadow-lg">
        <h2 className="text-base font-bold text-p4 flex items-center gap-2">
          <Settings size={18} className="text-p1" />
          <span>General Server Settings</span>
        </h2>

        <div>
          <label className="block text-[11px] font-semibold text-p5 uppercase mb-1.5">
            Server Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-p5 uppercase mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoRestart"
            checked={autoRestart}
            onChange={(e) => setAutoRestart(e.target.checked)}
            className="size-4 accent-p1 rounded cursor-pointer"
          />
          <label htmlFor="autoRestart" className="text-xs text-p4 font-medium cursor-pointer">
            Auto-restart server on unexpected crashes (Crash Loop Protection enabled)
          </label>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#222638]">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Reinstall Server */}
      <div className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-p4 flex items-center gap-2">
            <RefreshCw size={16} className="text-amber-400" />
            <span>Reinstall Server Software</span>
          </h3>
          <p className="text-xs text-p5 mt-1">
            Redownloads the latest build of {server.software} {server.minecraft_version} and rebuilds base configuration.
          </p>
        </div>

        <button
          onClick={handleReinstall}
          disabled={reinstalling}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500 hover:text-black transition-colors disabled:opacity-50"
        >
          {reinstalling && <Loader2 size={14} className="animate-spin" />}
          <span>Reinstall Server</span>
        </button>
      </div>

      {/* Danger Zone: Delete Server */}
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/30 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={20} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h3>
        </div>

        <p className="text-xs text-p5 leading-relaxed">
          Deleting this server will terminate the running instance, delete all world directories, plugins, configs, and release the allocated port back to the pool. This action is <strong className="text-red-400">irreversible</strong>.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <label className="text-[11px] text-p5">
            Type <strong className="text-p4 font-mono select-all">{server.name}</strong> below to confirm:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder={server.name}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="flex-1 bg-[#08090d] border border-red-500/30 rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handleDelete}
              disabled={deleteConfirm !== server.name || deleting}
              className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>Permanently Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
