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
import { Calendar, PlusCircle, Play, Trash2, Clock, Loader2 } from 'lucide-react';

const ServerSchedules = () => {
  const { server } = useOutletContext();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [cronExp, setCronExp] = useState('0 4 * * *');
  const [actionType, setActionType] = useState('power_restart');
  const [payload, setPayload] = useState('');

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/schedules`);
      if (res.success) setSchedules(res.data || []);
    } catch (err) { console.error('Failed to load schedules:', err); }
    finally { setLoading(false); }
  }, [server.id]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/servers/${server.id}/schedules`, { name, cron_expression: cronExp, is_active: 1, tasks: [{ action_type: actionType, payload }] });
      setModalOpen(false); setName(''); fetchSchedules();
    } catch (err) { alert(`Schedule creation failed: ${err.message}`); }
  };

  const handleTrigger = async (schedId) => {
    try { await api.post(`/servers/${server.id}/schedules/${schedId}/trigger`); alert('Schedule triggered immediately!'); fetchSchedules(); }
    catch (err) { alert(`Trigger failed: ${err.message}`); }
  };

  const handleDelete = async (schedId) => {
    if (!confirm('Delete this scheduled job?')) return;
    try { await api.delete(`/servers/${server.id}/schedules/${schedId}`); fetchSchedules(); }
    catch (err) { alert(`Delete failed: ${err.message}`); }
  };

  return (
    <div className="flex flex-col gap-6">
      <BreezePageHeader title="Scheduled Tasks" description="Automate daily restarts, backups, and custom in-game commands." icon={Calendar}>
        <BreezeButton variant="primary" size="md" icon={PlusCircle} onClick={() => setModalOpen(true)}>New Schedule</BreezeButton>
      </BreezePageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" /><p className="body-3 font-medium">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <BreezeEmptyState image="/images/detail-3.png" title="No Schedules Configured" description="Set up automatic daily restarts or scheduled world backups to keep your server running at peak performance." actionLabel="New Schedule" onAction={() => setModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s) => (
            <BreezeCard key={s.id} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="base-bold text-p4">{s.name}</h3>
                  <BreezeBadge status="active">Active</BreezeBadge>
                </div>
                <p className="small-2 text-p1 font-mono">{s.cron_expression}</p>
                <div className="flex items-center gap-2 mt-2 small-2 text-p5">
                  <Clock size={13} />
                  <span>Last run: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>
              <div className="pt-3 border-t-2 border-s3 flex items-center justify-end gap-2">
                <BreezeButton variant="secondary" size="xs" icon={Play} onClick={() => handleTrigger(s.id)}>Run Now</BreezeButton>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"><Trash2 size={15} /></button>
              </div>
            </BreezeCard>
          ))}
        </div>
      )}

      <BreezeModal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Automated Schedule">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput label="Schedule Name" required placeholder="e.g. Daily 4 AM Restart" value={name} onChange={(e) => setName(e.target.value)} />
          <BreezeInput label="Cron Expression" required placeholder="e.g. 0 4 * * * (Every day at 4 AM)" value={cronExp} onChange={(e) => setCronExp(e.target.value)} inputClassName="font-mono" />
          <BreezeInput label="Action" type="select" value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="power_restart">Restart Server</option>
            <option value="backup">Create Backup</option>
            <option value="command">Send In-Game Command</option>
            <option value="power_stop">Stop Server</option>
          </BreezeInput>
          {actionType === 'command' && (
            <BreezeInput label="Command String" required placeholder="e.g. say Server restarting in 5 minutes!" value={payload} onChange={(e) => setPayload(e.target.value)} inputClassName="font-mono" />
          )}
          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton variant="ghost" size="md" onClick={() => setModalOpen(false)}>Cancel</BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit">Save Schedule</BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default ServerSchedules;
