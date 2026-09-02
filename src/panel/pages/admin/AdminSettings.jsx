import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Key,
  Server,
  HelpCircle,
  Loader2,
  Lock,
  Zap,
  Globe,
  RotateCw,
  ExternalLink,
  Cpu,
  RefreshCw,
  Radio,
  Check,
  Power,
} from 'lucide-react';
import clsx from 'clsx';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('playit'); // 'playit' | 'smtp'

  // ==========================================
  // Playit State
  // ==========================================
  const [playitNodes, setPlayitNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(1);
  const [playitStatus, setPlayitStatus] = useState(null);
  const [playitLoading, setPlayitLoading] = useState(true);
  const [playitActionLoading, setPlayitActionLoading] = useState(false);
  const [playitEnabled, setPlayitEnabled] = useState(true);
  const [playitAutoProvision, setPlayitAutoProvision] = useState(true);
  const [manualSecret, setManualSecret] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [claimData, setClaimData] = useState(null); // { code, claimUrl }
  const [claimExchanging, setClaimExchanging] = useState(false);
  const [playitToast, setPlayitToast] = useState(null);

  const showPlayitToast = (type, message) => {
    setPlayitToast({ type, message });
    setTimeout(() => setPlayitToast(null), 4000);
  };

  const loadPlayitData = useCallback(async (nodeId = 1) => {
    try {
      setPlayitLoading(true);
      const [nodesRes, statusRes] = await Promise.all([
        api.get('/admin/nodes').catch(() => ({ success: false, data: [] })),
        api.get(`/admin/playit/nodes/${nodeId}/status`).catch(() => ({ success: false, data: null })),
      ]);

      if (nodesRes.success && Array.isArray(nodesRes.data)) {
        setPlayitNodes(nodesRes.data);
      }
      if (statusRes.success && statusRes.data) {
        setPlayitStatus(statusRes.data);
        setPlayitEnabled(Boolean(statusRes.data.enabled));
        setPlayitAutoProvision(Boolean(statusRes.data.autoProvision));
      }
    } catch (err) {
      console.error('Failed to load Playit settings:', err);
    } finally {
      setPlayitLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayitData(selectedNodeId);
  }, [loadPlayitData, selectedNodeId]);

  const handleSavePlayitConfig = async () => {
    try {
      setPlayitActionLoading(true);
      const payload = {
        enabled: playitEnabled,
        auto_provision: playitAutoProvision,
      };
      if (manualSecret.trim()) {
        payload.secretKey = manualSecret.trim();
      }

      const res = await api.post(`/admin/playit/nodes/${selectedNodeId}/config`, payload);
      if (res.success) {
        showPlayitToast('success', 'Playit configuration saved successfully.');
        setManualSecret('');
        setShowSecretInput(false);
        loadPlayitData(selectedNodeId);
      } else {
        throw new Error(res.error?.message || 'Save failed');
      }
    } catch (err) {
      showPlayitToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const handleGenerateClaim = async () => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/admin/playit/nodes/${selectedNodeId}/claim/setup`);
      if (res.success && res.data) {
        setClaimData(res.data);
        showPlayitToast('success', 'Claim code generated. Please authorize in your browser.');
      } else {
        throw new Error(res.error?.message || 'Failed to generate claim code');
      }
    } catch (err) {
      showPlayitToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const handleExchangeClaim = async () => {
    if (!claimData?.code) return;
    try {
      setClaimExchanging(true);
      const res = await api.post(`/admin/playit/nodes/${selectedNodeId}/claim/exchange`, {
        code: claimData.code,
      });
      if (res.success) {
        showPlayitToast('success', 'Agent successfully claimed and activated on this node!');
        setClaimData(null);
        loadPlayitData(selectedNodeId);
      } else {
        throw new Error(res.error?.message || 'Claim exchange failed');
      }
    } catch (err) {
      showPlayitToast('error', err.message);
    } finally {
      setClaimExchanging(false);
    }
  };

  const handleInstallBinary = async () => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/admin/playit/nodes/${selectedNodeId}/install`);
      if (res.success) {
        showPlayitToast('success', res.message || 'Playit agent binary verified.');
        loadPlayitData(selectedNodeId);
      } else {
        throw new Error(res.error?.message || 'Binary installation failed');
      }
    } catch (err) {
      showPlayitToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const handleRestartAgent = async () => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/admin/playit/nodes/${selectedNodeId}/restart`);
      if (res.success) {
        showPlayitToast('success', res.message || 'Agent restarted.');
        loadPlayitData(selectedNodeId);
      } else {
        throw new Error(res.error?.message || 'Restart failed');
      }
    } catch (err) {
      showPlayitToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  const handleReconcileTunnels = async () => {
    try {
      setPlayitActionLoading(true);
      const res = await api.post(`/admin/playit/nodes/${selectedNodeId}/reconcile`);
      if (res.success) {
        showPlayitToast('success', res.message || 'Reconciliation completed.');
        loadPlayitData(selectedNodeId);
      } else {
        throw new Error(res.error?.message || 'Reconcile failed');
      }
    } catch (err) {
      showPlayitToast('error', err.message);
    } finally {
      setPlayitActionLoading(false);
    }
  };

  // ==========================================
  // SMTP State & Handlers
  // ==========================================
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [providerPreset, setProviderPreset] = useState('google');
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(465);
  const [security, setSecurity] = useState('ssl');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('BreezeBytes');
  const [replyTo, setReplyTo] = useState('');
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const loadSmtpSettings = async () => {
    try {
      setSmtpLoading(true);
      const res = await api.get('/admin/settings/smtp');
      if (res.success && res.data) {
        const d = res.data;
        setSmtpEnabled(Boolean(d.enabled));
        setHost(d.host || 'smtp.gmail.com');
        setPort(d.port || 465);
        setSecurity(d.security || 'ssl');
        setUsername(d.username || '');
        setFromEmail(d.fromEmail || '');
        setFromName(d.fromName || 'BreezeBytes');
        setReplyTo(d.replyTo || '');
        setPasswordConfigured(Boolean(d.passwordConfigured));

        if (d.host?.includes('gmail') || d.host?.includes('google')) {
          setProviderPreset('google');
        } else {
          setProviderPreset('custom');
        }
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'smtp') {
      loadSmtpSettings();
    }
  }, [activeTab]);

  const handleProviderChange = (preset) => {
    setProviderPreset(preset);
    if (preset === 'google') {
      setHost('smtp.gmail.com');
      setPort(465);
      setSecurity('ssl');
    } else {
      setHost('');
      setPort(587);
      setSecurity('tls');
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSmtpSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        enabled: smtpEnabled,
        host,
        port: Number(port),
        security,
        username,
        fromEmail,
        fromName,
        replyTo,
      };
      if (password) {
        payload.password = password;
      }

      const res = await api.post('/admin/settings/smtp', payload);
      if (res.success) {
        setSaveStatus({ type: 'success', message: 'SMTP settings updated successfully!' });
        setPassword('');
        setPasswordConfigured(true);
      } else {
        throw new Error(res.error?.message || 'Failed to save settings');
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      setTestStatus({ type: 'error', message: 'Please specify a target recipient email address.' });
      return;
    }
    setSmtpTesting(true);
    setTestStatus(null);
    try {
      const res = await api.post('/admin/settings/smtp/test', { toEmail: testEmail });
      if (res.success) {
        setTestStatus({ type: 'success', message: res.message || 'Test email delivered successfully!' });
      } else {
        throw new Error(res.error?.message || 'Test delivery failed.');
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: err.message });
    } finally {
      setSmtpTesting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-6xl mx-auto">
      <BreezePageHeader
        title="Infrastructure & System Settings"
        description="Configure Playit zero-config ingress tunneling, multi-node agent orchestration, and system services."
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-s3 pb-1">
        <button
          onClick={() => setActiveTab('playit')}
          className={clsx(
            'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'playit'
              ? 'bg-s1 text-p1 border-2 border-s3 shadow-sm'
              : 'text-p5 hover:text-p4'
          )}
        >
          <BreezeIcon icon={Globe} size={16} />
          <span>Playit.gg Zero-Config</span>
          {playitStatus?.configured && (
            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={clsx(
            'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'smtp'
              ? 'bg-s1 text-p1 border-2 border-s3 shadow-sm'
              : 'text-p5 hover:text-p4'
          )}
        >
          <BreezeIcon icon={Mail} size={16} />
          <span>SMTP Mail Delivery</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: PLAYIT.GG ZERO-CONFIG TUNNELING     */}
      {/* ========================================== */}
      {activeTab === 'playit' && (
        <div className="flex flex-col gap-6">
          {playitToast && (
            <div
              className={clsx(
                'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs transition-all',
                playitToast.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              )}
            >
              <div className="flex items-center gap-2">
                <BreezeIcon icon={playitToast.type === 'error' ? AlertCircle : Check} size={15} />
                <span>{playitToast.message}</span>
              </div>
              <button onClick={() => setPlayitToast(null)} className="font-bold ml-3 text-p4 hover:underline">✕</button>
            </div>
          )}

          {/* Node Selector Bar */}
          {playitNodes.length > 1 && (
            <div className="p-4 bg-s2 border-2 border-s3 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-p1" />
                <span className="text-xs font-bold text-p4">Select Node:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {playitNodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNodeId(n.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                      selectedNodeId === n.id
                        ? 'bg-p1/20 border-p1/40 text-p1 font-bold'
                        : 'bg-s1 border-s3 text-p5 hover:text-p4'
                    )}
                  >
                    #{n.id} {n.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BreezeCard className="p-4 flex flex-col justify-between gap-2">
              <span className="text-[11px] text-p5 uppercase font-semibold flex items-center gap-1.5">
                <Globe className="size-4 text-p1" /> Agent Status
              </span>
              <div className="flex items-center gap-2">
                {playitStatus?.agentRunning ? (
                  <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Running
                  </span>
                ) : playitStatus?.configured ? (
                  <span className="text-base font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" /> {playitStatus?.agentState || 'Stopped'}
                  </span>
                ) : (
                  <span className="text-base font-bold text-p5">Unconfigured</span>
                )}
              </div>
              <span className="text-[10px] text-p5/70 font-mono">
                {playitStatus?.isSystemd ? 'systemd (playit-agent.service)' : 'Managed Process'}
              </span>
            </BreezeCard>

            <BreezeCard className="p-4 flex flex-col justify-between gap-2">
              <span className="text-[11px] text-p5 uppercase font-semibold flex items-center gap-1.5">
                <Radio className="size-4 text-p1" /> Active Tunnels
              </span>
              <span className="text-xl font-bold text-p4 font-mono">
                {playitStatus?.activeTunnelsCount || 0}
              </span>
              <span className="text-[10px] text-p5/70">
                {playitStatus?.totalTunnelsCount || 0} total registered on node
              </span>
            </BreezeCard>

            <BreezeCard className="p-4 flex flex-col justify-between gap-2">
              <span className="text-[11px] text-p5 uppercase font-semibold flex items-center gap-1.5">
                <Cpu className="size-4 text-p1" /> Version Pinned
              </span>
              <span className="text-base font-bold text-p4 font-mono">
                v{playitStatus?.agentVersion || '1.0.10'}
              </span>
              <span className="text-[10px] text-emerald-400/80">
                Official Stable Release
              </span>
            </BreezeCard>

            <BreezeCard className="p-4 flex flex-col justify-between gap-2">
              <span className="text-[11px] text-p5 uppercase font-semibold flex items-center gap-1.5">
                <Lock className="size-4 text-p1" /> Agent Identity
              </span>
              <span className="text-xs font-bold text-p4 font-mono truncate">
                {playitStatus?.agentId ? `${playitStatus.agentId.substring(0, 12)}...` : 'Pending Link'}
              </span>
              <span className="text-[10px] text-p5/70">
                {playitStatus?.configured ? 'Secret Stored (AES-256-GCM)' : 'Secret missing'}
              </span>
            </BreezeCard>
          </div>

          {/* Core Configuration & Automation */}
          <BreezeCard className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-s3 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-p4">Node Tunneling Configuration</h2>
                <p className="text-xs text-p5">Configure zero-config tunneling behavior for Node #{selectedNodeId}.</p>
              </div>

              <BreezeButton
                variant="primary"
                size="sm"
                loading={playitActionLoading}
                onClick={handleSavePlayitConfig}
              >
                Save Configuration
              </BreezeButton>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-s1 border border-s3 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-p4 block">Enable Playit Integration</span>
                  <span className="text-[11px] text-p5">Allow servers on this node to provision Anycast tunnels.</span>
                </div>
                <input
                  type="checkbox"
                  checked={playitEnabled}
                  onChange={(e) => setPlayitEnabled(e.target.checked)}
                  className="size-4 rounded accent-p1 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-s1 border border-s3 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-p4 block">Auto-Provision on Server Creation</span>
                  <span className="text-[11px] text-p5">Automatically creates public endpoint when a user creates a Minecraft server.</span>
                </div>
                <input
                  type="checkbox"
                  checked={playitAutoProvision}
                  onChange={(e) => setPlayitAutoProvision(e.target.checked)}
                  className="size-4 rounded accent-p1 cursor-pointer"
                />
              </div>
            </div>

            {/* Secret Management Section */}
            <div className="pt-2 flex flex-col gap-4 border-t border-s3/80">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-p4 uppercase tracking-wider">Agent Authentication</h3>
                  <p className="text-[11px] text-p5">Link this node with your Playit account to unlock public edge allocations.</p>
                </div>

                <div className="flex items-center gap-2">
                  <BreezeButton
                    variant="secondary"
                    size="sm"
                    icon={ExternalLink}
                    loading={playitActionLoading}
                    onClick={handleGenerateClaim}
                  >
                    1-Click Official Claim
                  </BreezeButton>

                  <button
                    type="button"
                    onClick={() => setShowSecretInput(!showSecretInput)}
                    className="text-xs text-p1 hover:underline font-semibold cursor-pointer ml-2"
                  >
                    {showSecretInput ? 'Hide Manual Secret' : 'Enter Secret Key Manually'}
                  </button>
                </div>
              </div>

              {/* Official Claim Flow Box */}
              {claimData && (
                <div className="p-5 rounded-2xl bg-p1/10 border-2 border-p1/30 flex flex-col gap-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-p1">Official Claim Request Active</span>
                    <span className="text-[10px] font-mono text-p5">Expires in 10 minutes</span>
                  </div>
                  <p className="text-xs text-p4">
                    Please open the official Playit authorization link in your browser and approve the agent:
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={claimData.claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-p1 text-s1 font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-p1/90 transition-all cursor-pointer"
                    >
                      <span>Authorize Agent on Playit.gg</span>
                      <ExternalLink className="size-3.5" />
                    </a>

                    <BreezeButton
                      variant="secondary"
                      size="sm"
                      icon={CheckCircle2}
                      loading={claimExchanging}
                      onClick={handleExchangeClaim}
                    >
                      Complete & Bind Secret
                    </BreezeButton>
                  </div>
                </div>
              )}

              {/* Manual Secret Key Input */}
              {showSecretInput && (
                <div className="p-4 rounded-2xl bg-s1 border border-s3 flex flex-col gap-3">
                  <BreezeInput
                    label="Playit Agent Secret Key"
                    type="password"
                    placeholder="Enter raw agent secret key (e.g. hex format)"
                    value={manualSecret}
                    onChange={(e) => setManualSecret(e.target.value)}
                    helperText="Stored securely using AES-256-GCM. Plaintext is never stored in DB or exposed to API."
                  />
                  <span className="text-[10px] text-p5 font-mono">
                    Node Status: {playitStatus?.configured ? '✓ Secret currently configured' : '✗ Secret not configured'}
                  </span>
                </div>
              )}
            </div>
          </BreezeCard>

          {/* Maintenance & Diagnostics */}
          <BreezeCard className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-p4">Diagnostics & Node Operations</h2>
              <p className="text-xs text-p5">Perform low-level maintenance and synchronization operations for Node #{selectedNodeId}.</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-2">
              <BreezeButton
                variant="secondary"
                size="sm"
                icon={Zap}
                loading={playitActionLoading}
                onClick={handleInstallBinary}
              >
                Install / Verify Binary
              </BreezeButton>

              <BreezeButton
                variant="secondary"
                size="sm"
                icon={RotateCw}
                loading={playitActionLoading}
                onClick={handleRestartAgent}
              >
                Restart Agent Service
              </BreezeButton>

              <BreezeButton
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                loading={playitActionLoading}
                onClick={handleReconcileTunnels}
              >
                Reconcile Active Tunnels
              </BreezeButton>
            </div>
          </BreezeCard>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: SMTP CONFIGURATION                  */}
      {/* ========================================== */}
      {activeTab === 'smtp' && (
        <form onSubmit={handleSaveSmtp} className="flex flex-col gap-6">
          {saveStatus && (
            <div
              className={clsx(
                'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs',
                saveStatus.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              )}
            >
              <div className="flex items-center gap-2">
                <BreezeIcon icon={saveStatus.type === 'error' ? AlertCircle : Check} size={15} />
                <span>{saveStatus.message}</span>
              </div>
              <button type="button" onClick={() => setSaveStatus(null)} className="font-bold ml-3 text-p4 hover:underline">✕</button>
            </div>
          )}

          <BreezeCard className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-s3 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <BreezeIcon icon={Mail} size={20} className="text-p1" />
                <div>
                  <h2 className="text-base font-bold text-p4">SMTP Server Configuration</h2>
                  <p className="text-xs text-p5">Outbound mail server used to dispatch automated notifications.</p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="text-xs font-semibold text-p4">Enable Email Delivery</span>
                <input
                  type="checkbox"
                  checked={smtpEnabled}
                  onChange={(e) => setSmtpEnabled(e.target.checked)}
                  className="size-4 rounded accent-p1 cursor-pointer"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-p4">Provider Preset</label>
              <div className="grid grid-cols-2 gap-3 sm:w-80">
                <button
                  type="button"
                  onClick={() => handleProviderChange('google')}
                  className={clsx(
                    'p-3 rounded-xl border text-xs font-medium transition-all text-center flex items-center justify-center gap-2 cursor-pointer',
                    providerPreset === 'google'
                      ? 'bg-s4/20 border-s4 text-p1 font-bold'
                      : 'bg-s1 border-s3 text-p5 hover:border-s4/40 hover:text-p4'
                  )}
                >
                  <span>Google SMTP (Gmail)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange('custom')}
                  className={clsx(
                    'p-3 rounded-xl border text-xs font-medium transition-all text-center flex items-center justify-center gap-2 cursor-pointer',
                    providerPreset === 'custom'
                      ? 'bg-s4/20 border-s4 text-p1 font-bold'
                      : 'bg-s1 border-s3 text-p5 hover:border-s4/40 hover:text-p4'
                  )}
                >
                  <span>Custom SMTP</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BreezeInput
                label="SMTP Host"
                placeholder="smtp.gmail.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
              />
              <BreezeInput
                label="SMTP Port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                required
              />
              <div>
                <label className="caption mb-2 block font-bold text-p4 text-xs">Encryption</label>
                <select
                  value={security}
                  onChange={(e) => setSecurity(e.target.value)}
                  className="w-full bg-s1 border-2 border-s3 rounded-2xl px-4 py-3 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono cursor-pointer"
                >
                  <option value="ssl">SSL (Port 465)</option>
                  <option value="tls">STARTTLS (Port 587)</option>
                  <option value="none">None (Port 25)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BreezeInput
                label="Username / Email"
                placeholder="notifications@breezebytes.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <BreezeInput
                label="Password / App Password"
                type="password"
                placeholder={passwordConfigured ? '••••••••••••••••' : 'Enter app password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText={passwordConfigured ? 'Password configured (AES-256-GCM encrypted).' : ''}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BreezeInput
                label="From Email"
                placeholder="noreply@breezebytes.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
              <BreezeInput
                label="From Display Name"
                placeholder="BreezeBytes"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
              <BreezeInput
                label="Reply-To Email"
                placeholder="support@breezebytes.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <BreezeButton
                type="submit"
                variant="primary"
                size="sm"
                loading={smtpSaving}
              >
                Save SMTP Settings
              </BreezeButton>
            </div>
          </BreezeCard>

          {/* Test Email Card */}
          <BreezeCard className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-p4">Send Test Email</h2>
              <p className="text-xs text-p5">Validate connection and deliverability to an external inbox.</p>
            </div>

            {testStatus && (
              <div
                className={clsx(
                  'p-3.5 rounded-2xl border-2 flex items-center justify-between text-xs',
                  testStatus.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                )}
              >
                <span>{testStatus.message}</span>
                <button type="button" onClick={() => setTestStatus(null)} className="font-bold ml-3 text-p4 hover:underline">✕</button>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-[240px]">
                <BreezeInput
                  placeholder="admin@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <BreezeButton
                type="button"
                variant="secondary"
                size="sm"
                icon={Send}
                loading={smtpTesting}
                onClick={handleTestSmtp}
              >
                Send Test
              </BreezeButton>
            </div>
          </BreezeCard>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
