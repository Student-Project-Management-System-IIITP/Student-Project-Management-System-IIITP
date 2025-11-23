import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import websocketManager from '../utils/websocket';

export const useWebSocket = () => {
  const { user, token } = useAuth();
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  // Update connection state when websocket manager state changes
  useEffect(() => {
    // Subscribe to connection events to update state
    const handleConnected = () => {
      setIsConnected(true);
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
    };

    // Subscribe to connection events
    websocketManager.subscribe('connected', handleConnected);
    websocketManager.subscribe('disconnected', handleDisconnected);

    // Set initial state
    setIsConnected(websocketManager.isConnected);

    return () => {
      websocketManager.unsubscribe('connected', handleConnected);
      websocketManager.unsubscribe('disconnected', handleDisconnected);
    };
  }, []);

  const connect = useCallback(() => {
    if (token && !isConnectedRef.current) {
      websocketManager.connect(token);
      isConnectedRef.current = true;
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (isConnectedRef.current) {
      websocketManager.disconnect();
      isConnectedRef.current = false;
    }
  }, []);

  const subscribe = useCallback((event, callback) => {
    websocketManager.subscribe(event, callback);
  }, []);

  const unsubscribe = useCallback((event, callback) => {
    websocketManager.unsubscribe(event, callback);
  }, []);

  const send = useCallback((data) => {
    websocketManager.send(data);
  }, []);

  useEffect(() => {
    if (user && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send
  };
};

export const useGroupInvitations = (callback) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (callback) {
      subscribe('group_invitation', callback);
      return () => unsubscribe('group_invitation', callback);
    }
  }, [callback, subscribe, unsubscribe]);
};

export const useGroupAllocations = (callback) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (callback) {
      subscribe('group_allocation', callback);
      return () => unsubscribe('group_allocation', callback);
    }
  }, [callback, subscribe, unsubscribe]);
};

export const useFacultyResponses = (callback) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (callback) {
      subscribe('faculty_response', callback);
      return () => unsubscribe('faculty_response', callback);
    }
  }, [callback, subscribe, unsubscribe]);
};

export const useProjectUpdates = (callback) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (callback) {
      subscribe('project_update', callback);
      return () => unsubscribe('project_update', callback);
    }
  }, [callback, subscribe, unsubscribe]);
};

export const useSystemNotifications = (callback) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (callback) {
      subscribe('system_notification', callback);
      return () => unsubscribe('system_notification', callback);
    }
  }, [callback, subscribe, unsubscribe]);
};
