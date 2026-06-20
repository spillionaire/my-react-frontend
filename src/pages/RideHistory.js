import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaCar, 
  FaUser, 
  FaClock, 
  FaMoneyBill, 
  FaCheck, 
  FaTimes,
  FaStar,
  FaMapMarkerAlt,
  FaFlag,
  FaSync,
  FaFilter,
  FaSignOutAlt,
  FaHome
} from 'react-icons/fa';
import { API_URL } from '../config';

const RideHistory = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch ride history
  const fetchRideHistory = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rides/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRides(response.data);
    } catch (error) {
      console.error('Error fetching ride history:', error);
      toast.error('Failed to load ride history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchRideHistory();
  }, [fetchRideHistory]);

  // Listen for ride status updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleRideStatus = (data) => {
      const rideBelongsToUser = data.riderId === user?._id || data.driverId === user?._id;
      
      if (rideBelongsToUser && (data.status === 'completed' || data.status === 'cancelled')) {
        console.log('🔄 Ride status changed, refreshing history...');
        setTimeout(() => {
          fetchRideHistory();
        }, 1000);
      }
    };

    socket.on('ride-status-update', handleRideStatus);
    socket.on('ride-completed', (data) => {
      if (data.riderId === user?._id || data.driverId === user?._id) {
        console.log('✅ Ride completed, refreshing history...');
        setTimeout(() => {
          fetchRideHistory();
        }, 1000);
      }
    });
    socket.on('ride-cancelled', (data) => {
      if (data.riderId === user?._id || data.driverId === user?._id) {
        console.log('❌ Ride cancelled, refreshing history...');
        setTimeout(() => {
          fetchRideHistory();
        }, 1000);
      }
    });

    return () => {
      socket.off('ride-status-update');
      socket.off('ride-completed');
      socket.off('ride-cancelled');
    };
  }, [socket, user, fetchRideHistory]);

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRideHistory();
    toast.success('🔄 History refreshed');
  };

  const getStatusColor = (status) => {
    const colors = {
      requested: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-blue-100 text-blue-800 border-blue-200',
      arrived: 'bg-purple-100 text-purple-800 border-purple-200',
      'in-progress': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      requested: '⏳',
      accepted: '✅',
      arrived: '📍',
      'in-progress': '🚗',
      completed: '🏁',
      cancelled: '❌',
    };
    return icons[status] || '❓';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRides = rides.filter(ride => {
    if (filter === 'all') return true;
    return ride.status === filter;
  });

  const getStats = () => {
    const completed = rides.filter(r => r.status === 'completed');
    const cancelled = rides.filter(r => r.status === 'cancelled');
    const totalSpent = completed.reduce((sum, r) => sum + r.fare, 0);
    return { 
      completed: completed.length, 
      cancelled: cancelled.length, 
      totalSpent,
      total: rides.length 
    };
  };

  const stats = getStats();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Flat Twitter-style */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center shadow-none sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <FaCar className="h-6 w-6 text-black mr-2" />
            <h1 className="text-xl font-bold text-black">Vai</h1>
          </div>
          <span className="text-sm text-gray-500 font-medium">
            History
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`text-gray-400 hover:text-black transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FaSync className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <FaSignOutAlt className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Stats Cards - Mobile Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Total Rides</p>
                <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
              </div>
              <FaCar className="h-5 w-5 md:h-8 md:w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Completed</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <FaCheck className="h-5 w-5 md:h-8 md:w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Cancelled</p>
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  {stats.cancelled}
                </p>
              </div>
              <FaTimes className="h-5 w-5 md:h-8 md:w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-500">Total Spent</p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">
                  R{stats.totalSpent.toFixed(2)}
                </p>
              </div>
              <FaMoneyBill className="h-5 w-5 md:h-8 md:w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters - Scrollable on mobile */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
              filter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
            }`}
          >
            All
          </button>
          {['requested', 'accepted', 'arrived', 'in-progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition capitalize whitespace-nowrap ${
                filter === status
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Ride List */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading your rides...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🚗</div>
            <p className="text-lg text-gray-600">No rides found</p>
            <p className="text-sm text-gray-400">
              {filter === 'all' ? 'You haven\'t taken any rides yet' : `No ${filter} rides`}
            </p>
            <button
              onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
              className="mt-4 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              {user?.role === 'driver' ? 'Go Online' : 'Request a Ride'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredRides.map((ride) => (
              <div key={ride._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium border ${getStatusColor(ride.status)}`}>
                        {getStatusIcon(ride.status)} {ride.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(ride.createdAt)}
                      </span>
                    </div>

                    {/* Ride Details */}
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-start space-x-2">
                        <FaMapMarkerAlt className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 truncate">
                          <span className="font-medium">From:</span>{' '}
                          {ride.pickupLocation?.address || 'Pickup location'}
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <FaFlag className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 truncate">
                          <span className="font-medium">To:</span>{' '}
                          {ride.dropoffLocation?.address || 'Destination'}
                        </p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-3 md:gap-4 mt-2 text-xs">
                      <span className="text-gray-500">📏 {ride.distance?.toFixed(1) || '0'} km</span>
                      <span className="text-gray-500">⏱ {ride.duration || '0'} min</span>
                      {ride.driver && (
                        <span className="text-gray-500">🚗 {ride.driver.name}</span>
                      )}
                      {ride.rider && ride.rider.name && (
                        <span className="text-gray-500">👤 {ride.rider.name}</span>
                      )}
                      <span className="text-gray-500">💰 {ride.paymentMethod || 'Cash'}</span>
                    </div>
                  </div>

                  {/* Fare & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1">
                    <p className="text-xl md:text-2xl font-bold text-green-600">R{ride.fare?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">
                      {ride.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                    </p>
                    {ride.status === 'completed' && (
                      <button
                        onClick={() => toast.success('⭐ Rating feature coming soon!')}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 md:px-3 py-1 rounded-full transition"
                      >
                        ⭐ Rate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistory;