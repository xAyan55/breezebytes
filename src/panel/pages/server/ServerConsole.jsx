import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import {
  Terminal,
  Send,
  Trash2,
  Copy,
  Check,
  ArrowDownCircle,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Radio,
  Server,
  Network,
  Wifi,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const MAX_LOG_LINES = 1000;

// Module-level cache so navigating Console -> Files -> Console preserves active logs instantly
const consoleLogCache = new Map(); // serverId -> logs[]

const ServerConsole = () => {
  const { server, status } = useOutletContext();
  const { connected, subscribe, sendCommand } = useSocket();
  const serverId = server?.id;

  const [logs, setLogs] = useState(() => {
    return consoleLogCache.get(serverId) || [];
  });
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    memoryLimit: server?.memory || 2048,
    disk: 0,
    diskLimit: server?.disk || 10000,
    uptime: 0,
  });

  const terminalContainerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Helper to update logs state AND cache synchronously
  const updateLogs = useCallback((updater) => {
    setLogs((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (serverId) {
        consoleLogCache.set(serverId, next);
      }
      return next;
    });
  }, [serverId]);

  // Merge historical logs with existing logs avoiding duplicates
  const mergeLogs = useCallback((newLogs) => {
    if (!Array.isArray(newLogs) || newLogs.length === 0) return;
    updateLogs((prev) => {
      if (prev.length === 0) {
        return newLogs.slice(-MAX_LOG_LINES);
      }
      // If prev already has logs, merge by comparing recent entries
      const prevTexts = new Set(prev.slice(-100).map((l) => (typeof l === 'string' ? l : l.text)));
      const filtered = newLogs.filter((l) => {
        const txt = typeof l === 'string' ? l : l.text;
        return !prevTexts.has(txt);
      });
      return [...prev, ...filtered].slice(-MAX_LOG_LINES);
    });
  }, [updateLogs]);

  // Fetch initial history via HTTP
  const fetchHistory = useCallback(async () => {
    if (!serverId) return;
    try {
      setFetchError(null);
      const res = await api.get(`/servers/${serverId}/logs`);
      if (isMountedRef.current && res.success && Array.isArray(res.data)) {
        mergeLogs(res.data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.warn('Could not fetch server log history via HTTP:', err.message);
      }
    }
  }, [serverId, mergeLogs]);

  // WebSocket Subscription Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    if (!serverId) return;

    // 1. Fetch initial HTTP logs
    fetchHistory();

    // 2. Subscribe to live console stream
    const unsubConsole = subscribe(`server:${serverId}:console`, (event, data) => {
      if (!isMountedRef.current) return;

      if (event === 'console_line' && data) {
        updateLogs((prev) => [...prev.slice(-(MAX_LOG_LINES - 1)), data]);
      } else if (event === 'console_history' && Array.isArray(data)) {
        mergeLogs(data);
      }
    });

    // 3. Subscribe to stats stream
    const unsubStats = subscribe(`server:${serverId}:stats`, (event, data) => {
      if (!isMountedRef.current) return;
      if (event === 'stats_update' && data) {
        setStats((prev) => ({
          ...prev,
          ...data,
          memoryLimit: data.memoryLimit || server?.memory || prev.memoryLimit,
          diskLimit: data.diskLimit || server?.disk || prev.diskLimit,
        }));
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubConsole();
      unsubStats();
    };
  }, [serverId, server?.memory, server?.disk, subscribe, fetchHistory, updateLogs, mergeLogs]);

  // Handle scroll detection for user manual scrolling
  const handleScroll = useCallback(() => {
    if (!terminalContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;

    if (isAtBottom) {
      setUserScrolledUp(false);
    } else {
      setUserScrolledUp(true);
    }
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && !userScrolledUp && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, userScrolledUp]);

  const scrollToBottom = () => {
    setUserScrolledUp(false);
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  };

  const handleSendCommand = (e) => {
    e?.preventDefault();
    if (!command.trim() || !serverId) return;

    sendCommand(serverId, command.trim());
    setCommandHistory((prev) => [...prev, command.trim()]);
    setHistoryIndex(-1);
    setCommand('');
    scrollToBottom();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(nextIndex);
          setCommand(commandHistory[nextIndex]);
        }
      }
    }
  };

  const clearConsole = () => {
    updateLogs([]);
  };

  const copyConsole = () => {
    const text = logs.map((l) => (typeof l === 'string' ? l : l.text || '')).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAddress = () => {
    const addr =
      server?.allocation
        ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
        : '';
    if (addr) {
      navigator.clipboard.writeText(addr);
      setAddrCopied(true);
      setTimeout(() => setAddrCopied(false), 2000);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatMb = (mb) => {
    if (!mb && mb !== 0) return '0 MB';
    if (mb >= 1024) {
      const gb = (mb / 1024).toFixed(1);
      return `${gb.endsWith('.0') ? parseInt(gb, 10) : gb} GB`;
    }
    return `${mb} MB`;
  };

  const formatLogLine = (line) => {
    const text = typeof line === 'string' ? line : line?.text || '';
    if (text.includes('WARN') || text.includes('warning') || text.includes('WARNING')) {
      return <span className="text-amber-400">{text}</span>;
    }
    if (text.includes('ERROR') || text.includes('Exception') || text.includes('error') || text.includes('FATAL')) {
      return <span className="text-red-400 font-semibold">{text}</span>;
    }
    if (text.startsWith('>')) {
      return <span className="text-p1 font-bold">{text}</span>;
    }
    if (text.includes('[BreezeBytes]')) {
      return <span className="text-emerald-400 font-medium">{text}</span>;
    }
    return <span className="text-zinc-300">{text}</span>;
  };

  const isOnline = status === 'running';

  const serverAddress = server?.allocation
    ? `${server.allocation.ip === '0.0.0.0' ? server.node?.fqdn || 'localhost' : server.allocation.ip}:${server.allocation.port}`
    : 'Unassigned';

  const cpuLimit = server?.cpu || 100;
  const cpuPercent = isOnline ? Math.min(100, Math.max(0, (stats.cpu / cpuLimit) * 100)) : 0;

  const totalRam = stats.memoryLimit || server?.memory || 2048;
  const memoryPercent = isOnline ? Math.min(100, Math.max(0, (stats.memory / totalRam) * 100)) : 0;

  const totalDisk = stats.diskLimit || server?.disk || 10000;
  const diskPercent = Math.min(100, Math.max(0, (stats.disk / totalDisk) * 100));

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_330px] gap-5 items-start">
      {/* ===== Left: Dominant Console & Terminal Workspace (75-80%) ===== */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Error Notice if log history failed */}
        {fetchError && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BreezeIcon icon={AlertCircle} size={15} />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1 font-semibold hover:underline"
            >
              <BreezeIcon icon={RefreshCw} size={13} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Terminal Box */}
        <div className="border-2 border-s3 rounded-2xl bg-s1 flex flex-col overflow-hidden min-w-0 relative shadow-sm">
          {/* Terminal Header / Toolbar */}
          <div className="px-4 py-3 bg-s2 border-b-2 border-s3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <BreezeIcon icon={Terminal} size={18} className="flex-shrink-0" />
              <span className="small-compact uppercase text-p4 font-bold tracking-wider text-xs">
                Server Terminal
              </span>

              {/* Real Connection Status Indicator */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-s1 border border-s3 text-[10px] font-medium text-p5">
                <span
                  className={clsx(
                    'size-1.5 rounded-full',
                    connected && isOnline
                      ? 'bg-emerald-400 animate-pulse'
                      : connected && !isOnline
                      ? 'bg-p5/50'
                      : 'bg-amber-400 animate-ping',
                  )}
                />
                <span>
                  {connected
                    ? isOnline
                      ? 'Live Stream'
                      : 'Server Offline'
                    : 'Reconnecting...'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-300 border cursor-pointer',
                  autoScroll
                    ? 'bg-s4/20 text-p1 border-s4/40'
                    : 'bg-s1 text-p5 border-s3 hover:text-p4 hover:border-s4',
                )}
                title="Toggle Console Auto-Scroll"
              >
                <BreezeIcon icon={ArrowDownCircle} size={16} className={clsx(autoScroll && 'text-p1')} />
                <span>Auto-Scroll</span>
              </button>

              <button
                onClick={copyConsole}
                className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/40 border border-transparent hover:border-s3 transition-all duration-300 cursor-pointer"
                title="Copy Terminal Output"
              >
                {copied ? <BreezeIcon icon={Check} size={16} /> : <BreezeIcon icon={Copy} size={16} />}
              </button>

              <button
                onClick={clearConsole}
                className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all duration-300 cursor-pointer"
                title="Clear Terminal Output"
              >
                <BreezeIcon icon={Trash2} size={16} />
              </button>
            </div>
          </div>

          {/* Terminal Screen Output */}
          <div
            ref={terminalContainerRef}
            onScroll={handleScroll}
            className="p-4 font-mono text-xs sm:text-[13px] overflow-y-auto h-[520px] flex flex-col gap-0.5 select-text bg-[#07080c] text-zinc-300 scroll-smooth relative"
          >
            {logs.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center gap-2 text-center p-6 select-none">
                <BreezeIcon icon={Radio} size={28} className="text-p5/30 animate-pulse" />
                <p className="text-p5/50 text-xs font-mono">
                  {isOnline
                    ? connected
                      ? 'Waiting for server console output...'
                      : 'Connecting to server console stream...'
                    : 'Server is currently offline. Click Start in the header to power on and stream live logs.'}
                </p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-words font-mono">
                  {formatLogLine(log)}
                </div>
              ))
            )}

            {/* Jump to Latest Floating Button when manually scrolled up */}
            {userScrolledUp && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 self-center flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-s4 text-p4 text-xs font-bold shadow-500 border border-s4 hover:scale-105 transition-all duration-200 cursor-pointer z-20"
              >
                <BreezeIcon icon={ChevronDown} size={14} className="animate-bounce" />
                <span>Jump to latest</span>
              </button>
            )}
          </div>

          {/* Command Input Bar (Directly Attached) */}
          <form
            onSubmit={handleSendCommand}
            className="p-3 bg-s2 border-t-2 border-s3 flex items-center gap-2.5"
          >
            <span className="text-p1 font-mono font-bold text-sm select-none pl-1">&gt;</span>
            <input
              type="text"
              disabled={!isOnline}
              placeholder={
                isOnline
                  ? 'Type a Minecraft command (e.g. op Steve, help, list, save-all)...'
                  : 'Server must be online to execute commands.'
              }
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-s1 border-2 border-s3 rounded-xl px-4 py-2 text-xs font-mono text-p4 placeholder:text-p5/40 focus:outline-none focus:border-s4 transition-all duration-300 disabled:opacity-40"
            />
            <BreezeButton
              type="submit"
              variant="primary"
              size="sm"
              iconRight={Send}
              disabled={!isOnline || !command.trim()}
            >
              Send
            </BreezeButton>
          </form>
        </div>
      </div>

      {/* ===== Right: Consistent 7-Metric Telemetry Sidebar ===== */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* Card 1: Address */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex items-center justify-between gap-3 hover:border-s4/60 transition-colors duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
              <BreezeIcon icon={Wifi} size={22} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
                Address
              </span>
              <span className="text-xs font-bold text-p4 font-mono tracking-wide block truncate select-all">
                {serverAddress}
              </span>
            </div>
          </div>
          {server?.allocation && (
            <button
              onClick={copyAddress}
              className="p-1.5 rounded-xl text-p5 hover:text-p1 hover:bg-s5/40 border border-transparent hover:border-s3 transition-colors cursor-pointer flex-shrink-0"
              title="Copy Address"
            >
              {addrCopied ? <BreezeIcon icon={Check} size={15} /> : <BreezeIcon icon={Copy} size={15} />}
            </button>
          )}
        </div>

        {/* Card 2: Uptime */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex items-center gap-3 hover:border-s4/60 transition-colors duration-300">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
            <BreezeIcon icon={Clock} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
              Uptime
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-p4 font-mono">
                {isOnline ? formatUptime(stats.uptime) : 'Offline'}
              </span>
              <span
                className={clsx(
                  'size-2 rounded-full mr-1',
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-p5/40',
                )}
              />
            </div>
          </div>
        </div>

        {/* Card 3: CPU Load */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex flex-col gap-2.5 hover:border-s4/60 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
              <BreezeIcon icon={Cpu} size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
                CPU Load
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-p4 font-mono">
                  {isOnline ? `${stats.cpu}%` : '0%'}
                </span>
                <span className="text-p5/60 text-[10px] font-mono">Limit: {cpuLimit}%</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-s1 rounded-full h-1.5 overflow-hidden border border-s3">
            <div
              className="bg-gradient-to-r from-p2 to-p1 h-full rounded-full transition-all duration-300"
              style={{ width: `${cpuPercent}%` }}
            />
          </div>
        </div>

        {/* Card 4: Memory Usage */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex flex-col gap-2.5 hover:border-s4/60 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
              <BreezeIcon icon={Activity} size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
                Memory
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-p4 font-mono">
                  {isOnline ? formatMb(stats.memory) : '0 MB'}
                </span>
                <span className="text-p5/60 text-[10px] font-mono">{formatMb(totalRam)}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-s1 rounded-full h-1.5 overflow-hidden border border-s3">
            <div
              className="bg-gradient-to-r from-p2 to-p1 h-full rounded-full transition-all duration-300"
              style={{ width: `${memoryPercent}%` }}
            />
          </div>
        </div>

        {/* Card 5: Disk Usage */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex flex-col gap-2.5 hover:border-s4/60 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
              <BreezeIcon icon={HardDrive} size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
                Disk
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-p4 font-mono">
                  {formatMb(stats.disk)}
                </span>
                <span className="text-p5/60 text-[10px] font-mono">{formatMb(totalDisk)}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-s1 rounded-full h-1.5 overflow-hidden border border-s3">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${diskPercent}%` }}
            />
          </div>
        </div>

        {/* Card 6: Network Port */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex items-center gap-3 hover:border-s4/60 transition-colors duration-300">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
            <BreezeIcon icon={Network} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
              Primary Port
            </span>
            <span className="text-xs font-bold text-p4 font-mono block truncate">
              {server?.allocation?.port ? `#${server.allocation.port}` : 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Card 7: Host Node */}
        <div className="border-2 border-s3 rounded-2xl bg-s2 p-3.5 flex items-center gap-3 hover:border-s4/60 transition-colors duration-300">
          <div className="size-10 rounded-xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 flex-shrink-0 shadow-inner">
            <BreezeIcon icon={Server} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-p5/70 uppercase tracking-wider block font-sans">
              Host Node
            </span>
            <span className="text-xs font-bold text-p4 font-sans block truncate" title={server?.node?.name || server?.node?.fqdn}>
              {server?.node?.name || server?.node?.fqdn || 'Local Daemon'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerConsole;
