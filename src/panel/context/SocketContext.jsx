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
  const heartbeatTimerRef = useRef(null);
  const pingPendingRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const listenersRef = useRef(new Map()); // channel -> Set of callback functions

  const sendPendingSubscriptions = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      listenersRef.current.forEach((_, channel) => {
        try {
          wsRef.current.send(JSON.stringify({ action: 'subscribe', channel }));
        } catch {
          // ignore send error
        }
      });
    }
  }, []);

  const clearHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    pingPendingRef.current = false;
  };

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      // If previous ping was never acknowledged within 15s, socket is stalled/dead
      if (pingPendingRef.current) {
        console.warn('[WS] Heartbeat timeout detected (no pong response). Reconnecting...');
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        return;
      }

      try {
        pingPendingRef.current = true;
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      } catch {
        pingPendingRef.current = false;
      }
    }, 15000);
  }, []);

  const connect = useCallback(() => {
    if (isDestroyedRef.current) return;
    const token = api.getToken();
    if (!token || !user) {
      setConnected(false);
      isAuthenticatedRef.current = false;
      clearHeartbeat();
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
      pingPendingRef.current = false;

      ws.onopen = () => {
        if (isDestroyedRef.current) {
          ws.close();
          return;
        }
        // Send authentication immediately
        ws.send(JSON.stringify({ action: 'auth', token }));
      };

      ws.onmessage = (event) => {
        // Any message received means the link is alive
        pingPendingRef.current = false;

        try {
          const payload = JSON.parse(event.data);
          const { channel, event: eventName, data } = payload;

          if (eventName === 'pong') {
            return;
          }

          if (eventName === 'auth_success') {
            isAuthenticatedRef.current = true;
            setConnected(true);
            setConnectionEpoch((prev) => prev + 1);
            // Once authenticated, subscribe to all active channels and start keepalive
            sendPendingSubscriptions();
            startHeartbeat();
            return;
          }

          if (eventName === 'auth_error') {
            isAuthenticatedRef.current = false;
            setConnected(false);
            clearHeartbeat();
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
        clearHeartbeat();

        if (!isDestroyedRef.current) {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 2000);
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
      clearHeartbeat();
    }
  }, [user, sendPendingSubscriptions, startHeartbeat]);

  // Initial connection
  useEffect(() => {
    isDestroyedRef.current = false;
    connect();

    return () => {
      isDestroyedRef.current = true;
      clearHeartbeat();
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

  // Auto-heal on tab switch, window focus, or network reconnect
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const isSocketHealthy =
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN &&
          isAuthenticatedRef.current;

        if (!isSocketHealthy) {
          // Socket was closed or throttled while away; reconnect immediately!
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          connect();
        } else {
          // Socket claims to be open; send an immediate ping to verify link and refresh subscriptions
          try {
            pingPendingRef.current = true;
            wsRef.current.send(JSON.stringify({ action: 'ping' }));
            sendPendingSubscriptions();
          } catch {
            connect();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
    };
  }, [connect, sendPendingSubscriptions]);

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
    const isSocketOpen =
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      isAuthenticatedRef.current;

    if (isSocketOpen) {
      try {
        wsRef.current.send(
          JSON.stringify({
            action: 'send_command',
            channel: `server:${serverId}:console`,
            command,
          }),
        );
      } catch {
        // If socket send threw, fall back to HTTP
        api.post(`/servers/${serverId}/command`, { command }).catch(console.error);
        connect();
      }
    } else {
      // HTTP fallback if socket not open, and trigger reconnect
      api.post(`/servers/${serverId}/command`, { command }).catch(console.error);
      connect();
    }
  }, [connect]);

  return (
    <SocketContext.Provider
      value={{
        connected,
        connectionEpoch,
        subscribe,
        sendCommand,
        reconnect: connect,
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
