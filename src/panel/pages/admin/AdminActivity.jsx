import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { Activity, Clock, Loader2 } from 'lucide-react';

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
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-p4">System Audit Logs</h1>
          <p className="text-xs text-p5">Chronological record of administrative events, server creations, and logins.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-[#11141e] border border-[#222638] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center py-12 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-p5 text-center py-8">No audit logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222638] bg-[#08090d] text-p5 font-sans font-semibold uppercase">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222638]/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-s2/30">
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
      </div>
    </div>
  );
};

export default AdminActivity;
