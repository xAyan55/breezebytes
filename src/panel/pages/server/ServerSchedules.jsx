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
import {
  Calendar,
  PlusCircle,
  Play,
  Trash2,
  Clock,
  Check,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import clsx from 'clsx';

const ServerSchedules = () => {
  const { server } = useOutletContext();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [cronExp, setCronExp] = useState('0 4 * * *');
  const [actionType, setActionType] = useState('power_restart');
  const [payload, setPayload] = useState('');
  const [triggeringId, setTriggeringId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/schedules`);
      if (res.success) {
        setSchedules(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
      showNotification('error', err.message || 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post(`/servers/${server.id}/schedules`, {
        name: name.trim(),
        cron_expression: cronExp.trim(),
        is_active: 1,
        tasks: [{ action_type: actionType, payload: payload.trim() }],
      });
      setModalOpen(false);
      setName('');
      setPayload('');
      showNotification('success', 'Schedule created.');
      fetchSchedules();
    } catch (err) {
      showNotification('error', `Schedule creation failed: ${err.message}`);
    }
  };

  const handleTrigger = async (schedId) => {
    try {
      setTriggeringId(schedId);
      await api.post(`/servers/${server.id}/schedules/${schedId}/trigger`);
      showNotification('success', 'Schedule executed immediately.');
      fetchSchedules();
    } catch (err) {
      showNotification('error', `Trigger failed: ${err.message}`);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleDelete = async (schedId) => {
    if (!confirm('Delete this automated schedule?')) return;
    try {
      await api.delete(`/servers/${server.id}/schedules/${schedId}`);
      showNotification('success', 'Schedule deleted.');
      fetchSchedules();
    } catch (err) {
      showNotification('error', `Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <BreezePageHeader
        caption="Automation & Jobs"
        title="Scheduled Tasks"
        description="Automate recurring daily restarts, snapshots, and custom in-game commands via cron."
        icon={Calendar}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => setModalOpen(true)}
        >
          New Schedule
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
      ) : schedules.length === 0 ? (
        <BreezeEmptyState
          image="/images/detail-3.png"
          title="No Schedules Configured"
          description="Set up automatic daily restarts or scheduled world backups to keep your server running at peak performance."
          actionLabel="New Schedule"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s) => (
            <BreezeCard key={s.id} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1 flex-shrink-0">
                      <Calendar size={16} />
                    </div>
                    <h3 className="base-bold text-p4 truncate">{s.name}</h3>
                  </div>
                  <BreezeBadge status="active">Active</BreezeBadge>
                </div>
                <div className="mt-2 pl-1 flex items-center gap-2">
                  <span className="text-xs text-p1 font-mono font-bold bg-s1 px-2.5 py-1 rounded-xl border border-s3">
                    {s.cron_expression}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-p5 pl-1">
                  <Clock size={13} />
                  <span>Last run: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>
              <div className="pt-3 border-t-2 border-s3 flex items-center justify-end gap-2">
                <BreezeButton
                  variant="secondary"
                  size="xs"
                  icon={triggeringId === s.id ? RotateCw : Play}
                  loading={triggeringId === s.id}
                  onClick={() => handleTrigger(s.id)}
                >
                  Run Now
                </BreezeButton>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Schedule"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      {/* Create Schedule Modal */}
      <BreezeModal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Automated Schedule">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput
            label="Schedule Name"
            required
            placeholder="e.g. Daily 4 AM Restart"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <BreezeInput
            label="Cron Expression"
            required
            placeholder="e.g. 0 4 * * * (Every day at 4 AM)"
            value={cronExp}
            onChange={(e) => setCronExp(e.target.value)}
            inputClassName="font-mono"
          />
          <BreezeInput
            label="Action"
            type="select"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          >
            <option value="power_restart">Restart Server</option>
            <option value="backup">Create Full Backup</option>
            <option value="command">Send In-Game Console Command</option>
            <option value="power_stop">Stop Server</option>
          </BreezeInput>
          {actionType === 'command' && (
            <BreezeInput
              label="Command String"
              required
              placeholder="e.g. say Server restarting in 5 minutes!"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              inputClassName="font-mono"
            />
          )}
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="sm" type="submit">
              Save Schedule
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerSchedules;
