import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
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
  Globe,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';

const ServerConsole = () => {
  const { server, status } = useOutletContext();
  const { subscribe, sendCommand } = useSocket();
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);
  const [stats, setStats] = useState({
    cpu: 0,
    memory: 0,
    memoryLimit: server?.memory || 2048,
    disk: 0,
    diskLimit: server?.disk || 10000,
    uptime: 0,
  });

  const terminalEndRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const res = await api.get(`/servers/${server.id}/logs`);
        if (isMounted && res.success && Array.isArray(res.data)) {
          setLogs(res.data);
        }
      } catch {
        // ignore
      }
    };

    fetchLogs();

    const unsubConsole = subscribe(`server:${server.id}:console`, (event, data) => {
      if (event === 'console_line' && data) {
        setLogs((prev) => [...prev.slice(-1000), data]);
      } else if (event === 'console_history' && Array.isArray(data)) {
        setLogs(data);
      }
    });

    const unsubStats = subscribe(`server:${server.id}:stats`, (event, data) => {
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
      isMounted = false;
      unsubConsole();
      unsubStats();
    };
  }, [server.id, server.memory, server.disk, subscribe]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleSendCommand = (e) => {
    e?.preventDefault();
    if (!command.trim()) return;

    sendCommand(server.id, command);
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setCommand('');
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

  const clearConsole = () => setLogs([]);

  const copyConsole = () => {
    const text = logs.map((l) => l.text || '').join('\n');
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
    const text = line?.text || '';
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

  // Percentage calculations
  const cpuLimit = server?.cpu || 100;
  const cpuPercent = isOnline ? Math.min(100, Math.max(0, (stats.cpu / cpuLimit) * 100)) : 0;

  const totalRam = stats.memoryLimit || server?.memory || 2048;
  const memoryPercent = isOnline ? Math.min(100, Math.max(0, (stats.memory / totalRam) * 100)) : 0;

  const totalDisk = stats.diskLimit || server?.disk || 10000;
  const diskPercent = Math.min(100, Math.max(0, (stats.disk / totalDisk) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      {/* ===== Left: Dominant Console & Terminal Workspace ===== */}
      <div className="border-2 border-s3 rounded-3xl bg-s1 flex flex-col shadow-500 overflow-hidden min-w-0">
        {/* Terminal Header / Toolbar */}
        <div className="px-4 py-3 bg-s2 border-b-2 border-s3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Terminal size={16} className="text-p1 flex-shrink-0" />
            <span className="small-compact uppercase text-p4 font-bold tracking-wider text-xs">
              Server Terminal & Output
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-s1 border border-s3 text-[10px] font-medium text-p5">
              <span
                className={clsx(
                  'size-1.5 rounded-full',
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-p5/40',
                )}
              />
              {isOnline ? 'Live Stream' : 'Idle'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-500 border-2 cursor-pointer',
                autoScroll
                  ? 'g4 text-p1 border-s4/30 shadow-400'
                  : 'bg-s1 text-p5 border-s3 hover:text-p4 hover:border-s4',
              )}
              title="Toggle Console Auto-Scroll"
            >
              <ArrowDownCircle size={14} className={clsx(autoScroll && 'text-p1')} />
              <span>Scroll</span>
            </button>

            <button
              onClick={copyConsole}
              className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/40 border border-transparent hover:border-s3 transition-all duration-500 cursor-pointer"
              title="Copy Terminal Logs"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              onClick={clearConsole}
              className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all duration-500 cursor-pointer"
              title="Clear Terminal Output"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Terminal Screen Output */}
        <div
          ref={terminalEndRef}
          className="p-4 font-mono text-xs sm:text-[13px] overflow-y-auto min-h-[440px] h-[520px] lg:h-[calc(100vh-290px)] max-h-[720px] flex flex-col gap-1 select-text bg-[#08090d] text-zinc-300 scroll-smooth"
        >
          {logs.length === 0 ? (
            <div className="my-auto flex flex-col items-center justify-center gap-2 text-center p-6 select-none">
              <Radio size={24} className="text-p5/30 animate-pulse" />
              <p className="text-p5/40 text-xs font-mono">
                {isOnline
                  ? 'Terminal ready. Streaming live stdout/stderr console logs...'
                  : 'Terminal offline. Start the server to stream live stdout/stderr logs.'}
              </p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed break-words font-mono">
                {formatLogLine(log)}
              </div>
            ))
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
            className="flex-1 bg-s1 border-2 border-s3 rounded-2xl px-4 py-2 text-xs font-mono text-p4 placeholder:text-p5/40 focus:outline-none focus:border-s4 transition-all duration-500 disabled:opacity-40"
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

      {/* ===== Right: Compact Live Resource Sidebar ===== */}
      <div className="border-2 border-s3 rounded-3xl bg-s2/80 backdrop-blur-sm p-4 sm:p-5 flex flex-col gap-4 shadow-500">
        <div className="flex items-center justify-between border-b border-s3 pb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-p1" />
            <h3 className="caption mb-0 text-xs">Live Telemetry</h3>
          </div>
          <span className="text-[10px] text-p5/60 font-mono">Realtime</span>
        </div>

        {/* Server Address */}
        <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-s1/60 border border-s3/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-p5 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={13} className="text-p1" />
              <span>Address</span>
            </span>
            {server?.allocation && (
              <button
                onClick={copyAddress}
                className="p-1 rounded-lg text-p5 hover:text-p1 transition-colors cursor-pointer"
                title="Copy Address"
              >
                {addrCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            )}
          </div>
          <p className="font-mono text-xs text-p4 font-semibold break-all select-all">
            {serverAddress}
          </p>
          {server?.node && (
            <p className="text-[10px] text-p5/70 truncate">
              Node: <span className="text-p4">{server.node.name || server.node.fqdn}</span>
            </p>
          )}
        </div>

        {/* Uptime */}
        <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-s1/60 border border-s3/80">
          <span className="text-[11px] font-bold text-p5 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-p1" />
            <span>Uptime</span>
          </span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-p4 font-mono">
              {isOnline ? formatUptime(stats.uptime) : 'Offline'}
            </span>
            <span
              className={clsx(
                'size-2 rounded-full',
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-p5/40',
              )}
            />
          </div>
        </div>

        {/* CPU Usage */}
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-s1/60 border border-s3/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-p5 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={13} className="text-p1" />
              <span>CPU</span>
            </span>
            <span className="text-xs font-bold text-p4 font-mono">
              {isOnline ? `${stats.cpu}%` : '0%'}
              <span className="text-p5/60 font-normal text-[10px]"> / {cpuLimit}%</span>
            </span>
          </div>
          {/* Subtle Progress Bar */}
          <div className="w-full bg-s3 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-p2 to-p1 h-full rounded-full transition-all duration-500"
              style={{ width: `${cpuPercent}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-s1/60 border border-s3/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-p5 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} className="text-p1" />
              <span>Memory</span>
            </span>
            <span className="text-xs font-bold text-p4 font-mono">
              {isOnline ? formatMb(stats.memory) : '0 MB'}
              <span className="text-p5/60 font-normal text-[10px]"> / {formatMb(totalRam)}</span>
            </span>
          </div>
          {/* Subtle Progress Bar */}
          <div className="w-full bg-s3 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-p2 to-p1 h-full rounded-full transition-all duration-500"
              style={{ width: `${memoryPercent}%` }}
            />
          </div>
        </div>

        {/* Disk Usage */}
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-s1/60 border border-s3/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-p5 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive size={13} className="text-p1" />
              <span>Disk</span>
            </span>
            <span className="text-xs font-bold text-p4 font-mono">
              {formatMb(stats.disk)}
              <span className="text-p5/60 font-normal text-[10px]"> / {formatMb(totalDisk)}</span>
            </span>
          </div>
          {/* Subtle Progress Bar */}
          <div className="w-full bg-s3 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-p2 to-p1 h-full rounded-full transition-all duration-500"
              style={{ width: `${diskPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerConsole;
