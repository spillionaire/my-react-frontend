import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FaTimes, FaPaperPlane, FaUser, FaCar } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

const Chat = ({ rideId, driverInfo, riderInfo, isOpen, onClose }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch chat history from backend
  const fetchChatHistory = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rides/${rideId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data && response.data.chatMessages) {
        setMessages(response.data.chatMessages);
        // Mark messages as read
        const unread = response.data.chatMessages.filter(
          msg => msg.senderId !== user?._id && !msg.isRead
        );
        if (unread.length > 0) {
          await markMessagesAsRead(unread.map(m => m._id));
        }
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (messageIds) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/rides/${rideId}/chat/mark-read`,
        { messageIds },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Join chat room
  const joinChatRoom = () => {
    if (socket && rideId && !hasJoinedRef.current) {
      socket.emit('join-ride-chat', { rideId });
      hasJoinedRef.current = true;
      console.log('📱 Joined chat room:', rideId);
    }
  };

  // Load messages when chat opens
  useEffect(() => {
    if (isOpen && rideId) {
      fetchChatHistory();
      joinChatRoom();
    }
    
    return () => {
      if (socket && rideId && hasJoinedRef.current) {
        socket.emit('leave-ride-chat', { rideId });
        hasJoinedRef.current = false;
      }
    };
  }, [isOpen, rideId]);

  // Socket listener for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Only add message if it belongs to this ride
      if (msg.rideId === rideId) {
        console.log('📩 New message received:', msg);
        
        // Add to messages state
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => 
            m._id === msg._id || 
            (m.message === msg.message && 
             m.senderId === msg.senderId && 
             m.timestamp === msg.timestamp)
          );
          if (exists) return prev;
          return [...prev, msg];
        });
        
        // If message is from other user, increment unread count
        if (msg.senderId !== user?._id) {
          setUnreadCount(prev => prev + 1);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, rideId, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Send message - FIXED to save to database
  const sendMessage = async () => {
    if (!message.trim() || !rideId) return;

    const msgData = {
      rideId: rideId,
      senderId: user?._id,
      senderName: user?.name || 'User',
      senderRole: user?.role || 'rider',
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    // Add to local messages immediately (optimistic update)
    setMessages(prev => [...prev, msgData]);
    
    // Clear input
    setMessage('');
    
    // Scroll to bottom
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      // Save message to database via API
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/rides/${rideId}/chat`,
        {
          message: msgData.message,
          senderId: msgData.senderId,
          senderRole: msgData.senderRole,
          senderName: msgData.senderName
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // If saved successfully, replace local message with server version
      if (response.data && response.data.message) {
        const savedMsg = response.data.message;
        setMessages(prev => 
          prev.map(m => 
            (m.message === msgData.message && m.senderId === msgData.senderId && !m._id) 
              ? savedMsg 
              : m
          )
        );
      }

      // Emit to socket for real-time delivery
      socket?.emit('send-message', msgData);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Remove the optimistic message if failed
      setMessages(prev => prev.filter(m => 
        !(m.message === msgData.message && m.senderId === msgData.senderId && !m._id)
      ));
      toast.error('Failed to send message');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get other user info
  const getOtherUser = () => {
    if (user?.role === 'rider') {
      return driverInfo || { name: 'Driver', role: 'driver' };
    } else {
      return riderInfo || { name: 'Rider', role: 'rider' };
    }
  };

  const otherUser = getOtherUser();

  // If not open, return null
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#0E1A2A] rounded-2xl w-full max-w-md h-[80vh] max-h-[600px] flex flex-col shadow-2xl border border-[#1A2A4A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Dark theme */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A2A4A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1A2A4A] rounded-full flex items-center justify-center">
              {otherUser?.role === 'driver' ? (
                <FaCar className="text-gray-400" />
              ) : (
                <FaUser className="text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-white">{otherUser?.name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{otherUser?.role || 'User'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1A2A4A] rounded-full transition"
          >
            <FaTimes className="text-gray-400" />
          </button>
        </div>

        {/* Messages - Dark theme */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080E1F]"
        >
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A6BFF] mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">💬</p>
              <p>No messages yet</p>
              <p className="text-xs text-gray-600 mt-1">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSender = msg.senderId === user?._id;
              return (
                <div
                  key={msg._id || index}
                  className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isSender
                        ? 'bg-[#1A6BFF] text-white rounded-br-none'
                        : 'bg-[#1A2A4A] text-white rounded-bl-none'
                    }`}
                  >
                    {!isSender && (
                      <p className="text-xs font-medium text-gray-400 mb-1">
                        {msg.senderName || 'User'}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isSender ? 'text-blue-200' : 'text-gray-500'}`}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : 'Just now'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Dark theme */}
        <div className="p-3 border-t border-[#1A2A4A] bg-[#0E1A2A] rounded-b-2xl">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${otherUser?.name || 'User'}...`}
              className="flex-1 px-4 py-2.5 bg-[#080E1F] border border-[#1A2A4A] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] text-white placeholder-gray-500 text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="p-2.5 bg-[#1A6BFF] text-white rounded-full hover:bg-[#5294FF] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPaperPlane className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;