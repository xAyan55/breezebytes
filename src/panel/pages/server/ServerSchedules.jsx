import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import BreezeEmptyState from '../../../components/ui/BreezeEmptyState.jsx';
import {
  Calendar,
  PlusCircle,
  Clock,
  Play,
  RotateCw,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const ServerSchedules = () => {
  const { server } = useOutletContext();
  const serverId = server?.id;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 4 * * *');
  const [actionType, setActionType] = useState('command');
  const [actionPayload, setActionPayload] = useState('say [Server] Automated Restart in 60 seconds');
  const [creating, setCreating] = useState(false);
  const [triggeringId, setTriggeringId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchSchedules = useCallback(async () => {
    if (!serverId) return;
    try {
      setLoading(true);
      const res = await api.get(`/servers/${serverId}/schedules`);
      if (res.success && Array.isArray(res.data)) {
        setSchedules(res.data);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      const res = await api.post(`/servers/${serverId}/schedules`, {
        name: name.trim(),
        cron_expression: cron.trim(),
        action_type: actionType,
        action_payload: actionPayload.trim(),
        is_active: true,
      });

      if (res.success) {
        setShowCreateModal(false);
        setName('');
        setCron('0 4 * * *');
        setActionPayload('');
        showToast('success', 'Scheduled task created.');
        fetchSchedules();
      } else {
        throw new Error(res.error?.message || 'Failed to create schedule');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTrigger = async (schedule) => {
    try {
      setTriggeringId(schedule.id);
      const res = await api.post(`/servers/${serverId}/schedules/${schedule.id}/trigger`);
      if (res.success) {
        showToast('success', `Triggered task "${schedule.name}".`);
        fetchSchedules();
      } else {
        throw new Error(res.error?.message || 'Trigger failed');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleDelete = async (schedule) => {
    if (!window.confirm(`Delete scheduled task "${schedule.name}"?`)) return;
    try {
      const res = await api.delete(`/servers/${serverId}/schedules/${schedule.id}`);
      if (res.success) {
        showToast('success', 'Schedule deleted.');
        fetchSchedules();
      } else {
        throw new Error(res.error?.message || 'Delete failed');
      }
    } catch (err) {
      showToast('error', err.message);
    }
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
            <BreezeIcon icon={Calendar} size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-p4">Scheduled Tasks</h2>
            <p className="text-xs text-p5">Automate server commands, daily restarts, and backups via cron.</p>
          </div>
        </div>

        <BreezeButton
          variant="primary"
          size="sm"
          icon={PlusCircle}
          onClick={() => setShowCreateModal(true)}
        >
          New Schedule
        </BreezeButton>
      </div>

      {/* Schedules List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-p5">
          <img src="/images/icons/Loader2.gif" alt="Loading" className="size-7 object-contain" />
          <span className="text-xs font-mono">Loading schedules...</span>
        </div>
      ) : schedules.length === 0 ? (
        <BreezeEmptyState
          image="/images/detail-3.png"
          title="No Scheduled Tasks"
          description="Create recurring cron tasks to execute commands, perform world saves, or restart your server at set times."
          actionLabel="Create Schedule"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="p-4 border-2 border-s3 rounded-2xl bg-s2 flex flex-col justify-between gap-4 hover:border-s4/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                    <BreezeIcon icon={Calendar} size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-p4 truncate">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-lg bg-s1 border border-s3 font-mono text-[10px] text-p1 font-bold">
                        {s.cron_expression}
                      </span>
                      <span className="text-[11px] text-p5 capitalize">
                        {s.action_type}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    s.is_active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-s3 text-p5 border border-s3',
                  )}
                >
                  {s.is_active ? 'Active' : 'Paused'}
                </span>
              </div>

              {s.action_payload && (
                <div className="p-2.5 rounded-xl bg-s1 border border-s3 font-mono text-xs text-zinc-300 truncate select-all">
                  &gt; {s.action_payload}
                </div>
              )}

              <div className="pt-3 border-t border-s3/60 flex items-center justify-between">
                <span className="text-[10px] text-p5 flex items-center gap-1 font-mono">
                  <BreezeIcon icon={Clock} size={12} />
                  <span>Last run: {s.last_run ? new Date(s.last_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                </span>

                <div className="flex items-center gap-2">
                  <BreezeButton
                    variant="secondary"
                    size="sm"
                    icon={triggeringId === s.id ? RotateCw : Play}
                    loading={triggeringId === s.id}
                    onClick={() => handleTrigger(s)}
                  >
                    Run Now
                  </BreezeButton>

                  <button
                    onClick={() => handleDelete(s)}
                    className="p-2 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                    title="Delete Schedule"
                  >
                    <BreezeIcon icon={Trash2} size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Schedule */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-s2 border-2 border-s3 rounded-2xl p-5 max-w-md w-full flex flex-col gap-4 shadow-500"
          >
            <h3 className="h6 text-p4">Create Scheduled Task</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-p4 uppercase">Task Name</label>
              <input
                type="text"
                placeholder="e.g. Daily 4 AM Restart, World Auto-Save"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-p4 uppercase">Cron Expression (Minute Hour Day Month Weekday)</label>
              <input
                type="text"
                placeholder="0 4 * * * (Every day at 04:00)"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                required
                className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 font-mono focus:outline-none focus:border-s4"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-p4 uppercase">Action</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="bg-s1 border-2 border-s3 rounded-xl px-3 py-2 text-xs text-p4 focus:outline-none focus:border-s4"
                >
                  <option value="command">Send Command</option>
                  <option value="power_restart">Restart Server</option>
                  <option value="power_start">Start Server</option>
                  <option value="power_stop">Stop Server</option>
                  <option value="backup">Create Backup</option>
                </select>
              </div>

              {actionType === 'command' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-p4 uppercase">Command Payload</label>
                  <input
                    type="text"
                    placeholder="e.g. save-all, say Hello"
                    value={actionPayload}
                    onChange={(e) => setActionPayload(e.target.value)}
                    required
                    className="bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 font-mono focus:outline-none focus:border-s4"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                disabled={!name.trim()}
              >
                Save Schedule
              </BreezeButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ServerSchedules;
