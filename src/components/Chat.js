import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaUser, FaCar } from 'react-icons/fa';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Chat = ({ rideId, driverInfo, riderInfo, isOpen, onClose }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const notificationSoundRef = useRef(null);

  // Create notification sound
  useEffect(() => {
    notificationSoundRef.current = new Audio(
      'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYY='
    );
    return () => {
      if (notificationSoundRef.current) {
        notificationSoundRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playNotification = () => {
    try {
      if (notificationSoundRef.current) {
        notificationSoundRef.current.play().catch(() => {});
      }
    } catch (e) {
      // Silent fail
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Load chat history and join room
  useEffect(() => {
    if (!socket || !rideId || !isOpen) return;

    // Join chat room
    socket.emit('join-ride-chat', { rideId });

    // Listen for join confirmation
    socket.on('chat-joined', (data) => {
      console.log('✅ Joined chat room:', data.rideId);
      setIsJoined(true);
      socket.emit('get-chat-history', { rideId });
    });

    // Listen for new messages
    socket.on('new-message', (msg) => {
      console.log('📩 New message received:', msg);
      console.log('Current user ID:', user?.id);
      console.log('Message sender ID:', msg.senderId);
      
      // CRITICAL FIX: Convert both IDs to strings for comparison
      const currentUserId = String(user?.id || '');
      const messageSenderId = String(msg.senderId || '');
      const isOwnMessage = currentUserId === messageSenderId;
      
      console.log('Is own message?', isOwnMessage);
      
      setMessages(prev => [...prev, { ...msg, isOwn: isOwnMessage }]);
      
      // Show notification only for messages from others
      if (!isOwnMessage && isOpen) {
        playNotification();
        const senderName = msg.senderRole === 'driver' 
          ? (driverInfo?.name || 'Driver') 
          : (riderInfo?.name || 'Rider');
        toast.success(`💬 ${senderName}: ${msg.message}`, {
          duration: 3000,
          icon: '💬'
        });
      }
    });

    // Listen for chat history
    socket.on('chat-history', (history) => {
      const currentUserId = String(user?.id || '');
      const messagesWithOwn = (history || []).map(msg => ({
        ...msg,
        isOwn: String(msg.senderId || '') === currentUserId
      }));
      setMessages(messagesWithOwn);
    });

    return () => {
      socket.off('chat-joined');
      socket.off('new-message');
      socket.off('chat-history');
      socket.emit('leave-ride-chat', { rideId });
      setIsJoined(false);
    };
  }, [socket, rideId, isOpen, user, driverInfo, riderInfo]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !rideId) return;

    const messageData = {
      rideId,
      senderId: user?.id,
      senderName: user?.name || 'User',
      senderRole: user?.role || 'rider',
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending message:', messageData);

    socket.emit('send-message', messageData);
    setNewMessage('');
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get the other person's name
  const getOtherPersonName = () => {
    if (!user) return 'Other';
    if (user.role === 'rider' && riderInfo) {
      return riderInfo.name || 'Rider';
    }
    if (user.role === 'driver' && driverInfo) {
      return driverInfo.name || 'Driver';
    }
    return 'Other';
  };

  // Get display name for a message sender
  const getSenderDisplayName = (msg) => {
    // Use the isOwn flag
    if (msg.isOwn === true) {
      return 'You';
    }
    
    // If not own, show the sender's role
    if (msg.senderRole === 'driver') {
      return driverInfo?.name || 'Driver';
    } else {
      return riderInfo?.name || 'Rider';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 w-80 h-96 bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 bg-black text-white rounded-t-xl">
        <div className="flex items-center space-x-2">
          {user?.role === 'rider' && driverInfo ? (
            <>
              <FaCar className="h-4 w-4" />
              <span className="text-sm font-medium">{driverInfo.name || 'Driver'}</span>
            </>
          ) : user?.role === 'driver' && riderInfo ? (
            <>
              <FaUser className="h-4 w-4" />
              <span className="text-sm font-medium">{riderInfo.name || 'Rider'}</span>
            </>
          ) : (
            <span className="text-sm font-medium">Chat</span>
          )}
          {isJoined && (
            <span className="text-[10px] bg-green-500 px-2 py-0.5 rounded-full">Connected</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          <FaTimes className="h-4 w-4" />
        </button>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            No messages yet. Say hello! 👋
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.isOwn === true;
            const isDriver = msg.senderRole === 'driver';
            const displayName = getSenderDisplayName(msg);
            
            return (
              <div
                key={index}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-black text-white rounded-br-none'
                      : isDriver
                      ? 'bg-blue-100 text-gray-800 rounded-bl-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="text-xs font-medium">
                      {displayName}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${getOtherPersonName()}...`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaPaperPlane className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default Chat;