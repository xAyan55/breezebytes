import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../components/ui/BreezePageHeader.jsx';
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
  const [nodeId, setNodeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Fetch versions whenever selected software changes
  const loadVersions = useCallback(async (swId) => {
    try {
      setVersionsLoading(true);
      setVersionsError(null);
      const list = await getSoftwareVersions(swId);
      setVersions(list);

      // Auto-select latest release or maintain valid selection
      const exists = list.some((v) => v.version === version);
      if (!exists && list.length > 0) {
        setVersion(list[0].version);
        setJavaVersion(list[0].java || 21);
      }
    } catch (err) {
      console.error('Failed to load versions:', err);
      setVersionsError('Unable to load Minecraft versions. Please check your connection.');
    } finally {
      setVersionsLoading(false);
    }
  }, [version]);

  // Initial load
  useEffect(() => {
    loadVersions(software);
  }, [software, loadVersions]);

  // Load cluster node for placement
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await api.get('/admin/nodes').catch(() => ({ data: [] }));
        if (res.data && res.data.length > 0) {
          setNodeId(res.data[0].id);
        }
      } catch {
        // Handled silently
      }
    };
    fetchNodes();
  }, []);

  const handleSoftwareChange = (swId) => {
    if (swId === software) return;
    setSoftware(swId);
    setValidationError(null);
  };

  const handleVersionSelect = (selectedVer, javaVer) => {
    setVersion(selectedVer);
    if (javaVer) setJavaVersion(javaVer);
    setValidationError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);

    if (!name || !name.trim()) {
      setValidationError('Please enter a valid server name.');
      return;
    }

    if (!software) {
      setValidationError('Please select a server software.');
      return;
    }

    if (!version) {
      setValidationError('Please choose a Minecraft version.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        description: '',
        software: software.toLowerCase(),
        minecraft_version: version,
        java_version: String(javaVersion || 21),
        memory: 4096,
        cpu: 100,
        disk: 10000,
        node_id: nodeId || undefined,
      };

      const res = await api.post('/servers', payload);
      if (res.success && res.data) {
        navigate(`/panel/servers/${res.data.id}/console`);
      } else {
        throw new Error(res.error?.message || 'Failed to create server.');
      }
    } catch (err) {
      setValidationError(err.message || 'Server creation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <BreezePageHeader
        caption="Server Deployment"
        title="Create a Minecraft Server"
        description="Choose your software and version, then deploy your instance in seconds."
        icon={Server}
      />

      {/* Main Cohesive Workspace Card */}
      <form onSubmit={handleSubmit}>
        <BreezeCard className="p-6 sm:p-8 flex flex-col gap-8">
          {/* SECTION 1: SERVER NAME */}
          <div className="flex flex-col gap-2">
            <BreezeInput
              label="Server Name"
              required
              placeholder="e.g. Survival SMP, Skyblock World"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setValidationError(null);
              }}
              maxLength={40}
            />
            <p className="small-2 text-p5/70 pl-1 font-normal tracking-normal text-[11px]">
              A friendly name for your server dashboard and management console.
            </p>
          </div>

          {/* SECTION 2: SERVER SOFTWARE */}
          <div className="flex flex-col gap-3 pt-6 border-t-2 border-s3/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-p4">
                Server Software <span className="text-p1">*</span>
              </label>
              <span className="text-[11px] text-p5">
                Selected:{' '}
                <strong className="text-p1 uppercase font-mono">
                  {SUPPORTED_SOFTWARE.find((s) => s.id === software)?.name}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SUPPORTED_SOFTWARE.map((sw) => {
                const isSelected = software === sw.id;

                return (
                  <div
                    key={sw.id}
                    onClick={() => handleSoftwareChange(sw.id)}
                    className={clsx(
                      'p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between gap-2.5 relative select-none group',
                      isSelected
                        ? 'g4 border-s4 text-p4 shadow-500 ring-1 ring-p1/30'
                        : 'bg-s1 border-s3 text-p5 hover:border-s4/60 hover:text-p4',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={clsx(
                          'size-9 rounded-xl border-2 flex items-center justify-center transition-colors duration-300',
                          isSelected
                            ? 'bg-p1/15 border-s4/60 text-p1'
                            : 'bg-s2 border-s3 text-p5 group-hover:text-p4 group-hover:border-s4/40',
                        )}
                      >
                        <SoftwareIcon software={sw.id} size={18} />
                      </div>

                      {sw.recommended && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-p1/15 text-p1 border border-p1/30 uppercase tracking-wider">
                          Popular
                        </span>
                      )}
                    </div>

                    <div>
                      <h3
                        className={clsx(
                          'text-sm font-bold transition-colors',
                          isSelected ? 'text-p1' : 'text-p4',
                        )}
                      >
                        {sw.name}
                      </h3>
                      <p className="text-[11px] text-p5/80 font-medium leading-snug mt-0.5">
                        {sw.tagline}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: MINECRAFT VERSION */}
          <div className="pt-6 border-t-2 border-s3/60">
            <VersionCombobox
              versions={versions}
              selectedVersion={version}
              onSelect={handleVersionSelect}
              loading={versionsLoading}
              error={versionsError}
              onRetry={() => loadVersions(software)}
            />
          </div>

          {/* SECTION 4: SERVER RESOURCES (COMPACT ROW) */}
          <div className="flex flex-col gap-3 pt-6 border-t-2 border-s3/60">
            <label className="text-xs font-semibold uppercase tracking-wider text-p4">
              Included Server Resources
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* RAM */}
              <div className="p-3.5 rounded-2xl bg-s1 border-2 border-s3 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-p1/10 border border-p1/20 flex items-center justify-center text-p1 flex-shrink-0">
                  <Zap size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-p5">Memory</p>
                  <p className="text-xs font-bold text-p4 font-inter">4 GB RAM</p>
                </div>
              </div>

              {/* CPU */}
              <div className="p-3.5 rounded-2xl bg-s1 border-2 border-s3 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Cpu size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-p5">Processor</p>
                  <p className="text-xs font-bold text-p4 font-inter">100% CPU</p>
                </div>
              </div>

              {/* Storage */}
              <div className="p-3.5 rounded-2xl bg-s1 border-2 border-s3 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <HardDrive size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-p5">Storage</p>
                  <p className="text-xs font-bold text-p4 font-inter">10 GB NVMe</p>
                </div>
              </div>

              {/* Port Routing */}
              <div className="p-3.5 rounded-2xl bg-s1 border-2 border-s3 flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Network size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-p5">Port</p>
                  <p className="text-xs font-bold text-p4 font-mono">Auto-Assigned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Error Notice */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center gap-2.5 text-xs text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION 5: ACTION FOOTER */}
          <div className="pt-6 border-t-2 border-s3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-p5">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Instant provisioning & 24/7 online uptime</span>
            </div>

            <BreezeButton
              variant="primary"
              size="lg"
              type="submit"
              icon={submitting ? Loader2 : '/images/magictouch.svg'}
              loading={submitting}
              className="w-full sm:w-auto px-8"
            >
              {submitting ? 'Deploying Server...' : 'Create Server'}
            </BreezeButton>
          </div>
        </BreezeCard>
      </form>
    </div>
  );
};

export default CreateServer;
