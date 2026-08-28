import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import {
  Server,
  Layers,
  Cpu,
  HardDrive,
  Network,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

const SOFTWARE_OPTIONS = [
  { id: 'paper', name: 'PaperMC', desc: 'High performance Spigot fork with plugin support and optimization', recommended: true },
  { id: 'purpur', name: 'Purpur', desc: 'Drop-in replacement for Paper with extra customization features' },
  { id: 'vanilla', name: 'Vanilla', desc: 'Official Mojang server without plugin or modding support' },
  { id: 'fabric', name: 'Fabric', desc: 'Lightweight, modern modding toolchain for Minecraft' },
  { id: 'spigot', name: 'Spigot', desc: 'Classic Bukkit-based server implementation' },
];

const VERSION_OPTIONS = [
  { version: '1.20.4', java: '21', recommended: true },
  { version: '1.20.2', java: '21' },
  { version: '1.19.4', java: '17' },
  { version: '1.18.2', java: '17' },
  { version: '1.16.5', java: '11' },
  { version: '1.12.2', java: '8' },
  { version: '1.8.8', java: '8' },
];

const CreateServer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [allocations, setAllocations] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: 'My Minecraft Server',
    description: '',
    software: 'paper',
    minecraft_version: '1.20.4',
    java_version: '21',
    memory: 2048,
    cpu: 100,
    disk: 10000,
    node_id: '',
    allocation_id: '',
  });

  useEffect(() => {
    const loadNodeData = async () => {
      try {
        const [nodeRes, allocRes] = await Promise.all([
          api.get('/admin/nodes').catch(() => ({ data: [] })),
          api.get('/admin/allocations').catch(() => ({ data: [] })),
        ]);

        if (nodeRes.data && nodeRes.data.length > 0) {
          setNodes(nodeRes.data);
          setFormData((prev) => ({ ...prev, node_id: nodeRes.data[0].id }));
        }

        if (allocRes.data) {
          const freeAllocs = allocRes.data.filter((a) => !a.server_id);
          setAllocations(freeAllocs);
          if (freeAllocs.length > 0) {
            setFormData((prev) => ({ ...prev, allocation_id: freeAllocs[0].id }));
          }
        }
      } catch (err) {
        console.error('Failed to load nodes:', err);
      }
    };

    loadNodeData();
  }, []);

  const handleSoftwareSelect = (sw) => {
    setFormData((prev) => ({ ...prev, software: sw }));
  };

  const handleVersionSelect = (v) => {
    setFormData((prev) => ({
      ...prev,
      minecraft_version: v.version,
      java_version: v.java,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const res = await api.post('/servers', formData);
      if (res.success && res.data) {
        navigate(`/panel/servers/${res.data.id}/console`);
      }
    } catch (err) {
      alert(`Server creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-p4 tracking-tight flex items-center gap-2">
          <Sparkles className="text-p1" />
          <span>Deploy New Minecraft Server</span>
        </h1>
        <p className="text-xs text-p5 mt-1">
          Configure server core, version, memory allocation, and port routing.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#11141e] border border-[#222638] overflow-x-auto gap-4">
        {[
          { num: 1, label: 'Details' },
          { num: 2, label: 'Software' },
          { num: 3, label: 'Version' },
          { num: 4, label: 'Resources' },
          { num: 5, label: 'Review' },
        ].map((s) => (
          <div
            key={s.num}
            className={clsx(
              'flex items-center gap-2 text-xs font-semibold whitespace-nowrap',
              step === s.num
                ? 'text-p1 font-bold'
                : step > s.num
                ? 'text-emerald-400'
                : 'text-p5/50'
            )}
          >
            <div
              className={clsx(
                'size-6 rounded-full flex items-center justify-center text-[11px]',
                step === s.num
                  ? 'bg-p1 text-black font-bold'
                  : step > s.num
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#08090d] border border-[#222638] text-p5'
              )}
            >
              {step > s.num ? <CheckCircle2 size={12} /> : s.num}
            </div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step Contents */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#11141e] border border-[#222638] shadow-2xl">
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <Server size={20} className="text-p1" />
              <span>Step 1: Server Details</span>
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-p4 uppercase tracking-wider mb-2">
                  Server Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Survival SMP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-3 text-sm text-p4 focus:outline-none focus:border-p1/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-p4 uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your server or SMP for friends..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-3 text-sm text-p4 focus:outline-none focus:border-p1/60"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <Layers size={20} className="text-p1" />
              <span>Step 2: Choose Server Software</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SOFTWARE_OPTIONS.map((sw) => (
                <div
                  key={sw.id}
                  onClick={() => handleSoftwareSelect(sw.id)}
                  className={clsx(
                    'p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3',
                    formData.software === sw.id
                      ? 'bg-p1/10 border-p1 text-p4 shadow-lg shadow-p1/10'
                      : 'bg-[#08090d] border-[#222638] text-p5 hover:border-p1/40 hover:text-p4'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-p4">{sw.name}</span>
                    {sw.recommended && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-p1/20 text-p1 border border-p1/40">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">{sw.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <Layers size={20} className="text-p1" />
              <span>Step 3: Select Minecraft & Java Version</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {VERSION_OPTIONS.map((v) => (
                <div
                  key={v.version}
                  onClick={() => handleVersionSelect(v)}
                  className={clsx(
                    'p-4 rounded-2xl border cursor-pointer transition-all text-center flex flex-col gap-2',
                    formData.minecraft_version === v.version
                      ? 'bg-p1/10 border-p1 shadow-lg shadow-p1/10'
                      : 'bg-[#08090d] border-[#222638] hover:border-p1/40'
                  )}
                >
                  <span className="font-bold text-lg text-p4">{v.version}</span>
                  <span className="text-xs text-p5">Java {v.java}</span>
                  {v.recommended && (
                    <span className="text-[10px] text-p1 font-semibold mt-1">Latest Release</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <Cpu size={20} className="text-p1" />
              <span>Step 4: Resource Allocation</span>
            </h2>

            <div className="flex flex-col gap-6">
              {/* RAM Slider */}
              <div className="p-5 rounded-2xl bg-[#08090d] border border-[#222638]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-p4">
                    RAM Allocation (Memory)
                  </span>
                  <span className="text-sm font-bold text-p1 font-mono">
                    {formData.memory} MB ({(formData.memory / 1024).toFixed(1)} GB)
                  </span>
                </div>
                <input
                  type="range"
                  min="1024"
                  max="16384"
                  step="512"
                  value={formData.memory}
                  onChange={(e) => setFormData({ ...formData, memory: Number(e.target.value) })}
                  className="w-full accent-p1 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-p5 mt-2 font-mono">
                  <span>1 GB</span>
                  <span>4 GB</span>
                  <span>8 GB</span>
                  <span>16 GB</span>
                </div>
              </div>

              {/* Disk Allocation */}
              <div className="p-5 rounded-2xl bg-[#08090d] border border-[#222638]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-p4">
                    Storage Allocation (NVMe SSD)
                  </span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {(formData.disk / 1024).toFixed(1)} GB
                  </span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="50000"
                  step="2500"
                  value={formData.disk}
                  onChange={(e) => setFormData({ ...formData, disk: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-p5 mt-2 font-mono">
                  <span>5 GB</span>
                  <span>25 GB</span>
                  <span>50 GB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold text-p4 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-p1" />
              <span>Step 5: Review & Deploy</span>
            </h2>

            <div className="p-6 rounded-2xl bg-[#08090d] border border-[#222638] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-p5 uppercase">Server Name</p>
                <p className="text-sm font-bold text-p4 mt-0.5">{formData.name}</p>
              </div>

              <div>
                <p className="text-p5 uppercase">Software</p>
                <p className="text-sm font-bold text-p4 mt-0.5 capitalize">{formData.software}</p>
              </div>

              <div>
                <p className="text-p5 uppercase">Minecraft Version</p>
                <p className="text-sm font-bold text-p4 mt-0.5">{formData.minecraft_version} (Java {formData.java_version})</p>
              </div>

              <div>
                <p className="text-p5 uppercase">RAM Allocated</p>
                <p className="text-sm font-bold text-p1 mt-0.5">{formData.memory} MB</p>
              </div>

              <div>
                <p className="text-p5 uppercase">Storage</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{(formData.disk / 1024).toFixed(1)} GB</p>
              </div>

              <div>
                <p className="text-p5 uppercase">Port Routing</p>
                <p className="text-sm font-bold text-p4 mt-0.5 font-mono">Auto-assigned primary port</p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#222638]">
          <button
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-p5 hover:text-p4 border border-[#222638] bg-[#08090d] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep((prev) => Math.min(5, prev + 1))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-bold text-xs hover:bg-emerald-300 shadow-md shadow-emerald-400/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Provisioning Instance...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Deploy Server Now</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateServer;
