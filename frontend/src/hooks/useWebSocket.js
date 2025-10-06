import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for WebSocket connections with automatic reconnection
 *
 * @param {string} url - WebSocket URL (e.g., 'ws://localhost:8000/ws/rooms/1/')
 * @param {object} options - Configuration options
 * @param {boolean} options.enabled - Whether to enable the WebSocket connection
 * @param {number} options.reconnectDelay - Delay in ms before reconnecting (default: 3000)
 * @param {number} options.maxReconnectAttempts - Max reconnection attempts (default: 5)
 * @param {function} options.onMessage - Callback for incoming messages
 * @param {function} options.onOpen - Callback when connection opens
 * @param {function} options.onClose - Callback when connection closes
 * @param {function} options.onError - Callback for errors
 *
 * @returns {object} - WebSocket state and methods
 */
export const useWebSocket = (url, options = {}) => {
  const {
    enabled = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    onMessage = () => {},
    onOpen = () => {},
    onClose = () => {},
    onError = () => {},
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    try {
      console.log(`[WebSocket] Connecting to ${url}...`);
      setConnectionStatus('connecting');

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (event) => {
        console.log(`[WebSocket] Connected to ${url}`);
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        onOpen(event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage(data);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error(`[WebSocket] Error:`, error);
        setConnectionStatus('error');
        onError(error);
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected from ${url}`, event);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        onClose(event);

        // Attempt to reconnect if not manually closed
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setConnectionStatus('reconnecting');
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('[WebSocket] Max reconnection attempts reached');
          setConnectionStatus('failed');
        }
      };

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      setConnectionStatus('error');
    }
  }, [url, enabled, reconnectDelay, maxReconnectAttempts, onOpen, onMessage, onClose, onError]);

  const disconnect = useCallback(() => {
    console.log('[WebSocket] Manually disconnecting...');
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
      return false;
    }
  }, []);

  const reconnect = useCallback(() => {
    console.log('[WebSocket] Manual reconnect triggered');
    reconnectAttemptsRef.current = 0;
    shouldReconnectRef.current = true;
    disconnect();
    setTimeout(connect, 500);
  }, [connect, disconnect]);

  // Initialize connection
  useEffect(() => {
    if (enabled) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, enabled, connect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect,
  };
};

export default useWebSocket;
