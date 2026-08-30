import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import { BreezeSkeleton } from '../../../components/ui/BreezeSkeleton.jsx';
import { Activity, Terminal } from 'lucide-react';

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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <BreezePageHeader
        caption="Administration"
        title="System Audit Logs"
        description="Chronological record of administrative events, server creations, and daemon operations."
        icon={Activity}
      />

      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
            <BreezeSkeleton className="h-8 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-p5 text-xs flex flex-col items-center justify-center gap-2">
            <Terminal size={28} className="text-p5/40 mb-1" />
            <p className="font-semibold text-p4">No audit logs recorded yet</p>
            <p className="text-[11px] text-p5/70">System audit records will appear here as administrative actions occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-sans font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-s5/30 transition-colors duration-300">
                    <td className="py-3 px-4 font-bold text-p1 font-sans uppercase text-[11px]">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-p4 font-sans">{log.userEmail}</td>
                    <td className="py-3 px-4 text-p5 font-sans capitalize">
                      {log.target_type} #{log.target_id || ''}
                    </td>
                    <td className="py-3 px-4 text-p5">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-p5 font-sans">
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
