import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeStatCard from '../../../components/ui/BreezeStatCard.jsx';
import {
  Terminal,
  Send,
  Trash2,
  Copy,
  Check,
  ArrowDownCircle,
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
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/servers/${server.id}/logs`);
        if (res.success && res.data) {
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
        setStats(data);
      }
    });

    return () => {
      unsubConsole();
      unsubStats();
    };
  }, [server.id, subscribe]);

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
    const text = logs.map((l) => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatLogLine = (line) => {
    const text = line.text || '';
    if (text.includes('WARN') || text.includes('warning')) {
      return <span className="text-amber-400">{text}</span>;
    }
    if (text.includes('ERROR') || text.includes('Exception') || text.includes('error')) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Live Stats ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <BreezeStatCard
          label="CPU Usage"
          value={isOnline ? `${stats.cpu}%` : '0%'}
          image="/images/detail-1.png"
        />
        <BreezeStatCard
          label="Memory"
          value={isOnline ? `${stats.memory} MB` : '0 MB'}
          image="/images/detail-3.png"
        />
        <BreezeStatCard
          label="Disk Usage"
          value={`${stats.disk} MB`}
          image="/images/detail-2.png"
        />
        <BreezeStatCard
          label="Uptime"
          value={isOnline ? formatUptime(stats.uptime) : 'Offline'}
          image="/images/detail-4.png"
        />
      </div>

      {/* ===== Terminal ===== */}
      <div className="border-2 border-s3 rounded-3xl bg-s1 flex flex-col shadow-500 overflow-hidden">
        {/* Terminal Titlebar */}
        <div className="px-4 py-3 bg-s2 border-b-2 border-s3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-p1" />
            <span className="small-compact uppercase text-p4 font-bold tracking-wider">
              Server Terminal & Output
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-500 border-2',
                autoScroll
                  ? 'g4 text-p1 border-s4/30'
                  : 'bg-s1 text-p5 border-s3',
              )}
              title="Toggle Auto-Scroll"
            >
              <ArrowDownCircle size={14} />
              <span>Scroll</span>
            </button>

            <button
              onClick={copyConsole}
              className="p-1.5 rounded-xl text-p5 hover:text-p4 hover:bg-s5/40 transition-colors duration-500"
              title="Copy Console Output"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              onClick={clearConsole}
              className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"
              title="Clear Terminal"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Terminal Screen */}
        <div
          ref={terminalEndRef}
          className="p-4 font-mono text-xs overflow-y-auto h-[450px] sm:h-[500px] flex flex-col gap-1 select-text bg-s1"
        >
          {logs.length === 0 ? (
            <p className="text-p5/40 italic my-auto text-center">
              Terminal ready. Start the server to stream live stdout/stderr console logs.
            </p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed break-words">
                {formatLogLine(log)}
              </div>
            ))
          )}
        </div>

        {/* Command Input */}
        <form
          onSubmit={handleSendCommand}
          className="p-3 bg-s2 border-t-2 border-s3 flex items-center gap-3"
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
    </div>
  );
};

export default ServerConsole;
