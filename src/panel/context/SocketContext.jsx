import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import api from '../services/api.js';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const isAuthenticatedRef = useRef(false);
  const isDestroyedRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(new Map()); // channel -> Set of callback functions

  const sendPendingSubscriptions = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      listenersRef.current.forEach((_, channel) => {
        try {
          wsRef.current.send(JSON.stringify({ action: 'subscribe', channel }));
        } catch {
          // ignore
        }
      });
    }
  }, []);

  const connect = useCallback(() => {
    if (isDestroyedRef.current) return;
    const token = api.getToken();
    if (!token || !user) {
      setConnected(false);
      isAuthenticatedRef.current = false;
      return;
    }

    // Clean up any existing connection before creating a new one
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      isAuthenticatedRef.current = false;

      ws.onopen = () => {
        if (isDestroyedRef.current) {
          ws.close();
          return;
        }
        // Send authentication
        ws.send(JSON.stringify({ action: 'auth', token }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { channel, event: eventName, data } = payload;

          if (eventName === 'auth_success') {
            isAuthenticatedRef.current = true;
            setConnected(true);
            // Once authenticated, subscribe to all active channels
            sendPendingSubscriptions();
            return;
          }

          if (eventName === 'auth_error') {
            isAuthenticatedRef.current = false;
            setConnected(false);
            return;
          }

          if (channel && listenersRef.current.has(channel)) {
            listenersRef.current.get(channel).forEach((cb) => {
              try {
                cb(eventName, data);
              } catch (cbErr) {
                console.error('[WS Callback Error]', cbErr);
              }
            });
          }
        } catch {
          // ignore parsing errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        isAuthenticatedRef.current = false;
        if (!isDestroyedRef.current) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.error('[WS Init Error]', err);
      setConnected(false);
      isAuthenticatedRef.current = false;
    }
  }, [user, sendPendingSubscriptions]);

  useEffect(() => {
    isDestroyedRef.current = false;
    connect();

    return () => {
      isDestroyedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  const subscribe = useCallback((channel, callback) => {
    if (!channel || !callback) return () => {};

    if (!listenersRef.current.has(channel)) {
      listenersRef.current.set(channel, new Set());
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        isAuthenticatedRef.current
      ) {
        try {
          wsRef.current.send(JSON.stringify({ action: 'subscribe', channel }));
        } catch {
          // ignore
        }
      }
    }

    listenersRef.current.get(channel).add(callback);

    // Return deterministic un-subscribe function
    return () => {
      const set = listenersRef.current.get(channel);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(channel);
          if (
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN &&
            isAuthenticatedRef.current
          ) {
            try {
              wsRef.current.send(JSON.stringify({ action: 'unsubscribe', channel }));
            } catch {
              // ignore
            }
          }
        }
      }
    };
  }, []);

  const sendCommand = useCallback((serverId, command) => {
    if (!serverId || !command) return;
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      isAuthenticatedRef.current
    ) {
      try {
        wsRef.current.send(
          JSON.stringify({
            action: 'send_command',
            channel: `server:${serverId}:console`,
            command,
          }),
        );
      } catch {
        // ignore
      }
    } else {
      // HTTP fallback
      api.post(`/servers/${serverId}/command`, { command }).catch(console.error);
    }
  }, []);

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
