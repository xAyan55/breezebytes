import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../components/ui/BreezePageHeader.jsx';
import BreezeIcon from '../../components/ui/BreezeIcon.jsx';
import VersionCombobox from '../../components/ui/VersionCombobox.jsx';
import {
  SUPPORTED_SOFTWARE,
  getSoftwareVersions,
} from '../services/mcjarsService.js';
import SoftwareIcon from '../../components/ui/SoftwareIcons.jsx';
import {
  Server,
  Cpu,
  HardDrive,
  Network,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

const CreateServer = () => {
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('My Survival SMP');
  const [software, setSoftware] = useState('paper');
  const [version, setVersion] = useState('1.21.1');
  const [javaVersion, setJavaVersion] = useState(21);

  // Dynamic MCJars Versions
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionsError, setVersionsError] = useState(null);

  // Node and Allocation IDs (auto-managed)
  const [nodeId, setNodeId] = useState(null);
  const [allocationId, setAllocationId] = useState(null);

  // Resource specifications (Free Plan Presets)
  const [memory] = useState(2048);
  const [disk] = useState(10240);
  const [cpu] = useState(100);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial active node & free allocation
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const nodesRes = await api.get('/admin/nodes');
        if (nodesRes.success && nodesRes.data?.length > 0) {
          setNodeId(nodesRes.data[0].id);
        }

        const allocsRes = await api.get('/admin/allocations');
        if (allocsRes.success && allocsRes.data?.length > 0) {
          const unassigned = allocsRes.data.find((a) => !a.server_id);
          if (unassigned) {
            setAllocationId(unassigned.id);
          }
        }
      } catch (err) {
        console.warn('Prerequisites warning:', err.message);
      }
    };

    fetchPrerequisites();
  }, []);

  // Fetch software versions dynamically via mcjarsService
  const loadVersions = useCallback(async (selectedSoftware) => {
    try {
      setVersionsLoading(true);
      setVersionsError(null);
      const data = await getSoftwareVersions(selectedSoftware);
      setVersions(data);
      if (data.length > 0) {
        setVersion(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load dynamic versions:', err);
      setVersionsError('Could not fetch latest release list. Using stable fallback.');
      setVersions([{ id: '1.21.1', name: '1.21.1 (Stable)', type: 'release' }]);
      setVersion('1.21.1');
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVersions(software);
  }, [software, loadVersions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a server name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        software,
        minecraft_version: version,
        java_version: parseInt(javaVersion, 10),
        memory,
        disk,
        cpu,
        node_id: nodeId || 1,
        allocation_id: allocationId || null,
      };

      const res = await api.post('/servers', payload);
      if (res.success && res.data?.id) {
        navigate(`/panel/servers/${res.data.id}/console`);
      } else {
        throw new Error(res.error?.message || 'Server deployment failed');
      }
    } catch (err) {
      console.error('Failed to create server:', err);
      setError(err.message || 'Failed to initialize server instance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* ===== Page Header ===== */}
      <BreezePageHeader
        caption="Deploy Instance"
        title="Create Minecraft Server"
        description="Configure software type, runtime version, and deploy your containerized server in seconds."
        icon={Server}
      />

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
          <BreezeIcon icon={AlertCircle} size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1: Server Identity */}
        <BreezeCard className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b-2 border-s3">
            <BreezeIcon icon={Server} size={18} className="text-p1" />
            <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">
              1. General Details
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <BreezeInput
              label="Server Name"
              placeholder="e.g. My Survival SMP, Hypixel Clone"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </BreezeCard>

        {/* Step 2: Minecraft Software Selection */}
        <BreezeCard className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-s3">
            <div className="flex items-center gap-2.5">
              <SoftwareIcon software={software} size={20} className="text-p1" />
              <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">
                2. Select Software
              </h2>
            </div>
            <span className="text-xs text-p5 font-mono">
              {SUPPORTED_SOFTWARE.length} Platforms Available
            </span>
          </div>

          {/* Software Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {SUPPORTED_SOFTWARE.map((sw) => {
              const isSelected = software === sw.id;

              return (
                <button
                  key={sw.id}
                  type="button"
                  onClick={() => setSoftware(sw.id)}
                  className={clsx(
                    'p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all duration-300 relative cursor-pointer',
                    isSelected
                      ? 'bg-s4/20 border-s4 shadow-500 scale-[1.02]'
                      : 'bg-s1 border-s3 hover:border-s4/60 hover:bg-s2/80',
                  )}
                >
                  <div className="size-10 rounded-xl bg-s2 border border-s3 flex items-center justify-center p-1.5 flex-shrink-0">
                    <SoftwareIcon software={sw.id} size={22} className="text-p1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-p4 font-poppins">{sw.name}</span>
                      {isSelected && (
                        <BreezeIcon icon={CheckCircle2} size={15} className="text-p1 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-p5/80 mt-1 line-clamp-2 leading-relaxed">
                      {sw.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Version Selection & Java Runtime */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <VersionCombobox
              label="Minecraft Version"
              software={software}
              versions={versions}
              selectedVersion={version}
              onSelect={setVersion}
              loading={versionsLoading}
              error={versionsError}
              onRetry={() => loadVersions(software)}
            />

            <div>
              <label className="caption mb-2 block font-bold text-p4 text-xs">
                Java Runtime Environment
              </label>
              <select
                value={javaVersion}
                onChange={(e) => setJavaVersion(e.target.value)}
                className="w-full bg-s1 border-2 border-s3 rounded-2xl px-4 py-3 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono cursor-pointer"
              >
                <option value={21}>Java 21 (Recommended for MC 1.20.5+)</option>
                <option value={17}>Java 17 (Recommended for MC 1.18 - 1.20.4)</option>
                <option value={11}>Java 11 (Legacy 1.16 - 1.17)</option>
                <option value={8}>Java 8 (Legacy 1.8.8 - 1.12.2)</option>
              </select>
            </div>
          </div>
        </BreezeCard>

        {/* Step 3: Allocated Resources Overview */}
        <BreezeCard className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-3 border-b-2 border-s3">
            <BreezeIcon icon={Zap} size={18} className="text-p1" />
            <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">
              3. Resource Specifications (Standard Plan)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-s1 border border-s3 flex flex-col gap-1">
              <span className="text-[10px] text-p5 uppercase font-sans font-semibold flex items-center gap-1.5">
                <BreezeIcon icon={HardDrive} size={12} className="text-p1" />
                <span>Memory</span>
              </span>
              <span className="text-sm font-bold text-p4 mt-1">2048 MB</span>
              <span className="text-[10px] text-p5/70 font-sans">2 GB DDR4 RAM</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-s1 border border-s3 flex flex-col gap-1">
              <span className="text-[10px] text-p5 uppercase font-sans font-semibold flex items-center gap-1.5">
                <BreezeIcon icon={HardDrive} size={12} className="text-p1" />
                <span>Disk</span>
              </span>
              <span className="text-sm font-bold text-p4 mt-1">10240 MB</span>
              <span className="text-[10px] text-p5/70 font-sans">10 GB NVMe SSD</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-s1 border border-s3 flex flex-col gap-1">
              <span className="text-[10px] text-p5 uppercase font-sans font-semibold flex items-center gap-1.5">
                <BreezeIcon icon={Cpu} size={12} className="text-p1" />
                <span>CPU Limit</span>
              </span>
              <span className="text-sm font-bold text-p4 mt-1">100%</span>
              <span className="text-[10px] text-p5/70 font-sans">1 Dedicated Thread</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-s1 border border-s3 flex flex-col gap-1">
              <span className="text-[10px] text-p5 uppercase font-sans font-semibold flex items-center gap-1.5">
                <BreezeIcon icon={Network} size={12} className="text-p1" />
                <span>Port</span>
              </span>
              <span className="text-sm font-bold text-p4 mt-1">Auto-assigned</span>
              <span className="text-[10px] text-p5/70 font-sans">Dedicated Port</span>
            </div>
          </div>
        </BreezeCard>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <BreezeButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/panel/servers')}
            disabled={loading}
          >
            Cancel
          </BreezeButton>
          <BreezeButton
            type="submit"
            variant="primary"
            size="md"
            icon={loading ? Loader2 : Server}
            loading={loading}
          >
            {loading ? 'Deploying Instance...' : 'Create Server'}
          </BreezeButton>
        </div>
      </form>
    </div>
  );
};

export default CreateServer;
