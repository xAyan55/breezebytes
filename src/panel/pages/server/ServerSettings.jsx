import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
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
      await api.patch(`/servers/${server.id}`, { name, description, auto_restart: autoRestart });
      alert('Server settings saved!');
      fetchServer();
    } catch (err) { alert(`Save failed: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleReinstall = async () => {
    if (!confirm('Warning: Reinstalling will overwrite server JAR and base properties. Existing world files will not be deleted, but please ensure you have a backup. Continue?')) return;
    try {
      setReinstalling(true);
      await api.post(`/servers/${server.id}/reinstall`);
      alert('Reinstallation process started. Check console for progress.');
      navigate(`/panel/servers/${server.id}/console`);
    } catch (err) { alert(`Reinstall failed: ${err.message}`); }
    finally { setReinstalling(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== server.name) { alert(`Please type "${server.name}" exactly to confirm deletion.`); return; }
    try {
      setDeleting(true);
      await api.delete(`/servers/${server.id}`);
      navigate('/panel/servers');
    } catch (err) { alert(`Deletion failed: ${err.message}`); setDeleting(false); }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* General Settings */}
      <form onSubmit={handleSave}>
        <BreezeCard className="p-6 flex flex-col gap-6">
          <h2 className="base-bold text-p4 flex items-center gap-2">
            <Settings size={18} className="text-p1" />
            <span>General Server Settings</span>
          </h2>
          <BreezeInput label="Server Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <BreezeInput label="Description" type="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="autoRestart" checked={autoRestart} onChange={(e) => setAutoRestart(e.target.checked)} className="size-4 accent-p1 rounded cursor-pointer" />
            <label htmlFor="autoRestart" className="small-compact text-p4 font-medium cursor-pointer">
              Auto-restart server on unexpected crashes (Crash Loop Protection enabled)
            </label>
          </div>
          <div className="flex justify-end pt-4 border-t-2 border-s3">
            <BreezeButton variant="primary" size="md" type="submit" icon={saving ? Loader2 : Save} loading={saving}>
              Save Settings
            </BreezeButton>
          </div>
        </BreezeCard>
      </form>

      {/* Reinstall */}
      <BreezeCard className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="base-bold text-p4 flex items-center gap-2">
            <RefreshCw size={16} className="text-amber-400" />
            <span>Reinstall Server Software</span>
          </h3>
          <p className="small-2 text-p5 mt-1">
            Redownloads the latest build of {server.software} {server.minecraft_version} and rebuilds base configuration.
          </p>
        </div>
        <BreezeButton variant="warning" size="md" loading={reinstalling} onClick={handleReinstall}>
          Reinstall Server
        </BreezeButton>
      </BreezeCard>

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl bg-red-500/5 border-2 border-red-500/30 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={20} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h3>
        </div>
        <p className="small-2 text-p5 leading-relaxed">
          Deleting this server will terminate the running instance, delete all world directories, plugins, configs, and release the allocated port back to the pool. This action is <strong className="text-red-400">irreversible</strong>.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <label className="small-2 text-p5">
            Type <strong className="text-p4 font-mono select-all">{server.name}</strong> below to confirm:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder={server.name}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="flex-1 bg-s1 border-2 border-red-500/30 rounded-2xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-red-500 transition-all duration-500"
            />
            <BreezeButton
              variant="destructive"
              size="md"
              icon={deleting ? Loader2 : Trash2}
              loading={deleting}
              disabled={deleteConfirm !== server.name}
              onClick={handleDelete}
            >
              Permanently Delete
            </BreezeButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
