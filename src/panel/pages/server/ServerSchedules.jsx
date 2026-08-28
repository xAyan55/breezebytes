import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import {
  Calendar,
  PlusCircle,
  Play,
  Trash2,
  Clock,
  Loader2,
} from 'lucide-react';

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
      if (res.success) {
        setSchedules(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/servers/${server.id}/schedules`, {
        name,
        cron_expression: cronExp,
        is_active: 1,
        tasks: [{ action_type: actionType, payload }],
      });
      setModalOpen(false);
      setName('');
      fetchSchedules();
    } catch (err) {
      alert(`Schedule creation failed: ${err.message}`);
    }
  };

  const handleTrigger = async (schedId) => {
    try {
      await api.post(`/servers/${server.id}/schedules/${schedId}/trigger`);
      alert('Schedule triggered immediately!');
      fetchSchedules();
    } catch (err) {
      alert(`Trigger failed: ${err.message}`);
    }
  };

  const handleDelete = async (schedId) => {
    if (!confirm('Delete this scheduled job?')) return;
    try {
      await api.delete(`/servers/${server.id}/schedules/${schedId}`);
      fetchSchedules();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-base font-bold text-p4">Scheduled Tasks</h2>
          <p className="text-xs text-p5">Automate daily restarts, backups, and custom in-game commands.</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>New Schedule</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
          <Loader2 className="animate-spin text-p1 size-8" />
          <p className="text-sm font-medium">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11141e] border border-[#222638] text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-p1/10 flex items-center justify-center text-p1">
            <Calendar size={24} />
          </div>
          <h3 className="text-base font-bold text-p4">No Schedules Configured</h3>
          <p className="text-xs text-p5 max-w-sm">
            Set up automatic daily restarts or scheduled world backups to keep your server running at peak performance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col justify-between gap-4 shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base text-p4">{s.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-xs text-p1 font-mono">{s.cron_expression}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-p5">
                  <Clock size={13} />
                  <span>Last run: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#222638] flex items-center justify-end gap-2">
                <button
                  onClick={() => handleTrigger(s.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-p1/10 border border-p1/30 text-xs text-p1 hover:bg-p1 hover:text-black transition-colors"
                >
                  <Play size={13} />
                  <span>Run Now</span>
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Create Automated Schedule</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Schedule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily 4 AM Restart"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Cron Expression</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0 4 * * * (Every day at 4 AM)"
                  value={cronExp}
                  onChange={(e) => setCronExp(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs font-mono text-p4 focus:outline-none focus:border-p1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Action</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
                >
                  <option value="power_restart">Restart Server</option>
                  <option value="backup">Create Backup</option>
                  <option value="command">Send In-Game Command</option>
                  <option value="power_stop">Stop Server</option>
                </select>
              </div>

              {actionType === 'command' && (
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Command String</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. say Server restarting in 5 minutes!"
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs font-mono text-p4 focus:outline-none focus:border-p1"
                  />
                </div>
              )}

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
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerSchedules;
