import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import { Cpu, Save, Loader2 } from 'lucide-react';

const ServerStartup = () => {
  const { server, fetchServer } = useOutletContext();
  const [data, setData] = useState({ javaVersion: '21', startupCommand: '', software: 'paper', minecraftVersion: '1.20.4', variables: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStartup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/servers/${server.id}/startup`);
      if (res.success && res.data) setData(res.data);
    } catch (err) { console.error('Failed to load startup info:', err); }
    finally { setLoading(false); }
  }, [server.id]);

  useEffect(() => { fetchStartup(); }, [fetchStartup]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post(`/servers/${server.id}/startup`, { java_version: data.javaVersion, startup_command: data.startupCommand, software: data.software, minecraft_version: data.minecraftVersion });
      alert('Startup configuration updated successfully!');
      fetchServer();
    } catch (err) { alert(`Save failed: ${err.message}`); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-p5">
        <Loader2 className="animate-spin text-p1 size-8" /><p className="body-3 font-medium">Loading startup variables...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">
      <BreezeCard className="p-6 flex flex-col gap-6">
        <h2 className="base-bold text-p4 flex items-center gap-2">
          <Cpu size={18} className="text-p1" />
          <span>Java Environment & Startup Command</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BreezeInput label="Java Runtime Version" type="select" value={data.javaVersion} onChange={(e) => setData({ ...data, javaVersion: e.target.value })}>
            <option value="21">Java 21 (Recommended for MC 1.20.4+)</option>
            <option value="17">Java 17 (Recommended for MC 1.18 - 1.20.1)</option>
            <option value="11">Java 11 (Recommended for MC 1.16 - 1.17)</option>
            <option value="8">Java 8 (Recommended for MC 1.8 - 1.12.2)</option>
          </BreezeInput>
          <BreezeInput label="Software Core" type="select" value={data.software} onChange={(e) => setData({ ...data, software: e.target.value })}>
            <option value="paper">PaperMC</option>
            <option value="purpur">Purpur</option>
            <option value="vanilla">Vanilla</option>
            <option value="fabric">Fabric</option>
            <option value="spigot">Spigot</option>
          </BreezeInput>
        </div>

        <div>
          <BreezeInput
            label="Startup Command Template"
            value={data.startupCommand || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar nogui'}
            onChange={(e) => setData({ ...data, startupCommand: e.target.value })}
            inputClassName="font-mono"
          />
          <p className="small-2 text-p5 mt-1 pl-1">
            Variable substitutions: <span className="text-p1 font-mono">{`{{SERVER_MEMORY}}`}</span> = {server.memory} MB.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t-2 border-s3">
          <BreezeButton variant="primary" size="md" type="submit" icon={saving ? Loader2 : Save} loading={saving}>
            Save Configuration
          </BreezeButton>
        </div>
      </BreezeCard>
    </form>
  );
};

export default ServerStartup;
