import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api.js';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import {
  Globe,
  Network,
  Radio,
  Wifi,
  Zap,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  ArrowRight,
  ExternalLink,
  Power,
  RotateCw,
  Sparkles,
} from 'lucide-react';

const ServerConnect = () => {
  const { id: serverId } = useParams();
  const { server } = useOutletContext();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);
  const [activeTab, setActiveTab] = useState('java'); // 'java' | 'bedrock' | 'details'
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTunnelInfo = useCallback(async (isSilent = false) => {
    if (!serverId) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get(`/servers/${serverId}/connect`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      if (!isSilent) {
        showToast('error', err.message || 'Failed to fetch Playit tunnel status');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchTunnelInfo();
  }, [fetchTunnelInfo]);

  // Polling while tunnel is in an active provisioning state
  const primaryTunnel = data?.primary;
  const isPending = primaryTunnel && ['pending', 'ensuring_agent', 'creating', 'waiting_allocation'].includes(primaryTunnel.status);

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      fetchTunnelInfo(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, fetchTunnelInfo]);

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'host') {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } else if (type === 'domain') {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } else if (type === 'full') {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } else if (type === 'local') {
      setCopiedLocal(true);
      setTimeout(() => setCopiedLocal(false), 2000);
    }
    showToast('success', 'Address copied to clipboard!');
  };

  const handleRetryProvisioning = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/servers/${serverId}/network/playit/retry`);
      if (res.success) {
        showToast('success', 'Tunnel provisioning queued. Polling for Anycast allocation...');
        setTimeout(() => fetchTunnelInfo(true), 2500);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTunnel = async (currentEnabled) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/servers/${serverId}/network/playit/toggle`, { enabled: !currentEnabled });
      if (res.success) {
        showToast('success', `Playit tunnel ${!currentEnabled ? 'enabled' : 'disabled'}.`);
        fetchTunnelInfo(true);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isTunnelActive = primaryTunnel?.status === 'active' && primaryTunnel?.publicAddress;
  const isTunnelFailed = primaryTunnel?.status === 'failed';
  const isTunnelDisabled = primaryTunnel?.enabled === false;
  const isNodeReady = data?.nodeConfigured;

  const publicAddress = primaryTunnel?.publicAddress || 'Allocating...';
  const localTarget = `${primaryTunnel?.localIp || '127.0.0.1'}:${primaryTunnel?.localPort || server?.allocation?.port || 25565}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-p5">
        <img src="/images/icons/Loader2.gif" alt="Loading" className="size-8 object-contain" />
        <p className="body-3 font-medium text-p4">Loading Playit connection manager...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* ===== Toast Notification Banner ===== */}
      {toastMessage && (
        <div
          className={clsx(
            'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all shadow-lg',
            toastMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          )}
        >
          <BreezeIcon icon={toastMessage.type === 'error' ? AlertCircle : Check} size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ===== Header & Title ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-s3 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-s3/70 border border-s4 flex items-center justify-center p-2.5 shadow-inner">
            <BreezeIcon icon="connect" size={28} className="text-p1" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="h4 text-p1 font-bold tracking-tight">Connect</h1>
              <BreezeBadge
                variant={
                  isTunnelActive
                    ? 'success'
                    : isPending
                    ? 'warning'
                    : isTunnelFailed
                    ? 'error'
                    : 'neutral'
                }
                className="capitalize"
              >
                {isTunnelActive
                  ? 'Active / Online'
                  : isPending
                  ? 'Allocating Edge IP...'
                  : isTunnelDisabled
                  ? 'Tunnel Paused'
                  : isTunnelFailed
                  ? 'Provisioning Failed'
                  : 'Standby'}
              </BreezeBadge>
            </div>
            <p className="body-3 text-p5 mt-0.5">
              Playit.gg Zero-Config Public Ingress & Anycast tunnel management for your Minecraft server.
            </p>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTunnelInfo(false)}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-s3/70 hover:bg-s3 border border-s4 text-p4 hover:text-p1 text-xs font-semibold transition-all"
            title="Refresh tunnel metrics"
          >
            <BreezeIcon
              icon={actionLoading ? RefreshCw : RotateCw}
              size={14}
              className={clsx(actionLoading && 'animate-spin')}
            />
            <span>Refresh</span>
          </button>

          {isNodeReady && (!primaryTunnel || isTunnelFailed) && (
            <button
              onClick={handleRetryProvisioning}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-p1/20 hover:bg-p1/30 border border-p1/40 text-p1 text-xs font-semibold transition-all shadow-sm"
            >
              <BreezeIcon icon={Zap} size={14} />
              <span>Retry Tunnel Provisioning</span>
            </button>
          )}

          {primaryTunnel && (
            <button
              onClick={() => handleToggleTunnel(primaryTunnel.enabled)}
              disabled={actionLoading}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all',
                primaryTunnel.enabled
                  ? 'bg-s3/70 hover:bg-red-500/20 text-p4 hover:text-red-300 border-s4 hover:border-red-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40',
              )}
            >
              <BreezeIcon icon={Power} size={14} />
              <span>{primaryTunnel.enabled ? 'Pause Tunnel' : 'Resume Tunnel'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== Case 1: Node Agent Not Configured Warning ===== */}
      {!isNodeReady && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <BreezeIcon icon={AlertTriangle} size={24} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-300">Playit Agent Not Yet Configured on Node #{data?.nodeId || 1}</h4>
              <p className="text-xs text-amber-200/80 mt-1 max-w-2xl leading-relaxed">
                To enable automatic Anycast public endpoints for all servers, the host administrator can link a Playit account in Admin Settings or run the 1-click claim setup.
              </p>
            </div>
          </div>
          <Link
            to="/panel/admin/settings"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all whitespace-nowrap"
          >
            <span>Configure in Admin Settings</span>
            <BreezeIcon icon={ArrowRight} size={14} />
          </Link>
        </div>
      )}

      {/* ===== Case 2: Provisioning Pending Progress Card ===== */}
      {isPending && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-s2 to-s3/80 border border-s4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-s4 overflow-hidden">
            <div className="h-full bg-p1 animate-pulse" style={{ width: '70%' }} />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/images/icons/Loader2.gif" alt="Allocating" className="size-10 object-contain" />
              <div>
                <h3 className="text-base font-bold text-p1">Allocating Playit Anycast Edge Route...</h3>
                <p className="text-xs text-p5 mt-0.5">
                  Playit V1 API is negotiating a global Anycast port and establishing tunnel routing with your node agent.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BreezeBadge variant="warning">Step: {primaryTunnel?.status?.replace('_', ' ')}</BreezeBadge>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN HERO CARD: Connection Address & Direct Copy ===== */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-s2/90 via-s2 to-s1 border-2 border-s3/80 shadow-2xl relative overflow-hidden group">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -right-24 size-80 bg-p1/10 rounded-full blur-3xl pointer-events-none group-hover:bg-p1/15 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 size-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-p1/15 border border-p1/30 flex items-center justify-center p-2 text-p1">
                <BreezeIcon icon={Globe} size={18} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-p5">Public Server Address</span>
                <p className="text-xs text-p4 font-medium">Give this address to players to connect from anywhere in the world</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                Anycast DDoS Protected
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-s3/80 text-p4 border border-s4">
                No Port Forwarding Required
              </span>
            </div>
          </div>

          {/* Big IP / Domain Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2.5 rounded-2xl bg-s1/90 border border-s3 shadow-inner">
            <div className="flex-1 px-4 py-2 flex items-center gap-3 min-w-0">
              <BreezeIcon icon={Radio} size={20} className="text-p1 flex-shrink-0" />
              <span className="font-mono text-base md:text-xl font-bold text-p1 truncate select-all tracking-wide">
                {isTunnelActive ? publicAddress : isPending ? 'Allocating Anycast Address...' : 'No Public Address Allocated'}
              </span>
            </div>

            <div className="flex items-center gap-2 p-1">
              <button
                onClick={() => copyToClipboard(publicAddress, 'host')}
                disabled={!isTunnelActive}
                className={clsx(
                  'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-md',
                  isTunnelActive
                    ? copiedHost
                      ? 'bg-emerald-500 text-s1 font-extrabold shadow-emerald-500/20'
                      : 'bg-p1 hover:bg-p1/90 text-s1 font-bold shadow-p1/20 hover:scale-[1.02]'
                    : 'bg-s3 text-p5 cursor-not-allowed',
                )}
              >
                <BreezeIcon icon={copiedHost ? Check : Copy} size={16} />
                <span>{copiedHost ? 'Copied!' : 'Copy Address'}</span>
              </button>
            </div>
          </div>

          {/* SRV Domain Helper Pill */}
          {isTunnelActive && primaryTunnel?.domain && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-s3/40 border border-s3/70 text-xs">
              <div className="flex items-center gap-2 text-p3">
                <BreezeIcon icon={Sparkles} size={15} className="text-amber-400 flex-shrink-0" />
                <span className="text-p4 font-medium">Auto SRV Domain (No Port Needed in Minecraft):</span>
                <span className="font-mono font-bold text-p1 select-all">{primaryTunnel.domain}</span>
              </div>
              <button
                onClick={() => copyToClipboard(primaryTunnel.domain, 'domain')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-s4/70 hover:bg-s4 text-p2 hover:text-p1 text-[11px] font-bold transition-all shadow-sm"
              >
                <BreezeIcon icon={copiedDomain ? Check : Copy} size={13} />
                <span>{copiedDomain ? 'Copied!' : 'Copy SRV Domain'}</span>
              </button>
            </div>
          )}

          {/* Tunnel Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-s3/40 border border-s3/60">
              <span className="text-[10px] font-bold text-p5 uppercase tracking-wider block">Edge Protocol</span>
              <div className="flex items-center gap-1.5 mt-1">
                <BreezeIcon icon={Network} size={14} className="text-p1" />
                <span className="text-xs font-semibold text-p2">Minecraft Java (TCP)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-s3/40 border border-s3/60">
              <span className="text-[10px] font-bold text-p5 uppercase tracking-wider block">Local Forward Target</span>
              <div className="flex items-center gap-1.5 mt-1">
                <BreezeIcon icon={Server} size={14} className="text-p3" />
                <span className="text-xs font-mono font-semibold text-p2 truncate">{localTarget}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-s3/40 border border-s3/60">
              <span className="text-[10px] font-bold text-p5 uppercase tracking-wider block">Global Anycast PoP</span>
              <div className="flex items-center gap-1.5 mt-1">
                <BreezeIcon icon={Wifi} size={14} className="text-emerald-400" />
                <span className="text-xs font-semibold text-p2">Nearest Edge Server</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-s3/40 border border-s3/60">
              <span className="text-[10px] font-bold text-p5 uppercase tracking-wider block">Agent Health</span>
              <div className="flex items-center gap-1.5 mt-1">
                <BreezeIcon icon={ShieldCheck} size={14} className="text-p1" />
                <span className="text-xs font-semibold text-p2 capitalize">
                  {data?.nodeStatus || 'Active'} ({data?.agentVersion || '1.0.10'})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tab Navigation: Instructions & Technical Details ===== */}
      <div className="flex items-center gap-2 border-b border-s3 pb-2 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('java')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
            activeTab === 'java'
              ? 'bg-s3 text-p1 border border-s4 shadow-sm'
              : 'text-p5 hover:text-p4 hover:bg-s3/40',
          )}
        >
          <img src="/images/icons/PaperIcon.png" alt="Java" className="size-4 object-contain" />
          <span>Minecraft Java Connect Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('bedrock')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
            activeTab === 'bedrock'
              ? 'bg-s3 text-p1 border border-s4 shadow-sm'
              : 'text-p5 hover:text-p4 hover:bg-s3/40',
          )}
        >
          <BreezeIcon icon="connect" size={16} />
          <span>Bedrock / Geyser Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
            activeTab === 'details'
              ? 'bg-s3 text-p1 border border-s4 shadow-sm'
              : 'text-p5 hover:text-p4 hover:bg-s3/40',
          )}
        >
          <BreezeIcon icon={Network} size={16} />
          <span>Tunnel Technical Details</span>
        </button>
      </div>

      {/* ===== TAB CONTENT ===== */}

      {/* Tab 1: Java Edition Guide */}
      {activeTab === 'java' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-s2 border border-s3 flex flex-col gap-3">
            <div className="size-8 rounded-xl bg-p1/20 border border-p1/30 flex items-center justify-center font-bold text-p1 text-sm">
              1
            </div>
            <h4 className="text-sm font-bold text-p1">Launch Minecraft Java</h4>
            <p className="text-xs text-p5 leading-relaxed">
              Open the Minecraft Launcher and start version <span className="text-p3 font-mono font-semibold">{server?.minecraft_version || 'matching your server'}</span> (or compatible via ViaVersion).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-s2 border border-s3 flex flex-col gap-3">
            <div className="size-8 rounded-xl bg-p1/20 border border-p1/30 flex items-center justify-center font-bold text-p1 text-sm">
              2
            </div>
            <h4 className="text-sm font-bold text-p1">Open Multiplayer</h4>
            <p className="text-xs text-p5 leading-relaxed">
              Click <span className="text-p2 font-semibold">Multiplayer</span> &rarr; select <span className="text-p2 font-semibold">Direct Connection</span> or click <span className="text-p2 font-semibold">Add Server</span>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-s2 border border-s3 flex flex-col gap-3">
            <div className="size-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-sm">
              3
            </div>
            <h4 className="text-sm font-bold text-p1">Paste Public Address</h4>
            <p className="text-xs text-p5 leading-relaxed">
              Paste the address <span className="font-mono text-p1 bg-s1 px-1.5 py-0.5 rounded border border-s4 text-[11px] select-all">{publicAddress}</span> into Server Address and click <span className="text-emerald-400 font-semibold">Join Server</span>!
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Bedrock Guide */}
      {activeTab === 'bedrock' && (
        <div className="p-6 rounded-2xl bg-s2 border border-s3 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <BreezeIcon icon={Zap} size={20} className="text-amber-400" />
            <h4 className="text-sm font-bold text-p1">Cross-Platform Play with GeyserMC</h4>
          </div>
          <p className="text-xs text-p5 leading-relaxed max-w-3xl">
            If your server has the <span className="text-p2 font-semibold">GeyserMC</span> and <span className="text-p2 font-semibold">Floodgate</span> plugins installed, Bedrock players on mobile, console, or Windows Bedrock edition can join seamlessly.
          </p>
          <div className="p-4 rounded-xl bg-s1 border border-s3 space-y-2">
            <span className="text-[11px] font-bold text-p5 uppercase tracking-wider block">How Bedrock Players Join:</span>
            <ul className="text-xs text-p4 space-y-1.5 list-disc pl-4">
              <li>In Minecraft Bedrock, go to <span className="text-p2 font-semibold">Play &rarr; Servers &rarr; Add Server</span>.</li>
              <li>Server Name: <span className="text-p1 font-semibold">{server?.name || 'My Server'}</span></li>
              <li>Server Address: <span className="font-mono text-p1">{primaryTunnel?.domain || (publicAddress.includes(':') ? publicAddress.split(':')[0] : publicAddress)}</span></li>
              <li>Port: <span className="font-mono text-p1">{primaryTunnel?.publicPort || (publicAddress.includes(':') ? publicAddress.split(':')[1] : '25565')}</span></li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Technical Tunnel Details */}
      {activeTab === 'details' && (
        <div className="p-6 rounded-2xl bg-s2 border border-s3 space-y-4 animate-in fade-in duration-200">
          <h4 className="text-sm font-bold text-p1">Playit.gg Provisioning & Node Metadata</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-s1 border border-s3 flex justify-between items-center">
              <span className="text-p5">Tunnel UUID:</span>
              <span className="text-p2 truncate max-w-[200px]">{primaryTunnel?.playitTunnelId || 'Auto-Managed'}</span>
            </div>
            <div className="p-3 rounded-xl bg-s1 border border-s3 flex justify-between items-center">
              <span className="text-p5">Assigned Edge IP:</span>
              <span className="text-p2">{primaryTunnel?.publicIp || 'Anycast Cloud'}</span>
            </div>
            <div className="p-3 rounded-xl bg-s1 border border-s3 flex justify-between items-center">
              <span className="text-p5">Public Edge Port:</span>
              <span className="text-p2">{primaryTunnel?.publicPort || 'N/A'}</span>
            </div>
            <div className="p-3 rounded-xl bg-s1 border border-s3 flex justify-between items-center">
              <span className="text-p5">Node Bound Port:</span>
              <span className="text-p2">{primaryTunnel?.localPort || server?.allocation?.port || '25565'}</span>
            </div>
            <div className="p-3 rounded-xl bg-s1 border border-s3 flex justify-between items-center">
              <span className="text-p5">Node Agent ID:</span>
              <span className="text-p2 truncate max-w-[200px]">{data?.agentId || 'd5ae9292-...'}</span>
            </div>
            <div className="p-3 rounded-xl bg-s1 border border-s3 flex justify-between items-center">
              <span className="text-p5">Hosting Node ID:</span>
              <span className="text-p2">Node #{data?.nodeId || 1}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerConnect;
