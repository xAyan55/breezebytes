import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeStatCard from '../../../components/ui/BreezeStatCard.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import {
  Shield,
  Cpu,
  Loader2,
} from 'lucide-react';

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/overview');
        if (res.success && res.data) setData(res.data);
      } catch (err) { console.error('Failed to load admin overview:', err); }
      finally { setLoading(false); }
    };
    fetchOverview();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="body-3 font-medium">Loading system metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <BreezePageHeader
        caption="Administration"
        title="System Administration Overview"
        description="Platform capacity, node utilization, and daemon health."
        icon={Shield}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <BreezeStatCard label="Total Users" value={data.users.total} image="/images/detail-1.png" />
        <BreezeStatCard label="Active Nodes" value={data.nodes.total} image="/images/detail-2.png" />
        <BreezeStatCard
          label="Total Servers"
          value={data.servers.total}
          subtitle={`${data.servers.running} running`}
          image="/images/detail-3.png"
        />
        <BreezeStatCard
          label="Port Allocations"
          value={`${data.allocations.used} / ${data.allocations.total}`}
          subtitle={`${data.allocations.free} available`}
          image="/images/detail-4.png"
        />
      </div>

      {/* Capacity */}
      <BreezeCard className="p-6 flex flex-col gap-6">
        <h2 className="base-bold text-p4 flex items-center gap-2">
          <Cpu size={18} className="text-p1" />
          <span>Global Capacity & Allocation Pools</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RAM */}
          <div className="p-5 rounded-3xl bg-s1 border-2 border-s3 flex flex-col gap-3">
            <div className="flex justify-between items-center small-compact">
              <span className="text-p5 font-semibold uppercase">Memory Allocation</span>
              <span className="font-bold text-p4 font-mono">
                {(data.resources.allocatedRamMb / 1024).toFixed(1)} GB / {(data.resources.totalRamMb / 1024).toFixed(1)} GB
              </span>
            </div>
            <div className="w-full bg-s2 rounded-full h-3 overflow-hidden border-2 border-s3">
              <div
                className="bg-p1 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((data.resources.allocatedRamMb / (data.resources.totalRamMb || 1)) * 100))}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div className="p-5 rounded-3xl bg-s1 border-2 border-s3 flex flex-col gap-3">
            <div className="flex justify-between items-center small-compact">
              <span className="text-p5 font-semibold uppercase">Disk Allocation</span>
              <span className="font-bold text-emerald-400 font-mono">
                {(data.resources.allocatedDiskMb / 1024).toFixed(1)} GB / {(data.resources.totalDiskMb / 1024).toFixed(1)} GB
              </span>
            </div>
            <div className="w-full bg-s2 rounded-full h-3 overflow-hidden border-2 border-s3">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((data.resources.allocatedDiskMb / (data.resources.totalDiskMb || 1)) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </BreezeCard>
    </div>
  );
};

export default AdminOverview;
