import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import SoftwareIcon from '../../../components/ui/SoftwareIcons.jsx';
import {
  Settings,
  Server,
  Layers,
  Globe,
  Activity,
  Cpu,
  HardDrive,
  Hash,
  Save,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerSettings = () => {
  const { server, fetchServer } = useOutletContext();
  const serverId = server?.id;
  const navigate = useNavigate();

  // General form
  const [name, setName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [saving, setSaving] = useState(false);

  // Reinstall
  const [reinstalling, setReinstalling] = useState(false);

  // Danger Zone deletion
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [copiedUuid, setCopiedUuid] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveGeneral = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      const res = await api.put(`/servers/${serverId}`, {
        name: name.trim(),
        description: description.trim(),
      });
      if (res.success) {
        showToast('success', 'Server details updated successfully.');
        fetchServer();
      } else {
        throw new Error(res.error?.message || 'Update failed');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReinstall = async () => {
    if (!window.confirm('Reinstall server software? All default server files and core JARs will be re-downloaded.')) {
      return;
    }

    try {
      setReinstalling(true);
      const res = await api.post(`/servers/${serverId}/reinstall`);
      if (res.success) {
        showToast('success', 'Server software reinstall initiated.');
      } else {
        throw new Error(res.error?.message || 'Reinstall failed');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setReinstalling(false);
    }
  };

  const handleDeleteServer = async (e) => {
    e.preventDefault();
    if (confirmName !== server?.name) {
      showToast('error', 'Server name confirmation does not match.');
      return;
    }

    try {
      setDeleting(true);
      const res = await api.delete(`/servers/${serverId}`);
      if (res.success) {
        navigate('/panel/servers');
      } else {
        throw new Error(res.error?.message || 'Delete failed');
      }
    } catch (err) {
      showToast('error', err.message);
      setDeleting(false);
    }
  };

  const copyUuid = () => {
    if (server?.uuid || server?.id) {
      navigator.clipboard.writeText(server.uuid || String(server.id));
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
    }
  };

  const formatGb = (mb) => {
    if (!mb) return '0 GB';
    const gb = (mb / 1024).toFixed(1);
    return `${gb.endsWith('.0') ? parseInt(gb, 10) : gb} GB`;
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto">
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

      {/* 2-Column Balanced Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ===== Left: General Settings ===== */}
        <div className="flex flex-col gap-6">
          <form
            onSubmit={handleSaveGeneral}
            className="p-6 border-2 border-s3 rounded-2xl bg-s2 flex flex-col gap-5 shadow-sm"
          >
            <div className="flex items-center gap-2.5 pb-3 border-b-2 border-s3">
              <BreezeIcon icon={Settings} size={18} className="text-p1" />
              <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">
                General Settings
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              <BreezeInput
                label="Server Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Minecraft Server"
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="caption font-bold text-p4 text-xs">Server Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add operational notes, Discord invite, or staff guidelines..."
                  rows={4}
                  className="w-full bg-s1 border-2 border-s3 rounded-2xl p-3.5 text-xs text-p4 placeholder:text-p5/40 focus:outline-none focus:border-s4 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <BreezeButton
                type="submit"
                variant="primary"
                size="md"
                icon={Save}
                loading={saving}
                disabled={!name.trim()}
              >
                Save Settings
              </BreezeButton>
            </div>
          </form>

          {/* Software Reinstall Card */}
          <div className="p-6 border-2 border-s3 rounded-2xl bg-s2 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b-2 border-s3">
              <BreezeIcon icon={RefreshCw} size={18} className="text-amber-400" />
              <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">
                Reinstall Server Software
              </h2>
            </div>

            <p className="text-xs text-p5 leading-relaxed">
              Re-executes the container setup script, downloads fresh vanilla/modded JAR binaries, and cleans corrupted core libraries while preserving user directories.
            </p>

            <div className="flex justify-start pt-1">
              <BreezeButton
                variant="warning"
                size="sm"
                icon={RefreshCw}
                loading={reinstalling}
                onClick={handleReinstall}
              >
                Reinstall Software
              </BreezeButton>
            </div>
          </div>
        </div>

        {/* ===== Right: Specifications & Danger Zone ===== */}
        <div className="flex flex-col gap-6">
          {/* Server Specifications Card */}
          <div className="p-6 border-2 border-s3 rounded-2xl bg-s2 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b-2 border-s3">
              <BreezeIcon icon={Server} size={18} className="text-p1" />
              <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">
                Server Specifications
              </h2>
            </div>

            <div className="divide-y divide-s3/60 text-xs font-mono">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={Layers} size={13} className="text-p1" />
                  <span>Software</span>
                </span>
                <span className="text-p4 font-bold capitalize flex items-center gap-1.5">
                  <SoftwareIcon software={server?.software} size={16} />
                  <span>{server?.software || 'Paper'}</span>
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={Globe} size={13} className="text-p1" />
                  <span>Minecraft Version</span>
                </span>
                <span className="text-p4 font-bold">{server?.minecraft_version || 'Latest'}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={Activity} size={13} className="text-p1" />
                  <span>Memory Allocation</span>
                </span>
                <span className="text-p4 font-bold">{formatGb(server?.memory)} ({server?.memory} MB)</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={Cpu} size={13} className="text-p1" />
                  <span>CPU Limit</span>
                </span>
                <span className="text-p4 font-bold">{server?.cpu || 100}%</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={HardDrive} size={13} className="text-p1" />
                  <span>Storage Allocation</span>
                </span>
                <span className="text-p4 font-bold">{formatGb(server?.disk)}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={Server} size={13} className="text-p1" />
                  <span>Host Node</span>
                </span>
                <span className="text-p4 font-bold truncate max-w-[180px]">
                  {server?.node?.name || server?.node?.fqdn || 'Local Host Node'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 font-sans flex items-center gap-1.5">
                  <BreezeIcon icon={Hash} size={13} className="text-p1" />
                  <span>Server UUID</span>
                </span>
                <button
                  onClick={copyUuid}
                  className="text-p5 hover:text-p1 flex items-center gap-1.5 truncate max-w-[180px]"
                  title="Copy Server UUID"
                >
                  <span className="truncate">{server?.uuid || server?.id}</span>
                  {copiedUuid ? <BreezeIcon icon={Check} size={13} className="text-emerald-400" /> : <BreezeIcon icon={Copy} size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 border-2 border-red-500/30 rounded-2xl bg-red-500/5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b-2 border-red-500/20">
              <BreezeIcon icon={AlertTriangle} size={18} className="text-red-400" />
              <h2 className="base-bold text-red-400 text-sm font-semibold uppercase tracking-wider">
                Danger Zone
              </h2>
            </div>

            <p className="text-xs text-red-300/80 leading-relaxed">
              Permanently delete this Minecraft server, container allocations, world data, and backups. This action is irreversible.
            </p>

            <form onSubmit={handleDeleteServer} className="flex flex-col gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-p4">
                  Type <span className="font-mono text-red-400 select-all font-bold">&quot;{server?.name}&quot;</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder={server?.name}
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="bg-s1 border-2 border-red-500/30 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <BreezeButton
                  type="submit"
                  variant="destructive"
                  size="sm"
                  icon={Trash2}
                  loading={deleting}
                  disabled={confirmName !== server?.name || deleting}
                >
                  {deleting ? 'Deleting Server...' : 'Permanently Delete'}
                </BreezeButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
