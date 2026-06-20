import React, { useState } from 'react';
import { FaStar, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

const RatingModal = ({ rideId, userRole, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/rides/${rideId}/rate`,
        { rating, comment, userRole },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      toast.success('Thank you for your rating!');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (error) {
      console.error('Rating error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => setRating(star)}
        onMouseEnter={() => setHover(star)}
        onMouseLeave={() => setHover(0)}
        className="text-3xl focus:outline-none transition-transform hover:scale-110"
      >
        <FaStar
          className={`${
            (hover || rating) >= star ? 'text-yellow-500' : 'text-gray-300'
          }`}
        />
      </button>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">
            Rate Your {userRole === 'rider' ? 'Driver' : 'Rider'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          How was your experience?
        </p>

        <div className="flex justify-center space-x-2 mb-4">
          {renderStars()}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black mb-4"
          rows="3"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;