// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { isAuthenticated, user } = useAuth();
  
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket - no user');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    console.log('🔌 Initializing socket connection...');
    console.log('🔌 Socket URL:', SOCKET_URL);
    console.log('🔌 User ID:', user._id || user.id);
    console.log('🔌 User Role:', user.role);

    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');

    // Create socket connection with auth
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: token,
        userId: user._id || user.id,
        role: user.role
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      path: '/socket.io/'
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // ============ CONNECTION EVENTS ============
    newSocket.on('connect', () => {
      console.log('✅ Socket connected!');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      
      // Identify the user
      newSocket.emit('identify', {
        userId: user._id || user.id,
        role: user.role,
        name: user.name
      });

      // If driver, emit online status
      if (user.role === 'driver' && user.isAvailable) {
        console.log('🚗 Driver going online');
        newSocket.emit('driver-online', {
          driverId: user._id || user.id,
          location: user.location || { lat: -26.2041, lng: 28.0473 },
          vehicle: user.vehicle
        });
      }

      // If rider, join rider room
      if (user.role === 'rider') {
        console.log('👤 Rider identified');
        newSocket.emit('rider-online', {
          riderId: user._id || user.id,
          name: user.name
        });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        setTimeout(() => {
          console.log('🔄 Attempting manual reconnect...');
          newSocket.connect();
        }, 1000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setIsConnected(false);
      setConnectionError(error.message);
      
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('❌ Max reconnect attempts reached');
        setConnectionError('Failed to connect to server after multiple attempts');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnect attempt:', attemptNumber);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
      setConnectionError('Failed to reconnect to server');
    });

    // ============ RIDE SPECIFIC EVENTS ============
    // Join ride room helper
    newSocket.on('join-ride-room', (data) => {
      console.log('📡 Joined ride room:', data);
    });

    // ============ CLEANUP ============
    return () => {
      console.log('🔌 Cleaning up socket');
      if (user?.role === 'driver') {
        newSocket.emit('driver-offline', { 
          driverId: user._id || user.id 
        });
      }
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  // ============ HELPER FUNCTIONS ============
  const emit = (event, data) => {
    if (!socketRef.current || !isConnected) {
      console.warn(`⚠️ Cannot emit "${event}" - socket not connected`);
      return false;
    }
    socketRef.current.emit(event, data);
    return true;
  };

  const on = (event, callback) => {
    if (!socketRef.current) {
      console.warn(`⚠️ Cannot listen to "${event}" - socket not connected`);
      return () => {};
    }
    socketRef.current.on(event, callback);
    return () => socketRef.current.off(event, callback);
  };

  const off = (event, callback) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, callback);
  };

  // Join a ride room
  const joinRideRoom = (rideId, userId, role) => {
    if (!socketRef.current || !isConnected) {
      console.warn('⚠️ Cannot join ride room - socket not connected');
      return false;
    }
    socketRef.current.emit('join-ride-room', { rideId, userId, role });
    return true;
  };

  // Request driver location
  const requestDriverLocation = (driverId, rideId) => {
    if (!socketRef.current || !isConnected) {
      console.warn('⚠️ Cannot request driver location - socket not connected');
      return false;
    }
    socketRef.current.emit('request-driver-location', { driverId, rideId });
    return true;
  };

  const value = {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    off,
    joinRideRoom,
    requestDriverLocation,
    isReady: () => socketRef.current && isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};