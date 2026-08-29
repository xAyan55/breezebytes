import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import { Activity, Loader2 } from 'lucide-react';

const AdminActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="flex flex-col gap-6">
      <BreezePageHeader
        caption="Administration"
        title="System Audit Logs"
        description="Chronological record of administrative events, server creations, and logins."
        icon={Activity}
      />

      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
          </div>
        ) : logs.length === 0 ? (
          <p className="small-2 text-p5 text-center py-8">No audit logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-sans font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-s5/30 transition-colors duration-500">
                    <td className="py-3.5 px-4 font-bold text-p1 font-sans uppercase">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-p4 font-sans">{log.userEmail}</td>
                    <td className="py-3.5 px-4 text-p5 font-sans capitalize">
                      {log.target_type} #{log.target_id || ''}
                    </td>
                    <td className="py-3.5 px-4 text-p5">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3.5 px-4 text-p5 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BreezeCard>
    </div>
  );
};

export default AdminActivity;
