import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import { Cpu, Save, Loader2 } from 'lucide-react';

const ServerStartup = () => {
  const { server, fetchServer } = useOutletContext();
  const [data, setData] = useState({
    javaVersion: '21',
    startupCommand: '',
    software: 'paper',
    minecraftVersion: '1.20.4',
    variables: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStartup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/startup`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load startup info:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    fetchStartup();
  }, [fetchStartup]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post(`/servers/${server.id}/startup`, {
        java_version: data.javaVersion,
        startup_command: data.startupCommand,
        software: data.software,
        minecraft_version: data.minecraftVersion,
      });
      alert('Startup configuration updated successfully!');
      fetchServer();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" />
        <p className="text-sm font-medium">Loading startup variables...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">
      <div className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col gap-6 shadow-lg">
        <h2 className="text-base font-bold text-p4 flex items-center gap-2">
          <Cpu size={18} className="text-p1" />
          <span>Java Environment & Startup Command</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-p5 uppercase mb-1.5">
              Java Runtime Version
            </label>
            <select
              value={data.javaVersion}
              onChange={(e) => setData({ ...data, javaVersion: e.target.value })}
              className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
            >
              <option value="21">Java 21 (Recommended for MC 1.20.4+)</option>
              <option value="17">Java 17 (Recommended for MC 1.18 - 1.20.1)</option>
              <option value="11">Java 11 (Recommended for MC 1.16 - 1.17)</option>
              <option value="8">Java 8 (Recommended for MC 1.8 - 1.12.2)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-p5 uppercase mb-1.5">
              Software Core
            </label>
            <select
              value={data.software}
              onChange={(e) => setData({ ...data, software: e.target.value })}
              className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1 capitalize"
            >
              <option value="paper">PaperMC</option>
              <option value="purpur">Purpur</option>
              <option value="vanilla">Vanilla</option>
              <option value="fabric">Fabric</option>
              <option value="spigot">Spigot</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-p5 uppercase mb-1.5">
            Startup Command Template
          </label>
          <input
            type="text"
            value={data.startupCommand || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar nogui'}
            onChange={(e) => setData({ ...data, startupCommand: e.target.value })}
            className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs font-mono text-p4 focus:outline-none focus:border-p1"
          />
          <p className="text-[10px] text-p5 mt-1">
            Variable substitutions: <span className="text-p1 font-mono">{`{{SERVER_MEMORY}}`}</span> = {server.memory} MB.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#222638]">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default ServerStartup;
