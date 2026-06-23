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
  FaHome,
  FaInfoCircle
} from 'react-icons/fa';
import { API_URL } from '../config';
import ProfileDropdown from '../components/ProfileDropdown';

const RideHistory = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [ratingRideId, setRatingRideId] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

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

  // Submit rating
  const submitRating = async () => {
    if (ratingValue === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmittingRating(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/api/rides/${ratingRideId}/rate`,
        {
          rating: ratingValue,
          comment: ratingComment,
          userRole: user?.role || 'rider'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      toast.success('⭐ Rating submitted successfully!');
      setShowRatingModal(false);
      setRatingValue(0);
      setRatingComment('');
      setRatingRideId(null);
      
      // Refresh history to update rating status
      setTimeout(() => {
        fetchRideHistory();
      }, 500);
    } catch (error) {
      console.error('Rating error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Open rating modal
  const openRatingModal = (rideId) => {
    setRatingRideId(rideId);
    setRatingValue(0);
    setRatingComment('');
    setShowRatingModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      requested: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
      accepted: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
      arrived: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
      'in-progress': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
      completed: 'bg-green-500/20 text-green-400 border-green-500/20',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/20',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/20';
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

  // Render stars for rating
  const renderStars = (rating, interactive = false, onStarClick = null) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onStarClick && onStarClick(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'} focus:outline-none`}
          >
            <FaStar
              className={`${
                star <= rating 
                  ? 'text-yellow-400' 
                  : 'text-gray-600'
              } ${interactive ? 'text-3xl' : 'text-lg'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#03060F]">
      {/* Header */}
      <header className="bg-[#080E1F] border-b border-[#1A2A4A] px-4 py-3 flex justify-between items-center shadow-none sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-sm mr-2 shadow-lg shadow-[#1A6BFF]/30">
              V
            </div>
            <h1 className="text-xl font-bold text-white">Vai</h1>
          </div>
          <span className="text-sm text-gray-400 font-medium">
            History
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`text-gray-400 hover:text-white transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FaSync className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <ProfileDropdown user={user} logout={handleLogout} />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="bg-[#0E1A2A] rounded-xl p-3 md:p-4 shadow-sm border border-[#1A2A4A] hover:border-[#1A6BFF] transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-400">Total Rides</p>
                <p className="text-lg md:text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FaCar className="h-5 w-5 md:h-8 md:w-8 text-gray-500" />
            </div>
          </div>
          <div className="bg-[#0E1A2A] rounded-xl p-3 md:p-4 shadow-sm border border-[#1A2A4A] hover:border-[#1A6BFF] transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-400">Completed</p>
                <p className="text-lg md:text-2xl font-bold text-green-400">
                  {stats.completed}
                </p>
              </div>
              <FaCheck className="h-5 w-5 md:h-8 md:w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-[#0E1A2A] rounded-xl p-3 md:p-4 shadow-sm border border-[#1A2A4A] hover:border-[#1A6BFF] transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-400">Cancelled</p>
                <p className="text-lg md:text-2xl font-bold text-red-400">
                  {stats.cancelled}
                </p>
              </div>
              <FaTimes className="h-5 w-5 md:h-8 md:w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-[#0E1A2A] rounded-xl p-3 md:p-4 shadow-sm border border-[#1A2A4A] hover:border-[#1A6BFF] transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-400">Total Spent</p>
                <p className="text-lg md:text-2xl font-bold text-blue-400">
                  R{stats.totalSpent.toFixed(2)}
                </p>
              </div>
              <FaMoneyBill className="h-5 w-5 md:h-8 md:w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
              filter === 'all'
                ? 'bg-[#1A6BFF] text-white'
                : 'bg-[#0E1A2A] text-gray-400 hover:text-white hover:border-[#1A6BFF] border border-[#1A2A4A]'
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
                  ? 'bg-[#1A6BFF] text-white'
                  : 'bg-[#0E1A2A] text-gray-400 hover:text-white hover:border-[#1A6BFF] border border-[#1A2A4A]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Ride List */}
        {loading ? (
          <div className="text-center py-12 bg-[#0E1A2A] rounded-xl shadow-sm border border-[#1A2A4A]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A6BFF] mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading your rides...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-12 bg-[#0E1A2A] rounded-xl shadow-sm border border-[#1A2A4A]">
            <div className="text-6xl mb-4">🚗</div>
            <p className="text-lg text-white">No rides found</p>
            <p className="text-sm text-gray-400">
              {filter === 'all' ? 'You haven\'t taken any rides yet' : `No ${filter} rides`}
            </p>
            <button
              onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
              className="mt-4 px-6 py-2 bg-[#1A6BFF] text-white rounded-lg hover:bg-[#5294FF] transition"
            >
              {user?.role === 'driver' ? 'Go Online' : 'Request a Ride'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredRides.map((ride) => {
              const isRated = ride.isRated?.[user?.role === 'rider' ? 'rider' : 'driver'] || false;
              const ratingData = user?.role === 'rider' ? ride.riderRating : ride.driverRating;
              
              return (
                <div key={ride._id} className="bg-[#0E1A2A] rounded-xl shadow-sm border border-[#1A2A4A] p-4 md:p-6 hover:border-[#1A6BFF] transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Status Badge & Trip Reference */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium border ${getStatusColor(ride.status)}`}>
                          {getStatusIcon(ride.status)} {ride.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(ride.createdAt)}
                        </span>
                      </div>

                      {/* TRIP REFERENCE */}
                      <div className="flex items-center space-x-2 mb-2">
                        <FaInfoCircle className="h-3 w-3 text-gray-500" />
                        <p className="text-xs font-mono font-medium text-gray-400 bg-[#1A2A4A] px-2 py-0.5 rounded border border-[#1A2A4A]">
                          {ride.tripReference || 'VAI-0000-0000'}
                        </p>
                      </div>

                      {/* Ride Details */}
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="flex items-start space-x-2">
                          <FaMapMarkerAlt className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-300 truncate">
                            <span className="font-medium">From:</span>{' '}
                            {ride.pickupLocation?.address || 'Pickup location'}
                          </p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <FaFlag className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-300 truncate">
                            <span className="font-medium">To:</span>{' '}
                            {ride.dropoffLocation?.address || 'Destination'}
                          </p>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-3 md:gap-4 mt-2 text-xs">
                        <span className="text-gray-400">📏 {ride.distance?.toFixed(1) || '0'} km</span>
                        <span className="text-gray-400">⏱ {ride.duration || '0'} min</span>
                        {ride.driver && (
                          <span className="text-gray-400 flex items-center">
                            🚗 {ride.driver.name}
                            {ride.driver?.isVerified && (
                              <span className="ml-1 text-[#1A6BFF] text-[10px]">✓</span>
                            )}
                            <span className="ml-1 text-xs text-yellow-400">
                              ★ {ride.driver?.rating?.average?.toFixed(1) || 'New'}
                            </span>
                          </span>
                        )}
                        <span className="text-gray-400">💰 {ride.paymentMethod || 'Cash'}</span>
                        <span className="text-gray-400 capitalize">🚗 {ride.serviceType || 'Standard'}</span>
                      </div>

                      {/* Show rating if completed */}
                      {ride.status === 'completed' && (
                        <div className="mt-2 flex items-center space-x-2">
                          {isRated ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-400">Rated:</span>
                              <div className="flex space-x-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <FaStar
                                    key={star}
                                    className={`text-xs ${
                                      star <= (ratingData?.rating || 0) 
                                        ? 'text-yellow-400' 
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              {ratingData?.comment && (
                                <span className="text-xs text-gray-500 italic">"{ratingData.comment}"</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => openRatingModal(ride._id)}
                              className="flex items-center space-x-1 text-xs bg-[#1A2A4A] hover:bg-[#2A3A5A] px-3 py-1 rounded-full transition text-white"
                            >
                              <FaStar className="text-yellow-400" />
                              <span>Rate this ride</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Fare & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1">
                      <p className="text-xl md:text-2xl font-bold text-green-400">R{ride.fare?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-gray-400">
                        {ride.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0E1A2A] rounded-2xl p-6 max-w-md w-full border border-[#1A2A4A]">
            <h3 className="text-xl font-bold text-white mb-4">Rate Your Ride</h3>
            <p className="text-sm text-gray-400 mb-4">How was your experience?</p>
            
            <div className="flex justify-center mb-4">
              {renderStars(ratingValue, true, (star) => setRatingValue(star))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Comment (Optional)
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your experience..."
                rows="3"
                className="w-full px-3 py-2 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setRatingValue(0);
                  setRatingComment('');
                  setRatingRideId(null);
                }}
                className="flex-1 py-2 bg-[#1A2A4A] text-gray-300 rounded-xl hover:bg-[#2A3A5A] transition"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                disabled={submittingRating || ratingValue === 0}
                className="flex-1 py-2 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition disabled:opacity-50 flex items-center justify-center"
              >
                {submittingRating ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                ) : (
                  'Submit Rating'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideHistory;