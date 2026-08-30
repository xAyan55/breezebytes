import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import {
  Settings,
  RefreshCw,
  Trash2,
  Save,
  AlertTriangle,
  Loader2,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Globe,
  Hash,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerSettings = () => {
  const { server, fetchServer } = useOutletContext();
  const navigate = useNavigate();
  const [name, setName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [autoRestart, setAutoRestart] = useState(
    server?.auto_restart === 1 || server?.auto_restart === true,
  );
  const [saving, setSaving] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.patch(`/servers/${server.id}`, {
        name: name.trim(),
        description: description.trim(),
        auto_restart: autoRestart,
      });
      if (res.success) {
        showNotification('success', 'Server settings saved successfully.');
        fetchServer();
      } else {
        throw new Error(res.error?.message || 'Failed to update settings');
      }
    } catch (err) {
      showNotification('error', `Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReinstall = async () => {
    if (
      !confirm(
        `Warning: Reinstalling will re-download the server JAR (${server.software} ${server.minecraft_version}) and rebuild base configuration. Existing world files will not be deleted, but please ensure you have a backup. Continue?`,
      )
    ) {
      return;
    }
    try {
      setReinstalling(true);
      await api.post(`/servers/${server.id}/reinstall`);
      navigate(`/panel/servers/${server.id}/console`);
    } catch (err) {
      showNotification('error', `Reinstall failed: ${err.message}`);
    } finally {
      setReinstalling(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== server.name) {
      showNotification('error', `Please type "${server.name}" exactly to confirm deletion.`);
      return;
    }
    try {
      setDeleting(true);
      await api.delete(`/servers/${server.id}`);
      navigate('/panel/servers');
    } catch (err) {
      showNotification('error', `Deletion failed: ${err.message}`);
      setDeleting(false);
    }
  };

  const copyServerId = () => {
    const idStr = server.uuid || String(server.id);
    navigator.clipboard.writeText(idStr);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatMb = (mb) => {
    if (!mb && mb !== 0) return '0 MB';
    if (mb >= 1024) {
      const gb = (mb / 1024).toFixed(1);
      return `${gb.endsWith('.0') ? parseInt(gb, 10) : gb} GB`;
    }
    return `${mb} MB`;
  };

  const serverAddress = server?.allocation
    ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
    : 'Unassigned';

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Page Header */}
      <BreezePageHeader
        caption="Configuration"
        title="Server Settings"
        description="Manage server configuration, runtime options, hardware allocations, and lifecycle actions."
        icon={Settings}
      />

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

      {/* ===== Top Section: 2-Column Balanced Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: General Settings (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col">
          <BreezeCard className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-s3 pb-3">
              <div className="flex items-center gap-2.5">
                <Settings size={18} className="text-p1" />
                <h3 className="base-bold text-p4">General Settings</h3>
              </div>
            </div>

            <BreezeInput
              label="Server Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Survival SMP"
            />

            <BreezeInput
              label="Description"
              type="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this server instance..."
            />

            {/* Auto Restart Option */}
            <div className="p-3.5 rounded-2xl bg-s1/60 border border-s3/80 flex items-start gap-3">
              <input
                type="checkbox"
                id="autoRestart"
                checked={autoRestart}
                onChange={(e) => setAutoRestart(e.target.checked)}
                className="size-4 mt-0.5 accent-p1 rounded cursor-pointer flex-shrink-0"
              />
              <label htmlFor="autoRestart" className="text-xs text-p4 font-medium cursor-pointer leading-relaxed">
                <span className="font-semibold block text-p4">Auto-restart server on crash</span>
                <span className="text-p5/70 text-[11px] block mt-0.5">
                  Automatically restarts the server if the Java process terminates unexpectedly or runs out of memory.
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-3 border-t-2 border-s3">
              <BreezeButton
                variant="primary"
                size="md"
                type="submit"
                icon={saving ? Loader2 : Save}
                loading={saving}
              >
                Save Settings
              </BreezeButton>
            </div>
          </BreezeCard>
        </form>

        {/* Right: Server Specifications / Read-only Info (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <BreezeCard className="p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-s3 pb-3">
              <div className="flex items-center gap-2.5">
                <Server size={18} className="text-p1" />
                <h3 className="base-bold text-p4">Server Specifications</h3>
              </div>
              <BreezeBadge status={server.status || 'offline'} className="px-2 py-0.5 text-[9px]">
                {server.status || 'offline'}
              </BreezeBadge>
            </div>

            <div className="flex flex-col divide-y divide-s3/60 text-xs">
              {/* Software & Version */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Layers size={14} className="text-p1" />
                  <span>Software</span>
                </span>
                <span className="font-semibold text-p4 capitalize">{server.software || 'Paper'}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Globe size={14} className="text-p1" />
                  <span>Minecraft Version</span>
                </span>
                <span className="font-mono font-semibold text-p4">{server.minecraft_version || '1.20.4'}</span>
              </div>

              {/* Hardware Allocations */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Activity size={14} className="text-p1" />
                  <span>RAM Allocation</span>
                </span>
                <span className="font-semibold text-p4 font-mono">{formatMb(server.memory || 2048)}</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Cpu size={14} className="text-p1" />
                  <span>CPU Allocation</span>
                </span>
                <span className="font-semibold text-p4 font-mono">{server.cpu || 100}%</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <HardDrive size={14} className="text-p1" />
                  <span>Storage / Disk</span>
                </span>
                <span className="font-semibold text-p4 font-mono">{formatMb(server.disk || 10000)}</span>
              </div>

              {/* Node & Address */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Server size={14} className="text-p1" />
                  <span>Node</span>
                </span>
                <span className="font-medium text-p4 truncate max-w-[150px]">
                  {server.node?.name || server.node?.fqdn || 'Local Daemon'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Globe size={14} className="text-p1" />
                  <span>Address</span>
                </span>
                <span className="font-medium text-xs text-p4 font-mono tracking-wide truncate max-w-[170px] select-all">
                  {serverAddress}
                </span>
              </div>

              {/* Server ID / UUID */}
              <div className="pt-2.5 flex items-center justify-between">
                <span className="text-p5 flex items-center gap-2">
                  <Hash size={14} className="text-p1" />
                  <span>Server ID</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-p5/80 truncate max-w-[120px]">
                    {server.uuid ? server.uuid.slice(0, 8) + '...' : `#${server.id}`}
                  </span>
                  <button
                    onClick={copyServerId}
                    className="p-1 rounded text-p5 hover:text-p1 transition-colors cursor-pointer"
                    title="Copy Full Server UUID"
                  >
                    {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </BreezeCard>
        </div>
      </div>

      {/* ===== Bottom Section: Reinstall Card ===== */}
      <BreezeCard className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="base-bold text-p4 flex items-center gap-2">
            <RefreshCw size={16} className="text-amber-400" />
            <span>Reinstall Server Software</span>
          </h3>
          <p className="text-xs text-p5 mt-1 leading-relaxed max-w-2xl">
            Redownloads the latest build of <strong className="text-p4">{server.software} {server.minecraft_version}</strong> and regenerates server files. World files, configs, and plugins will not be removed.
          </p>
        </div>
        <BreezeButton
          variant="warning"
          size="md"
          loading={reinstalling}
          onClick={handleReinstall}
          className="flex-shrink-0"
        >
          Reinstall Server
        </BreezeButton>
      </BreezeCard>

      {/* ===== Bottom Section: Danger Zone Card ===== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-red-500/5 border-2 border-red-500/30 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
        </div>
        <p className="text-xs text-p5 leading-relaxed">
          Deleting this server will permanently terminate the process, delete all world directories, plugins, configs, backups, and release the allocated network port. This action is <strong className="text-red-400">irreversible</strong>.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <label className="text-xs text-p5">
            Type <strong className="text-p4 font-mono select-all font-bold">{server.name}</strong> below to confirm deletion:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder={server.name}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="flex-1 bg-s1 border-2 border-red-500/30 rounded-2xl px-4 py-2 text-xs font-mono text-p4 placeholder:text-p5/30 focus:outline-none focus:border-red-500 transition-all duration-300"
            />
            <BreezeButton
              variant="destructive"
              size="md"
              icon={deleting ? Loader2 : Trash2}
              loading={deleting}
              disabled={deleteConfirm !== server.name}
              onClick={handleDelete}
              className="flex-shrink-0"
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
