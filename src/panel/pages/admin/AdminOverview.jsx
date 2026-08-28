import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import {
  Shield,
  Users,
  HardDrive,
  Network,
  Cpu,
  Server,
  Activity,
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
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="text-sm font-medium">Loading system metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-p4 tracking-tight flex items-center gap-2">
          <Shield className="text-p1" />
          <span>System Administration Overview</span>
        </h1>
        <p className="text-xs text-p5 mt-1">Platform capacity, node utilization, and daemon health.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase">Total Users</p>
            <p className="text-3xl font-bold text-p4 mt-1">{data.users.total}</p>
          </div>
          <div className="size-12 rounded-xl bg-p1/10 flex items-center justify-center text-p1">
            <Users size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase">Active Nodes</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{data.nodes.total}</p>
          </div>
          <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <HardDrive size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase">Total Servers</p>
            <p className="text-3xl font-bold text-p4 mt-1">{data.servers.total}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">{data.servers.running} running</p>
          </div>
          <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Server size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-p5 uppercase">Port Allocations</p>
            <p className="text-3xl font-bold text-p1 mt-1">{data.allocations.used} / {data.allocations.total}</p>
            <p className="text-[11px] text-p5 mt-0.5">{data.allocations.free} available</p>
          </div>
          <div className="size-12 rounded-xl bg-p1/10 flex items-center justify-center text-p1">
            <Network size={24} />
          </div>
        </div>
      </div>

      {/* Cluster Resource Utilization */}
      <div className="p-6 rounded-3xl bg-[#11141e] border border-[#222638] flex flex-col gap-6 shadow-xl">
        <h2 className="text-base font-bold text-p4 flex items-center gap-2">
          <Cpu size={18} className="text-p1" />
          <span>Global Capacity & Allocation Pools</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RAM Progress */}
          <div className="p-5 rounded-2xl bg-[#08090d] border border-[#222638] flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-p5 font-semibold uppercase">Memory Allocation</span>
              <span className="font-bold text-p4 font-mono">
                {(data.resources.allocatedRamMb / 1024).toFixed(1)} GB / {(data.resources.totalRamMb / 1024).toFixed(1)} GB
              </span>
            </div>
            <div className="w-full bg-[#11141e] rounded-full h-3 overflow-hidden border border-[#222638]">
              <div
                className="bg-p1 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((data.resources.allocatedRamMb / (data.resources.totalRamMb || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Disk Progress */}
          <div className="p-5 rounded-2xl bg-[#08090d] border border-[#222638] flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-p5 font-semibold uppercase">Disk Allocation</span>
              <span className="font-bold text-emerald-400 font-mono">
                {(data.resources.allocatedDiskMb / 1024).toFixed(1)} GB / {(data.resources.totalDiskMb / 1024).toFixed(1)} GB
              </span>
            </div>
            <div className="w-full bg-[#11141e] rounded-full h-3 overflow-hidden border border-[#222638]">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((data.resources.allocatedDiskMb / (data.resources.totalDiskMb || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
