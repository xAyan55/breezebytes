import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import api from '../services/api.js';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(new Map()); // channel -> Set of callback functions

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!token || !user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Authenticate socket connection
      ws.send(JSON.stringify({ action: 'auth', token }));

      // Re-subscribe to all active channels
      listenersRef.current.forEach((_, channel) => {
        ws.send(JSON.stringify({ action: 'subscribe', channel }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { channel, event: eventName, data } = payload;
        if (channel && listenersRef.current.has(channel)) {
          listenersRef.current.get(channel).forEach((cb) => cb(eventName, data));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Attempt reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribe = (channel, callback) => {
    if (!listenersRef.current.has(channel)) {
      listenersRef.current.set(channel, new Set());
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'subscribe', channel }));
      }
    }
    listenersRef.current.get(channel).add(callback);

    // Return un-subscribe function
    return () => {
      const set = listenersRef.current.get(channel);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(channel);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'unsubscribe', channel }));
          }
        }
      }
    };
  };

  const sendCommand = (serverId, command) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'send_command',
        channel: `server:${serverId}:console`,
        command,
      }));
    }
  };

  return (
    <SocketContext.Provider
      value={{
        connected,
        subscribe,
        sendCommand,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
