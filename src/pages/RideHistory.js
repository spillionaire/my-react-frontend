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
  FaFilter
} from 'react-icons/fa';

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
      const response = await axios.get('http://localhost:5000/api/rides/history');
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

    // When a ride is completed or cancelled, refresh history
    const handleRideStatus = (data) => {
      // Check if this ride belongs to the current user
      const rideBelongsToUser = data.riderId === user?.id || data.driverId === user?.id;
      
      if (rideBelongsToUser && (data.status === 'completed' || data.status === 'cancelled')) {
        console.log('🔄 Ride status changed, refreshing history...');
        // Small delay to allow backend to save
        setTimeout(() => {
          fetchRideHistory();
        }, 1000);
      }
    };

    // Listen for ride status changes
    socket.on('ride-status-update', handleRideStatus);

    // Also listen for ride completed event
    socket.on('ride-completed', (data) => {
      if (data.riderId === user?.id || data.driverId === user?.id) {
        console.log('✅ Ride completed, refreshing history...');
        setTimeout(() => {
          fetchRideHistory();
        }, 1000);
      }
    });

    // Listen for ride cancelled event
    socket.on('ride-cancelled', (data) => {
      if (data.riderId === user?.id || data.driverId === user?.id) {
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
      {/* Header */}
      <div className="bg-black text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
            className="text-white hover:text-gray-300 transition"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Vai</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`text-sm bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition flex items-center ${
              refreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FaSync className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> 
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <span className="text-sm bg-gray-800 px-3 py-1 rounded-full">
            {user?.role === 'driver' ? '🚗 Driver' : '🚶 Rider'}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Rides</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FaCar className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <FaCheck className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.cancelled}
                </p>
              </div>
              <FaTimes className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-blue-600">
                  R{stats.totalSpent.toFixed(2)}
                </p>
              </div>
              <FaMoneyBill className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
            }`}
          >
            All
          </button>
          {['requested', 'accepted', 'arrived', 'in-progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                filter === status
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Ride List */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading your rides...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
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
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <div key={ride._id} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ride.status)}`}>
                        {getStatusIcon(ride.status)} {ride.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(ride.createdAt)}
                      </span>
                    </div>

                    {/* Ride Details */}
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <FaMapMarkerAlt className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">From:</span>{' '}
                          {ride.pickupLocation?.address || 'Pickup location'}
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <FaFlag className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">To:</span>{' '}
                          {ride.dropoffLocation?.address || 'Destination'}
                        </p>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs">
                      <span className="text-gray-500">📏 {ride.distance?.toFixed(1) || '0'} km</span>
                      <span className="text-gray-500">⏱ {ride.duration || '0'} min</span>
                      {ride.driver && (
                        <span className="text-gray-500">🚗 {ride.driver.name}</span>
                      )}
                      {ride.rider && ride.rider.name && (
                        <span className="text-gray-500">👤 {ride.rider.name}</span>
                      )}
                      <span className="text-gray-500">💰 Cash</span>
                    </div>
                  </div>

                  {/* Fare & Actions */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">R{ride.fare?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ride.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                    </p>
                    {ride.status === 'completed' && (
                      <button
                        onClick={() => toast.success('⭐ Rating feature coming soon!')}
                        className="mt-2 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition"
                      >
                        ⭐ Rate Ride
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